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

  const { concept_id, hookCount } = await request.json()
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

    // Load KB hooks for better generation
    let kbHookContext: string | undefined
    try {
      const { entries } = await getAdGenerationContext(10)
      const hookEntries = entries.filter(e => e.category === 'hook_library')
      if (hookEntries.length > 0) {
        kbHookContext = hookEntries.slice(0, 5).map(e => `• ${e.title}: ${(e.content || '').substring(0, 200)}`).join('\n')
      }
    } catch { /* non-fatal */ }

    // Generate hooks
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

    return NextResponse.json({ success: true, concept_id, hooks: savedHooks })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Hook generation failed'
    console.error('[Creative Hooks] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
