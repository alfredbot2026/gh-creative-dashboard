/**
 * Topic Intelligence API
 * GET /api/content/topics — Clusters topics, calculates performance per cluster.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Topic clustering: map raw topics to canonical clusters
const CLUSTER_MAP: Record<string, string> = {
  'shopee affiliate program': 'Shopee Affiliate',
  'shopee affiliate': 'Shopee Affiliate',
  'shopee affiliate marketing': 'Shopee Affiliate',
  'shopee seller tutorial': 'Shopee Selling',
  'shopee selling': 'Shopee Selling',
  'shopee seller tips': 'Shopee Selling',
  'shopee': 'Shopee Selling',
  'shopee bir': 'BIR & Tax Compliance',
  'bir registration': 'BIR & Tax Compliance',
  'bir compliance': 'BIR & Tax Compliance',
  'tax compliance': 'BIR & Tax Compliance',
  'bir': 'BIR & Tax Compliance',
  'online business registration': 'BIR & Tax Compliance',
  'tiktok shop': 'TikTok Selling',
  'tiktok affiliate': 'TikTok Selling',
  'tiktok selling': 'TikTok Selling',
  'tiktok seller': 'TikTok Selling',
  'live selling': 'TikTok Selling',
  'canva tutorial': 'Canva & Design',
  'canva': 'Canva & Design',
  'canva earning': 'Canva & Design',
  'canva philippines': 'Canva & Design',
  'graphic design': 'Canva & Design',
  'printing business': 'Printing Business',
  'home-based printing': 'Printing Business',
  'printing': 'Printing Business',
  'sublimation': 'Printing Business',
  'paper products': 'Printing Business',
  'homeschooling': 'Homeschooling',
  'homeschooling resources': 'Homeschooling',
  'homeschooling philippines': 'Homeschooling',
  'education': 'Homeschooling',
  'araling panlipunan': 'Homeschooling',
  'passive income': 'Passive Income & Side Hustle',
  'online business': 'Passive Income & Side Hustle',
  'online business philippines': 'Passive Income & Side Hustle',
  'side hustle': 'Passive Income & Side Hustle',
  'work from home': 'Passive Income & Side Hustle',
  'earn money online': 'Passive Income & Side Hustle',
  'affiliate marketing': 'Affiliate Marketing',
  'lazada': 'Lazada Selling',
  'lazada selling': 'Lazada Selling',
  'lazada seller': 'Lazada Selling',
  'e-commerce tutorial': 'E-commerce',
  'e-commerce': 'E-commerce',
  'e-commerce logistics': 'E-commerce',
  'online selling': 'E-commerce',
  'online selling philippines': 'E-commerce',
  'bookkeeping': 'BIR & Tax Compliance',
}

function clusterTopic(rawTopic: string): string {
  const key = rawTopic.toLowerCase().trim()
  return CLUSTER_MAP[key] || rawTopic
}

function getViews(metrics: any): number {
  if (!metrics) return 0
  return metrics.views || metrics.viewCount || metrics.reach || metrics.impressions || 0
}

function getLikes(metrics: any): number {
  if (!metrics) return 0
  return metrics.likes || metrics.like_count || metrics.likeCount || 0
}

function getComments(metrics: any): number {
  if (!metrics) return 0
  return metrics.comments || metrics.commentCount || metrics.comments_count || 0
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all deep-analyzed items
  const allItems: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('content_ingest')
      .select('id, platform, platform_id, caption, metrics, deep_analysis, published_at')
      .eq('user_id', user.id)
      .not('deep_analysis', 'is', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allItems.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }

  // Filter valid deep analysis
  const analyzed = allItems.filter(i => i.deep_analysis && !i.deep_analysis.error)

  // Build topic clusters
  const clusters: Record<string, {
    name: string
    rawTopics: Set<string>
    videos: Array<{
      id: string
      title: string
      views: number
      likes: number
      comments: number
      score: number
      platform: string
      hook_type: string
      purpose: string
    }>
  }> = {}

  for (const item of analyzed) {
    const da = item.deep_analysis
    const topics = da.topics || []
    const views = getViews(item.metrics)
    const likes = getLikes(item.metrics)
    const comments = getComments(item.metrics)

    const videoData = {
      id: item.id,
      title: item.caption?.slice(0, 80) || 'Untitled',
      views,
      likes,
      comments,
      score: da.overall_score || 0,
      platform: item.platform,
      hook_type: da.hook_analysis?.hook_type || '',
      purpose: da.content_purpose || '',
    }

    for (const topic of topics) {
      const cluster = clusterTopic(topic)
      if (!clusters[cluster]) {
        clusters[cluster] = { name: cluster, rawTopics: new Set(), videos: [] }
      }
      clusters[cluster].rawTopics.add(topic)
      // Avoid duplicate videos in same cluster
      if (!clusters[cluster].videos.find(v => v.id === item.id)) {
        clusters[cluster].videos.push(videoData)
      }
    }
  }

  // Calculate stats per cluster
  const clusterStats = Object.values(clusters)
    .map(c => {
      const videoCount = c.videos.length
      const totalViews = c.videos.reduce((a, v) => a + v.views, 0)
      const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0
      const totalLikes = c.videos.reduce((a, v) => a + v.likes, 0)
      const totalComments = c.videos.reduce((a, v) => a + v.comments, 0)
      const avgScore = videoCount > 0
        ? Math.round((c.videos.reduce((a, v) => a + v.score, 0) / videoCount) * 10) / 10
        : 0
      const avgEngRate = totalViews > 0
        ? (totalLikes + totalComments) / totalViews
        : 0

      // Best performing video in cluster
      const bestVideo = c.videos.sort((a, b) => b.views - a.views)[0]

      // Most common hook type
      const hookCounts: Record<string, number> = {}
      for (const v of c.videos) {
        if (v.hook_type) hookCounts[v.hook_type] = (hookCounts[v.hook_type] || 0) + 1
      }
      const topHook = Object.entries(hookCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

      // Most common purpose
      const purposeCounts: Record<string, number> = {}
      for (const v of c.videos) {
        if (v.purpose) purposeCounts[v.purpose.toLowerCase()] = (purposeCounts[v.purpose.toLowerCase()] || 0) + 1
      }
      const topPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

      return {
        name: c.name,
        raw_topics: Array.from(c.rawTopics),
        video_count: videoCount,
        total_views: totalViews,
        avg_views: avgViews,
        total_likes: totalLikes,
        total_comments: totalComments,
        avg_score: avgScore,
        avg_engagement_rate: Math.round(avgEngRate * 10000) / 100, // as percentage
        top_hook: topHook,
        top_purpose: topPurpose,
        best_video: bestVideo ? { id: bestVideo.id, title: bestVideo.title, views: bestVideo.views } : null,
        videos: c.videos.sort((a, b) => b.views - a.views).slice(0, 5), // Top 5
      }
    })
    .filter(c => c.video_count >= 2) // Only clusters with 2+ videos
    .sort((a, b) => b.total_views - a.total_views)

  return NextResponse.json({
    total_analyzed: analyzed.length,
    total_clusters: clusterStats.length,
    clusters: clusterStats,
  })
}
