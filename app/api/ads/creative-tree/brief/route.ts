/**
 * POST /api/ads/creative-tree/brief — Step 1: Generate concept brief only (~3-5s)
 * Returns the brief immediately so UI can show it while hooks generate.
 * Also saves the concept to DB.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateConceptBrief } from '@/lib/ads/creative-engine'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { angle, persona, mode } = await request.json()
  if (!angle || !persona) {
    return NextResponse.json({ error: 'angle and persona required' }, { status: 400 })
  }

  try {
    const brief = await generateConceptBrief(angle, persona, user.id, mode || 'explore')

    // Save concept to DB
    const { data: concept, error: conceptErr } = await supabase
      .from('creative_concepts')
      .upsert({
        user_id: user.id,
        angle,
        persona,
        core_message: brief.core_message,
        concept_brief: brief as unknown as Record<string, unknown>,
        mode: mode || 'explore',
        status: 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, angle, persona, core_message' })
      .select('id')
      .single()

    if (conceptErr || !concept) {
      throw new Error('Failed to save concept: ' + (conceptErr?.message || 'unknown'))
    }

    return NextResponse.json({ success: true, concept_id: concept.id, brief })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Brief generation failed'
    console.error('[Creative Brief] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
