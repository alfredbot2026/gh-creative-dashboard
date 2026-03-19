export interface EvalScores {
  hook_specificity: number    // 1-10
  research_backing: number    // 1-10
  brand_voice_match: number   // 1-10
  production_readiness: number // 1-10
  taglish_naturalness: number // 1-10
  overall: number             // 1-10
}

export interface AutoScores {
  tone_match: number          // 0-1
  vocabulary_match: number    // 0-1
  taglish_ratio: number       // 0-1
  formality_match: number     // 0-1
  banned_words_clean: number  // 0-1
  composite: number           // 0-1 (weighted average)
}

export interface EvalDatasetEntry {
  id: string
  title: string
  content_type: 'short-form-script' | 'ad-copy' | 'youtube-script' | 'carousel-copy' | 'caption'
  lane: 'short-form' | 'ads' | 'youtube'
  content: string
  script_data?: Record<string, unknown>
  scores: EvalScores
  source: 'manual' | 'past_content' | 'generated'
  notes: string
}

export interface QualityScore {
  id: string
  content_item_id?: string
  content_type: string
  content_text: string
  auto_scores: AutoScores
  human_verdict?: 'approved' | 'rejected' | 'edited'
  human_notes?: string
  passed_gate: boolean
  threshold_used: number
}
