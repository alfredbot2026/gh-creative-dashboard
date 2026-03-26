/**
 * Ad Performance Context Builder
 * Pulls aggregated ad performance data to inject into generation prompts.
 * Closes the feedback loop: real ad ROAS → better content generation.
 */
import { createClient } from '@/lib/supabase/server'

export interface AdPerformanceContext {
  topStructures: string[]
  topHooks: string[]
  topTopics: string[]
  roasByStructure: Record<string, { avg_roas: number; sample_size: number }>
  roasByHook: Record<string, { avg_roas: number; sample_size: number }>
  hasEnoughData: boolean
  dataWindow: string
  promptFragment: string // Pre-built text to inject into LLM prompts
}

interface AggRow {
  dimension: string
  avg_roas: number
  total_spend: number
  sample_size: number
}

/**
 * Aggregate ad performance by a dimension (structure_slug, hook_type, or topic).
 */
async function aggregateByDimension(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  column: string,
): Promise<AggRow[]> {
  // Fetch all ad performance rows and aggregate in JS
  const { data } = await supabase
    .from('ad_performance')
    .select('structure_slug, hook_type, topic, spend, roas')
    .eq('user_id', userId)
    .gt('spend', 0)

  if (!data || data.length === 0) return []

  // Group and aggregate in JS
  const groups = new Map<string, { spends: number[]; roasValues: number[] }>()
  for (const row of data) {
    const key = (row as Record<string, any>)[column] as string
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { spends: [], roasValues: [] })
    const g = groups.get(key)!
    g.spends.push((row as Record<string, any>).spend || 0)
    g.roasValues.push((row as Record<string, any>).roas || 0)
  }

  return Array.from(groups.entries())
    .map(([dim, g]) => ({
      dimension: dim,
      avg_roas: g.roasValues.reduce((a, b) => a + b, 0) / g.roasValues.length,
      total_spend: g.spends.reduce((a, b) => a + b, 0),
      sample_size: g.spends.length,
    }))
    .sort((a, b) => b.avg_roas - a.avg_roas)
}

/**
 * Get ad performance context for prompt injection.
 * Returns empty context (hasEnoughData=false) if insufficient data.
 */
export async function getAdPerformanceContext(userId: string): Promise<AdPerformanceContext> {
  const supabase = await createClient()

  // Check if we have enough data to be useful
  const { count } = await supabase
    .from('ad_performance')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('spend', 0)

  const { data: spendData } = await supabase
    .from('ad_performance')
    .select('spend')
    .eq('user_id', userId)
    .gt('spend', 0)

  const totalSpend = spendData?.reduce((s, r) => s + (r.spend || 0), 0) || 0
  const hasEnoughData = (count || 0) >= 5 && totalSpend >= 3000

  if (!hasEnoughData) {
    return {
      topStructures: [],
      topHooks: [],
      topTopics: [],
      roasByStructure: {},
      roasByHook: {},
      hasEnoughData: false,
      dataWindow: 'Insufficient data',
      promptFragment: '',
    }
  }

  // Aggregate by each dimension
  const [byStructure, byHook, byTopic] = await Promise.all([
    aggregateByDimension(supabase, userId, 'structure_slug'),
    aggregateByDimension(supabase, userId, 'hook_type'),
    aggregateByDimension(supabase, userId, 'topic'),
  ])

  const topStructures = byStructure.slice(0, 5).map(r => r.dimension)
  const topHooks = byHook.slice(0, 5).map(r => r.dimension)
  const topTopics = byTopic.slice(0, 5).map(r => r.dimension)

  const roasByStructure: Record<string, { avg_roas: number; sample_size: number }> = {}
  for (const r of byStructure) {
    roasByStructure[r.dimension] = { avg_roas: Math.round(r.avg_roas * 100) / 100, sample_size: r.sample_size }
  }

  const roasByHook: Record<string, { avg_roas: number; sample_size: number }> = {}
  for (const r of byHook) {
    roasByHook[r.dimension] = { avg_roas: Math.round(r.avg_roas * 100) / 100, sample_size: r.sample_size }
  }

  // Build prompt fragment
  const structureLines = byStructure.slice(0, 5)
    .map(r => `  - ${r.dimension}: ${r.avg_roas.toFixed(1)}x return (${r.sample_size} ads)`)
    .join('\n')
  const hookLines = byHook.slice(0, 5)
    .map(r => `  - ${r.dimension}: ${r.avg_roas.toFixed(1)}x return (${r.sample_size} ads)`)
    .join('\n')
  const topicLines = byTopic.slice(0, 5)
    .map(r => `  - ${r.dimension}: ${r.avg_roas.toFixed(1)}x return (${r.sample_size} ads)`)
    .join('\n')

  const promptFragment = `
## AD PERFORMANCE DATA (from actual paid ads — last 90 days)
Best-converting structures:
${structureLines || '  (no structure data yet)'}

Best-converting hooks:
${hookLines || '  (no hook data yet)'}

Topics that convert as ads:
${topicLines || '  (no topic data yet)'}

When generating content, prefer patterns that have proven ad conversion data.
If the goal is "sell" or "announce", heavily weight ad-proven patterns.
`.trim()

  return {
    topStructures,
    topHooks,
    topTopics,
    roasByStructure,
    roasByHook,
    hasEnoughData: true,
    dataWindow: 'Last 90 days',
    promptFragment,
  }
}
