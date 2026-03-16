/**
 * Knowledge Base Types
 * Structured, categorized, performance-weighted knowledge entries.
 * See PROJECT-SPEC.md §3c for full documentation.
 */

export const KNOWLEDGE_CATEGORIES = [
  'hook_library',
  'scripting_framework', 
  'content_funnel',
  'virality_science',
  'ad_creative',
  'platform_intelligence',
  'competitor_intel',
  'ai_prompting',
  'brand_identity',
  'cro_patterns',
  'performance_learning',
] as const

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number]

export const CONTENT_LANES = ['short-form', 'ads', 'youtube'] as const
export type ContentLane = typeof CONTENT_LANES[number]

export const SOURCE_TYPES = ['notebooklm', 'manual', 'performance_data', 'competitor_analysis'] as const
export type SourceType = typeof SOURCE_TYPES[number]

export const SOURCE_CONFIDENCE_LEVELS = ['performance_data', 'curated_manual', 'notebooklm_extracted', 'unverified'] as const
export type SourceConfidence = typeof SOURCE_CONFIDENCE_LEVELS[number]

export const REVIEW_STATUSES = ['candidate', 'approved', 'deprecated', 'archived'] as const
export type ReviewStatus = typeof REVIEW_STATUSES[number]

export interface KnowledgeEntry {
  id: string
  category: KnowledgeCategory
  subcategory: string
  lanes: ContentLane[]
  title: string
  content: string
  examples: string[]  // concrete examples
  source: SourceType
  source_detail: string | null
  source_confidence: SourceConfidence
  extraction_version: string | null
  review_status: ReviewStatus
  reviewed_by: string | null
  reviewed_at: string | null
  effectiveness_score: number
  confidence_interval: number
  min_sample_gate: number
  times_used: number
  times_successful: number
  last_used_at: string | null
  times_approved: number
  times_rejected: number
  saturation_penalty: number
  tags: string[]
  is_mandatory_first_read: boolean
  created_at: string
  updated_at: string
}

/** For creating new entries */
export type KnowledgeEntryInsert = Omit<KnowledgeEntry, 
  'id' | 'created_at' | 'updated_at' | 'effectiveness_score' | 'confidence_interval' |
  'times_used' | 'times_successful' | 'last_used_at' | 'times_approved' | 'times_rejected' |
  'saturation_penalty'
> & {
  effectiveness_score?: number
  confidence_interval?: number
}

/** For updating existing entries */
export type KnowledgeEntryUpdate = Partial<Omit<KnowledgeEntry, 'id' | 'created_at'>>

/** Filter options for querying */
export interface KnowledgeFilter {
  category?: KnowledgeCategory
  subcategory?: string
  lane?: ContentLane
  review_status?: ReviewStatus
  source?: SourceType
  source_confidence?: SourceConfidence
  min_effectiveness?: number
  search?: string  // full-text search on title + content
  tags?: string[]
  limit?: number
  offset?: number
}

/** Human-readable labels for categories */
export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  hook_library: '🪝 Hook Library',
  scripting_framework: '📝 Scripting Frameworks',
  content_funnel: '🔻 Content Funnel Strategy',
  virality_science: '🧪 Virality Science',
  ad_creative: '📢 Ad Creative Frameworks',
  platform_intelligence: '📱 Platform Intelligence',
  competitor_intel: '🔍 Competitor Intel',
  ai_prompting: '🤖 AI Prompting Workflows',
  brand_identity: '🎨 Brand Identity',
  cro_patterns: '📊 CRO / Conversion Patterns',
  performance_learning: '📈 Performance Learnings',
}

/** Provenance record for generated content */
export interface GenerationProvenance {
  id: string
  content_item_id: string | null
  lane: ContentLane
  primary_entries: string[]
  auxiliary_entries: string[]
  generation_params: Record<string, unknown>
  pipeline_steps: Record<string, unknown>[]
  brand_voice_score: number | null
  performance_score: number | null
  grace_decision: 'approved' | 'rejected' | 'edited' | null
  created_at: string
}
