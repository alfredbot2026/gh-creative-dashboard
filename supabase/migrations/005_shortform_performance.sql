-- Short-form content performance tracking
CREATE TABLE IF NOT EXISTS shortform_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id UUID,                    -- link to content_items
  
  -- Platform
  platform TEXT NOT NULL CHECK (platform IN ('instagram-reels', 'tiktok', 'youtube-shorts')),
  post_url TEXT,                            -- link to the actual post
  posted_at TIMESTAMPTZ,
  
  -- Metrics (manual entry for now)
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  follows_gained INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  
  -- Computed
  engagement_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN views > 0 
      THEN (likes + comments + shares + saves)::FLOAT / views 
      ELSE 0 
    END
  ) STORED,
  
  -- Metadata
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sf_perf_content ON shortform_performance(content_item_id);
CREATE INDEX idx_sf_perf_platform ON shortform_performance(platform);
CREATE INDEX idx_sf_perf_engagement ON shortform_performance(engagement_rate DESC);

ALTER TABLE shortform_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage shortform_performance" 
  ON shortform_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_shortform_performance_updated_at
  BEFORE UPDATE ON shortform_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
