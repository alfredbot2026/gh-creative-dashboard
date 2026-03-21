/**
 * Insights Generator
 * 
 * Translates a Performance Profile into plain-language, actionable insights.
 */
import type { PerformanceProfile, Insight } from './profile-types'

/**
 * Generate insights from a performance profile.
 * Returns at most 12 insights, prioritized by confidence + actionability.
 */
export function generateInsights(profile: PerformanceProfile): Insight[] {
  const insights: Insight[] = []

  // 1. Top hooks by engagement
  const topHooks = profile.hook_performance.filter(h => h.confidence !== 'low').slice(0, 3)
  if (topHooks.length > 0) {
    const avgAll = profile.hook_performance.reduce((a, b) => a + b.avg_engagement_rate, 0) / (profile.hook_performance.length || 1)
    const multiplier = topHooks[0].avg_engagement_rate / (avgAll || 1)
    
    insights.push({
      type: 'recommendation',
      title: `Your best hook is "${topHooks[0].label}"`,
      detail: `${topHooks[0].label} gets ${multiplier.toFixed(1)}x more engagement than your average hook. Used in ${topHooks[0].sample_size} posts.`,
      confidence: topHooks[0].confidence,
      data: { hooks: topHooks },
      actionable: true,
    })
  }

  // 2. Best posting times
  if (profile.best_posting_times.length > 0) {
    const top = profile.best_posting_times[0]
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    insights.push({
      type: 'recommendation',
      title: `Best posting time: ${days[top.day_of_week]} at ${top.hour}:00`,
      detail: `Posts at this time get the highest engagement (based on ${top.sample_size} posts).`,
      confidence: top.sample_size >= 10 ? 'high' : top.sample_size >= 5 ? 'medium' : 'low',
      data: { top_times: profile.best_posting_times.slice(0, 5) },
      actionable: true,
    })
  }

  // 3. Content mix imbalance
  const mixDiffs: { purpose: string; actual: number; optimal: number; diff: number }[] = []
  for (const [purpose, optimal] of Object.entries(profile.content_mix_optimal)) {
    const actual = profile.content_mix_actual[purpose] || 0
    const diff = actual - optimal
    if (Math.abs(diff) > 0.1) {
      mixDiffs.push({ purpose, actual, optimal, diff })
    }
  }
  if (mixDiffs.length > 0) {
    const biggest = mixDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0]
    const direction = biggest.diff > 0 ? 'too much' : 'not enough'
    insights.push({
      type: 'warning',
      title: `Content mix: ${direction} "${biggest.purpose}"`,
      detail: `You're at ${Math.round(biggest.actual * 100)}% ${biggest.purpose} content vs recommended ${Math.round(biggest.optimal * 100)}%.`,
      confidence: 'medium',
      data: { actual: profile.content_mix_actual, optimal: profile.content_mix_optimal },
      actionable: true,
    })
  }

  // 4. Stale topics (not posted in >2x their normal frequency)
  const staleDays = 14  // Topics not posted in 2 weeks
  const now = new Date()
  const staleTopics = profile.topic_freshness.filter(t => {
    const daysSince = (now.getTime() - new Date(t.last_posted).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > Math.max(t.frequency_days * 2, staleDays)
  })
  if (staleTopics.length > 0) {
    const top = staleTopics[0]
    const daysSince = Math.round((now.getTime() - new Date(top.last_posted).getTime()) / (1000 * 60 * 60 * 24))
    insights.push({
      type: 'opportunity',
      title: `"${top.topic}" hasn't been covered in ${daysSince} days`,
      detail: `You normally post about this every ~${top.frequency_days} days on ${top.platform}. Performance: ${top.performance.replace('_', ' ')}.`,
      confidence: 'medium',
      data: { stale_topics: staleTopics.slice(0, 5) },
      actionable: true,
    })
  }

  // 5. Declining trends
  const declining = profile.hook_performance.filter(h => h.trend === 'declining' && h.confidence !== 'low')
  if (declining.length > 0) {
    insights.push({
      type: 'warning',
      title: `"${declining[0].label}" hook is losing effectiveness`,
      detail: `Recent posts using this hook perform worse than your historical average. Consider switching to rising alternatives.`,
      confidence: declining[0].confidence,
      data: { declining },
      actionable: true,
    })
  }

  // 6. Rising trends
  const rising = profile.hook_performance.filter(h => h.trend === 'rising' && h.confidence !== 'low')
  if (rising.length > 0) {
    insights.push({
      type: 'pattern',
      title: `"${rising[0].label}" hook is gaining momentum`,
      detail: `Recent posts with this hook outperform your historical average. Keep using it!`,
      confidence: rising[0].confidence,
      data: { rising },
      actionable: false,
    })
  }

  // 7. Platform differences
  const platforms = Object.entries(profile.platform_performance)
  if (platforms.length >= 2) {
    const sorted = platforms.sort((a, b) => b[1].avg_engagement_rate - a[1].avg_engagement_rate)
    if (sorted[0][1].avg_engagement_rate > sorted[1][1].avg_engagement_rate * 1.3) {
      insights.push({
        type: 'pattern',
        title: `${sorted[0][0]} outperforms ${sorted[1][0]} by ${Math.round((sorted[0][1].avg_engagement_rate / sorted[1][1].avg_engagement_rate - 1) * 100)}%`,
        detail: `Best hook on ${sorted[0][0]}: ${sorted[0][1].best_hook}. Best day: ${sorted[0][1].best_day}.`,
        confidence: 'medium',
        data: { platforms: profile.platform_performance },
        actionable: false,
      })
    }
  }

  // 8. Top structure
  const topStructure = profile.structure_performance.filter(s => s.confidence !== 'low')[0]
  if (topStructure) {
    insights.push({
      type: 'recommendation',
      title: `Best content structure: "${topStructure.label}"`,
      detail: `Gets ${topStructure.avg_engagement_rate.toFixed(4)} engagement rate across ${topStructure.sample_size} posts. Saves: ${topStructure.avg_saves.toFixed(1)} avg.`,
      confidence: topStructure.confidence,
      data: { structures: profile.structure_performance.slice(0, 5) },
      actionable: true,
    })
  }

  // 9. Saves insight (saves = strongest signal)
  const highSaves = [...profile.hook_performance].sort((a, b) => b.avg_saves - a.avg_saves)[0]
  if (highSaves && highSaves.avg_saves > 0) {
    insights.push({
      type: 'pattern',
      title: `"${highSaves.label}" hooks get the most saves`,
      detail: `${highSaves.avg_saves.toFixed(1)} saves on average. Saves are the strongest signal that content is valuable.`,
      confidence: highSaves.confidence,
      data: { hook: highSaves },
      actionable: true,
    })
  }

  // Sort by: actionable first, then by confidence (high > medium > low)
  const confOrder = { high: 3, medium: 2, low: 1 }
  return insights
    .sort((a, b) => {
      if (a.actionable !== b.actionable) return a.actionable ? -1 : 1
      return confOrder[b.confidence] - confOrder[a.confidence]
    })
    .slice(0, 12)
}
