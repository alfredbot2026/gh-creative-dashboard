import { createClient } from '@/lib/supabase/server'

export interface AdPerformanceInsight {
  insight_type: 'framework_performance' | 'hook_performance' | 'format_performance' | 'audience_insight'
  framework: string
  metric_name: string
  metric_value: number
  sample_size: number
  period_start: string
  period_end: string
  kb_entries_used: string[]
}

export interface KBScoreUpdate {
  entry_id: string
  score_delta: number
  reason: string
}

export interface LearningResult {
  insights: AdPerformanceInsight[]
  kb_updates: KBScoreUpdate[]
  summary: string
}

interface AdPerformanceRow {
  id: string
  spend: number | null
  impressions: number | null
  clicks: number | null
  conversions: number | null
  revenue: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  roas: number | null
  content_item_id: string | null
}

interface ContentItemRow {
  id: string
  script_data: Record<string, unknown> | null
}

interface FrameworkGroup {
  framework: string
  roas_values: number[]
  ctr_values: number[]
  kb_entries: Set<string>
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * Analyze ad performance data and generate insights.
 * Groups by framework, identifies top/bottom performers,
 * and generates KB score adjustments.
 */
export async function analyzeAdPerformance(
  userId: string,
  periodDays: number = 30
): Promise<LearningResult> {
  const supabase = await createClient()

  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - periodDays)
  const periodStartStr = periodStart.toISOString().slice(0, 10)
  const periodEndStr = new Date().toISOString().slice(0, 10)

  // 1. Get ad performance rows linked to content items
  const { data: perfRows, error: perfError } = await supabase
    .from('ad_performance')
    .select('id, spend, impressions, clicks, conversions, revenue, ctr, cpc, cpm, roas, content_item_id')
    .eq('user_id', userId)
    .not('content_item_id', 'is', null)
    .gte('created_at', periodStart.toISOString())

  if (perfError || !perfRows || perfRows.length === 0) {
    return {
      insights: [],
      kb_updates: [],
      summary: `No linked ad performance data found in the last ${periodDays} days.`,
    }
  }

  // 2. Get the content items for these ads
  const contentItemIds = [...new Set(
    (perfRows as AdPerformanceRow[])
      .map(r => r.content_item_id)
      .filter((id): id is string => id !== null)
  )]

  const { data: contentItems } = await supabase
    .from('content_items')
    .select('id, script_data')
    .in('id', contentItemIds)

  const contentMap = new Map<string, ContentItemRow>(
    ((contentItems || []) as ContentItemRow[]).map(ci => [ci.id, ci])
  )

  // 3. Group by framework
  const frameworkGroups = new Map<string, FrameworkGroup>()

  for (const row of perfRows as AdPerformanceRow[]) {
    if (!row.content_item_id) continue
    const content = contentMap.get(row.content_item_id)
    if (!content?.script_data) continue

    // Extract framework from script_data
    // Ad variants store framework in variants[].framework or generation_provenance
    const scriptData = content.script_data as Record<string, unknown>
    const variants = (scriptData.variants || []) as Array<Record<string, unknown>>
    const provenance = scriptData.generation_provenance as Record<string, unknown> | undefined

    // Try to find framework name
    let framework = 'unknown'
    if (variants.length > 0 && variants[0].framework) {
      framework = String(variants[0].framework)
    }

    // Collect KB entries used
    const kbEntries = new Set<string>()
    if (provenance) {
      const entriesLoaded = (provenance.entries_loaded || []) as Array<Record<string, string>>
      for (const e of entriesLoaded) {
        if (e.id) kbEntries.add(e.id)
      }
    }
    for (const v of variants) {
      const techUsed = (v.techniques_used || []) as Array<Record<string, string>>
      for (const t of techUsed) {
        if (t.entry_id) kbEntries.add(t.entry_id)
      }
    }

    if (!frameworkGroups.has(framework)) {
      frameworkGroups.set(framework, {
        framework,
        roas_values: [],
        ctr_values: [],
        kb_entries: new Set(),
      })
    }

    const group = frameworkGroups.get(framework)!
    if (row.roas !== null && row.roas !== undefined) group.roas_values.push(row.roas)
    if (row.ctr !== null && row.ctr !== undefined) group.ctr_values.push(row.ctr)
    for (const e of kbEntries) group.kb_entries.add(e)
  }

