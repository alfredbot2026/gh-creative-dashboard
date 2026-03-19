import { createClient } from '@/lib/supabase/server'
import { AdVariant } from '@/lib/create/ad-types'

export interface AdPerformanceInsight {
  id?: string
  user_id?: string
  insight_type: 'framework_performance' | 'hook_performance' | 'format_performance' | 'audience_insight'
  framework?: string
  metric_name: string
  metric_value: number
  sample_size: number
  period_start: string
  period_end: string
  kb_entries_used?: string[]
  raw_data?: any
}

export interface LearningResult {
  insights: AdPerformanceInsight[]
  kb_updates: Array<{ entry_id: string; score_delta: number; reason: string }>
  summary: string
}

export async function analyzeAdPerformance(
  userId: string,
  periodDays: number = 30
): Promise<LearningResult> {
  const supabase = await createClient()
  
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - periodDays)

  // 1. Query ad_performance joined with content_items
  const { data: performanceData, error: perfError } = await supabase
    .from('ad_performance')
    .select(`
      *,
      content_items (
        id,
        script_data,
        platform,
        content_type
      )
    `)
    .eq('user_id', userId)
    .not('content_item_id', 'is', null)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (perfError || !performanceData) {
    throw new Error(`Failed to fetch performance data: ${perfError?.message}`)
  }

  // 2. Parse and group by framework
  const frameworkStats: Record<string, {
    spend: number,
    revenue: number,
    clicks: number,
    impressions: number,
    count: number,
    kb_entries: Set<string>
  }> = {}

  for (const row of performanceData) {
    const item = row.content_items
    if (!item || !item.script_data) continue

    let framework = 'Unknown'
    let kbEntries: string[] = []
    
    if (item.script_data.variants && Array.isArray(item.script_data.variants)) {
       const variant = item.script_data.variants[0] as AdVariant
       if (variant) {
         framework = variant.framework_used || 'Unknown'
         kbEntries = variant.knowledge_entries_used || []
       }
    } else if (item.script_data.framework_used) {
       framework = item.script_data.framework_used
       kbEntries = item.script_data.knowledge_entries_used || []
    }

    if (!frameworkStats[framework]) {
      frameworkStats[framework] = { spend: 0, revenue: 0, clicks: 0, impressions: 0, count: 0, kb_entries: new Set() }
    }

    frameworkStats[framework].spend += Number(row.spend) || 0
    frameworkStats[framework].revenue += Number(row.revenue) || 0
    frameworkStats[framework].clicks += Number(row.clicks) || 0
    frameworkStats[framework].impressions += Number(row.impressions) || 0
    frameworkStats[framework].count += 1
    
    for (const kb of kbEntries) {
      frameworkStats[framework].kb_entries.add(kb)
    }
  }

  const insights: AdPerformanceInsight[] = []
  const kbUpdates: LearningResult['kb_updates'] = []

  const frameworkRoas: Array<{ framework: string, roas: number, count: number, entries: string[] }> = []

  for (const [framework, stats] of Object.entries(frameworkStats)) {
    const roas = stats.spend > 0 ? stats.revenue / stats.spend : 0
    frameworkRoas.push({
      framework,
      roas,
      count: stats.count,
      entries: Array.from(stats.kb_entries)
    })

    if (stats.count > 0) {
      insights.push({
        user_id: userId,
        insight_type: 'framework_performance',
        framework,
        metric_name: 'ROAS',
        metric_value: roas,
        sample_size: stats.count,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        kb_entries_used: Array.from(stats.kb_entries),
      })
    }
  }

  frameworkRoas.sort((a, b) => b.roas - a.roas)

  // 4 & 6. KB score updates
  if (frameworkRoas.length > 0) {
    const top = frameworkRoas[0]
    const bottom = frameworkRoas[frameworkRoas.length - 1]

    if (top.count >= 3 && top.roas > 1.0) {
      for (const entry of top.entries) {
        kbUpdates.push({ entry_id: entry, score_delta: 0.05, reason: `Used in top performing framework ${top.framework} (ROAS ${top.roas.toFixed(2)})` })
      }
    }

    if (bottom.count >= 3 && bottom.roas < 1.0 && bottom.framework !== top.framework) {
      for (const entry of bottom.entries) {
        kbUpdates.push({ entry_id: entry, score_delta: -0.02, reason: `Used in bottom performing framework ${bottom.framework} (ROAS ${bottom.roas.toFixed(2)})` })
      }
    }
  }

  // 7. Insert insights
  if (insights.length > 0) {
    await supabase.from('ad_performance_insights').insert(insights)
  }

  // 8. Apply KB score updates
  for (const update of kbUpdates) {
    const { data: kbData } = await supabase.from('knowledge_entries').select('effectiveness_score').eq('id', update.entry_id).single()
    if (kbData) {
      let newScore = (kbData.effectiveness_score || 0.5) + update.score_delta
      newScore = Math.max(0.0, Math.min(1.0, newScore))
      await supabase.from('knowledge_entries').update({ effectiveness_score: newScore }).eq('id', update.entry_id)
    }
  }

  return {
    insights,
    kb_updates: kbUpdates,
    summary: `Analyzed ${performanceData.length} performance records across ${frameworkRoas.length} frameworks.`
  }
}
