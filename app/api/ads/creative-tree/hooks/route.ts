/**
 * POST /api/ads/creative-tree/hooks — Step 2: Generate hooks for a saved concept (~5-8s)
 * Requires concept_id from step 1. Loads brief from DB, generates hooks, saves them.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHookVariations } from '@/lib/ads/creative-engine'
import { getAdGenerationContext } from '@/lib/create/kb-retriever'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { concept_id, hookCount, bank_hooks, bank_hook_ids, fresh } = await request.json()
  if (!concept_id) {
    return NextResponse.json({ error: 'concept_id required' }, { status: 400 })
  }

  try {
    // Load concept brief from DB
    const { data: concept, error: loadErr } = await supabase
      .from('creative_concepts')
      .select('concept_brief')
      .eq('id', concept_id)
      .eq('user_id', user.id)
      .single()

    if (loadErr || !concept?.concept_brief) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const brief = concept.concept_brief as any

    // ─── Path A: Bank hooks provided (picked from bank grid) ───
    if (bank_hooks && bank_hooks.length > 0) {
      const savedHooks = []
      for (const hook of bank_hooks) {
        const { data: saved } = await supabase
          .from('creative_hooks')
          .insert({
            concept_id,
            user_id: user.id,
            hook_text: hook.hook_text,
            hook_type: hook.hook_type,
            proof_points_used: hook.proof_points_used || [],
            status: 'draft',
            llm_provider: 'bank',
            llm_model: 'pre-generated',
          })
          .select('id, hook_text, hook_type, proof_points_used, status')
          .single()
        if (saved) savedHooks.push(saved)
      }
      // Mark bank hooks as selected
      if (bank_hook_ids && bank_hook_ids.length > 0) {
        for (const bhId of bank_hook_ids) {
          await supabase.from('hook_bank')
            .update({ status: 'selected', times_selected: 1, updated_at: new Date().toISOString() })
            .eq('id', bhId).eq('user_id', user.id)
        }
      }
      return NextResponse.json({ success: true, concept_id, hooks: savedHooks, source: 'bank' })
    }

    // ─── Path B: Generate fresh hooks with negative constraints ───
    let kbHookContext: string | undefined
    try {
      if (fresh) {
        // Load ALL existing hooks for this angle×persona as negative constraints
        const { data: existing } = await supabase
          .from('hook_bank')
          .select('hook_text, hook_type')
          .eq('user_id', user.id)
          .eq('angle', brief.angle)
          .eq('persona', brief.persona)
          .not('status', 'eq', 'retired')

        if (existing && existing.length > 0) {
          const usedTypes = [...new Set(existing.map((h: any) => h.hook_type))]
          const allTypes = ['question', 'social_proof', 'curiosity_gap', 'direct_benefit', 'story_opening', 'bold_claim', 'pain_call', 'how_to']
          const unusedTypes = allTypes.filter(t => !usedTypes.includes(t))

          kbHookContext = `HOOKS THAT ALREADY EXIST (DO NOT repeat, paraphrase, or create similar variations):\n${existing.map((h: any) => `• [${h.hook_type}] ${h.hook_text}`).join('\n')}\n\nHook types already used: ${usedTypes.join(', ')}${unusedTypes.length > 0 ? `\nPRIORITIZE these unused hook types: ${unusedTypes.join(', ')}` : ''}\n\nGenerate COMPLETELY NEW hooks with different emotional angles and proof point combinations.`
        }
      } else {
        const { entries } = await getAdGenerationContext(10)
        const hookEntries = entries.filter(e => e.category === 'hook_library')
        if (hookEntries.length > 0) {
          kbHookContext = hookEntries.slice(0, 5).map(e => `• ${e.title}: ${(e.content || '').substring(0, 200)}`).join('\n')
        }
      }
    } catch { /* non-fatal */ }

    // Generate hooks via LLM
    const hooks = await generateHookVariations(brief, hookCount || 3, kbHookContext)

    // Save hooks to DB
    const savedHooks = []
    for (const hook of hooks) {
      const { data: saved } = await supabase
        .from('creative_hooks')
        .insert({
          concept_id,
          user_id: user.id,
          hook_text: hook.hook_text,
          hook_type: hook.hook_type,
          proof_points_used: hook.proof_points_used,
          status: 'draft',
          llm_provider: hook.llm_provider || null,
          llm_model: hook.llm_model || null,
        })
        .select('id, hook_text, hook_type, proof_points_used, status')
        .single()
      if (saved) savedHooks.push(saved)
    }

    // If fresh mode, also save new hooks to bank for future sessions
    if (fresh) {
      for (const hook of hooks) {
        const hash = require('crypto').createHash('md5').update(hook.hook_text).digest('hex')
        await supabase.from('hook_bank').insert({
          user_id: user.id,
          angle: brief.angle,
          persona: brief.persona,
          hook_text: hook.hook_text,
          hook_type: hook.hook_type,
          proof_points_used: hook.proof_points_used || [],
          generated_by: hook.llm_provider || 'unknown',
          generated_model: hook.llm_model || null,
          status: 'fresh',
          exclusion_hash: hash,
        }) // dedup failures are non-fatal
      }
    }

    return NextResponse.json({ success: true, concept_id, hooks: savedHooks, source: fresh ? 'generated_fresh' : 'generated' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Hook generation failed'
    console.error('[Creative Hooks] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
