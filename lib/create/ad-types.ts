export type AdObjective = 'conversions' | 'awareness' | 'traffic'
export type AdFormat = 'static' | 'video_script' | 'carousel'
export type AdPlatform = 'facebook' | 'instagram'
export type AdFramework = 'PAS' | 'AIDA' | 'before_after' | 'social_proof' | 'urgency' | 'FAB'

export interface AdGenerationRequest {
  product: string
  offer_details: string
  objective: AdObjective
  ad_format: AdFormat
  platform: AdPlatform
  tone_override?: string
}

export interface AdVariant {
  id: string
  headline: string
  primary_text: string
  description: string
  cta: string
  framework_used: AdFramework
  framework_explanation: string
  image_prompt: string
  brand_voice_score: number
  knowledge_entries_used: string[]
}

export interface AdGenerationResponse {
  variants: AdVariant[]
  generation_provenance: {
    model: string
    kb_entries_loaded: number
    brand_guide_version: string
    kb_tier_used?: string
  }
}
