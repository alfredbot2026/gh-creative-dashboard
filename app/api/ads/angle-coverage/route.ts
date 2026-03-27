/**
 * GET /api/ads/angle-coverage
 * Returns tested vs untested angles from ad_creatives, 
 * with winner counts and best ROAS per angle.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALL_ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: creatives } = await supabase
    .from('ad_creatives')
    .select('angle, ad_status, avg_roas')
    .eq('user_id', user.id)
    .not('angle', 'is', null)

  // Aggregate per angle
  const angleMap = new Map<string, { ad_count: number; winner_count: number; best_roas: number | null }>()
  for (const c of creatives || []) {
    if (!c.angle) continue
    const existing = angleMap.get(c.angle) || { ad_count: 0, winner_count: 0, best_roas: null }
    existing.ad_count++
    if (c.ad_status === 'winning') {
      existing.winner_count++
      if (c.avg_roas && (existing.best_roas === null || c.avg_roas > existing.best_roas)) {
        existing.best_roas = c.avg_roas
      }
    }
    angleMap.set(c.angle, existing)
  }

  const coverage = ALL_ANGLES.map(angle => {
    const data = angleMap.get(angle)
    return {
      angle,
      tested: !!data,
      ad_count: data?.ad_count || 0,
      winner_count: data?.winner_count || 0,
      best_roas: data?.best_roas || null,
    }
  })

  return NextResponse.json({ coverage })
}
