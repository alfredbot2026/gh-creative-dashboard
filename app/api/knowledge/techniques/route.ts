/**
 * GET /api/knowledge/techniques
 * Returns top hooks + frameworks for a given content purpose + lane.
 * Used by Content Purpose Picker UI to surface technique options before generation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { KnowledgeEntry } from '@/lib/knowledge/types'

const PURPOSE_CATEGORIES: Record<string, { hooks: string[], frameworks: string[], supporting: string[] }> = {
  educate: {
    hooks:      ['hook_library'],
    frameworks: ['scripting_framework', 'virality_science'],
    supporting: ['content_funnel', 'platform_intelligence'],
  },
  story: {
    hooks:      ['hook_library'],
    frameworks: ['scripting_framework'],
    supporting: ['virality_science', 'brand_identity'],
  },
  sell: {
    hooks:      ['hook_library', 'ad_creative'],
    frameworks: ['ad_creative', 'cro_patterns'],
    supporting: ['content_funnel', 'virality_science'],
  },
  prove: {
    hooks:      ['hook_library'],
    frameworks: ['virality_science', 'cro_patterns'],
    supporting: ['ad_creative', 'platform_intelligence'],
  },
  trend: {
    hooks:      ['hook_library'],
    frameworks: ['platform_intelligence', 'virality_science'],
    supporting: ['scripting_framework'],
  },
  inspire: {
    hooks:      ['hook_library'],
    frameworks: ['content_funnel', 'scripting_framework'],
    supporting: ['virality_science'],
  },
}

async function fetchTopEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categories: string[],
  lane: string,
  limit: number
): Promise<KnowledgeEntry[]> {
  // Try approved first, fall back to candidate
  for (const status of ['approved', 'candidate'] as const) {
    const { data } = await supabase
      .from('knowledge_entries')
      .select('*')
      .in('category', categories)
      .contains('lanes', [lane])
      .eq('review_status', status)
      .order('effectiveness_score', { ascending: false })
      .limit(limit)
    if (data && data.length > 0) return data
  }
  return []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const purpose = searchParams.get('purpose') || 'educate'
  const lane = searchParams.get('lane') || 'short-form'

  const purposeConfig = PURPOSE_CATEGORIES[purpose] || PURPOSE_CATEGORIES.educate

  try {
    const supabase = await createClient()

    const [hooks, frameworks, supporting] = await Promise.all([
      fetchTopEntries(supabase, purposeConfig.hooks, lane, 6),
      fetchTopEntries(supabase, purposeConfig.frameworks, lane, 6),
      fetchTopEntries(supabase, purposeConfig.supporting, lane, 4),
    ])

    // Deduplicate across sections
    const seenIds = new Set<string>()
    const dedup = (entries: KnowledgeEntry[]) => entries.filter(e => {
      if (seenIds.has(e.id)) return false
      seenIds.add(e.id)
      return true
    })

    return NextResponse.json({
      purpose,
      lane,
      hooks: dedup(hooks).slice(0, 5),
      frameworks: dedup(frameworks).slice(0, 5),
      supporting: dedup(supporting).slice(0, 3),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch techniques' },
      { status: 500 }
    )
  }
}
