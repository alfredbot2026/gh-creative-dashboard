-- performance_profile: aggregated performance rules per tenant
-- Part of Phase 3.5 Learning Pipeline (Sub-phase 3.5c)

CREATE TABLE IF NOT EXISTS performance_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  profile JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  total_posts_analyzed INT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, version)
);

ALTER TABLE performance_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON performance_profile;
CREATE POLICY "Users read own profile"
  ON performance_profile FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_performance_profile_user 
  ON performance_profile(user_id, version DESC);
