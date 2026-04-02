/**
 * POST /api/ads/bank/seed — Seed the hook bank for an angle×persona
 * 
 * Generates hooks via Kimi K2-Turbo (best for hooks) and optionally
 * scripts via Claude Sonnet 4.6 (best for scripts).
 * 
 * Deduplicates against existing bank entries.
 * Tracks credit usage for SaaS metering.
 * 
 * Auth: User session or CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAdGenerationContext } from '@/lib/create/kb-retriever'
import crypto from 'crypto'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

// Hook types to cycle through for variety
const HOOK_TYPES = ['question', 'social_proof', 'curiosity_gap', 'direct_benefit', 'story_opening', 'bold_claim', 'pain_call', 'how_to']

export async function POST(request: NextRequest) {
  // Auth: user session or cron
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  let supabase: any
  let userId: string

  if (isCronAuth) {
    supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    userId = tokenRow?.user_id || ''
    if (!userId) return NextResponse.json({ error: 'No user found' }, { status: 400 })
  } else {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
  }

  const body = await request.json()
  const { angle, persona, hookCount = 5, includeScripts = false } = body

  if (!angle || !persona) {
    return NextResponse.json({ error: 'angle and persona required' }, { status: 400 })
  }

  try {
    // 1. Get existing hooks for dedup
    const { data: existing } = await supabase
      .from('hook_bank')
      .select('exclusion_hash')
      .eq('user_id', userId)
      .eq('angle', angle)
      .eq('persona', persona)
      .not('status', 'eq', 'retired')

    const existingHashes = new Set((existing || []).map((h: any) => h.exclusion_hash))

    // 2. Get KB context for richer prompts
    let kbContext = ''
    try {
      const { entries } = await getAdGenerationContext(8)
      const hookEntries = entries.filter(e => e.category === 'hook_library')
      if (hookEntries.length > 0) {
        kbContext = '\n\nPROVEN HOOK PATTERNS (adapt, don\'t copy):\n' +
          hookEntries.slice(0, 4).map(e => `• ${e.title}: ${(e.content || '').substring(0, 150)}`).join('\n')
      }
    } catch { /* non-fatal */ }

    // 3. Get exclusion list (existing hook texts to avoid)
    const { data: existingTexts } = await supabase
      .from('hook_bank')
      .select('hook_text')
      .eq('user_id', userId)
      .eq('angle', angle)
      .eq('persona', persona)
      .not('status', 'eq', 'retired')
      .limit(20)

    const exclusionList = (existingTexts || []).map((h: any) => h.hook_text).slice(0, 10)
    const exclusionPrompt = exclusionList.length > 0
      ? `\n\nDO NOT repeat or rephrase these existing hooks:\n${exclusionList.map((t: string) => `- "${t}"`).join('\n')}`
      : ''

    // 4. Generate hooks via Kimi K2-Turbo (best hook quality)
    const moonKey = process.env.MOONSHOT_API_KEY
    if (!moonKey) {
      return NextResponse.json({ error: 'MOONSHOT_API_KEY not configured' }, { status: 500 })
    }

    // Load product context
    const { data: product } = await supabase
      .from('product_catalog')
      .select('name, price, description, usps')
      .eq('is_active', true)
      .limit(1)
      .single()

    const productName = product?.name || 'Papers to Profits'
    const productPrice = product?.price || 1497
    const proofPoints = (product?.usps || []).join(' | ')

    const hookRes = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${moonKey}` },
      body: JSON.stringify({
        model: 'kimi-k2-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You generate hook variations for Meta ads in Taglish (Filipino-English mix). Output ONLY valid JSON. No markdown fences.'
          },
          {
            role: 'user',
            content: `Generate ${hookCount} hook variations for this Meta ad.

ANGLE: ${angle}
PERSONA: ${persona}
PRODUCT: ${productName} (₱${productPrice})
PROOF POINTS: ${proofPoints}
${kbContext}
${exclusionPrompt}

RULES:
- Each hook = max 2 sentences, Taglish, scroll-stopping
- Use these hook types (one each): ${HOOK_TYPES.slice(0, hookCount).join(', ')}
- No income guarantees
- Each hook must be UNIQUE — never repeat patterns

