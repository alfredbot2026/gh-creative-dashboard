-- ADS-002: creative_learnings
CREATE TABLE IF NOT EXISTS creative_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_creative_id UUID REFERENCES ad_creatives(id) ON DELETE SET NULL,
  format TEXT,
  hook_primary TEXT,
  hook_family TEXT,
  hook_type TEXT,
  body_summary TEXT,
  belief_barrier TEXT,
  cta_pattern TEXT,
  visual_pattern TEXT,
  emotional_tone TEXT,
  inferred_mechanism TEXT,
  mechanism_confidence TEXT CHECK (mechanism_confidence IN ('high','medium','low')),
  extraction_source JSONB NOT NULL DEFAULT '{}',
  extraction_confidence NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, ad_creative_id)
);

ALTER TABLE creative_learnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own creative learnings" ON creative_learnings;
CREATE POLICY "Users can read their own creative learnings"
  ON creative_learnings FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own creative learnings" ON creative_learnings;
CREATE POLICY "Users can insert their own creative learnings"
  ON creative_learnings FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own creative learnings" ON creative_learnings;
CREATE POLICY "Users can update their own creative learnings"
  ON creative_learnings FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service can manage all creative learnings" ON creative_learnings;
CREATE POLICY "Service can manage all creative learnings"
  ON creative_learnings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_creative_learnings_user ON creative_learnings(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_learnings_hook_family ON creative_learnings(user_id, hook_family);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_creative_learnings_updated_at'
  ) THEN
    CREATE TRIGGER update_creative_learnings_updated_at
      BEFORE UPDATE ON creative_learnings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
