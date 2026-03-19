import { createClient } from '@/lib/supabase/server'
import type { KnowledgeEntry } from '@/lib/knowledge/types'

/**
 * Retrieve relevant KB entries for content generation.
 * Pulls: hooks, scripting frameworks, brand identity (mandatory first-read),
 * and any lane-specific entries sorted by effectiveness_score.
 */
export async function getGenerationContext(
  lane: 'short-form' | 'ads' | 'youtube',
  categories: string[],
  limit: number = 15
): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  const supabase = await createClient()

  // 1. Always get mandatory first-read entries (brand identity)
  // Prefer approved; if none exist yet, fall back to candidate so the app has KB context on first run.
  const { data: mandatoryApproved } = await supabase
    .from('knowledge_entries')
    .select('*')
    .eq('is_mandatory_first_read', true)
    .eq('review_status', 'approved')

  const mandatory = (mandatoryApproved && mandatoryApproved.length > 0)
    ? mandatoryApproved
    : (await supabase
        .from('knowledge_entries')
        .select('*')
        .eq('is_mandatory_first_read', true)
        .eq('review_status', 'candidate')
      ).data

  // 2. Get lane-specific entries by requested categories
  // Prefer approved; if none exist yet, fall back to candidate.
  const { data: entriesApproved } = await supabase
    .from('knowledge_entries')
    .select('*')
    .in('category', categories)
    .contains('lanes', [lane])
    .eq('review_status', 'approved')
    .order('effectiveness_score', { ascending: false })
    .limit(limit)

  let tier: 'approved' | 'candidate' = 'approved'
  let entries = entriesApproved
  
  if (!entriesApproved || entriesApproved.length === 0) {
    tier = 'candidate'
    const { data } = await supabase
      .from('knowledge_entries')
      .select('*')
      .in('category', categories)
      .contains('lanes', [lane])
      .eq('review_status', 'candidate')
      .order('effectiveness_score', { ascending: false })
      .limit(limit)
    entries = data
  }

  // Deduplicate (mandatory entries might overlap) and enforce category diversity
  const MAX_PER_CATEGORY = 5
  const seen = new Set<string>()
  const result: KnowledgeEntry[] = []
  const categoryCount: Record<string, number> = {}

  for (const entry of [...(mandatory || []), ...(entries || [])]) {
    if (!seen.has(entry.id)) {
      const cat = entry.category
      
      // Always include mandatory first-read regardless of category count limits
      if (entry.is_mandatory_first_read) {
        seen.add(entry.id)
        result.push(entry)
        continue
      }
      
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
      if (categoryCount[cat] <= MAX_PER_CATEGORY) {
        seen.add(entry.id)
        result.push(entry)
      }
      
      if (result.length >= limit) break
    }
  }


  return { entries: result, tier }
}

/**
 * Get brand style guide for prompt injection.
 */
export async function getBrandContext(): Promise<Record<string, unknown> | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('brand_style_guide')
    .select('*')
    .limit(1)
    .single()
  return data
}

/**
 * Retrieve KB entries specifically for Ad Copy Generation.
 */
export async function getAdGenerationContext(limit: number = 25): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  return getGenerationContext(
    'ads',
    ['ad_creative', 'hook_library', 'cro_patterns', 'content_funnel', 'virality_science', 'platform_intelligence'],
    limit
  )
}

/**
 * Retrieve KB entries specifically for Short-Form Script Generation.
 */
export async function getShortFormGenerationContext(limit: number = 25): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  return getGenerationContext(
    'short-form',
    ['hook_library', 'scripting_framework', 'virality_science', 'content_funnel', 'platform_intelligence'],
    limit
  )
}

/**
 * Retrieve KB entries with pinned selected hook/framework at the front.
 * Used when Content Purpose Picker has specific selections.
 */
export async function getContextWithPinnedSelections(
  lane: 'short-form' | 'ads' | 'youtube',
  categories: string[],
  selectedHookId?: string,
  selectedFrameworkId?: string,
  limit: number = 25
): Promise<{ entries: KnowledgeEntry[], pinnedHook?: KnowledgeEntry, pinnedFramework?: KnowledgeEntry, tier: 'approved' | 'candidate' }> {
  const supabase = await createClient()

  // Fetch pinned entries if specified
  const pinnedIds = [selectedHookId, selectedFrameworkId].filter(Boolean) as string[]
  let pinnedHook: KnowledgeEntry | undefined
  let pinnedFramework: KnowledgeEntry | undefined

  if (pinnedIds.length > 0) {
    const { data: pinned } = await supabase
      .from('knowledge_entries')
      .select('*')
      .in('id', pinnedIds)
    if (pinned) {
      pinnedHook = pinned.find(e => e.id === selectedHookId)
      pinnedFramework = pinned.find(e => e.id === selectedFrameworkId)
    }
  }

  // Get regular context
  const { entries, tier } = await getGenerationContext(lane, categories, limit)

  // Merge: pinned entries go first, dedup rest
  const pinnedSet = new Set(pinnedIds)
  const rest = entries.filter(e => !pinnedSet.has(e.id))
  const merged = [
    ...(pinnedHook ? [pinnedHook] : []),
    ...(pinnedFramework ? [pinnedFramework] : []),
    ...rest,
  ].slice(0, limit)

  return { entries: merged, pinnedHook, pinnedFramework, tier }
}
