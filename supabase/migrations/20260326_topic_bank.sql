-- Topic bank: cache generated topic suggestions per goal+platform combo
CREATE TABLE IF NOT EXISTS topic_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL,
  goal TEXT NOT NULL,
  title TEXT NOT NULL,
  angle TEXT,
  category TEXT,
  hook_idea TEXT,
  source TEXT DEFAULT 'llm',
  evidence TEXT,
  shown BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  shown_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

ALTER TABLE topic_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own topics" ON topic_bank
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_topic_bank_combo ON topic_bank(user_id, platform, goal, shown);
CREATE INDEX idx_topic_bank_created ON topic_bank(created_at);
