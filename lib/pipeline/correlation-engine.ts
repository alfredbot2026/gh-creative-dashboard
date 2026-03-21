/**
 * Performance Correlation Engine
 * 
 * Cross-references content classifications with performance metrics
 * to build a Performance Profile — ranked hooks, structures, topics, etc.
 */
import { createClient } from '@/lib/supabase/server'
import type {
  PerformanceProfile,
  RankedMetric,
  PostingTimeSlot,
  TopicFreshness,
  PlatformSummary,
} from './profile-types'
import type { ContentClassification } from './classification-types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface IngestWithAnalysis {
  id: string
  platform: string
  published_at: string
  metrics: Record<string, any>
  classification: ContentClassification
}

/**
 * Calculate engagement rate normalized per platform.
 */
function calcEngagementRate(metrics: Record<string, any>, platform: string): number {
  if (platform === 'instagram') {
    const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.saves || 0) + (metrics.shares || 0)
    const reach = metrics.reach || metrics.impressions || 1
    return engagement / reach
  }
  if (platform === 'youtube') {
    const engagement = (metrics.likes || 0) + (metrics.comments || 0)
    const views = metrics.views || 1
    return engagement / views
  }
  if (platform === 'facebook') {
    const engagement = metrics.engaged_users || metrics.reactions || 0
    const impressions = metrics.impressions || 1
    return engagement / impressions
  }
  return 0
}

function getConfidence(n: number): 'low' | 'medium' | 'high' {
  if (n < 5) return 'low'
  if (n < 15) return 'medium'
  return 'high'
}

/**
 * Group items by a classification field and rank by engagement.
 */
function rankByDimension(
  items: IngestWithAnalysis[],
  getLabel: (c: ContentClassification) => string,
  minSamples: number = 3
): RankedMetric[] {
  const groups = new Map<string, { engagements: number[]; reaches: number[]; saves: number[]; recentEngagements: number[] }>()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  for (const item of items) {
    const label = getLabel(item.classification)
    if (!label) continue

    if (!groups.has(label)) {
      groups.set(label, { engagements: [], reaches: [], saves: [], recentEngagements: [] })
    }

    const g = groups.get(label)!
    const engRate = calcEngagementRate(item.metrics, item.platform)
    const reach = item.metrics.reach || item.metrics.views || item.metrics.impressions || 0
    const saves = item.metrics.saves || item.metrics.saved || 0

    g.engagements.push(engRate)
    g.reaches.push(reach)
    g.saves.push(saves)

    if (new Date(item.published_at) > ninetyDaysAgo) {
      g.recentEngagements.push(engRate)
    }
  }

  const ranked: RankedMetric[] = []

  for (const [label, data] of groups) {
    if (data.engagements.length < minSamples) continue

    const avgEng = data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length
    const avgReach = data.reaches.reduce((a, b) => a + b, 0) / data.reaches.length
    const avgSaves = data.saves.reduce((a, b) => a + b, 0) / data.saves.length

    // Trend: compare recent 90 days vs all-time
    let trend: 'rising' | 'stable' | 'declining' = 'stable'
    if (data.recentEngagements.length >= 3) {
      const recentAvg = data.recentEngagements.reduce((a, b) => a + b, 0) / data.recentEngagements.length
      const ratio = recentAvg / (avgEng || 1)
      if (ratio > 1.2) trend = 'rising'
      else if (ratio < 0.8) trend = 'declining'
    }

    ranked.push({
      label,
      sample_size: data.engagements.length,
      avg_engagement_rate: Math.round(avgEng * 10000) / 10000,
      avg_reach: Math.round(avgReach),
      avg_saves: Math.round(avgSaves * 100) / 100,
      confidence: getConfidence(data.engagements.length),
      trend,
    })
  }

  return ranked.sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)
}

/**
 * Calculate best posting time slots.
 */
