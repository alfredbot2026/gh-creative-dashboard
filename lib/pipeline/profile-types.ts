/**
 * Performance Profile Types
 * The data structure that drives V2's intelligent suggestions.
 */

export interface PerformanceProfile {
  user_id: string
  generated_at: string
  sample_size: number

  hook_performance: RankedMetric[]
  structure_performance: RankedMetric[]
  topic_performance: RankedMetric[]
  purpose_performance: RankedMetric[]
  visual_style_performance: RankedMetric[]
  cta_performance: RankedMetric[]

  best_posting_times: PostingTimeSlot[]
  best_posting_days: { day: string; avg_engagement: number }[]

  content_mix_actual: Record<string, number>
  content_mix_optimal: Record<string, number>

  topic_freshness: TopicFreshness[]

  platform_performance: Record<string, PlatformSummary>

  confidence_level: 'low' | 'medium' | 'high'
}

export interface RankedMetric {
  label: string
  sample_size: number
  avg_engagement_rate: number
  avg_reach: number
  avg_saves: number
  confidence: 'low' | 'medium' | 'high'
  trend: 'rising' | 'stable' | 'declining'
}

export interface PostingTimeSlot {
  day_of_week: number   // 0=Sunday
  hour: number          // 0-23
  avg_engagement: number
  sample_size: number
}

export interface TopicFreshness {
  topic: string
  last_posted: string
  frequency_days: number
  performance: 'above_avg' | 'average' | 'below_avg'
  platform: string
}

export interface PlatformSummary {
  total_posts: number
  avg_engagement_rate: number
  best_hook: string
  best_structure: string
  best_day: string
}

export interface Insight {
  type: 'recommendation' | 'pattern' | 'warning' | 'opportunity'
  title: string
  detail: string
  confidence: 'low' | 'medium' | 'high'
  data: Record<string, any>
  actionable: boolean
}
