CREATE TABLE IF NOT EXISTS plan_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_brief_id UUID NOT NULL REFERENCES plan_briefs(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  plan_section TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plan_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own plan assets"
  ON plan_assets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own plan assets"
  ON plan_assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own plan assets"
  ON plan_assets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own plan assets"
  ON plan_assets FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_plan_assets_plan ON plan_assets(plan_brief_id);
CREATE INDEX IF NOT EXISTS idx_plan_assets_user_plan ON plan_assets(user_id, plan_brief_id);

CREATE OR REPLACE FUNCTION set_plan_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_assets_updated_at ON plan_assets;
CREATE TRIGGER trg_plan_assets_updated_at
  BEFORE UPDATE ON plan_assets
  FOR EACH ROW
  EXECUTE FUNCTION set_plan_assets_updated_at();
