import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const defaultGuide = {
  voice_rubric: {
    tone_descriptors: ["warm", "empowering", "knowledgeable", "encouraging", "relatable"],
    taglish_ratio: { target: 0.4, min: 0.2, max: 0.6 },
    formality_levels: {
      instagram: "casual-taglish",
      facebook: "casual-taglish", 
      youtube: "semi-formal-taglish",
      tiktok: "casual-taglish",
      ads: "direct-proof-focused"
    },
    vocabulary_whitelist: ["mommy", "kumita", "puhunan", "negosyo", "step-by-step", "kaya mo 'to", "kalma lang"],
    vocabulary_blacklist: ["utilize", "leverage", "synergy", "paradigm", "framework"],
    banned_ai_words: ["delve", "tapestry", "landscape", "in conclusion", "it's important to note", "in today's world", "game-changer", "unlock"],
    example_phrases: [
      "Kalma lang, Mommy. Hindi mo kailangang mag-thesis para magsimula.",
      "Step-by-step lang, kaya mo 'to kahit simpleng setup lang.",
      "1K na puhunan to 6 digits income"
    ],
    scoring_weights: { tone: 0.3, vocabulary: 0.2, taglish: 0.2, formality: 0.15, banned_words: 0.15 }
  },
  caption_rules: {
    instagram: { max_length: 2200, hashtag_count: 15, emoji_usage: "moderate", cta_required: true },
    facebook: { max_length: 5000, hashtag_count: 3, emoji_usage: "moderate", cta_required: true },
    tiktok: { max_length: 300, hashtag_count: 5, emoji_usage: "heavy", cta_required: false }
  },
  creator_description: "Filipina woman, warm smile, approachable, often shown in home/workshop setting",
  photography_style: "Bright, clean, warm tones. Home workshop aesthetic. Products featured prominently with natural lighting.",
  product_styling_rules: "Show paper products (notebooks, journals, magnets) in use or being made. Include tools when relevant. Flat lay for product shots.",
  avoid_list: ["dark/moody aesthetics", "corporate stock photo style", "overly polished/unrealistic", "complex jargon"]
}

async function seed() {
  console.log("Seeding brand style guide...")
  
  // Check if one exists
  const { data: existing, error: fetchErr } = await supabase
    .from('brand_style_guide')
    .select('id')
    .limit(1)

  if (fetchErr && fetchErr.code !== 'PGRST116') {
    console.error("Failed to fetch existing guide:", fetchErr)
  }

  let result;
  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('brand_style_guide')
      .update(defaultGuide)
      .eq('id', existing[0].id)
      .select()
    if (error) throw error
    result = data
  } else {
    const { data, error } = await supabase
      .from('brand_style_guide')
      .insert(defaultGuide)
      .select()
    if (error) throw error
    result = data
  }

  console.log("Seed successful!", result)
}

seed().catch(console.error)
