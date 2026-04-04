-- organic_script_bank: pre-seeded scripts for /create flow
-- Keyed by platform × goal × structure_slug × topic

CREATE TABLE IF NOT EXISTS organic_script_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL,
  goal TEXT NOT NULL,
  structure_slug TEXT,
  topic TEXT NOT NULL,
  variant_number INT NOT NULL DEFAULT 1,
  hook TEXT NOT NULL,
  content JSONB NOT NULL,
  quality_score INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'fresh',
  times_shown INT DEFAULT 0,
  times_used INT DEFAULT 0,
  last_shown_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  generated_by TEXT DEFAULT 'pre-seed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osb_lookup 
  ON organic_script_bank(user_id, platform, goal, structure_slug, status);

CREATE INDEX IF NOT EXISTS idx_osb_topic 
  ON organic_script_bank(user_id, goal, topic);

ALTER TABLE organic_script_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own organic scripts" ON organic_script_bank
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own organic scripts" ON organic_script_bank
  FOR UPDATE USING (auth.uid() = user_id);
