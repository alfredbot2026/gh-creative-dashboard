/**
 * Content Library API
 * GET /api/content/library — Paginated content with filters, sorting, and performance tiers.
 * Query params: platform, type, purpose, sort, order, page, limit, search, tier
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PerformanceTier = 'top' | 'above' | 'average' | 'below'

function getViews(metrics: any): number {
  if (!metrics) return 0
  return metrics.views || metrics.viewCount || metrics.reach || metrics.impressions || metrics.plays || 0
}

function getEngagement(metrics: any): number {
  if (!metrics) return 0
  const likes = metrics.likes || metrics.like_count || metrics.likeCount || 0
  const comments = metrics.comments || metrics.commentCount || metrics.comments_count || 0
  const shares = metrics.shares || 0
  const saves = metrics.saves || metrics.saved || 0
  return likes + comments + shares + saves
}

function getEngagementRate(metrics: any): number {
  const views = getViews(metrics)
  if (views === 0) return 0
  return getEngagement(metrics) / views
}

function calculateTier(engagementRate: number, avgEngagement: number): PerformanceTier {
  if (engagementRate >= avgEngagement * 2) return 'top'
  if (engagementRate >= avgEngagement * 1.2) return 'above'
  if (engagementRate >= avgEngagement * 0.5) return 'average'
  return 'below'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const platform = params.get('platform') || 'all'
  const sort = params.get('sort') || 'views'
  const order = params.get('order') || 'desc'
  const page = parseInt(params.get('page') || '1')
  const limit = Math.min(parseInt(params.get('limit') || '30'), 100)
  const search = params.get('search') || ''
  const tier = params.get('tier') as PerformanceTier | null

  // Paginated fetch of ALL items (for tier calculations)
  const allItems: any[] = []
  let fetchOffset = 0
  const MAX = 5000

  while (fetchOffset < MAX) {
    let q = supabase
      .from('content_ingest')
      .select('*')
      .eq('user_id', user.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(fetchOffset, fetchOffset + 999)

    const { data, error } = await q
    if (error) {
      console.error('[Library] Query error at offset', fetchOffset, error)
      break
    }
    if (!data || data.length === 0) break
    allItems.push(...data)
    if (data.length < 1000) break
    fetchOffset += 1000
  }

  // Get classifications
  const classMap = new Map<string, any>()
  let classOffset = 0
  while (true) {
    const { data: cs } = await supabase
      .from('content_analysis')
      .select('content_id, purpose, hook_type, confidence')
      .eq('user_id', user.id)
      .range(classOffset, classOffset + 999)
    if (!cs || cs.length === 0) break
    for (const c of cs) classMap.set(c.content_id, c)
    if (cs.length < 1000) break
    classOffset += 1000
  }

  // Calculate per-platform average engagement for tier assignment
  const platformRates: Record<string, number[]> = {}
  for (const item of allItems) {
    const rate = getEngagementRate(item.metrics)
    if (rate > 0) {
      if (!platformRates[item.platform]) platformRates[item.platform] = []
      platformRates[item.platform].push(rate)
    }
  }
  const platformAvgs: Record<string, number> = {}
  for (const [p, rates] of Object.entries(platformRates)) {
    platformAvgs[p] = rates.reduce((a, b) => a + b, 0) / rates.length
  }

  // Enrich
  let enriched = allItems.map(item => {
    const cls = classMap.get(item.id)
    const da = item.deep_analysis && !item.deep_analysis?.error ? item.deep_analysis : null
    const views = getViews(item.metrics)
    const engagement = getEngagement(item.metrics)
    const engRate = getEngagementRate(item.metrics)
    const itemTier = engRate > 0 ? calculateTier(engRate, platformAvgs[item.platform] || 0) : 'average'
    const purpose = da?.content_purpose || cls?.purpose || null
    const hookType = da?.hook_analysis?.hook_type || cls?.hook_type || null
    const score = da?.overall_score || null
    const topics = da?.topics || []
    const summary = da?.summary || null

    return {
      id: item.id,
      platform: item.platform,
      platform_id: item.platform_id,
      platform_url: item.platform_url,
      content_type: item.content_type,
      caption: item.caption,
      media_url: item.media_url,
      tags: item.tags,
      published_at: item.published_at,
      views,
      engagement,
      engagement_rate: engRate,
      tier: itemTier,
      purpose,
      hook_type: hookType,
      score,
      topics,
      summary,
      has_deep_analysis: !!da,
    }
  })

  // Filters
  if (platform !== 'all') enriched = enriched.filter(i => i.platform === platform)
  if (search) {
    const q = search.toLowerCase()
    enriched = enriched.filter(i =>
      i.caption?.toLowerCase().includes(q) ||
      i.topics?.some((t: string) => t.toLowerCase().includes(q))
    )
  }
  if (tier) enriched = enriched.filter(i => i.tier === tier)

  // Sort
  enriched.sort((a, b) => {
    let cmp = 0
    switch (sort) {
      case 'views': cmp = a.views - b.views; break
      case 'engagement': cmp = a.engagement_rate - b.engagement_rate; break
      case 'date': cmp = new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime(); break
      case 'score': cmp = (a.score || 0) - (b.score || 0); break
    }
    return order === 'desc' ? -cmp : cmp
  })

  // Stats
  const stats = {
    total: enriched.length,
    by_platform: {
      youtube: allItems.filter(i => i.platform === 'youtube').length,
      instagram: allItems.filter(i => i.platform === 'instagram').length,
      facebook: allItems.filter(i => i.platform === 'facebook').length,
    },
    by_tier: {
      top: enriched.filter(i => i.tier === 'top').length,
      above: enriched.filter(i => i.tier === 'above').length,
      average: enriched.filter(i => i.tier === 'average').length,
      below: enriched.filter(i => i.tier === 'below').length,
    },
    by_purpose: {} as Record<string, number>,
    deep_analyzed: allItems.filter(i => i.deep_analysis && !i.deep_analysis?.error).length,
  }
  for (const item of enriched) {
    if (item.purpose) {
      const p = item.purpose.toLowerCase()
      stats.by_purpose[p] = (stats.by_purpose[p] || 0) + 1
    }
  }

  // Paginate
  const offset = (page - 1) * limit
  const paginated = enriched.slice(offset, offset + limit)

  return NextResponse.json({
    items: paginated,
    stats,
    page,
    limit,
    total: enriched.length,
    has_more: offset + limit < enriched.length,
  })
}
