import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCellDetail, buildExperimentCells, type CreativeLearningRow, type ExperimentCreativeRow } from '@/lib/ads/experiment-map'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const angle = searchParams.get('angle')
  const persona = searchParams.get('persona')
  const format = searchParams.get('format')
  const hookFamily = searchParams.get('hook_family')

  if (!angle || !persona) {
    return NextResponse.json({ error: 'angle and persona are required' }, { status: 400 })
  }

  const [{ data: cells }, { data: creatives, error: creativesError }, { data: learnings }] = await Promise.all([
    supabase.from('experiment_cells').select('*').eq('user_id', user.id),
    supabase.from('ad_creatives').select('id, user_id, meta_ad_id, angle, persona, ad_status, is_active, total_spend, avg_roas, avg_cpa, avg_ctr, creative_format, body_text, headline, cta_text, link_description, hook_type, emotional_tone, frame_descriptions, ad_name, first_active_date, last_active_date, classified_at').eq('user_id', user.id),
    supabase.from('creative_learnings').select('ad_creative_id, hook_family, format, inferred_mechanism').eq('user_id', user.id),
  ])

  if (creativesError) return NextResponse.json({ error: creativesError.message }, { status: 500 })

  const usableCells = cells?.length
    ? cells
    : buildExperimentCells({ userId: user.id, creatives: (creatives || []) as ExperimentCreativeRow[], existingLearnings: (learnings || []) as CreativeLearningRow[] })

  const detail = buildCellDetail({
    cells: usableCells as any[],
    creatives: (creatives || []) as ExperimentCreativeRow[],
    learnings: (learnings || []) as CreativeLearningRow[],
    angle,
    persona,
    format,
    hookFamily,
  })

  if (!detail) return NextResponse.json({ error: 'Cell not found' }, { status: 404 })
  return NextResponse.json(detail)
}