  // 4. Generate insights
  const insights: AdPerformanceInsight[] = []

  for (const [, group] of frameworkGroups) {
    if (group.roas_values.length > 0) {
      insights.push({
        insight_type: 'framework_performance',
        framework: group.framework,
        metric_name: 'avg_roas',
        metric_value: Math.round(avg(group.roas_values) * 100) / 100,
        sample_size: group.roas_values.length,
        period_start: periodStartStr,
        period_end: periodEndStr,
        kb_entries_used: [...group.kb_entries],
      })
    }

    if (group.ctr_values.length > 0) {
      insights.push({
        insight_type: 'framework_performance',
        framework: group.framework,
        metric_name: 'avg_ctr',
        metric_value: Math.round(avg(group.ctr_values) * 10000) / 10000,
        sample_size: group.ctr_values.length,
        period_start: periodStartStr,
        period_end: periodEndStr,
        kb_entries_used: [...group.kb_entries],
      })
    }
  }

  // 5. Identify top/bottom performers and generate KB score updates
  const kb_updates: KBScoreUpdate[] = []
  const frameworksByRoas = [...frameworkGroups.values()]
    .filter(g => g.roas_values.length >= 3) // minimum sample size
    .sort((a, b) => avg(b.roas_values) - avg(a.roas_values))

  if (frameworksByRoas.length >= 2) {
    // Top performers: boost KB entries
    const topFramework = frameworksByRoas[0]
    for (const entryId of topFramework.kb_entries) {
      kb_updates.push({
        entry_id: entryId,
        score_delta: 0.05,
        reason: `Used in top-performing framework "${topFramework.framework}" (avg ROAS: ${avg(topFramework.roas_values).toFixed(2)}, n=${topFramework.roas_values.length})`,
      })
    }

    // Bottom performers: reduce KB entries
    const bottomFramework = frameworksByRoas[frameworksByRoas.length - 1]
    for (const entryId of bottomFramework.kb_entries) {
      kb_updates.push({
        entry_id: entryId,
        score_delta: -0.02,
        reason: `Used in underperforming framework "${bottomFramework.framework}" (avg ROAS: ${avg(bottomFramework.roas_values).toFixed(2)}, n=${bottomFramework.roas_values.length})`,
      })
    }
  }

  // 6. Save insights to DB
  if (insights.length > 0) {
    const insightRows = insights.map(i => ({
      user_id: userId,
      insight_type: i.insight_type,
      framework: i.framework,
      metric_name: i.metric_name,
      metric_value: i.metric_value,
      sample_size: i.sample_size,
      period_start: i.period_start,
      period_end: i.period_end,
      kb_entries_used: i.kb_entries_used,
    }))

    const { error: insertError } = await supabase
      .from('ad_performance_insights')
      .insert(insightRows)

    if (insertError) {
      console.error('[learning-engine] Failed to save insights:', insertError)
    }
  }

  // 7. Apply KB score updates
  for (const update of kb_updates) {
    const { data: entry } = await supabase
      .from('knowledge_entries')
      .select('effectiveness_score')
      .eq('id', update.entry_id)
      .limit(1)
      .single()

    if (entry) {
      const currentScore = entry.effectiveness_score ?? 0.5
      const newScore = Math.min(1.0, Math.max(0.0, currentScore + update.score_delta))

      await supabase
        .from('knowledge_entries')
        .update({ effectiveness_score: newScore })
        .eq('id', update.entry_id)
    }
  }

  // 8. Build summary
  const sortedFrameworks = [...frameworkGroups.entries()]
    .filter(([, g]) => g.roas_values.length > 0)
    .sort(([, a], [, b]) => avg(b.roas_values) - avg(a.roas_values))
    .map(([name, g]) => `${name}: ${avg(g.roas_values).toFixed(2)}x ROAS (${g.roas_values.length} ads)`)

  const summary = sortedFrameworks.length > 0
    ? `Framework performance (${periodDays}d):\n${sortedFrameworks.join('\n')}\n\nKB updates: ${kb_updates.length} entries adjusted.`
    : `No frameworks with enough data to analyze (need 3+ ads per framework).`

  return { insights, kb_updates, summary }
}
