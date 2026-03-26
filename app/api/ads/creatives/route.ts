/**
 * Ad Creatives API
 * GET /api/ads/creatives — Returns all classified ad creatives for the current user.
 * Supports filters: angle, persona, framework, status, format.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const angle = params.get('angle')
  const persona = params.get('persona')
  const framework = params.get('framework')
  const status = params.get('status')
  const format = params.get('format')

  let query = supabase
    .from('ad_creatives')
    .select('*')
    .eq('user_id', user.id)
    .order('total_spend', { ascending: false })

  if (angle) query = query.eq('angle', angle)
  if (persona) query = query.eq('persona', persona)
  if (framework) query = query.eq('framework', framework)
  if (status) query = query.eq('ad_status', status)
  if (format) query = query.eq('creative_format', format)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Summary stats
  const creatives = data || []
  const totalSpend = creatives.reduce((s, c) => s + (c.total_spend || 0), 0)
  const totalPurchases = creatives.reduce((s, c) => s + (c.total_purchases || 0), 0)
  const classified = creatives.filter(c => c.classified_at).length

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const c of creatives) {
    const s = c.ad_status || 'unknown'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  return NextResponse.json({
    creatives,
    summary: {
      total: creatives.length,
      classified,
      unclassified: creatives.length - classified,
      total_spend: Math.round(totalSpend * 100) / 100,
      total_purchases: totalPurchases,
      status_breakdown: statusCounts,
    },
  })
}