Return: {"hooks": [{"hook_text": "...", "hook_type": "...", "proof_points_used": ["...", "..."]}]}`
          }
        ],
        temperature: 0.8,
        max_tokens: 2048,
      }),
    })

    if (!hookRes.ok) {
      throw new Error(`Kimi error: ${hookRes.status}`)
    }

    const hookData = await hookRes.json()
    const raw = hookData.choices?.[0]?.message?.content || ''
    let hooks: any[] = []
    try {
      let cleaned = raw.trim()
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) cleaned = fence[1].trim()
      hooks = JSON.parse(cleaned).hooks || []
    } catch {
      const match = raw.match(/\{[\s\S]*"hooks"[\s\S]*\}/)
      if (match) try { hooks = JSON.parse(match[0]).hooks || [] } catch {}
    }

    // 5. Dedup and save
    let saved = 0
    for (const hook of hooks) {
      const hash = crypto.createHash('md5').update(hook.hook_text || '').digest('hex')
      if (existingHashes.has(hash)) continue

      const { error } = await supabase.from('hook_bank').insert({
        user_id: userId,
        angle,
        persona,
        hook_text: hook.hook_text,
        hook_type: hook.hook_type,
        proof_points_used: hook.proof_points_used || [],
        generated_by: 'kimi-k2-turbo',
        generated_model: 'kimi-k2-turbo-preview',
        exclusion_hash: hash,
        status: 'fresh',
      })

      if (!error) {
        saved++
        existingHashes.add(hash)
      }
    }

    // 6. Generate scripts if requested (full creative tree)
    let scriptsGenerated = 0
    if (includeScripts && saved > 0) {
      const openaiKey = process.env.OPENAI_API_KEY
      if (openaiKey) {
        for (const hook of hooks.slice(0, saved)) {
          try {
            const scriptRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'system',
                    content: 'You write 30-second UGC video ad scripts in Taglish (60% Filipino, 40% English). Return valid JSON only.'
                  },
                  {
                    role: 'user',
                    content: `Create a 5-scene video script for this hook:

HOOK: "${hook.hook_text}"
PRODUCT: ${productName} (₱${productPrice})

Structure (30 seconds total):
- Scene 1 HOOK (5s): Grab attention
- Scene 2 PROBLEM (7s): Agitate pain point  
- Scene 3 SOLUTION (8s): Present product
- Scene 4 PROOF (5s): Social proof
- Scene 5 CTA (5s): Call to action

Rules:
- Natural Taglish (Tagalog-English mix)
- On-screen text max 8 words per scene
- No income guarantees, no false scarcity

Return: {"format": "video_ugc", "total_duration_seconds": 30, "scenes": [{"scene_number": 1, "block_label": "HOOK", "duration_seconds": 5, "script_text": "...", "visual_direction": "...", "on_screen_text": "..."}, ...], "caption_draft": "...", "hashtags": ["#..."], "cta": "..."}`
                  }
                ],
                temperature: 0.7,
                max_tokens: 1500,
              }),
            })

            if (scriptRes.ok) {
              const scriptData = await scriptRes.json()
              const rawScript = scriptData.choices?.[0]?.message?.content || ''
              let script: any
              try {
                let cleaned = rawScript.trim()
                const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (fence) cleaned = fence[1].trim()
                script = JSON.parse(cleaned)
              } catch { continue }

              await supabase.from('script_bank').insert({
                user_id: userId,
                angle,
                persona,
                hook_text: hook.hook_text,
                format: 'video_ugc',
                scenes: script.scenes || [],
                caption_draft: script.caption_draft || '',
                hashtags: script.hashtags || [],
                cta: script.cta || '',
                total_duration_seconds: 30,
                generated_by: 'gpt-4o-mini',
                generated_model: 'gpt-4o-mini',
                status: 'fresh',
              })
              scriptsGenerated++
            }
          } catch { /* continue on error */ }
        }
      }
    }

    // 7. Update credit usage (if credits table exists)
    try {
      await supabase.rpc('increment_hooks_used', { p_user_id: userId, p_count: saved })
    } catch { /* credits table might not exist yet */ }

    return NextResponse.json({
      success: true,
      angle,
      persona,
      generated: hooks.length,
      saved,
      duplicates: hooks.length - saved,
      bank_total: (existing || []).length + saved,
      scripts_generated: scriptsGenerated,
      full_creative_tree: includeScripts,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Seeding failed'
    console.error('[Bank Seed] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
