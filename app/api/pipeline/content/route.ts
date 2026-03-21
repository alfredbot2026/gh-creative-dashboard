/**
 * Pipeline Content List API
 * GET /api/pipeline/content?page=1&limit=20&platform=youtube&classified=true
 * Returns ingested content with their analysis side-by-side.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50)
  const platform = req.nextUrl.searchParams.get('platform')
  const purpose = req.nextUrl.searchParams.get('purpose')
  const sort = req.nextUrl.searchParams.get('sort') || 'published_at'
  const order = req.nextUrl.searchParams.get('order') || 'desc'
  const offset = (page - 1) * limit

  // Build ingest query
  let query = supabase
    .from('content_ingest')
    .select('id, platform, platform_id, platform_url, content_type, caption, description, media_url, tags, published_at, metrics, metrics_updated_at', { count: 'exact' })
    .eq('user_id', user.id)

  if (platform) query = query.eq('platform', platform)
  
  if (sort === 'published_at') {
    query = query.order('published_at', { ascending: order === 'asc' })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data: items, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ items: [], total: 0, page, limit })
  }

  // Fetch classifications for these items
  const ingestIds = items.map(i => i.id)
  const { data: analyses } = await supabase
    .from('content_analysis')
    .select('ingest_id, classification, confidence_avg, model_used, created_at')
    .in('ingest_id', ingestIds)

  const analysisMap = new Map((analyses || []).map(a => [a.ingest_id, a]))

  // Merge
  const merged = items.map(item => {
    const analysis = analysisMap.get(item.id)
    const metrics = item.metrics as any || {}
    
    // Calculate engagement rate based on platform
    let engagementRate = 0
    if (item.platform === 'youtube') {
      const views = metrics.viewCount || metrics.views || 0
      const likes = metrics.likeCount || metrics.likes || 0
      const comments = metrics.commentCount || metrics.comments || 0
      engagementRate = views > 0 ? (likes + comments) / views : 0
    } else {
      const reach = metrics.reach || metrics.impressions || 0
      const likes = metrics.likes || metrics.like_count || 0
      const comments = metrics.comments || metrics.comments_count || 0
      const saves = metrics.saves || metrics.saved || 0
      const shares = metrics.shares || 0
      engagementRate = reach > 0 ? (likes + comments + saves + shares) / reach : 0
    }

    return {
      id: item.id,
      platform: item.platform,
      platform_id: item.platform_id,
      platform_url: item.platform_url,
      content_type: item.content_type,
      caption: item.caption?.slice(0, 300) || null,
      description: item.description?.slice(0, 300) || null,
      media_url: item.media_url,
      tags: item.tags,
      published_at: item.published_at,
      metrics,
      engagement_rate: engagementRate,
      classification: analysis?.classification || null,
      confidence_avg: analysis?.confidence_avg || null,
      classified_at: analysis?.created_at || null,
    }
  })

  // Filter by purpose if requested (post-classification filter)
  const filtered = purpose
    ? merged.filter(m => m.classification?.content_purpose === purpose)
    : merged

  return NextResponse.json({
    items: filtered,
    total: count || 0,
    page,
    limit,
    has_more: (count || 0) > offset + limit,
  })
}
