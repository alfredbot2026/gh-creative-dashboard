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
): Promise<KnowledgeEntry[]> {
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

  const entries = (entriesApproved && entriesApproved.length > 0)
    ? entriesApproved
    : (await supabase
        .from('knowledge_entries')
        .select('*')
        .in('category', categories)
        .contains('lanes', [lane])
        .eq('review_status', 'candidate')
        .order('effectiveness_score', { ascending: false })
        .limit(limit)
      ).data

  // Deduplicate (mandatory entries might overlap)
  const seen = new Set<string>()
  const result: KnowledgeEntry[] = []
  for (const entry of [...(mandatory || []), ...(entries || [])]) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id)
      result.push(entry)
    }
  }

  return result
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
export async function getAdGenerationContext(limit: number = 15): Promise<KnowledgeEntry[]> {
  // Categories must match the `knowledge_entries.category` CHECK constraint (see migration 001)
  return getGenerationContext(
    'ads',
    ['ad_creative', 'hook_library', 'cro_patterns', 'brand_identity'],
    limit
  )
}
