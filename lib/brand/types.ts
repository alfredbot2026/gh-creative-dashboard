export interface ColorEntry {
  name: string
  hex: string
  usage: string // "primary" | "secondary" | "accent" | "background" | "text"
}

export interface VoiceRubric {
  tone_descriptors: string[]
  taglish_ratio: { target: number; min: number; max: number }
  formality_levels: Record<string, string> // platform → level
  vocabulary_whitelist: string[]
  vocabulary_blacklist: string[]
  banned_ai_words: string[]
  example_phrases: string[]
  scoring_weights: {
    tone: number
    vocabulary: number
    taglish: number
    formality: number
    banned_words: number
  }
}

export interface CaptionRules {
  [platform: string]: {
    max_length: number
    hashtag_count: number
    emoji_usage: string // "heavy" | "moderate" | "minimal"
    cta_required: boolean
  }
}

export interface ReferenceImage {
  path: string
  type: 'headshot' | 'product' | 'lifestyle' | 'logo'
  description: string
}

export interface BrandStyleGuide {
  id: string
  color_palette: ColorEntry[]
  typography: Record<string, string>
  photography_style: string
  product_styling_rules: string
  voice_rubric: VoiceRubric
  caption_rules: CaptionRules
  creator_description: string
  wardrobe_notes: string
  avoid_list: string[]
  reference_images: ReferenceImage[]
  updated_at: string
}
