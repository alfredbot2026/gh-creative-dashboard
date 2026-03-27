/**
 * GET /api/ads/competitors — Read competitor intelligence
 * POST /api/ads/competitors — Add a competitor manually
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getAuth(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (isCronAuth) {
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    return { supabase, userId: tokenRow?.user_id || '' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, userId: user?.id || '' }
}

export async function GET(request: NextRequest) {
  const { supabase, userId } = await getAuth(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all competitors with their latest snapshot + ad counts
  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Get competitor ads grouped by page
  const { data: allAds } = await supabase
    .from('competitor_ads')
    .select('id, competitor_id, page_name, ad_body, ad_started_at, ad_format, angle, framework, hook_type, is_active, first_seen_at, last_seen_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('first_seen_at', { ascending: false })

  // Get latest snapshots
  const { data: snapshots } = await supabase
    .from('competitor_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })

  // Aggregate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitorMap = new Map<string, { competitor: any; ads: any[]; latestSnapshot: any }>()

  for (const comp of competitors || []) {
    competitorMap.set(comp.id, {
      competitor: comp,
      ads: (allAds || []).filter(a => a.competitor_id === comp.id),
      latestSnapshot: (snapshots || []).find(s => s.competitor_id === comp.id) || null,
    })
  }

  // Overall competitive landscape
  const totalCompetitors = competitors?.length || 0
  const totalCompetitorAds = allAds?.length || 0
  const angleBreakdown: Record<string, number> = {}
  const hookBreakdown: Record<string, number> = {}
  for (const ad of allAds || []) {
    if (ad.angle) angleBreakdown[ad.angle] = (angleBreakdown[ad.angle] || 0) + 1
    if (ad.hook_type) hookBreakdown[ad.hook_type] = (hookBreakdown[ad.hook_type] || 0) + 1
  }

  return NextResponse.json({
    competitors: Array.from(competitorMap.values()).map(v => ({
      ...v.competitor,
      active_ads: v.ads?.length || 0,
      ads: v.ads?.slice(0, 10), // Top 10 most recent
      latest_snapshot: v.latestSnapshot,
    })),
    landscape: {
      total_competitors: totalCompetitors,
      total_ads: totalCompetitorAds,
      angle_breakdown: angleBreakdown,
      hook_breakdown: hookBreakdown,
    },
  })
}

export async function POST(request: NextRequest) {
  const { supabase, userId } = await getAuth(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { page_name, page_url, website_url, niche, notes } = body

  if (!page_name) return NextResponse.json({ error: 'page_name required' }, { status: 400 })

  const { error } = await supabase.from('competitors').upsert({
    user_id: userId,
    page_name,
    page_url: page_url || null,
    website_url: website_url || null,
    niche: niche || null,
    notes: notes || null,
    discovered_via: 'manual',
  }, { onConflict: 'user_id, page_name' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