function calcPostingTimes(items: IngestWithAnalysis[]): PostingTimeSlot[] {
  const slots = new Map<string, { engagements: number[] }>()

  for (const item of items) {
    const dt = new Date(item.published_at)
    const day = dt.getDay()
    const hour = dt.getHours()
    const key = `${day}-${hour}`

    if (!slots.has(key)) slots.set(key, { engagements: [] })
    slots.get(key)!.engagements.push(calcEngagementRate(item.metrics, item.platform))
  }

  const results: PostingTimeSlot[] = []
  for (const [key, data] of slots) {
    if (data.engagements.length < 2) continue
    const [day, hour] = key.split('-').map(Number)
    const avg = data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length
    results.push({
      day_of_week: day,
      hour,
      avg_engagement: Math.round(avg * 10000) / 10000,
      sample_size: data.engagements.length,
    })
  }

  return results.sort((a, b) => b.avg_engagement - a.avg_engagement).slice(0, 10)
}

/**
 * Calculate topic freshness per platform.
 */
function calcTopicFreshness(items: IngestWithAnalysis[]): TopicFreshness[] {
  const topics = new Map<string, { dates: Date[]; engagements: number[]; platform: string }>()
  const allEngagements = items.map(i => calcEngagementRate(i.metrics, i.platform))
  const avgEngagement = allEngagements.length > 0
    ? allEngagements.reduce((a, b) => a + b, 0) / allEngagements.length
    : 0

  for (const item of items) {
    const topic = item.classification.topic_category
    if (!topic) continue
    const key = `${topic}|${item.platform}`

    if (!topics.has(key)) topics.set(key, { dates: [], engagements: [], platform: item.platform })
    topics.get(key)!.dates.push(new Date(item.published_at))
    topics.get(key)!.engagements.push(calcEngagementRate(item.metrics, item.platform))
  }

  const results: TopicFreshness[] = []
  for (const [key, data] of topics) {
    if (data.dates.length < 2) continue
    const topic = key.split('|')[0]

    data.dates.sort((a, b) => b.getTime() - a.getTime())
    const lastPosted = data.dates[0].toISOString()

    // Avg days between posts
    let totalDays = 0
    for (let i = 0; i < data.dates.length - 1; i++) {
      totalDays += (data.dates[i].getTime() - data.dates[i + 1].getTime()) / (1000 * 60 * 60 * 24)
    }
    const frequencyDays = Math.round(totalDays / (data.dates.length - 1))

    const topicAvg = data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length
    let performance: 'above_avg' | 'average' | 'below_avg' = 'average'
    if (topicAvg > avgEngagement * 1.15) performance = 'above_avg'
    else if (topicAvg < avgEngagement * 0.85) performance = 'below_avg'

    results.push({
      topic,
      last_posted: lastPosted,
      frequency_days: frequencyDays,
      performance,
      platform: data.platform,
    })
  }

  return results.sort((a, b) => new Date(a.last_posted).getTime() - new Date(b.last_posted).getTime())
}

/**
 * Calculate per-platform summary.
 */
function calcPlatformPerformance(items: IngestWithAnalysis[]): Record<string, PlatformSummary> {
  const platforms = new Map<string, IngestWithAnalysis[]>()

  for (const item of items) {
    if (!platforms.has(item.platform)) platforms.set(item.platform, [])
    platforms.get(item.platform)!.push(item)
  }

  const result: Record<string, PlatformSummary> = {}

  for (const [platform, pItems] of platforms) {
    const engagements = pItems.map(i => calcEngagementRate(i.metrics, platform))
    const avgEng = engagements.reduce((a, b) => a + b, 0) / (engagements.length || 1)

    const hookRanks = rankByDimension(pItems, c => c.hook_type, 1)
    const structRanks = rankByDimension(pItems, c => c.structure, 1)

    // Best day
    const dayMap = new Map<number, number[]>()
    for (const item of pItems) {
      const day = new Date(item.published_at).getDay()
      if (!dayMap.has(day)) dayMap.set(day, [])
      dayMap.get(day)!.push(calcEngagementRate(item.metrics, platform))
    }
    let bestDay = 'Unknown'
    let bestDayEng = 0
    for (const [day, engs] of dayMap) {
      const avg = engs.reduce((a, b) => a + b, 0) / engs.length
      if (avg > bestDayEng) {
        bestDayEng = avg
        bestDay = DAY_NAMES[day]
      }
    }

    result[platform] = {
      total_posts: pItems.length,
      avg_engagement_rate: Math.round(avgEng * 10000) / 10000,
      best_hook: hookRanks[0]?.label || 'Unknown',
      best_structure: structRanks[0]?.label || 'Unknown',
      best_day: bestDay,
    }
  }

  return result
}

