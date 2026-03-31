/**
 * GET /api/ads/actions — Media Buyer Brain recommendations
 * 
 * Computes top 5 recommended actions based on:
 * - Ad performance (what's winning, fatiguing, dead)
 * - Strategy map gaps (untested angle × persona combos)
 * - Competitor signals (angles they use that we don't)
 * - Business thresholds (dynamic from product_catalog)
 * 
 * Returns plain-language action cards for the /ads Overview tab.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadBusinessContext, getThresholds } from '@/lib/ads/business-context'

export const dynamic = 'force-dynamic'

interface Action {
  type: 'explore' | 'scale' | 'refresh' | 'kill'
  priority: number
  angle: string
  persona: string
  title: string
  reason: string
  metrics?: { spend?: number; roas?: number; cpa?: number; cost_per_conv?: number; days_active?: number }
  ad_ids?: string[]
  urgency: 'high' | 'medium' | 'low'
}

const ALL_ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
const MAIN_PERSONAS = ['new_mom_curious', 'beginner', 'price_sensitive', 'aspirational', 'skeptic']

function formatPeso(n: number) { return '₱' + Math.round(n).toLocaleString() }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load all data in parallel
  const [creativesRes, perfRes, compRes, bizCtx] = await Promise.all([
    supabase.from('ad_creatives').select('id, meta_ad_id, angle, persona, ad_status, is_active, total_spend, avg_roas, avg_cpa, first_active_date, last_active_date, ad_name, campaign_name, campaign_objective, optimization_goal').eq('user_id', user.id),
    supabase.from('ad_performance').select('meta_ad_id, date_start, spend, conversion_value, conversions, roas, messaging_conversations').eq('user_id', user.id),
    supabase.from('competitor_ads').select('angle').eq('user_id', user.id).eq('is_active', true),
    loadBusinessContext(supabase, user.id),
  ])

  const creatives = creativesRes.data || []
  const perfRows = perfRes.data || []
  const compAds = compRes.data || []
  const thresholds = getThresholds(bizCtx)
  const actions: Action[] = []

  // Build per-ad daily metrics for fatigue detection
  // Separate tracking for sales (ROAS) vs engagement (cost/conv) campaigns
  type DailyRow = { date: string; spend: number; revenue: number; roas: number; conversations: number }
  const adDailyMap = new Map<string, DailyRow[]>()
  for (const r of perfRows) {
    if (!adDailyMap.has(r.meta_ad_id)) adDailyMap.set(r.meta_ad_id, [])
    adDailyMap.get(r.meta_ad_id)!.push({
      date: r.date_start,
      spend: Number(r.spend || 0),
      revenue: Number(r.conversion_value || 0),
      roas: Number(r.roas || 0),
      conversations: Number(r.messaging_conversations || 0),
    })
  }

  const isEngagement = (ad: any) => {
    const obj = ad.campaign_objective || ''
    return obj === 'OUTCOME_ENGAGEMENT' || obj === 'MESSAGES' || ad.optimization_goal === 'CONVERSATIONS'
  }
  const isAwareness = (ad: any) => (ad.campaign_objective || '') === 'OUTCOME_AWARENESS'

  // --- 1. KILL: Active ads that are confirmed dead by their own objective's metric ---
  const deadActive = creatives.filter(c => c.is_active && c.ad_status === 'dead' && Number(c.total_spend || 0) > 500)
  for (const ad of deadActive.slice(0, 2)) {
    // Don't flag engagement/awareness ads as "losing money" via ROAS
    if (isEngagement(ad) || isAwareness(ad)) continue

    actions.push({
      type: 'kill',
      priority: 1,
      angle: ad.angle || 'unknown',
      persona: ad.persona || 'unknown',
      title: `Stop "${ad.ad_name?.slice(0, 40)}"`,
      reason: `Sales campaign. Spent ${formatPeso(Number(ad.total_spend))} with ${ad.avg_roas ? ad.avg_roas.toFixed(1) + 'x' : 'below 1.0x'} ROAS. Below breakeven.`,
      metrics: { spend: Number(ad.total_spend), roas: Number(ad.avg_roas || 0) },
      ad_ids: [ad.id],
      urgency: 'high',
    })
  }

  // --- 2. REFRESH: Winning ads that are fatiguing ---
  const winningActive = creatives.filter(c => c.is_active && (c.ad_status === 'winning' || c.ad_status === 'tired'))
  for (const ad of winningActive) {
    const daily = adDailyMap.get(ad.meta_ad_id) || []
    if (daily.length < 14) continue

    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
    const recent7 = sorted.slice(-7)
    const older7 = sorted.slice(-14, -7)
    const recentSpend = recent7.reduce((s, r) => s + r.spend, 1)
    const olderSpend = older7.reduce((s, r) => s + r.spend, 1)

    if (isEngagement(ad)) {
      // Engagement: compare cost per conversation (lower is better, rising is bad)
      const recentConvs = recent7.reduce((s, r) => s + r.conversations, 0)
      const olderConvs = older7.reduce((s, r) => s + r.conversations, 0)
      const recentCPC = recentConvs > 0 ? recentSpend / recentConvs : null
      const olderCPC = olderConvs > 0 ? olderSpend / olderConvs : null

      if (recentCPC && olderCPC && recentCPC / olderCPC > 1.5) {
        const risePct = Math.round((recentCPC / olderCPC - 1) * 100)
        actions.push({
          type: 'refresh',
          priority: 2,
          angle: ad.angle || 'unknown',
          persona: ad.persona || 'unknown',
          title: `Refresh "${ad.ad_name?.slice(0, 40)}"`,
          reason: `Engagement campaign. Cost per conversation rose ${risePct}% (${formatPeso(olderCPC)}/conv → ${formatPeso(recentCPC)}/conv). Audience is fatiguing.`,
          metrics: { spend: Number(ad.total_spend), cost_per_conv: recentCPC },
          ad_ids: [ad.id],
          urgency: 'medium',
        })
      }
    } else {
      // Sales: compare ROAS trend (use meta-reported roas per day)
      const recentRoas = recent7.filter(r => r.roas > 0)
      const olderRoas = older7.filter(r => r.roas > 0)
      const recentAvg = recentRoas.length > 0 ? recentRoas.reduce((s, r) => s + r.roas, 0) / recentRoas.length : null
      const olderAvg = olderRoas.length > 0 ? olderRoas.reduce((s, r) => s + r.roas, 0) / olderRoas.length : null

      if (recentAvg && olderAvg && recentAvg / olderAvg < 0.7) {
        const declinePct = Math.round((1 - recentAvg / olderAvg) * 100)
        actions.push({
          type: 'refresh',
          priority: 2,
          angle: ad.angle || 'unknown',
          persona: ad.persona || 'unknown',
          title: `Refresh "${ad.ad_name?.slice(0, 40)}"`,
          reason: `ROAS dropped ${declinePct}% in the last 7 days (${olderAvg.toFixed(1)}x → ${recentAvg.toFixed(1)}x). Creative is fatiguing.`,
          metrics: { spend: Number(ad.total_spend), roas: recentAvg },
          ad_ids: [ad.id],
          urgency: ad.ad_status === 'tired' ? 'high' : 'medium',
        })
      }
    }
  }

  // --- 3. SCALE: Winning angles with room to grow ---
  const anglePerf = new Map<string, { spend: number; revenue: number; count: number; winners: number }>()
  for (const c of creatives) {
    if (!c.angle) continue
    const existing = anglePerf.get(c.angle) || { spend: 0, revenue: 0, count: 0, winners: 0 }
    existing.count++
    existing.spend += Number(c.total_spend || 0)
    if (c.avg_roas && Number(c.total_spend || 0) > 0) {
      existing.revenue += Number(c.avg_roas) * Number(c.total_spend)
    }
    if (c.ad_status === 'winning') existing.winners++
    anglePerf.set(c.angle, existing)
  }

  for (const [angle, data] of anglePerf) {
    if (data.winners < 1 || data.count >= 8) continue
    const roas = data.spend > 0 ? data.revenue / data.spend : 0
    if (roas >= 2) {
      actions.push({
        type: 'scale',
        priority: 3,
        angle,
        persona: 'new_mom_curious', // Default — most tested persona
        title: `Scale ${angle.replace(/_/g, ' ')} ads`,
        reason: `${data.winners} winner(s) at ${roas.toFixed(1)}x ROAS with only ${data.count} ads. Room for more creative variations.`,
        metrics: { spend: data.spend, roas },
        urgency: 'medium',
      })
    }
  }

  // --- 4. EXPLORE: Untested angles (especially if competitors use them) ---
  const compAngleCounts = new Map<string, number>()
  for (const c of compAds) {
    if (c.angle) compAngleCounts.set(c.angle, (compAngleCounts.get(c.angle) || 0) + 1)
  }

  const testedAngles = new Set(creatives.filter(c => c.angle && Number(c.total_spend || 0) > 0).map(c => c.angle))

  for (const angle of ALL_ANGLES) {
    if (testedAngles.has(angle)) continue
    const compCount = compAngleCounts.get(angle) || 0
    actions.push({
      type: 'explore',
      priority: compCount > 0 ? 3 : 4,
      angle,
      persona: 'new_mom_curious',
      title: `Test ${angle.replace(/_/g, ' ')} ads`,
      reason: compCount > 0
        ? `Never tested. ${compCount} competitor(s) use this angle — opportunity to compete.`
        : `Never tested. Could uncover a new winning angle.`,
      urgency: compCount > 0 ? 'medium' : 'low',
    })
  }

  // Sort by priority, take top 5
  actions.sort((a, b) => a.priority - b.priority || (a.urgency === 'high' ? -1 : b.urgency === 'high' ? 1 : 0))
  const topActions = actions.slice(0, 5)

  // Account health summary
  const totalSpend = creatives.reduce((s, c) => s + Number(c.total_spend || 0), 0)
  const activeCount = creatives.filter(c => c.is_active).length
  const winningCount = creatives.filter(c => c.ad_status === 'winning').length
  const tiredCount = creatives.filter(c => c.ad_status === 'tired').length
  const deadCount = creatives.filter(c => c.ad_status === 'dead' && c.is_active).length
  const untestedAngles = ALL_ANGLES.filter(a => !testedAngles.has(a)).length

  return NextResponse.json({
    actions: topActions,
    health: {
      active_ads: activeCount,
      winning: winningCount,
      tired: tiredCount,
      dead_active: deadCount,
      untested_angles: untestedAngles,
      total_angles: ALL_ANGLES.length,
      coverage_pct: Math.round(((ALL_ANGLES.length - untestedAngles) / ALL_ANGLES.length) * 100),
    },
  })
}
