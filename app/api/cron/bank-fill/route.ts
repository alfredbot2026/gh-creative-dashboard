/**
 * GET /api/cron/bank-fill — Nightly creative bank pre-generation (Vercel Cron)
 * 
 * Runs at 2:00 AM PHT daily. Does:
 * 1. Find angle×persona combos that need filling (untested, fatigued, low stock)
 * 2. For each combo: generate hooks via bank seed API
 * 3. For top combos: generate full creative trees (hooks + static + carousel)
 * 4. Track generation credits
 * 
 * Auth: Vercel cron (CRON_SECRET header) only.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300 // 5 min max for cron
export const dynamic = 'force-dynamic'

const ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
const PERSONAS = ['new_mom_curious', 'beginner', 'price_sensitive', 'aspirational', 'skeptic']
const MIN_FRESH_HOOKS = 5
const TARGET_HOOKS_PER_COMBO = 10
const MAX_COMBOS_PER_RUN = 5 // limit to avoid timeout

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: { timestamp: string; combos_checked: number; combos_filled: number; hooks_generated: number; errors: string[] } = {
    timestamp: new Date().toISOString(),
    combos_checked: 0,
    combos_filled: 0,
    hooks_generated: 0,
    errors: [],
  }

  try {
    // Get the user ID (single-tenant for now — Grace)
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    const userId = tokenRow?.user_id
    if (!userId) {
      return NextResponse.json({ error: 'No user found', ...results }, { status: 400 })
    }

    // Step 1: Audit all angle×persona combos
    const comboScores: Array<{ angle: string; persona: string; priority: number; reason: string; freshCount: number }> = []

    for (const angle of ANGLES) {
      for (const persona of PERSONAS) {
        results.combos_checked++

        // Count fresh hooks in bank
        const { count: freshCount } = await supabase
          .from('hook_bank')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('angle', angle)
          .eq('persona', persona)
          .eq('status', 'fresh')

        const fresh = freshCount || 0

        // Check if this angle has winning ads (scale opportunity)
        const { data: winningAds } = await supabase
          .from('ad_creatives')
          .select('id')
          .eq('user_id', userId)
          .eq('angle', angle)
          .eq('ad_status', 'winning')
          .limit(1)

        const hasWinners = (winningAds?.length || 0) > 0

        // Check if this angle has fatigued ads (refresh needed)
        const { data: fatiguedAds } = await supabase
          .from('ad_creatives')
          .select('id')
          .eq('user_id', userId)
          .eq('angle', angle)
          .eq('ad_status', 'tired')
          .limit(1)

        const hasFatigue = (fatiguedAds?.length || 0) > 0

        // Priority scoring
        let priority = 0
        let reason = ''

        if (fresh === 0) {
          priority = 100
          reason = 'empty bank'
        } else if (fresh < MIN_FRESH_HOOKS) {
          priority = 80
          reason = `low stock (${fresh} fresh)`
        } else if (hasFatigue) {
          priority = 70
          reason = 'fatigued ads need refresh'
        } else if (hasWinners && fresh < TARGET_HOOKS_PER_COMBO) {
          priority = 60
          reason = `winning angle, can scale (${fresh}/${TARGET_HOOKS_PER_COMBO})`
        } else {
          continue // skip well-stocked combos
        }

        comboScores.push({ angle, persona, priority, reason, freshCount: fresh })
      }
    }

    // Sort by priority descending, take top N
    comboScores.sort((a, b) => b.priority - a.priority)
    const toFill = comboScores.slice(0, MAX_COMBOS_PER_RUN)

    // Step 2: Fill each combo via bank seed API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    for (const combo of toFill) {
      const hooksNeeded = TARGET_HOOKS_PER_COMBO - combo.freshCount
      if (hooksNeeded <= 0) continue

      try {
        const seedRes = await fetch(`${baseUrl}/api/ads/bank/seed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            angle: combo.angle,
            persona: combo.persona,
            hookCount: Math.min(hooksNeeded, 10),
            includeScripts: true, // Generate full creative trees: hooks + scripts
          }),
        })

        const seedData = await seedRes.json()
        if (seedRes.ok) {
          results.combos_filled++
          results.hooks_generated += seedData.hooks_generated || 0
        } else {
          results.errors.push(`${combo.angle}×${combo.persona}: ${seedData.error || 'seed failed'}`)
        }
      } catch (err) {
        results.errors.push(`${combo.angle}×${combo.persona}: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }

    // Step 3: Auto-retire stale hooks (shown 3+ times, never selected)
    const { count: retiredCount } = await supabase
      .from('hook_bank')
      .update({ status: 'retired', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'shown')
      .gte('times_shown', 3)
      .eq('times_selected', 0)

    return NextResponse.json({
      ...results,
      combos_audited: comboScores.length,
      top_needs: toFill.map(c => `${c.angle}×${c.persona}: ${c.reason}`),
      hooks_retired: retiredCount || 0,
    })
  } catch (err) {
    results.errors.push(err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json(results, { status: 500 })
  }
}
