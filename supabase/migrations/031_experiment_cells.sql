-- ADS-002: experiment_cells
CREATE TABLE IF NOT EXISTS experiment_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  angle TEXT NOT NULL,
  persona TEXT NOT NULL,
  format TEXT,
  hook_family TEXT,
  test_count INTEGER NOT NULL DEFAULT 0,
  winner_count INTEGER NOT NULL DEFAULT 0,
  loser_count INTEGER NOT NULL DEFAULT 0,
  fatigued_count INTEGER NOT NULL DEFAULT 0,
  inconclusive_count INTEGER NOT NULL DEFAULT 0,
  best_roas NUMERIC(8,4),
  best_cpa NUMERIC(10,2),
  best_ctr NUMERIC(6,4),
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('high','medium','low','gap')),
  status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('untested','testing','inconclusive','winner','fatigued','loser','over_tested')),
  top_ad_ids UUID[] NOT NULL DEFAULT '{}',
  competitor_signal INTEGER NOT NULL DEFAULT 0,
  first_tested_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, angle, persona, format, hook_family)
);

CREATE INDEX IF NOT EXISTS idx_experiment_cells_user ON experiment_cells(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_cells_status ON experiment_cells(user_id, status);
CREATE INDEX IF NOT EXISTS idx_experiment_cells_angle_persona ON experiment_cells(user_id, angle, persona);

ALTER TABLE experiment_cells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own experiment cells" ON experiment_cells;
CREATE POLICY "Users can read their own experiment cells"
  ON experiment_cells FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own experiment cells" ON experiment_cells;
CREATE POLICY "Users can insert their own experiment cells"
  ON experiment_cells FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own experiment cells" ON experiment_cells;
CREATE POLICY "Users can update their own experiment cells"
  ON experiment_cells FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service can manage all experiment cells" ON experiment_cells;
CREATE POLICY "Service can manage all experiment cells"
  ON experiment_cells FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_experiment_cells_updated_at'
  ) THEN
    CREATE TRIGGER update_experiment_cells_updated_at
      BEFORE UPDATE ON experiment_cells
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
