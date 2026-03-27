-- Competition + Market Sentiment tables
-- Drop and recreate competitors (was empty, wrong schema)
DROP TABLE IF EXISTS competitor_snapshots CASCADE;
DROP TABLE IF EXISTS competitor_ads CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;
DROP TABLE IF EXISTS market_sentiment CASCADE;
DROP TABLE IF EXISTS tracked_terms CASCADE;

-- Tracked competitors
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  page_name TEXT NOT NULL,
  page_id TEXT,
  page_url TEXT,
  website_url TEXT,
  niche TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  discovered_via TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_name)
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitors_select" ON competitors FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "competitors_all" ON competitors FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "competitors_update" ON competitors FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "competitors_service" ON competitors FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Competitor ad snapshots
CREATE TABLE competitor_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  ad_library_id TEXT,
  ad_body TEXT,
  ad_headline TEXT,
  ad_started_at DATE,
  ad_format TEXT,
  platforms JSONB,
  snapshot_url TEXT,
  angle TEXT,
  persona TEXT,
  framework TEXT,
  hook_type TEXT,
  offer_type TEXT,
  emotional_tone TEXT,
  classification_raw JSONB,
  is_active BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  disappeared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_name, ad_library_id)
);

ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_ads_select" ON competitor_ads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "comp_ads_service" ON competitor_ads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Daily competitor snapshots
CREATE TABLE competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  active_ad_count INTEGER DEFAULT 0,
  new_ads_count INTEGER DEFAULT 0,
  killed_ads_count INTEGER DEFAULT 0,
  angle_distribution JSONB,
  format_distribution JSONB,
  oldest_ad_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, competitor_id, snapshot_date)
);

ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_snap_select" ON competitor_snapshots FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "comp_snap_service" ON competitor_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Market sentiment
CREATE TABLE market_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  signal_date DATE NOT NULL,
  signal_type TEXT NOT NULL,
  query TEXT NOT NULL,
  score DECIMAL(6,2),
  prev_score DECIMAL(6,2),
  change_pct DECIMAL(6,2),
  summary TEXT,
  raw_data JSONB,
  source_urls JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, signal_date, signal_type, query)
);

ALTER TABLE market_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sentiment_select" ON market_sentiment FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sentiment_service" ON market_sentiment FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Search terms to track
CREATE TABLE tracked_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  term TEXT NOT NULL,
  term_type TEXT DEFAULT 'keyword',
  language TEXT DEFAULT 'tl',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, term)
);

ALTER TABLE tracked_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terms_select" ON tracked_terms FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "terms_all" ON tracked_terms FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "terms_update" ON tracked_terms FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "terms_service" ON tracked_terms FOR ALL TO service_role USING (true) WITH CHECK (true);
