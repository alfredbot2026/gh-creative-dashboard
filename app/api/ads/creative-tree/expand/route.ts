/**
 * POST /api/ads/creative-tree/expand — Step 3: Expand a single hook into format executions
 * Called per-hook so UI can show results as they come in.
 * Static/carousel: ~5s. Video: ~60-120s (KB pipeline).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { expandToFormats } from '@/lib/ads/creative-engine'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { hook_id, concept_id, formats } = await request.json()
  if (!hook_id || !concept_id) {
    return NextResponse.json({ error: 'hook_id and concept_id required' }, { status: 400 })
  }

  try {
    // Load concept brief + hook from DB
    const [conceptRes, hookRes] = await Promise.all([
      supabase.from('creative_concepts').select('concept_brief').eq('id', concept_id).eq('user_id', user.id).single(),
      supabase.from('creative_hooks').select('hook_text, hook_type, proof_points_used').eq('id', hook_id).eq('user_id', user.id).single(),
    ])

    if (!conceptRes.data?.concept_brief) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }
    if (!hookRes.data) {
      return NextResponse.json({ error: 'Hook not found' }, { status: 404 })
    }

    const brief = conceptRes.data.concept_brief as any
    const hook = hookRes.data as any

    // Expand hook into format executions
    const executions = await expandToFormats(brief, hook, formats || ['static_image', 'carousel'])

    // Save executions to DB
    const savedExecs = []
    for (const exec of executions) {
      const { data: saved } = await supabase
        .from('creative_executions')
        .insert({
          hook_id,
          concept_id,
          user_id: user.id,
          format: exec.format,
          content: exec.content,
          status: 'draft',
          llm_provider: exec.llm_provider || null,
          llm_model: exec.llm_model || null,
        })
        .select('id, format, content, status')
        .single()

      if (saved) savedExecs.push(saved)
    }

    return NextResponse.json({ success: true, hook_id, executions: savedExecs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Format expansion failed'
    console.error('[Creative Expand] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
