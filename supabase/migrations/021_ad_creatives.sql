-- Phase 4e Wave 1: Ad Creatives table
-- Stores every ad creative from Meta with AI classification + performance aggregates.
-- Security addendum: user_id pattern, RLS, classification versioning, meta_account_id, confidence.

CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Meta identifiers
  meta_ad_id TEXT NOT NULL,
  meta_creative_id TEXT,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  meta_account_id TEXT,
  
  -- Creative content
  headline TEXT,
  body_text TEXT,
  cta_text TEXT,
  link_description TEXT,
  image_url TEXT,
  video_thumbnail_url TEXT,
  creative_format TEXT CHECK (creative_format IN ('static_image', 'video', 'carousel', 'collection')),
  carousel_cards JSONB,             -- array of {image_url, headline, body} for carousels
  
  -- AI Classification (Gemini)
  angle TEXT,                        -- 'pain_point', 'aspiration', 'fear', 'social_proof', 'comparison', 'education', 'urgency'
  persona TEXT,                      -- 'new_mom_curious', 'returning_buyer', 'price_sensitive', 'aspirational', 'skeptic'
  framework TEXT,                    -- 'PAS', 'AIDA', 'before_after', 'testimonial', 'urgency', 'FAB'
  hook_type TEXT,                    -- matches content_ingest classification vocabulary
  offer_type TEXT,                   -- 'discount', 'free_trial', 'value_stack', 'limited_time', 'social_proof', 'none'
  emotional_tone TEXT,               -- 'warm', 'urgent', 'educational', 'aspirational', 'fear'
  
  -- Classification metadata (versioning per security addendum)
  classification_version TEXT DEFAULT 'v1',
  classifier_model TEXT,
  classified_at TIMESTAMPTZ,
  classification_confidence DECIMAL(4,3),  -- 0.000 to 1.000
  classification_raw JSONB,                -- full AI response for debugging/re-scoring
  
  -- Denormalized performance (refreshed on sync, source of truth = ad_performance)
  total_spend DECIMAL(10,2) DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  avg_roas DECIMAL(8,4),
  avg_cpa DECIMAL(8,4),
  avg_ctr DECIMAL(6,4),
  first_active_date DATE,
  last_active_date DATE,
  performance_updated_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  ad_status TEXT DEFAULT 'unknown',      -- 'winning', 'weak', 'tired', 'dead', 'new'
  
  -- Metadata
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique per user + account + ad (supports multiple ad accounts)
  UNIQUE(user_id, meta_account_id, meta_ad_id)
);

-- RLS (per security addendum P0-2)
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own ad creatives" ON ad_creatives
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own ad creatives" ON ad_creatives
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own ad creatives" ON ad_creatives
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service can manage all ad creatives" ON ad_creatives
  FOR ALL USING (auth.role() = 'service_role');

-- Indexes for the matrix queries (angle × persona), performance lookups
CREATE INDEX IF NOT EXISTS idx_ad_creatives_user ON ad_creatives(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_matrix ON ad_creatives(user_id, angle, persona);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_framework ON ad_creatives(user_id, framework);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_meta_ad ON ad_creatives(user_id, meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON ad_creatives(user_id, ad_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_creatives_updated ON ad_creatives(user_id, updated_at DESC);

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ad_creatives_updated_at'
  ) THEN
    CREATE TRIGGER update_ad_creatives_updated_at
      BEFORE UPDATE ON ad_creatives
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
