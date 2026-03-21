/**
 * Dashboard Insights API
 * GET /api/content/dashboard — Aggregate patterns and recommendations.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getViews(m: any): number {
  return m?.views || m?.viewCount || m?.reach || m?.impressions || 0
}
function getLikes(m: any): number {
  return m?.likes || m?.like_count || m?.likeCount || 0
}
function getComments(m: any): number {
  return m?.comments || m?.commentCount || m?.comments_count || 0
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all deep-analyzed items
  const items: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('content_ingest')
      .select('id, platform, caption, metrics, deep_analysis, published_at')
      .eq('user_id', user.id)
      .not('deep_analysis', 'is', null)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    items.push(...data.filter(i => i.deep_analysis && !i.deep_analysis.error))
    if (data.length < 1000) break
    offset += 1000
  }

  if (items.length < 5) {
    return NextResponse.json({ ready: false, analyzed: items.length, message: 'Need at least 5 analyzed videos for insights' })
  }

  // --- Hook Performance ---
  const hookPerf: Record<string, { count: number; totalViews: number; totalEng: number }> = {}
  for (const item of items) {
    const hook = item.deep_analysis.hook_analysis?.hook_type
    if (!hook) continue
    const views = getViews(item.metrics)
    const eng = getLikes(item.metrics) + getComments(item.metrics)
    if (!hookPerf[hook]) hookPerf[hook] = { count: 0, totalViews: 0, totalEng: 0 }
    hookPerf[hook].count++
    hookPerf[hook].totalViews += views
    hookPerf[hook].totalEng += eng
  }
  const hookInsights = Object.entries(hookPerf)
    .map(([hook, stats]) => ({
      hook,
      count: stats.count,
      avg_views: Math.round(stats.totalViews / stats.count),
      avg_engagement_rate: stats.totalViews > 0 ? Math.round((stats.totalEng / stats.totalViews) * 10000) / 100 : 0,
    }))
    .filter(h => h.count >= 2)
    .sort((a, b) => b.avg_views - a.avg_views)

  // --- Purpose Performance ---
  const purposePerf: Record<string, { count: number; totalViews: number; totalEng: number }> = {}
  for (const item of items) {
    const purpose = item.deep_analysis.content_purpose?.toLowerCase()
    if (!purpose) continue
    const views = getViews(item.metrics)
    const eng = getLikes(item.metrics) + getComments(item.metrics)
    if (!purposePerf[purpose]) purposePerf[purpose] = { count: 0, totalViews: 0, totalEng: 0 }
    purposePerf[purpose].count++
    purposePerf[purpose].totalViews += views
    purposePerf[purpose].totalEng += eng
  }
  const purposeInsights = Object.entries(purposePerf)
    .map(([purpose, stats]) => ({
      purpose,
      count: stats.count,
      pct: Math.round((stats.count / items.length) * 100),
      avg_views: Math.round(stats.totalViews / stats.count),
      avg_engagement_rate: stats.totalViews > 0 ? Math.round((stats.totalEng / stats.totalViews) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // --- Day of Week Performance ---
  const dayPerf: Record<string, { count: number; totalViews: number; totalEng: number }> = {}
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const item of items) {
    if (!item.published_at) continue
    const day = dayNames[new Date(item.published_at).getDay()]
    const views = getViews(item.metrics)
    const eng = getLikes(item.metrics) + getComments(item.metrics)
    if (!dayPerf[day]) dayPerf[day] = { count: 0, totalViews: 0, totalEng: 0 }
    dayPerf[day].count++
    dayPerf[day].totalViews += views
    dayPerf[day].totalEng += eng
  }
  const dayInsights = dayNames.map(day => ({
    day,
    count: dayPerf[day]?.count || 0,
    avg_views: dayPerf[day] ? Math.round(dayPerf[day].totalViews / dayPerf[day].count) : 0,
    avg_engagement_rate: dayPerf[day]?.totalViews
      ? Math.round((dayPerf[day].totalEng / dayPerf[day].totalViews) * 10000) / 100
      : 0,
  }))

  // --- Visual Style Performance ---
  const visualPerf: Record<string, { count: number; totalViews: number }> = {}
  for (const item of items) {
    const style = item.deep_analysis.visual_analysis?.style
    if (!style) continue
    const views = getViews(item.metrics)
    if (!visualPerf[style]) visualPerf[style] = { count: 0, totalViews: 0 }
    visualPerf[style].count++
    visualPerf[style].totalViews += views
  }
  const visualInsights = Object.entries(visualPerf)
    .map(([style, stats]) => ({
      style,
      count: stats.count,
      avg_views: Math.round(stats.totalViews / stats.count),
    }))
    .filter(v => v.count >= 2)
    .sort((a, b) => b.avg_views - a.avg_views)

  // --- Score Distribution ---
  const scores = items.map(i => i.deep_analysis.overall_score || 0).filter(s => s > 0)
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0

  // --- Language ---
  const langCounts: Record<string, number> = {}
  for (const item of items) {
    const lang = item.deep_analysis.language?.primary
    if (lang) langCounts[lang] = (langCounts[lang] || 0) + 1
  }

  // --- Generate text insights ---
  const insights: string[] = []
  
  // Best hook
  if (hookInsights.length > 0) {
    const best = hookInsights[0]
    const worst = hookInsights[hookInsights.length - 1]
    if (best.hook !== worst.hook) {
      const multiplier = worst.avg_views > 0 ? (best.avg_views / worst.avg_views).toFixed(1) : '∞'
      insights.push(`"${best.hook}" hooks average ${formatViews(best.avg_views)} views — ${multiplier}x more than "${worst.hook}" hooks`)
    }
  }

  // Content mix
  const educateCount = purposePerf['educate']?.count || 0
  const sellCount = purposePerf['sell']?.count || 0
  if (educateCount > 0 && sellCount > 0) {
    insights.push(`${Math.round((educateCount / items.length) * 100)}% of your content is educational (${educateCount} videos). ${Math.round((sellCount / items.length) * 100)}% is sales-focused.`)
  }

  // Best day
  const bestDay = dayInsights.filter(d => d.count >= 2).sort((a, b) => b.avg_views - a.avg_views)[0]
  const worstDay = dayInsights.filter(d => d.count >= 2).sort((a, b) => a.avg_views - b.avg_views)[0]
  if (bestDay && worstDay && bestDay.day !== worstDay.day) {
    insights.push(`${bestDay.day} posts average ${formatViews(bestDay.avg_views)} views. ${worstDay.day} averages ${formatViews(worstDay.avg_views)} — consider shifting content to ${bestDay.day}.`)
  }

  // Visual style
  if (visualInsights.length > 0) {
    insights.push(`"${visualInsights[0].style}" videos average ${formatViews(visualInsights[0].avg_views)} views — your highest performing visual style.`)
  }

  // Score
  if (avgScore > 0) {
    insights.push(`Your average content quality score is ${avgScore}/10 across ${scores.length} analyzed videos.`)
  }

  return NextResponse.json({
    ready: true,
    analyzed: items.length,
    avg_score: avgScore,
    hooks: hookInsights,
    purposes: purposeInsights,
    days: dayInsights,
    visuals: visualInsights,
    language: langCounts,
    insights,
  })
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}
