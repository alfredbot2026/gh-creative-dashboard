export interface CarouselGenerationRequest {
  product_name: string
  offer_details?: string
  objective: 'conversions' | 'awareness' | 'traffic'
  platform: 'facebook' | 'instagram'
  slide_count: number  // 3-7
  style: 'educational' | 'storytelling' | 'product-showcase' | 'testimonial'
}

export type SlideRole = 'hook' | 'problem' | 'agitate' | 'solution' | 'proof' | 'cta'

export interface CarouselSlide {
  slide_number: number
  role: SlideRole
  headline: string
  body_text: string
  visual_description: string
  image_prompt: string
  text_overlay: string
  cta_text?: string
}

export interface CarouselGenerationResponse {
  slides: CarouselSlide[]
  carousel_theme: string
  caption: string
  hashtags: string[]
  techniques_used: Array<{
    entry_id: string
    entry_title: string
    category: string
    how_applied: string
  }>
  brand_voice_score: number
  generation_provenance: {
    model: string
    entries_loaded: Array<{ id: string; title: string; category: string }>
    tier: 'approved' | 'candidate'
    total_loaded: number
  }
}
