CREATE TABLE IF NOT EXISTS plan_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('scale', 'refresh', 'explore', 'mixed')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1),
  target_angle TEXT,
  target_persona TEXT,
  target_formats TEXT[] DEFAULT '{}'::TEXT[],
  objective TEXT NOT NULL,
  hypothesis TEXT,
  evidence_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  why_now TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'generating', 'completed', 'dismissed', 'expired')),
  generated_concept_ids UUID[] DEFAULT '{}'::UUID[],
  source_experiment_cell_id UUID REFERENCES experiment_cells(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE NULLS NOT DISTINCT (user_id, plan_type, target_angle, target_persona, status)
);

ALTER TABLE plan_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own plan briefs"
  ON plan_briefs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own plan briefs"
  ON plan_briefs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own plan briefs"
  ON plan_briefs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_plan_briefs_user_status ON plan_briefs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_briefs_type ON plan_briefs(user_id, plan_type);
CREATE INDEX IF NOT EXISTS idx_plan_briefs_priority_created ON plan_briefs(user_id, priority, created_at DESC);

CREATE OR REPLACE FUNCTION set_plan_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_briefs_updated_at ON plan_briefs;
CREATE TRIGGER trg_plan_briefs_updated_at
  BEFORE UPDATE ON plan_briefs
  FOR EACH ROW
  EXECUTE FUNCTION set_plan_briefs_updated_at();
