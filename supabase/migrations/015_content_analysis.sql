-- content_analysis: AI classification results for ingested content
-- Part of Phase 3.5 Learning Pipeline (Sub-phase 3.5b)

CREATE TABLE IF NOT EXISTS content_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ingest_id UUID NOT NULL REFERENCES content_ingest(id) ON DELETE CASCADE,
  
  classification JSONB NOT NULL,
  model_used TEXT NOT NULL,
  classification_version INT DEFAULT 1,
  confidence_avg FLOAT,
  
  manual_overrides JSONB,
  user_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ingest_id, classification_version)
);

ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own content analysis" ON content_analysis;
CREATE POLICY "Users manage own content analysis"
  ON content_analysis FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_content_analysis_user 
  ON content_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_ingest 
  ON content_analysis(ingest_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_content_analysis_updated_at'
  ) THEN
    CREATE TRIGGER update_content_analysis_updated_at
      BEFORE UPDATE ON content_analysis
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
