/**
 * GET /api/ads/metrics
 * 
 * Media buyer metrics computed from daily ad_performance data.
 * Proper aggregation: ROAS = total_revenue / total_spend (not avg of daily ROAS).
 * 
 * Query params:
 *   period: 7 | 14 | 30 | 90 | lifetime (default: 7)
 *   compare: true (include previous period for trend)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface DailyRow {
  meta_ad_id: string
  date_start: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  conversion_value: number
  reach: number | null
  frequency: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  video_views_p25: number
  video_views_p50: number
  video_views_p75: number
  video_views_p100: number
}

interface AdMetrics {
  meta_ad_id: string
  // Aggregated from daily data
  spend: number
  impressions: number
  clicks: number
  purchases: number
  revenue: number
  reach: number
  // Computed
  roas: number | null        // revenue / spend
  cpa: number | null         // spend / purchases
  ctr: number                // (clicks / impressions) * 100
  cpc: number | null         // spend / clicks
  cpm: number | null         // (spend / impressions) * 1000
  frequency: number | null   // impressions / reach
  // Video
  hook_rate: number | null   // p25 / impressions (3s view rate)
  hold_rate: number | null   // p100 / p25 (completion rate)
  video_views: number
  // Trend (vs previous period, null if no compare)
  roas_prev: number | null
  spend_prev: number | null
  roas_trend: 'rising' | 'stable' | 'declining' | null
}

function computeMetrics(rows: DailyRow[]): Omit<AdMetrics, 'meta_ad_id' | 'roas_prev' | 'spend_prev' | 'roas_trend'> {
  const spend = rows.reduce((s, r) => s + (r.spend || 0), 0)
  const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0)
  const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0)
  const purchases = rows.reduce((s, r) => s + (r.conversions || 0), 0)
  const revenue = rows.reduce((s, r) => s + (r.conversion_value || 0), 0)
  const reach = rows.reduce((s, r) => s + (r.reach || 0), 0)
  const p25 = rows.reduce((s, r) => s + (r.video_views_p25 || 0), 0)
  const p100 = rows.reduce((s, r) => s + (r.video_views_p100 || 0), 0)
  const videoViews = rows.reduce((s, r) => s + (r.video_views_p25 || 0), 0)

  return {
    spend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    purchases,
    revenue: Math.round(revenue * 100) / 100,
    reach,
    roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null,
    cpa: purchases > 0 ? Math.round((spend / purchases) * 100) / 100 : null,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : null,
    cpm: impressions > 0 ? Math.round((spend / impressions) * 100000) / 100 : null,
    frequency: reach > 0 ? Math.round((impressions / reach) * 100) / 100 : null,
    hook_rate: impressions > 0 && p25 > 0 ? Math.round((p25 / impressions) * 10000) / 100 : null,
    hold_rate: p25 > 0 && p100 > 0 ? Math.round((p100 / p25) * 10000) / 100 : null,
    video_views: videoViews,
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  let userId: string

  if (isCronAuth) {
    supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    userId = tokenRow?.user_id || ''
    if (!userId) return NextResponse.json({ error: 'No user' }, { status: 400 })
  } else {
    supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
  }

  const params = request.nextUrl.searchParams
  const period = parseInt(params.get('period') || '7', 10)
  const compare = params.get('compare') === 'true'
  const validPeriods = [7, 14, 30, 90]
  const isLifetime = params.get('period') === 'lifetime'

  // Date calculations
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  let sinceDate: string
  if (isLifetime) {
    sinceDate = '2020-01-01' // far enough back
  } else {
    const p = validPeriods.includes(period) ? period : 7
    const since = new Date(now.getTime() - p * 24 * 60 * 60 * 1000)
    sinceDate = since.toISOString().split('T')[0]
  }

  // Fetch current period daily data
  let query = supabase
    .from('ad_performance')
    .select('meta_ad_id, date_start, spend, impressions, clicks, conversions, conversion_value, reach, frequency, ctr, cpc, cpm, video_views_p25, video_views_p50, video_views_p75, video_views_p100')
    .eq('user_id', userId)
    .gte('date_start', sinceDate)
    .lte('date_start', today)

  const { data: currentRows, error: fetchErr } = await query
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Fetch previous period (for trend comparison)
  let prevRowsByAd: Map<string, DailyRow[]> | null = null
  if (compare && !isLifetime) {
    const p = validPeriods.includes(period) ? period : 7
    const prevEnd = new Date(now.getTime() - p * 24 * 60 * 60 * 1000)
    const prevStart = new Date(prevEnd.getTime() - p * 24 * 60 * 60 * 1000)
    const { data: prevRows } = await supabase
      .from('ad_performance')
      .select('meta_ad_id, date_start, spend, impressions, clicks, conversions, conversion_value, reach, frequency, ctr, cpc, cpm, video_views_p25, video_views_p50, video_views_p75, video_views_p100')
      .eq('user_id', userId)
      .gte('date_start', prevStart.toISOString().split('T')[0])
      .lt('date_start', prevEnd.toISOString().split('T')[0])

    if (prevRows) {
      prevRowsByAd = new Map()
      for (const r of prevRows as DailyRow[]) {
        if (!prevRowsByAd.has(r.meta_ad_id)) prevRowsByAd.set(r.meta_ad_id, [])
        prevRowsByAd.get(r.meta_ad_id)!.push(r)
      }
    }
  }

  // Group current by ad
  const byAd = new Map<string, DailyRow[]>()
  for (const r of (currentRows || []) as DailyRow[]) {
    if (!byAd.has(r.meta_ad_id)) byAd.set(r.meta_ad_id, [])
    byAd.get(r.meta_ad_id)!.push(r)
  }

  // Compute per-ad metrics
  const adMetrics: AdMetrics[] = []
  for (const [adId, rows] of byAd) {
    const m = computeMetrics(rows)

    let roas_prev: number | null = null
    let spend_prev: number | null = null
    let roas_trend: AdMetrics['roas_trend'] = null

    if (prevRowsByAd) {
      const prevRows = prevRowsByAd.get(adId)
      if (prevRows?.length) {
        const pm = computeMetrics(prevRows)
        roas_prev = pm.roas
        spend_prev = pm.spend
        if (m.roas !== null && pm.roas !== null && pm.roas > 0) {
          const ratio = m.roas / pm.roas
          roas_trend = ratio > 1.15 ? 'rising' : ratio < 0.85 ? 'declining' : 'stable'
        }
      }
    }

    adMetrics.push({ meta_ad_id: adId, ...m, roas_prev, spend_prev, roas_trend })
  }

  // Account-level summary
  const allRows = currentRows as DailyRow[] || []
  const accountMetrics = computeMetrics(allRows)

  return NextResponse.json({
    period: isLifetime ? 'lifetime' : period,
    date_range: { since: sinceDate, until: today },
    account: accountMetrics,
    ads: adMetrics,
  })
}
