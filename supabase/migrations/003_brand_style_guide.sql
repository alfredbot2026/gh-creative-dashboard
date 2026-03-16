-- Brand Style Guide (extends business_profile with generation-specific fields)
CREATE TABLE IF NOT EXISTS brand_style_guide (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Visual Identity
  color_palette JSONB DEFAULT '[]'::jsonb,         -- [{name, hex, usage}]
  typography JSONB DEFAULT '{}'::jsonb,              -- {heading_font, body_font, caption_font, rules}
  photography_style TEXT DEFAULT '',                  -- Description of visual style
  product_styling_rules TEXT DEFAULT '',              -- How products should be shown
  
  -- Brand Voice Rubric (quantitative scoring)
  voice_rubric JSONB DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   tone_descriptors: ["warm", "empowering", "knowledgeable"],
  --   taglish_ratio: { target: 0.4, min: 0.2, max: 0.6 },
  --   formality_levels: { instagram: "casual", youtube: "semi-formal", ads: "direct" },
  --   vocabulary_whitelist: ["mommy", "kumita", "puhunan", "negosyo"],
  --   vocabulary_blacklist: ["utilize", "leverage", "synergy", "delve"],
  --   banned_ai_words: ["delve", "tapestry", "landscape", "in conclusion", "it's important to note"],
  --   example_phrases: ["Kalma lang, Mommy", "Step-by-step lang"],
  --   scoring_weights: { tone: 0.3, vocabulary: 0.2, taglish: 0.2, formality: 0.15, banned_words: 0.15 }
  -- }
  
  -- Caption Rules (per platform)
  caption_rules JSONB DEFAULT '{}'::jsonb,
  -- { instagram: { max_length, hashtag_count, emoji_usage, cta_required }, ... }
  
  -- Grace's Appearance (for image generation consistency)
  creator_description TEXT DEFAULT '',                -- Physical description for AI image gen
  wardrobe_notes TEXT DEFAULT '',                     -- What Grace typically wears
  avoid_list TEXT[] DEFAULT '{}',                     -- Things to never include
  
  -- Reference Images (Supabase Storage paths)
  reference_images JSONB DEFAULT '[]'::jsonb,
  -- [{path, type: "headshot"|"product"|"lifestyle", description}]
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_brand_style_guide_updated_at ON brand_style_guide;
CREATE TRIGGER update_brand_style_guide_updated_at
  BEFORE UPDATE ON brand_style_guide
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE brand_style_guide ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "Allow read access for authenticated users" 
ON brand_style_guide FOR SELECT 
TO authenticated 
USING (true);

-- Allow all for authenticated users
CREATE POLICY "Allow all access for authenticated users" 
ON brand_style_guide FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
