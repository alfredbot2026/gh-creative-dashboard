/**
 * GET /api/ads/weekly-plan — Generate weekly creative testing recommendations
 * 
 * Returns 1-3 concept recommendations based on:
 * - Strategy map gaps (explore)
 * - Winning angles ready for iteration (scale)
 * - Fatiguing creatives needing replacement
 * - Competitor gaps
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadBusinessContext, getThresholds } from '@/lib/ads/business-context'

export const dynamic = 'force-dynamic'

interface Recommendation {
  mode: 'explore' | 'scale' | 'iterate'
  angle: string
  persona: string
  reason: string
  priority: number
  suggested_formats: string[]
  hook_count: number
  day: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load ad creatives for strategy map analysis
  const { data: creatives } = await supabase
    .from('ad_creatives')
    .select('angle, persona, ad_status, avg_roas, total_spend, campaign_objective')
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Load competitor angles
  const { data: compAds } = await supabase
    .from('competitor_ads')
    .select('angle')
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Load existing concepts (don't recommend what's already being tested)
  const { data: existingConcepts } = await supabase
    .from('creative_concepts')
    .select('angle, persona, status')
    .eq('user_id', user.id)
    .in('status', ['draft', 'testing'])

  const bizCtx = await loadBusinessContext(supabase, user.id)
  const thresholds = getThresholds(bizCtx)

  // Build strategy map
  const ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
  const PERSONAS = ['new_mom_curious', 'beginner', 'price_sensitive', 'aspirational', 'skeptic']

  const cellMap = new Map<string, { roas: number; count: number; status: string }>()
  for (const c of creatives || []) {
    if (!c.angle || !c.persona) continue
    const key = `${c.angle}|${c.persona}`
    const existing = cellMap.get(key)
    if (!existing) {
      cellMap.set(key, { roas: c.avg_roas || 0, count: 1, status: c.ad_status || 'unknown' })
    } else {
      existing.count++
      if ((c.avg_roas || 0) > existing.roas) existing.roas = c.avg_roas || 0
    }
  }

  const compAngleCounts = new Map<string, number>()
  for (const c of compAds || []) {
    if (c.angle) compAngleCounts.set(c.angle, (compAngleCounts.get(c.angle) || 0) + 1)
  }

  const alreadyTesting = new Set((existingConcepts || []).map(c => `${c.angle}|${c.persona}`))

  const recommendations: Recommendation[] = []

  // 1. SCALE: Find winning angles that need fresh creatives
  for (const [key, data] of cellMap) {
    if (data.status !== 'winning' || data.roas < 2) continue
    const [angle, persona] = key.split('|')
    if (alreadyTesting.has(key)) continue

    recommendations.push({
      mode: 'scale',
      angle,
      persona,
      reason: `${data.roas.toFixed(1)}x ROAS with ${data.count} ad(s). Proven winner — create fresh variations to prevent fatigue.`,
      priority: data.roas * data.count,
      suggested_formats: ['static_image', 'carousel', 'video_ugc'],
      hook_count: 3,
      day: 'Tuesday',
    })
  }

  // 2. EXPLORE: Find untested gaps (prioritize ones competitors aren't using)
  for (const angle of ANGLES) {
    for (const persona of PERSONAS) {
      const key = `${angle}|${persona}`
      if (cellMap.has(key)) continue
      if (alreadyTesting.has(key)) continue

      // Only suggest top personas
      if (persona !== 'new_mom_curious' && persona !== 'beginner') continue

      const compUses = compAngleCounts.get(angle) || 0
      const priority = compUses === 0 ? 10 : 5 // Higher priority if competitors DON'T use this angle

      recommendations.push({
        mode: 'explore',
        angle,
        persona,
        reason: compUses === 0
          ? `Never tested. Competitors don't use ${angle.replace(/_/g, ' ')} either — opportunity to own this angle.`
          : `Never tested. ${compUses} competitors use ${angle.replace(/_/g, ' ')} — test to see if it works for your audience.`,
        priority,
        suggested_formats: ['static_image', 'carousel'],
        hook_count: 2,
        day: 'Thursday',
      })
    }
  }

  // Sort by priority and take top 3
  recommendations.sort((a, b) => b.priority - a.priority)
  const plan = recommendations.slice(0, 3)

  // Assign days
  const days = ['Tuesday', 'Thursday', 'Saturday']
  plan.forEach((r, i) => { r.day = days[i] || 'Saturday' })

  return NextResponse.json({
    week_label: `Week of ${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    recommendations: plan,
    total_creatives: plan.reduce((s, r) => s + r.hook_count * r.suggested_formats.length, 0),
    business: thresholds,
  })
}
