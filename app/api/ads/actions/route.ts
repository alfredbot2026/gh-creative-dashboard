/**
 * GET /api/ads/actions — /ads command-center data
 *
 * Returns:
 * - legacy action cards
 * - account health + money summary
 * - richer context blocks for winners, fading, dead, and opportunities
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

interface CreativeRow {
  id: string
  meta_ad_id: string
  angle: string | null
  persona: string | null
  ad_status: string | null
  is_active: boolean | null
  total_spend: number | null
  avg_roas: number | null
  avg_cpa: number | null
  avg_ctr: number | null
  first_active_date: string | null
  last_active_date: string | null
  ad_name: string | null
  campaign_name: string | null
  campaign_objective: string | null
  optimization_goal: string | null
  creative_format: string | null
  body_text: string | null
  headline: string | null
  hook_type: string | null
  emotional_tone: string | null
  cta_text: string | null
  classification_confidence: number | null
}

const ALL_ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
const MAIN_PERSONAS = ['new_mom_curious', 'beginner', 'price_sensitive', 'aspirational', 'skeptic']

function formatPeso(n: number) {
  return '₱' + Math.round(n).toLocaleString()
}

function firstLine(text?: string | null) {
  return (text || '').split('\n').map(s => s.trim()).find(Boolean) || ''
}

function truncate(text: string, max = 60) {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text
}

function formatLabel(value?: string | null) {
  if (!value) return 'unknown'
  return value.replace(/_/g, ' ')
}

function getConfidence(ad: CreativeRow): 'high' | 'medium' | 'low' {
  const spend = Number(ad.total_spend || 0)
  const cls = Number(ad.classification_confidence || 0)
  if (spend >= 5000 || cls >= 0.85) return 'high'
  if (spend >= 1000 || cls >= 0.65) return 'medium'
  return 'low'
}

function inferCtaPattern(cta?: string | null) {
  const value = (cta || '').trim().toLowerCase()
  if (!value) return 'generic_cta'
  if (/(comment|dm|message|inbox)/.test(value)) return 'comment_how'
  if (/(learn more|shop now|buy now|sign up|download|get offer)/.test(value)) return 'link_click'
  if (/(send message|message now)/.test(value)) return 'message_start'
  if (/(book|reserve|apply)/.test(value)) return 'intent_capture'
  return 'generic_cta'
}

function inferWhyItWorks(ad: CreativeRow) {
  if (!ad.angle || !ad.persona || !ad.hook_type || !ad.emotional_tone) {
    return 'Strong performance but pattern not yet fully analyzed'
  }

  return `${formatLabel(ad.hook_type)} hook + ${formatLabel(ad.angle)} angle + ${formatLabel(ad.emotional_tone)} tone resonates with ${formatLabel(ad.persona)}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [creativesRes, perfRes, compRes, bizCtx] = await Promise.all([
    supabase
      .from('ad_creatives')
      .select('id, meta_ad_id, angle, persona, ad_status, is_active, total_spend, avg_roas, avg_cpa, avg_ctr, first_active_date, last_active_date, ad_name, campaign_name, campaign_objective, optimization_goal, creative_format, body_text, headline, hook_type, emotional_tone, cta_text, classification_confidence')
      .eq('user_id', user.id),
    supabase
      .from('ad_performance')
      .select('meta_ad_id, date_start, spend, conversion_value, conversions, roas, messaging_conversations')
      .eq('user_id', user.id),
    supabase
      .from('competitor_ads')
      .select('angle')
      .eq('user_id', user.id)
      .eq('is_active', true),
    loadBusinessContext(supabase, user.id),
  ])

  const creatives = (creativesRes.data || []) as CreativeRow[]
  const perfRows = perfRes.data || []
  const compAds = compRes.data || []
  const thresholds = getThresholds(bizCtx)
  const actions: Action[] = []

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

  const isEngagement = (ad: CreativeRow) => {
    const obj = ad.campaign_objective || ''
    return obj === 'OUTCOME_ENGAGEMENT' || obj === 'MESSAGES' || ad.optimization_goal === 'CONVERSATIONS'
  }
  const isAwareness = (ad: CreativeRow) => (ad.campaign_objective || '') === 'OUTCOME_AWARENESS'

  const anglePersonaMap = new Map<string, CreativeRow[]>()
  for (const creative of creatives) {
    if (!creative.angle || !creative.persona) continue
    const key = `${creative.angle}::${creative.persona}`
    if (!anglePersonaMap.has(key)) anglePersonaMap.set(key, [])
    anglePersonaMap.get(key)!.push(creative)
  }

  // Legacy actions for any older UI consumers
  const deadActive = creatives.filter(c => c.is_active && c.ad_status === 'dead' && Number(c.total_spend || 0) > 500)
  for (const ad of deadActive.slice(0, 2)) {
    if (isEngagement(ad) || isAwareness(ad)) continue
    actions.push({
      type: 'kill',
      priority: 1,
      angle: ad.angle || 'unknown',
      persona: ad.persona || 'unknown',
      title: `Stop "${ad.ad_name?.slice(0, 40)}"`,
      reason: `Sales campaign. Spent ${formatPeso(Number(ad.total_spend || 0))} with ${ad.avg_roas ? ad.avg_roas.toFixed(1) + 'x' : 'below 1.0x'} ROAS. Below breakeven.`,
      metrics: { spend: Number(ad.total_spend || 0), roas: Number(ad.avg_roas || 0) },
      ad_ids: [ad.id],
      urgency: 'high',
    })
  }

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
          metrics: { spend: Number(ad.total_spend || 0), cost_per_conv: recentCPC },
          ad_ids: [ad.id],
          urgency: 'medium',
        })
      }
    } else {
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
          metrics: { spend: Number(ad.total_spend || 0), roas: recentWRoas },
          ad_ids: [ad.id],
          urgency: ad.ad_status === 'tired' ? 'high' : 'medium',
        })
      }
    }
  }

  const angleAds = new Map<string, CreativeRow[]>()
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

  const compAngleCounts = new Map<string, number>()
  for (const c of compAds) {
    if (c.angle) compAngleCounts.set(c.angle, (compAngleCounts.get(c.angle) || 0) + 1)
  }

  const testedAngles = new Set(creatives.filter(c => c.angle && Number(c.total_spend || 0) > 0).map(c => c.angle as string))
  const testedCells = new Set(
    creatives.filter(c => c.angle && c.persona && Number(c.total_spend || 0) > 0).map(c => `${c.angle}::${c.persona}`),
  )

  const ANGLE_SUGGESTIONS: Record<string, string> = {
    pain_point: 'Show the frustration of the current way, then your solution.',
    aspiration: 'Show the dream outcome and emotional payoff after they buy.',
    fear: 'Show what they risk if they keep delaying.',
    social_proof: 'Lead with testimonials, proof, or visible demand.',
    comparison: 'Use direct contrast against alternatives or old habits.',
    education: 'Teach first, then transition into the offer naturally.',
    urgency: 'Give them a real reason to act now.',
    curiosity: 'Open a loop that makes the next line irresistible.',
    transformation: 'Show the before/after story arc clearly.',
    authority: 'Anchor the message in expertise or process.',
  }

  for (const angle of ALL_ANGLES) {
    if (testedAngles.has(angle)) continue
    const compCount = compAngleCounts.get(angle) || 0
    actions.push({
      type: 'explore',
      priority: compCount > 0 ? 3 : 4,
      angle,
      persona: 'new_mom_curious',
      title: `Try a ${angle.replace(/_/g, ' ')} ad`,
      reason: compCount > 0 ? `You haven't tested this yet, but ${compCount} competitor(s) are using it. ${ANGLE_SUGGESTIONS[angle]}` : `Untested angle. ${ANGLE_SUGGESTIONS[angle]}`,
      urgency: compCount > 0 ? 'medium' : 'low',
    })
  }

  actions.sort((a, b) => a.priority - b.priority || (a.urgency === 'high' ? -1 : b.urgency === 'high' ? 1 : 0))
  const topActions = actions.slice(0, 5)

  const adsWithSpend = creatives.filter(c => Number(c.total_spend || 0) > 0)
  const activeWithSpend = adsWithSpend.filter(c => c.is_active)
  const activeCount = activeWithSpend.length
  const winningCount = activeWithSpend.filter(c => c.ad_status === 'winning').length
  const tiredCount = activeWithSpend.filter(c => c.ad_status === 'tired').length
  const deadCount = activeWithSpend.filter(c => c.ad_status === 'dead').length
  const untestedAngles = ALL_ANGLES.filter(a => !testedAngles.has(a)).length

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentPerf = perfRows.filter(r => r.date_start >= sevenDaysAgo)
  const weekSpend = recentPerf.reduce((s, r) => s + Number(r.spend || 0), 0)
  const weekRevenue = recentPerf.reduce((s, r) => {
    const cv = Number(r.conversion_value || 0)
    if (cv > 0) return s + cv
    return s + Number(r.spend || 0) * Number(r.roas || 0)
  }, 0)
  const weekConversations = recentPerf.reduce((s, r) => s + Number(r.messaging_conversations || 0), 0)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const monthPerf = perfRows.filter(r => r.date_start >= thirtyDaysAgo)
  const monthSpend = monthPerf.reduce((s, r) => s + Number(r.spend || 0), 0)
  const monthRevenue = monthPerf.reduce((s, r) => {
    const cv = Number(r.conversion_value || 0)
    if (cv > 0) return s + cv
    return s + Number(r.spend || 0) * Number(r.roas || 0)
  }, 0)
  const monthConversations = monthPerf.reduce((s, r) => s + Number(r.messaging_conversations || 0), 0)

  const winnersContext = creatives
    .filter(c => c.ad_status === 'winning' && Number(c.total_spend || 0) > 0)
    .sort((a, b) => Number(b.avg_roas || 0) - Number(a.avg_roas || 0))
    .slice(0, 3)
    .map(ad => ({
      ad_id: ad.id,
      ad_name: ad.ad_name || 'Untitled ad',
      angle: ad.angle || 'unknown',
      persona: ad.persona || 'unknown',
      format: ad.creative_format || 'unknown',
      hook_preview: truncate(firstLine(ad.body_text) || firstLine(ad.headline) || ad.ad_name || 'No hook preview'),
      roas: Number(ad.avg_roas || 0),
      spend: Number(ad.total_spend || 0),
      confidence: getConfidence(ad),
      why_it_works: inferWhyItWorks(ad),
      hook_family: ad.hook_type || 'unknown',
      cta_pattern: inferCtaPattern(ad.cta_text),
    }))

  const fadingCandidates = creatives
    .filter(c => c.is_active && (c.ad_status === 'tired' || c.ad_status === 'winning'))
    .map(ad => {
      const daily = adDailyMap.get(ad.meta_ad_id) || []
      if (daily.length < 14) return null
      const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
      const recent7 = sorted.slice(-7)
      const older7 = sorted.slice(-14, -7)
      const recentSpend = recent7.reduce((s, r) => s + r.spend, 0)
      const olderSpend = older7.reduce((s, r) => s + r.spend, 0)

      let trendPct = 0
      let reason = 'Performance is softening'
      if (isEngagement(ad)) {
        const recentConvs = recent7.reduce((s, r) => s + r.conversations, 0)
        const olderConvs = older7.reduce((s, r) => s + r.conversations, 0)
        const recentCost = recentConvs > 0 ? recentSpend / recentConvs : null
        const olderCost = olderConvs > 0 ? olderSpend / olderConvs : null
        if (!recentCost || !olderCost) return null
        trendPct = Math.round((recentCost / olderCost - 1) * 100)
        if (trendPct < 15) return null
        reason = `Cost per conversation rose ${trendPct}%`
      } else {
        const recentR = recentSpend > 0 ? recent7.reduce((s, r) => s + r.spend * r.roas, 0) / recentSpend : null
        const olderR = olderSpend > 0 ? older7.reduce((s, r) => s + r.spend * r.roas, 0) / olderSpend : null
        if (!recentR || !olderR || olderR <= 0) return null
        trendPct = Math.round((1 - recentR / olderR) * 100)
        if (trendPct < 15) return null
        reason = `ROAS dropped ${trendPct}% over the last two weeks`
      }

      const siblings = anglePersonaMap.get(`${ad.angle}::${ad.persona}`) || []
      const usedHookFamilies = new Set(siblings.map(s => s.hook_type).filter(Boolean) as string[])
      const newHookFamiliesToTry = ['comparison', 'curiosity_gap', 'direct_benefit', 'question', 'story_opening']
        .filter(h => !usedHookFamilies.has(h))
        .slice(0, 3)

      return {
        ad_id: ad.id,
        ad_name: ad.ad_name || 'Untitled ad',
        angle: ad.angle || 'unknown',
        reason,
        trend_pct: trendPct,
        suggested_action: ad.ad_status === 'tired' ? 'same message, fresh hook' : 'keep the core promise, change the angle entry',
        new_hook_families_to_try: newHookFamiliesToTry.length > 0 ? newHookFamiliesToTry : ['comparison', 'curiosity_gap'],
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b?.trend_pct || 0) - (a?.trend_pct || 0))
    .slice(0, 3)

  const winnerHooksByAnglePersona = new Map<string, Set<string>>()
  for (const ad of creatives.filter(c => c.ad_status === 'winning' && c.angle && c.persona && c.hook_type)) {
    const key = `${ad.angle}::${ad.persona}`
    if (!winnerHooksByAnglePersona.has(key)) winnerHooksByAnglePersona.set(key, new Set())
    winnerHooksByAnglePersona.get(key)!.add(ad.hook_type!)
  }

  const deadContext = creatives
    .filter(c => c.ad_status === 'dead' && Number(c.total_spend || 0) > 0)
    .sort((a, b) => Number(b.total_spend || 0) - Number(a.total_spend || 0))
    .slice(0, 3)
    .map(ad => {
      const cellKey = `${ad.angle}::${ad.persona}`
      const winningHooks = [...(winnerHooksByAnglePersona.get(cellKey) || new Set<string>())]
      const lowCtr = Number(ad.avg_ctr || 0) > 0 && Number(ad.avg_ctr || 0) < 1
      const highCpa = Number(ad.avg_cpa || 0) > thresholds.breakevenCPA
      const repeatedWinnerHook = !!ad.hook_type && winningHooks.includes(ad.hook_type)

      let primaryMistake = 'pattern unclear'
      if (repeatedWinnerHook) primaryMistake = 'likely overused angle'
      else if (lowCtr) primaryMistake = 'weak hook'
      else if (highCpa) primaryMistake = 'mismatched offer'

      const siblings = anglePersonaMap.get(cellKey) || []
      const usedHooks = new Set(siblings.map(s => s.hook_type).filter(Boolean) as string[])
      const alternatives = ['comparison', 'curiosity_gap', 'story_opening', 'direct_benefit', 'how_to']
        .filter(h => !usedHooks.has(h))
        .slice(0, 3)

      return {
        ad_id: ad.id,
        ad_name: ad.ad_name || 'Untitled ad',
        angle: ad.angle || 'unknown',
        total_spend: Number(ad.total_spend || 0),
        roas: Number(ad.avg_roas || 0),
        primary_mistake: primaryMistake,
        avoid_this: repeatedWinnerHook && ad.hook_type ? [ad.hook_type] : lowCtr && ad.hook_type ? [ad.hook_type] : ['same framing'],
        try_this_instead: alternatives.length > 0 ? alternatives : ['comparison', 'story_opening'],
      }
    })

  const opportunitiesPool = ALL_ANGLES.flatMap(angle =>
    MAIN_PERSONAS.map(persona => {
      const key = `${angle}::${persona}`
      const testedInCell = testedCells.has(key)
      const cellAds = anglePersonaMap.get(key) || []
      const competitorSignal = compAngleCounts.get(angle) || 0
      const whyHere = !testedInCell ? 'never tested' : cellAds.length === 1 ? 'tested once but inconclusive' : ''
      if (!whyHere) return null

      const usedFormats = new Set(cellAds.map(a => a.creative_format).filter(Boolean) as string[])
      const suggestedApproach = usedFormats.has('video')
        ? 'try a static direct-benefit concept first'
        : 'start with a video curiosity or comparison hook'

      const score = (!testedInCell ? 3 : 1) + Math.min(competitorSignal, 3)
      const priority: 'high' | 'medium' | 'low' = score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'

      return {
        angle,
        persona,
        why_here: whyHere,
        competitor_signal: competitorSignal,
        suggested_approach: suggestedApproach,
        estimated_variants: !testedInCell ? 3 : 2,
        priority,
        _score: score,
      }
    }),
  )
    .filter(Boolean)
    .sort((a, b) => (b?._score || 0) - (a?._score || 0))
    .slice(0, 3)
    .map(item => ({
      angle: item!.angle,
      persona: item!.persona,
      why_here: item!.why_here,
      competitor_signal: item!.competitor_signal,
      suggested_approach: item!.suggested_approach,
      estimated_variants: item!.estimated_variants,
      priority: item!.priority,
    }))

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
      week_spend: Math.round(weekSpend),
    },
    money: {
      week: { spend: Math.round(weekSpend), revenue: Math.round(weekRevenue), conversations: weekConversations },
      month: { spend: Math.round(monthSpend), revenue: Math.round(monthRevenue), conversations: monthConversations },
    },
    winners_context: winnersContext,
    fading_context: fadingCandidates,
    dead_context: deadContext,
    opportunities_context: opportunitiesPool,
  })
}
