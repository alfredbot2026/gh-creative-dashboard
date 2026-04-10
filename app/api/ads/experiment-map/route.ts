import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExperimentCells, buildExperimentMapResponse, type CompetitiveAngleRow, type CreativeLearningRow, type ExperimentCreativeRow } from '@/lib/ads/experiment-map'

export const dynamic = 'force-dynamic'

async function getCompetitorAngles(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const collected: string[] = []

  const { data: competitorAds } = await supabase.from('competitor_ads').select('angle').eq('user_id', userId)
  for (const row of competitorAds || []) {
    if (row.angle) collected.push(row.angle)
  }

  const { data: intelligence } = await supabase.from('competitive_intelligence').select('angle, classification').eq('user_id', userId).limit(200)
  for (const row of (intelligence || []) as CompetitiveAngleRow[]) {
    if (row.angle) collected.push(row.angle)
    else {
      const hook = typeof row.classification?.hook_type === 'string' ? row.classification.hook_type : null
      if (hook) collected.push(hook)
    }
  }

  return collected
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existingCells } = await supabase
    .from('experiment_cells')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const latestUpdatedAt = existingCells?.[0]?.updated_at ? new Date(existingCells[0].updated_at).getTime() : 0
  const stale = !latestUpdatedAt || (Date.now() - latestUpdatedAt) > 24 * 60 * 60 * 1000

  if (!existingCells?.length || stale) {
    const [{ data: creatives, error: creativesError }, { data: learnings }] = await Promise.all([
      supabase.from('ad_creatives').select('id, user_id, meta_ad_id, angle, persona, ad_status, is_active, total_spend, avg_roas, avg_cpa, avg_ctr, creative_format, body_text, headline, cta_text, link_description, hook_type, emotional_tone, frame_descriptions, ad_name, first_active_date, last_active_date, classified_at').eq('user_id', user.id),
      supabase.from('creative_learnings').select('ad_creative_id, hook_family, format, inferred_mechanism').eq('user_id', user.id),
    ])

    if (creativesError) return NextResponse.json({ error: creativesError.message }, { status: 500 })
    const competitorAngles = await getCompetitorAngles(supabase, user.id)
    const rebuilt = buildExperimentCells({
      userId: user.id,
      creatives: (creatives || []) as ExperimentCreativeRow[],
      competitorAngles,
      existingLearnings: (learnings || []) as CreativeLearningRow[],
    })

    await supabase.from('experiment_cells').delete().eq('user_id', user.id)
    if (rebuilt.length) {
      const { error: upsertError } = await supabase.from('experiment_cells').upsert(rebuilt, { onConflict: 'user_id,angle,persona,format,hook_family' })
      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json(buildExperimentMapResponse(rebuilt.map(cell => ({ ...cell, updated_at: new Date().toISOString() }))))
  }

  return NextResponse.json(buildExperimentMapResponse(existingCells as any[]))
}
