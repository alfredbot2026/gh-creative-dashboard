-- Hook Bank: pre-generated hooks with freshness tracking + performance feedback
CREATE TABLE IF NOT EXISTS hook_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- What this hook is for
  angle TEXT NOT NULL,
  persona TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  hook_type TEXT NOT NULL, -- question, social_proof, curiosity_gap, etc.
  proof_points_used TEXT[] DEFAULT '{}',
  
  -- Generation metadata
  generated_by TEXT NOT NULL DEFAULT 'kimi-k2-turbo', -- which LLM
  generated_model TEXT, -- exact model id
  quality_score REAL, -- 0-1, from quality gate
  generation_context JSONB, -- KB entries used, prompt variant, etc.
  
  -- Freshness tracking
  status TEXT NOT NULL DEFAULT 'fresh', -- fresh, shown, selected, deployed, retired
  times_shown INT DEFAULT 0,
  times_selected INT DEFAULT 0,
  last_shown_at TIMESTAMPTZ,
  
  -- Performance feedback (populated after deployment)
  deployed_ad_id UUID REFERENCES ad_creatives(id),
  deployed_concept_id UUID REFERENCES creative_concepts(id),
  ad_roas REAL, -- from ad_creatives after sync
  ad_status TEXT, -- winning, tired, dead
  
  -- Anti-staleness: store previously generated hooks to avoid repeats
  exclusion_hash TEXT, -- hash of hook_text for dedup
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Script Bank: pre-generated video/content scripts
CREATE TABLE IF NOT EXISTS script_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- What this script is for
  angle TEXT NOT NULL,
  persona TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'video_ugc', -- video_ugc, video_hq, static_image, carousel
  hook_text TEXT, -- the hook this script was built for (nullable for standalone)
  
  -- Script content
  scenes JSONB NOT NULL DEFAULT '[]', -- full scene array
  caption_draft TEXT,
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  total_duration_seconds INT,
  
  -- Generation metadata
  generated_by TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  generated_model TEXT,
  quality_score REAL,
  kb_hooks_used TEXT[] DEFAULT '{}',
  kb_frameworks_used TEXT[] DEFAULT '{}',
  generation_context JSONB,
  
  -- Freshness tracking
  status TEXT NOT NULL DEFAULT 'fresh',
  times_shown INT DEFAULT 0,
  times_selected INT DEFAULT 0,
  last_shown_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast serving
CREATE INDEX IF NOT EXISTS idx_hook_bank_serve 
  ON hook_bank(user_id, angle, persona, status) 
  WHERE status IN ('fresh', 'shown');

CREATE INDEX IF NOT EXISTS idx_hook_bank_perf
  ON hook_bank(user_id, ad_roas DESC NULLS LAST)
  WHERE deployed_ad_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_script_bank_serve
  ON script_bank(user_id, angle, persona, format, status)
  WHERE status IN ('fresh', 'shown');

-- RLS
ALTER TABLE hook_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own hooks" ON hook_bank
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own scripts" ON script_bank
  FOR ALL USING (auth.uid() = user_id);

-- Service role bypass for cron
CREATE POLICY "Service role full access hooks" ON hook_bank
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access scripts" ON script_bank
  FOR ALL USING (auth.role() = 'service_role');

-- Credit tracking for SaaS metering
CREATE TABLE IF NOT EXISTS generation_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Credit balance
  credits_remaining INT NOT NULL DEFAULT 100, -- monthly allowance
  credits_used INT NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free', -- free, pro, unlimited
  
  -- Period
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  
  -- Limits per plan
  hooks_per_month INT NOT NULL DEFAULT 100,
  scripts_per_month INT NOT NULL DEFAULT 20,
  hooks_used INT NOT NULL DEFAULT 0,
  scripts_used INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_start)
);

ALTER TABLE generation_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own credits" ON generation_credits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access credits" ON generation_credits
  FOR ALL USING (auth.role() = 'service_role');
