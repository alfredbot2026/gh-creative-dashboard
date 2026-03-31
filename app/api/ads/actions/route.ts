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
      // Sales: compare spend-weighted ROAS trend (last 7d vs prior 7d)
      const recentSpendR = recent7.reduce((s, r) => s + r.spend, 0)
      const recentRevR = recent7.reduce((s, r) => s + r.spend * r.roas, 0)
      const olderSpendR = older7.reduce((s, r) => s + r.spend, 0)
      const olderRevR = older7.reduce((s, r) => s + r.spend * r.roas, 0)
      const recentWRoas = recentSpendR > 50 ? recentRevR / recentSpendR : null
      const olderWRoas = olderSpendR > 50 ? olderRevR / olderSpendR : null

      if (recentWRoas !== null && olderWRoas !== null && olderWRoas > 0 && recentWRoas / olderWRoas < 0.7) {
        const declinePct = Math.round((1 - recentWRoas / olderWRoas) * 100)
        actions.push({
          type: 'refresh',
          priority: 2,
          angle: ad.angle || 'unknown',
          persona: ad.persona || 'unknown',
          title: `Refresh "${ad.ad_name?.slice(0, 40)}"`,
          reason: `ROAS dropped ${declinePct}% — last 7 days: ${recentWRoas.toFixed(1)}x vs prior 7 days: ${olderWRoas.toFixed(1)}x. The creative is fatiguing. Make a new variation with the same angle but different hook or visual.`,
          metrics: { spend: Number(ad.total_spend), roas: recentWRoas },
          ad_ids: [ad.id],
          urgency: ad.ad_status === 'tired' ? 'high' : 'medium',
        })
      }
    }
  }

  // --- 3. SCALE: Winning ads with room to grow ---
  // Group by angle, find best-performing ad per angle to reference
  const angleAds = new Map<string, typeof creatives>()
  for (const c of creatives) {
    if (!c.angle) continue
    if (!angleAds.has(c.angle)) angleAds.set(c.angle, [])
    angleAds.get(c.angle)!.push(c)
  }

  for (const [angle, ads] of angleAds) {
    const winners = ads.filter(a => a.ad_status === 'winning')
    if (winners.length < 1 || ads.length >= 8) continue
    const totalSpendAngle = ads.reduce((s, a) => s + Number(a.total_spend || 0), 0)
    const totalRevAngle = ads.reduce((s, a) => s + (Number(a.avg_roas || 0) * Number(a.total_spend || 0)), 0)
    const roas = totalSpendAngle > 0 ? totalRevAngle / totalSpendAngle : 0
    if (roas < 2) continue

    // Find the best-performing ad to reference
    const bestAd = [...winners].sort((a, b) => Number(b.avg_roas || 0) - Number(a.avg_roas || 0))[0]
    const bestName = bestAd?.ad_name?.slice(0, 35) || angle.replace(/_/g, ' ')

    actions.push({
      type: 'scale',
      priority: 3,
      angle,
      persona: bestAd?.persona || 'new_mom_curious',
      title: `Make more like "${bestName}"`,
      reason: `Your ${angle.replace(/_/g, ' ')} angle is working — ${roas.toFixed(1)}x ROAS across ${ads.length} ads. "${bestName}" is the standout. Create 2-3 variations with different hooks or visuals.`,
      metrics: { spend: totalSpendAngle, roas },
      ad_ids: winners.map(w => w.id),
      urgency: 'medium',
    })
  }

  // --- 4. EXPLORE: Untested angles (especially if competitors use them) ---
  const compAngleCounts = new Map<string, number>()
  for (const c of compAds) {
    if (c.angle) compAngleCounts.set(c.angle, (compAngleCounts.get(c.angle) || 0) + 1)
  }

  const testedAngles = new Set(creatives.filter(c => c.angle && Number(c.total_spend || 0) > 0).map(c => c.angle))

  // Build angle-specific suggestions
  const ANGLE_SUGGESTIONS: Record<string, string> = {
    pain_point: 'Show the frustration of the current way (manual, expensive, unreliable) → then your solution.',
    aspiration: 'Show the dream outcome — what life looks like AFTER they buy. Lifestyle transformation.',
    fear: 'What happens if they DON\'T act? Missing out, falling behind, wasting money.',
    social_proof: 'Customer testimonials, review screenshots, "X people bought this week" proof.',
    comparison: 'Side-by-side: your product vs alternatives. Price, quality, ease of use.',
    education: 'Teach something valuable first, then naturally lead to your product as the tool.',
    urgency: 'Limited time, limited stock, seasonal relevance. Create a reason to buy NOW.',
    curiosity: 'Tease the result without revealing how. "This one trick..." pattern.',
    transformation: 'Before/after stories. Show the journey from struggle → success using your product.',
    authority: 'Expert positioning — years of experience, credentials, behind-the-scenes process.',
  }

  for (const angle of ALL_ANGLES) {
    if (testedAngles.has(angle)) continue
    const compCount = compAngleCounts.get(angle) || 0
    const suggestion = ANGLE_SUGGESTIONS[angle] || ''
    actions.push({
      type: 'explore',
      priority: compCount > 0 ? 3 : 4,
      angle,
      persona: 'new_mom_curious',
      title: `Try a ${angle.replace(/_/g, ' ')} ad`,
      reason: compCount > 0
        ? `You haven't tested this yet, but ${compCount} competitor(s) are using it. ${suggestion}`
        : `Untested angle. ${suggestion}`,
      urgency: compCount > 0 ? 'medium' : 'low',
    })
  }

  // Sort by priority, take top 5
  actions.sort((a, b) => a.priority - b.priority || (a.urgency === 'high' ? -1 : b.urgency === 'high' ? 1 : 0))
  const topActions = actions.slice(0, 5)

  // Account health summary — only count ads with actual spend
  const adsWithSpend = creatives.filter(c => Number(c.total_spend || 0) > 0)
  const activeWithSpend = adsWithSpend.filter(c => c.is_active)
  const activeCount = activeWithSpend.length
  const winningCount = activeWithSpend.filter(c => c.ad_status === 'winning').length
  const tiredCount = activeWithSpend.filter(c => c.ad_status === 'tired').length
  const deadCount = activeWithSpend.filter(c => c.ad_status === 'dead').length
  const untestedAngles = ALL_ANGLES.filter(a => !testedAngles.has(a)).length

  // Profit headline — last 7 days spend/revenue from daily data
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentPerf = perfRows.filter(r => r.date_start >= sevenDaysAgo)
  const weekSpend = recentPerf.reduce((s, r) => s + Number(r.spend || 0), 0)
  // Reconstruct revenue from daily spend × daily ROAS (conversion_value may not be synced)
  const weekRevenue = recentPerf.reduce((s, r) => {
    const cv = Number(r.conversion_value || 0)
    if (cv > 0) return s + cv
    return s + Number(r.spend || 0) * Number(r.roas || 0)
  }, 0)
  const weekConversations = recentPerf.reduce((s, r) => s + Number(r.messaging_conversations || 0), 0)

  // Also get last 30 days for context
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const monthPerf = perfRows.filter(r => r.date_start >= thirtyDaysAgo)
  const monthSpend = monthPerf.reduce((s, r) => s + Number(r.spend || 0), 0)
  const monthRevenue = monthPerf.reduce((s, r) => {
    const cv = Number(r.conversion_value || 0)
    if (cv > 0) return s + cv
    return s + Number(r.spend || 0) * Number(r.roas || 0)
  }, 0)
  const monthConversations = monthPerf.reduce((s, r) => s + Number(r.messaging_conversations || 0), 0)

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
    money: {
      week: { spend: Math.round(weekSpend), revenue: Math.round(weekRevenue), conversations: weekConversations },
      month: { spend: Math.round(monthSpend), revenue: Math.round(monthRevenue), conversations: monthConversations },
    },
  })
}
