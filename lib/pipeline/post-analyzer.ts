/**
 * Post Analyzer
 * 
 * Generates a plain-language "why this worked/didn't work" analysis for each post.
 * Compares individual post metrics against the user's profile averages.
 */
import type { PerformanceProfile } from './profile-types'

export interface PostAnalysis {
  verdict: 'outperformed' | 'average' | 'underperformed'
  score: number  // 0-100 relative to user's own content
  factors: AnalysisFactor[]
  summary: string  // Plain language summary for Grace
  tips: string[]  // Actionable tips
}

export interface AnalysisFactor {
  label: string
  impact: 'positive' | 'negative' | 'neutral'
  detail: string
}

interface PostData {
  platform: string
  content_type: string
  caption: string | null
  description: string | null
  published_at: string
  metrics: any
  classification: any
}

/**
 * Analyze a single post against the user's performance profile.
 */
export function analyzePost(post: PostData, profile: PerformanceProfile): PostAnalysis {
  const factors: AnalysisFactor[] = []
  const tips: string[] = []
  
  const metrics = post.metrics || {}
  const classification = post.classification || {}

  // -- Calculate engagement rate --
  let engRate = 0
  let avgEngRate = 0
  
  if (post.platform === 'youtube') {
    const views = metrics.views || metrics.viewCount || 0
    const likes = metrics.likes || metrics.likeCount || 0
    const comments = metrics.comments || metrics.commentCount || 0
    engRate = views > 0 ? (likes + comments) / views : 0
    
    const platPerf = profile.platform_performance?.youtube
    avgEngRate = platPerf?.avg_engagement_rate || 0.0187
  } else {
    const reach = metrics.reach || metrics.impressions || 0
    const likes = metrics.likes || metrics.like_count || 0
    const comments = metrics.comments || metrics.comments_count || 0
    const saves = metrics.saves || metrics.saved || 0
    engRate = reach > 0 ? (likes + comments + saves) / reach : 0
    
    const platPerf = profile.platform_performance?.instagram
    avgEngRate = platPerf?.avg_engagement_rate || 0.02
  }

  const engRatio = avgEngRate > 0 ? engRate / avgEngRate : 1

  // -- Verdict --
  let verdict: PostAnalysis['verdict'] = 'average'
  if (engRatio > 1.3) verdict = 'outperformed'
  else if (engRatio < 0.7) verdict = 'underperformed'

  // Score: 50 = average, 0-100 scale
  const score = Math.max(0, Math.min(100, Math.round(50 * (1 + Math.log2(Math.max(engRatio, 0.01))))))

  // -- Factor: Engagement Rate --
  factors.push({
    label: 'Engagement Rate',
    impact: engRatio > 1.2 ? 'positive' : engRatio < 0.8 ? 'negative' : 'neutral',
    detail: `${(engRate * 100).toFixed(2)}% (your average: ${(avgEngRate * 100).toFixed(2)}%) — ${engRatio > 1 ? `${((engRatio - 1) * 100).toFixed(0)}% above` : `${((1 - engRatio) * 100).toFixed(0)}% below`} your norm`,
  })

  // -- Factor: Hook Type --
  if (classification.hook_type) {
    const hookPerf = profile.hook_performance?.find(h => 
      h.label.toLowerCase().includes(classification.hook_type.toLowerCase().slice(0, 15))
    )
    if (hookPerf) {
      const hookRank = profile.hook_performance.indexOf(hookPerf)
      const totalHooks = profile.hook_performance.length
      const isTop = hookRank < totalHooks / 3
      const isBottom = hookRank > totalHooks * 2 / 3
      
      factors.push({
        label: 'Hook Type',
        impact: isTop ? 'positive' : isBottom ? 'negative' : 'neutral',
        detail: `"${classification.hook_type}" — ranked #${hookRank + 1} of ${totalHooks} hooks (${(hookPerf.avg_engagement_rate * 100).toFixed(2)}% avg engagement)`,
      })
      
      if (isBottom && profile.hook_performance[0]) {
        tips.push(`Try using "${profile.hook_performance[0].label}" hooks — they get ${(profile.hook_performance[0].avg_engagement_rate * 100).toFixed(2)}% engagement for you`)
      }
    }
  }

  // -- Factor: Content Purpose --
  if (classification.content_purpose) {
    const purposePerf = profile.purpose_performance?.find(p => p.label === classification.content_purpose)
    if (purposePerf) {
      const bestPurpose = profile.purpose_performance[0]
      factors.push({
        label: 'Content Type',
        impact: purposePerf === bestPurpose ? 'positive' : purposePerf.avg_engagement_rate < avgEngRate * 0.8 ? 'negative' : 'neutral',
        detail: `"${classification.content_purpose}" content gets ${(purposePerf.avg_engagement_rate * 100).toFixed(2)}% avg engagement`,
      })

      // Content mix check
      const actual = profile.content_mix_actual?.[classification.content_purpose] || 0
      const optimal = profile.content_mix_optimal?.[classification.content_purpose] || 0
      if (actual > optimal * 1.5) {
        tips.push(`You're posting too much "${classification.content_purpose}" content (${Math.round(actual * 100)}% vs recommended ${Math.round(optimal * 100)}%). Try mixing in more "${profile.purpose_performance[0]?.label || 'story'}" posts`)
      }
    }
  }

  // -- Factor: Visual Style --
  if (classification.visual_style) {
    const stylePerf = profile.visual_style_performance?.find(v => 
      v.label.toLowerCase() === classification.visual_style.toLowerCase()
    )
    if (stylePerf) {
      factors.push({
        label: 'Visual Style',
        impact: stylePerf.avg_engagement_rate > avgEngRate ? 'positive' : 'neutral',
        detail: `"${classification.visual_style}" — ${(stylePerf.avg_engagement_rate * 100).toFixed(2)}% avg engagement, ${stylePerf.avg_reach.toLocaleString()} avg reach`,
      })
    }
  }

  // -- Factor: Posting Time --
  const pubDate = new Date(post.published_at)
  const dayOfWeek = pubDate.getDay()
  const hour = pubDate.getHours()
  
  const bestDay = profile.best_posting_days?.[0]
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayPerf = profile.best_posting_days?.find(d => d.day === days[dayOfWeek])
  
  if (dayPerf && bestDay) {
    factors.push({
      label: 'Posting Day',
      impact: dayPerf === bestDay ? 'positive' : dayPerf.avg_engagement < bestDay.avg_engagement * 0.7 ? 'negative' : 'neutral',
      detail: `Posted on ${days[dayOfWeek]} (${(dayPerf.avg_engagement * 100).toFixed(2)}% avg) — your best day is ${bestDay.day} (${(bestDay.avg_engagement * 100).toFixed(2)}%)`,
    })
    
    if (dayPerf.avg_engagement < bestDay.avg_engagement * 0.7) {
      tips.push(`Try posting this on ${bestDay.day} instead — it gets ${Math.round((bestDay.avg_engagement / dayPerf.avg_engagement - 1) * 100)}% higher engagement`)
    }
  }

  // -- Factor: YouTube-specific analytics --
  if (post.platform === 'youtube') {
    // Retention
    if (metrics.avg_view_percentage) {
      const retention = metrics.avg_view_percentage
      factors.push({
        label: 'Audience Retention',
        impact: retention > 50 ? 'positive' : retention < 30 ? 'negative' : 'neutral',
        detail: `${retention.toFixed(1)}% average retention — ${retention > 50 ? 'great! Most viewers watched over half' : retention > 30 ? 'decent, but room to improve' : 'low — viewers are dropping off early'}`,
      })
      
      if (retention < 30) {
        tips.push('Your retention is low — try hooking viewers in the first 3 seconds with a question or surprising visual')
      }
    }

    // CTR
    if (metrics.ctr > 0) {
      factors.push({
        label: 'Click-Through Rate',
        impact: metrics.ctr > 5 ? 'positive' : metrics.ctr < 2 ? 'negative' : 'neutral',
        detail: `${metrics.ctr.toFixed(1)}% CTR — ${metrics.ctr > 5 ? 'excellent! Your thumbnail and title are working' : metrics.ctr < 2 ? 'low — your thumbnail or title may need work' : 'average'}`,
      })
      
      if (metrics.ctr < 2) {
        tips.push('Low CTR means people see your video but don\'t click. Try a more eye-catching thumbnail or a curiosity-driven title')
      }
    }

    // Watch time
    if (metrics.avg_view_duration && metrics.duration) {
      const durationMatch = metrics.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (durationMatch) {
        const totalSec = (parseInt(durationMatch[1] || '0') * 3600) + (parseInt(durationMatch[2] || '0') * 60) + parseInt(durationMatch[3] || '0')
        if (totalSec > 0) {
          const avgDur = metrics.avg_view_duration
          const pct = (avgDur / totalSec) * 100
          factors.push({
            label: 'Average Watch Time',
            impact: pct > 60 ? 'positive' : pct < 30 ? 'negative' : 'neutral',
            detail: `Viewers watch ${avgDur}s of ${totalSec}s (${pct.toFixed(0)}%) — ${pct > 60 ? 'strong retention' : pct < 30 ? 'most viewers leave early' : 'average'}`,
          })
        }
      }
    }

    // Subscriber impact
    if (metrics.subscribers_gained > 0) {
      factors.push({
        label: 'Subscriber Impact',
        impact: 'positive',
        detail: `Gained ${metrics.subscribers_gained} subscriber${metrics.subscribers_gained > 1 ? 's' : ''} from this video`,
      })
    }

    // Shares
    if (metrics.shares > 0) {
      factors.push({
        label: 'Shares',
        impact: 'positive',
        detail: `Shared ${metrics.shares} time${metrics.shares > 1 ? 's' : ''} — shares are the strongest signal of great content`,
      })
    }
  }

  // -- Factor: Instagram saves --
  if (post.platform === 'instagram' && (metrics.saves || metrics.saved) > 0) {
    const saves = metrics.saves || metrics.saved
    factors.push({
      label: 'Saves',
      impact: 'positive',
      detail: `${saves} save${saves > 1 ? 's' : ''} — saves mean people found this valuable enough to come back to`,
    })
  }

  // -- Build summary --
  const positives = factors.filter(f => f.impact === 'positive')
  const negatives = factors.filter(f => f.impact === 'negative')
  
  let summary = ''
  if (verdict === 'outperformed') {
    summary = `This post did ${Math.round((engRatio - 1) * 100)}% better than your average. `
    if (positives.length > 0) {
      summary += `What worked: ${positives.map(f => f.label.toLowerCase()).join(', ')}. `
    }
  } else if (verdict === 'underperformed') {
    summary = `This post did ${Math.round((1 - engRatio) * 100)}% worse than your average. `
    if (negatives.length > 0) {
      summary += `What may have hurt it: ${negatives.map(f => f.label.toLowerCase()).join(', ')}. `
    }
  } else {
    summary = `This post performed about average for your content. `
  }

  if (tips.length === 0 && verdict !== 'outperformed') {
    tips.push('Keep experimenting with different hooks and posting times to find what resonates')
  }

  return { verdict, score, factors, summary, tips }
}
