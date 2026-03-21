/**
 * Content Classification Types
 * Used by the AI classification pipeline to tag ingested content.
 */

export interface ContentClassification {
  // Core classification
  hook_type: string              // Must match KB vocabulary (knowledge_entries.title where category='hook_library')
  hook_confidence: number        // 0-1
  structure: string              // Must match KB vocabulary (knowledge_entries.title where category='scripting_framework')
  structure_confidence: number   // 0-1
  topic_category: string         // e.g., "Planner Organization", "Product Launch", "Craft Tutorial"
  content_purpose: ContentPurpose

  // Visual / format
  visual_style: VisualStyle
  text_overlay_style: TextOverlayStyle
  production_quality: ProductionQuality

  // Engagement drivers
  cta_type: string               // "Follow", "Save", "Comment", "Link in Bio", "Subscribe", "DM", "None"
  emotional_tone: EmotionalTone
  taglish_ratio: string          // e.g., "80% English / 20% Filipino"

  // Derived elements
  key_elements: string[]         // Notable elements: "before/after", "numbers in title", "face close-up"
}

export type ContentPurpose = 'educate' | 'story' | 'sell' | 'prove' | 'inspire' | 'trend'

export type VisualStyle =
  | 'talking_head'
  | 'b_roll_heavy'
  | 'text_overlay'
  | 'product_demo'
  | 'lifestyle'
  | 'behind_the_scenes'
  | 'tutorial_screencast'
  | 'mixed'

export type TextOverlayStyle =
  | 'bold_sans_center'
  | 'subtitle_bottom'
  | 'minimal_corner'
  | 'full_screen_text'
  | 'none'

export type ProductionQuality = 'phone_casual' | 'lit_styled' | 'studio_pro'

export type EmotionalTone =
  | 'warm_personal'
  | 'professional'
  | 'excited'
  | 'calm'
  | 'inspirational'
  | 'humorous'
  | 'urgent'

export interface ClassificationResult {
  ingest_id: string
  classification: ContentClassification
  model_used: string
  confidence_avg: number
  raw_response?: string
}

export interface GoldSetEntry {
  platform: string
  caption: string
  content_type: string
  expected: ContentClassification
  is_synthetic?: boolean  // True if created from known patterns, not actual content
}

export interface ValidationResult {
  overall_agreement: number
  per_field: Record<string, number>
  failures: Array<{
    entry_index: number
    field: string
    expected: string
    actual: string
  }>
  recommendation: 'proceed' | 'refine_prompt'
  total_entries: number
}