/**
 * Generate a full Performance Profile from classified + metricked content.
 */
export async function generatePerformanceProfile(userId: string): Promise<PerformanceProfile> {
  const supabase = await createClient()

  // Join content_ingest with content_analysis
  const { data: ingestData } = await supabase
    .from('content_ingest')
    .select('id, platform, published_at, metrics')
    .eq('user_id', userId)
    .not('metrics', 'eq', '{}')

  const { data: analysisData } = await supabase
    .from('content_analysis')
    .select('ingest_id, classification')
    .eq('user_id', userId)

  if (!ingestData || !analysisData) {
    throw new Error('No data available for profile generation')
  }

  // Build lookup
  const analysisMap = new Map<string, ContentClassification>()
  for (const a of analysisData) {
    analysisMap.set(a.ingest_id, a.classification as ContentClassification)
  }

  // Join: only items with both metrics and classification
  const items: IngestWithAnalysis[] = []
  for (const ingest of ingestData) {
    const classification = analysisMap.get(ingest.id)
    if (!classification) continue
    items.push({
      id: ingest.id,
      platform: ingest.platform,
      published_at: ingest.published_at,
      metrics: ingest.metrics as Record<string, any>,
      classification,
    })
  }

  if (items.length === 0) {
    throw new Error('No classified content with metrics found')
  }

  // Generate all dimensions
  const profile: PerformanceProfile = {
    user_id: userId,
    generated_at: new Date().toISOString(),
    sample_size: items.length,

    hook_performance: rankByDimension(items, c => c.hook_type),
    structure_performance: rankByDimension(items, c => c.structure),
    topic_performance: rankByDimension(items, c => c.topic_category),
    purpose_performance: rankByDimension(items, c => c.content_purpose),
    visual_style_performance: rankByDimension(items, c => c.visual_style),
    cta_performance: rankByDimension(items, c => c.cta_type),

    best_posting_times: calcPostingTimes(items),
    best_posting_days: (() => {
      const dayMap = new Map<string, number[]>()
      for (const item of items) {
        const day = DAY_NAMES[new Date(item.published_at).getDay()]
        if (!dayMap.has(day)) dayMap.set(day, [])
        dayMap.get(day)!.push(calcEngagementRate(item.metrics, item.platform))
      }
      return Array.from(dayMap.entries())
        .map(([day, engs]) => ({
          day,
          avg_engagement: Math.round((engs.reduce((a, b) => a + b, 0) / engs.length) * 10000) / 10000,
        }))
        .sort((a, b) => b.avg_engagement - a.avg_engagement)
    })(),

    content_mix_actual: (() => {
      const mix: Record<string, number> = {}
      for (const item of items) {
        const purpose = item.classification.content_purpose || 'unknown'
        mix[purpose] = (mix[purpose] || 0) + 1
      }
      // Normalize to percentages
      const total = Object.values(mix).reduce((a, b) => a + b, 0)
      for (const key of Object.keys(mix)) {
        mix[key] = Math.round((mix[key] / total) * 100) / 100
      }
      return mix
    })(),

    content_mix_optimal: {
      educate: 0.40,
      story: 0.25,
      sell: 0.15,
      inspire: 0.10,
      prove: 0.07,
      trend: 0.03,
    },

    topic_freshness: calcTopicFreshness(items),
    platform_performance: calcPlatformPerformance(items),

    confidence_level: items.length < 50 ? 'low' : items.length < 200 ? 'medium' : 'high',
  }

  // Store in DB
  const { data: existing } = await supabase
    .from('performance_profile')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (existing?.version || 0) + 1

  await supabase.from('performance_profile').insert({
    user_id: userId,
    profile,
    version: nextVersion,
    total_posts_analyzed: items.length,
    confidence_level: profile.confidence_level,
  })

  console.log(`[Profile] Generated v${nextVersion} for user ${userId}: ${items.length} posts analyzed, confidence: ${profile.confidence_level}`)

  return profile
}
