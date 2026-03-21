-- content_ingest: stores all historical posts/videos pulled from Meta + YouTube APIs
-- Part of Phase 3.5 Learning Pipeline

CREATE TABLE IF NOT EXISTS content_ingest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Source identification
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube')),
  platform_id TEXT NOT NULL,
  platform_url TEXT,
  
  -- Content
  content_type TEXT NOT NULL,
  caption TEXT,
  description TEXT,
  media_url TEXT,
  tags TEXT[],
  
  -- Timing
  published_at TIMESTAMPTZ NOT NULL,
  
  -- Metrics (snapshotted — refreshed at intervals)
  metrics JSONB NOT NULL DEFAULT '{}',
  metrics_updated_at TIMESTAMPTZ,
  metrics_snapshot_count INT DEFAULT 0,
  
  -- Raw API response for debugging
  raw_api_response JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, platform, platform_id)
);

ALTER TABLE content_ingest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ingested content" ON content_ingest;
CREATE POLICY "Users manage own ingested content"
  ON content_ingest FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_content_ingest_user_platform 
  ON content_ingest(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_content_ingest_published 
  ON content_ingest(user_id, published_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_content_ingest_updated_at'
  ) THEN
    CREATE TRIGGER update_content_ingest_updated_at
      BEFORE UPDATE ON content_ingest
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
