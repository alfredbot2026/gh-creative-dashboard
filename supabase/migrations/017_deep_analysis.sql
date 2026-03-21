-- Add deep analysis columns to content_ingest
-- Stores Gemini video analysis (transcript, hooks, retention, visual analysis)

ALTER TABLE content_ingest 
  ADD COLUMN IF NOT EXISTS deep_analysis JSONB,
  ADD COLUMN IF NOT EXISTS deep_analyzed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_content_ingest_deep_analyzed
  ON content_ingest(user_id, deep_analyzed_at)
  WHERE deep_analyzed_at IS NOT NULL;
