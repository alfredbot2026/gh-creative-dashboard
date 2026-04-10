import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type LearningRow = {
  ad_creative_id: string | null
  extraction_confidence: number | null
  actual_performance?: Record<string, unknown> | null
}

type PerfRow = {
  spend: number | null
  roas: number | null
  date_start: string | null
}

function weightedRoas(rows: PerfRow[]) {
  const spend = rows.reduce((sum, row) => sum + Number(row.spend || 0), 0)
  if (spend <= 0) return { roas: 0, spend: 0 }
  const revenue = rows.reduce((sum, row) => sum + (Number(row.spend || 0) * Number(row.roas || 0)), 0)
  return { roas: revenue / spend, spend }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { creative_ids?: string[] }
  const creativeIds = Array.isArray(body.creative_ids) ? body.creative_ids.filter(Boolean) : []

  let learningQuery = supabase
    .from('creative_learnings')
    .select('ad_creative_id, extraction_confidence, actual_performance')
    .eq('user_id', user.id)
    .not('ad_creative_id', 'is', null)

  if (creativeIds.length > 0) learningQuery = learningQuery.in('ad_creative_id', creativeIds)

  const { data: learnings, error } = await learningQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updatedCount = 0
  let boostedCount = 0
  let reducedCount = 0

  for (const learning of (learnings || []) as LearningRow[]) {
    if (!learning.ad_creative_id) continue

    const { data: creative, error: creativeError } = await supabase
      .from('ad_creatives')
      .select('meta_ad_id, ad_status')
      .eq('user_id', user.id)
      .eq('id', learning.ad_creative_id)
      .single<{ meta_ad_id: string | null; ad_status: string | null }>()

    if (creativeError || !creative?.meta_ad_id) continue

    const { data: perfRows, error: perfError } = await supabase
      .from('ad_performance')
      .select('spend, roas, date_start')
      .eq('user_id', user.id)
      .eq('meta_ad_id', creative.meta_ad_id)
      .gte('date_start', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order('date_start', { ascending: true })

    if (perfError || !perfRows || perfRows.length === 0) continue

    const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recent = (perfRows as PerfRow[]).filter(row => row.date_start && new Date(row.date_start) >= recentCutoff)
    const prior = (perfRows as PerfRow[]).filter(row => row.date_start && new Date(row.date_start) < recentCutoff)

    const totalSpend = perfRows.reduce((sum, row) => sum + Number(row.spend || 0), 0)
    const sampleDays = perfRows.filter(row => row.date_start).length
    if (sampleDays < 7 || totalSpend < 1000) continue

    const recentStats = weightedRoas(recent)
    const priorStats = weightedRoas(prior)
    const ratio = priorStats.roas > 0 ? recentStats.roas / priorStats.roas : 1
    const trend = ratio > 1.1 ? 'rising' : ratio < 0.9 ? 'declining' : 'stable'

    let nextConfidence = Number(learning.extraction_confidence || 0.5)
    if (totalSpend >= 1000 && sampleDays >= 7 && recentStats.roas > 0) {
      nextConfidence = 0.9
      boostedCount += nextConfidence > Number(learning.extraction_confidence || 0) ? 1 : 0
    } else {
      nextConfidence = 0.4
      reducedCount += nextConfidence < Number(learning.extraction_confidence || 1) ? 1 : 0
    }

    const { error: updateError } = await supabase
      .from('creative_learnings')
      .update({
        extraction_confidence: nextConfidence,
        actual_performance: {
          recent_roas: Number(recentStats.roas.toFixed(4)),
          prior_roas: Number(priorStats.roas.toFixed(4)),
          trend,
          sample_days: sampleDays,
          spend: Number(totalSpend.toFixed(2)),
          ad_status: creative.ad_status,
        },
      })
      .eq('user_id', user.id)
      .eq('ad_creative_id', learning.ad_creative_id)

    if (!updateError) updatedCount += 1
  }

  return NextResponse.json({ updated_count: updatedCount, boosted_count: boostedCount, reduced_count: reducedCount })
}
