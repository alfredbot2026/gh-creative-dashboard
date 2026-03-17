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
  const { data: mandatory } = await supabase
    .from('knowledge_entries')
    .select('*')
    .eq('is_mandatory_first_read', true)
    .eq('review_status', 'approved')

  // 2. Get lane-specific entries by requested categories
  const { data: entries } = await supabase
    .from('knowledge_entries')
    .select('*')
    .in('category', categories)
    .contains('lanes', [lane])
    .eq('review_status', 'approved')
    .order('effectiveness_score', { ascending: false })
    .limit(limit)

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
