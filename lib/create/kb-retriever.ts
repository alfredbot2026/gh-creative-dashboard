import { createClient } from '@/lib/supabase/server'
import type { KnowledgeEntry } from '@/lib/knowledge/types'

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Tiered KB selection engine.
 * 
 * 1. Fetch the FULL pool of matching entries (not just top N)
 * 2. Split into tiers by effectiveness_score:
 *    - Tier A (>70): proven performers → always included first
 *    - Tier B (50-70): average/unscored → randomly sampled
 *    - Tier C (<50): underperformers → excluded
 * 3. Enforce category diversity (max 3 per category)
 * 4. Result: mix of best + random fresh entries every time
 */
export async function getGenerationContext(
  lane: 'short-form' | 'ads' | 'youtube',
  categories: string[],
  limit: number = 15
): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  const supabase = await createClient()

  // 1. Always get mandatory first-read entries
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

  // 2. Fetch the FULL POOL — not limited, so we can randomly sample
  const { data: poolApproved } = await supabase
    .from('knowledge_entries')
    .select('*')
    .in('category', categories)
    .contains('lanes', [lane])
    .eq('review_status', 'approved')

  let poolTier: 'approved' | 'candidate' = 'approved'
  let pool = poolApproved || []
  
  if (pool.length === 0) {
    poolTier = 'candidate'
    const { data } = await supabase
      .from('knowledge_entries')
      .select('*')
      .in('category', categories)
      .contains('lanes', [lane])
      .eq('review_status', 'candidate')
    pool = data || []
  }

  // 3. Split into tiers
  const tierA: KnowledgeEntry[] = [] // score > 70 — proven winners
  const tierB: KnowledgeEntry[] = [] // score 50-70 — average/unscored (default 50)
  // Tier C (< 50) is excluded entirely

  for (const entry of pool) {
    const score = entry.effectiveness_score ?? 50
    if (score > 70) tierA.push(entry)
    else if (score >= 50) tierB.push(entry)
    // score < 50 → excluded
  }

  // 4. Build result: mandatory → Tier A → random from Tier B
  const MAX_PER_CATEGORY = 3
  const mandatoryIds = new Set((mandatory || []).map(e => e.id))
  const seen = new Set<string>()
  const result: KnowledgeEntry[] = []
  const categoryCount: Record<string, number> = {}

  // Helper to add with category diversity check
  const tryAdd = (entry: KnowledgeEntry, force = false): boolean => {
    if (seen.has(entry.id)) return false
    const cat = entry.category
    categoryCount[cat] = (categoryCount[cat] || 0)
    if (!force && categoryCount[cat] >= MAX_PER_CATEGORY) return false
    seen.add(entry.id)
    result.push(entry)
    categoryCount[cat]++
    return true
  }

  // Mandatory first-reads always included
  for (const entry of (mandatory || [])) {
    tryAdd(entry, true)
  }

  // Tier A: include all (they've proven themselves), shuffled for variety
  for (const entry of shuffle(tierA)) {
    if (result.length >= limit) break
    if (!mandatoryIds.has(entry.id)) tryAdd(entry)
  }

  // Tier B: randomly sample to fill remaining slots
  for (const entry of shuffle(tierB)) {
    if (result.length >= limit) break
    if (!mandatoryIds.has(entry.id)) tryAdd(entry)
  }

  return { entries: result, tier: poolTier }
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

export async function getContentTypeContext(
  lane: 'short-form' | 'ads' | 'youtube' | 'social_media',
  contentType: 'educate' | 'story' | 'prove' | 'sell',
  limit: number = 25
): Promise<{ entries: KnowledgeEntry[], hooks: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  let categories: string[] = []
  if (contentType === 'educate') categories = ['content_funnel', 'scripting_framework']
  else if (contentType === 'story') categories = ['scripting_framework', 'virality_science']
  else if (contentType === 'prove') categories = ['cro_patterns', 'ad_creative']
  else if (contentType === 'sell') categories = ['ad_creative', 'cro_patterns', 'content_funnel']
  else if (contentType === 'trend') categories = ['virality_science', 'platform_intelligence', 'hook_library']
  else if (contentType === 'inspire') categories = ['scripting_framework', 'content_funnel', 'virality_science']
  else if (contentType === 'debunk') categories = ['scripting_framework', 'virality_science', 'hook_library']
  else if (contentType === 'process') categories = ['content_funnel', 'scripting_framework']
  else if (contentType === 'journey') categories = ['scripting_framework', 'virality_science', 'content_funnel']
  else if (contentType === 'announce') categories = ['ad_creative', 'cro_patterns', 'hook_library']

  const validLane = lane === 'social_media' ? 'short-form' : lane
  const { entries, tier } = await getGenerationContext(validLane as 'short-form' | 'ads' | 'youtube', categories, limit - 5)
  
  const supabase = await createClient()
  const { data: hooksApproved } = await supabase
    .from('knowledge_entries')
    .select('*')
    .eq('category', 'hook_library')
    .contains('lanes', [validLane])
    .eq('review_status', 'approved')
    .limit(30)

  let hooks = hooksApproved || []
  if (hooks.length === 0) {
    const { data } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('category', 'hook_library')
      .contains('lanes', [validLane])
      .eq('review_status', 'candidate')
      .limit(15)
    hooks = data || []
  }

  // Shuffle hooks and take 5 — different hooks every generation
  hooks = shuffle(hooks).slice(0, 5)

  return { entries, hooks, tier }
}
