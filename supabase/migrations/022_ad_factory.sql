-- Phase 4e Wave 3-4: Creative Factory tables

-- Batches (a group of variants generated together)
CREATE TABLE IF NOT EXISTS ad_factory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Strategy context
  angle TEXT NOT NULL,
  persona TEXT NOT NULL,
  framework TEXT,                -- optional, AI picks if null
  offer_type TEXT,
  
  -- Source
  recommendation_index INTEGER,  -- which recommendation spawned this
  batch_type TEXT DEFAULT 'single' CHECK (batch_type IN ('single', 'weekly', 'refresh')),
  
  -- Status
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'approved', 'exported', 'failed')),
  variant_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ad_factory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own batches" ON ad_factory_batches
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_factory_batches_user ON ad_factory_batches(user_id, created_at DESC);

-- Variants (individual ad creatives within a batch)
CREATE TABLE IF NOT EXISTS ad_factory_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  batch_id UUID NOT NULL REFERENCES ad_factory_batches(id) ON DELETE CASCADE,
  
  -- Generated copy
  headline TEXT NOT NULL,
  body_text TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  link_description TEXT,
  
  -- Classification
  hook_type TEXT,
  framework TEXT,
  emotional_tone TEXT,
  
  -- Image
  image_prompt TEXT,
  image_url TEXT,                 -- generated image URL (Supabase Storage)
  image_status TEXT DEFAULT 'pending' CHECK (image_status IN ('pending', 'generating', 'ready', 'failed')),
  
  -- Carousel (optional)
  carousel_slides JSONB,         -- [{headline, body, image_prompt, image_url}]
  
  -- User actions
  is_approved BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  user_edits JSONB,              -- track what was changed
  
  -- Compliance
  compliance_flags TEXT[],       -- any prohibited pattern matches
  compliance_clean BOOLEAN DEFAULT true,
  
  -- Tracking (for performance loop)
  factory_batch_id UUID,         -- same as batch_id, for Meta matching
  matched_meta_ad_id TEXT,       -- set when matched to a live Meta ad
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ad_factory_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own variants" ON ad_factory_variants
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_factory_variants_batch ON ad_factory_variants(batch_id);
CREATE INDEX IF NOT EXISTS idx_factory_variants_user ON ad_factory_variants(user_id, created_at DESC);

-- Updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_factory_batches_updated_at') THEN
    CREATE TRIGGER update_factory_batches_updated_at BEFORE UPDATE ON ad_factory_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_factory_variants_updated_at') THEN
    CREATE TRIGGER update_factory_variants_updated_at BEFORE UPDATE ON ad_factory_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
