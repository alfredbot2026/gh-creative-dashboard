/**
 * Ad Intelligence Map API
 * GET /api/ads/intelligence/map — Returns the full ad account map with matrix,
 * gaps, saturation, recommendations, and summary.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAdAccountMap, type AdCreativeRow } from '@/lib/ads/intelligence'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all classified creatives
  const { data: creatives, error } = await supabase
    .from('ad_creatives')
    .select('id, angle, persona, framework, ad_name, ad_status, creative_format, total_spend, total_purchases, avg_roas, avg_cpa, avg_ctr, first_active_date, last_active_date, classified_at')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!creatives || creatives.length === 0) {
    return NextResponse.json({
      has_data: false,
      message: 'No ad creatives found. Sync your ads first.',
    })
  }

  // Optionally pull competitor angle data for gap prioritization
  let competitorAngles: string[] = []
  try {
    const { data: compData } = await supabase
      .from('competitive_intelligence')
      .select('classification')
      .eq('user_id', user.id)
      .limit(100)

    if (compData) {
      const angleCounts = new Map<string, number>()
      for (const row of compData) {
        const cls = row.classification as Record<string, any>
        const hook = cls?.hook_type
        if (hook) {
          angleCounts.set(hook, (angleCounts.get(hook) || 0) + 1)
        }
      }
      // Top 5 competitor angles
      competitorAngles = Array.from(angleCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([angle]) => angle)
    }
  } catch {
    // Non-fatal — competitive data is optional
  }

  const map = buildAdAccountMap(creatives as AdCreativeRow[], competitorAngles)

  return NextResponse.json({
    has_data: true,
    ...map,
  })
}
