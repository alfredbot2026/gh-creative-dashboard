-- Creative Testing System V2
-- Concept → Hooks → Executions hierarchy

-- Creative concepts (one angle × persona × core message)
CREATE TABLE IF NOT EXISTS creative_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  angle TEXT NOT NULL,
  persona TEXT NOT NULL,
  core_message TEXT NOT NULL,
  concept_brief JSONB NOT NULL DEFAULT '{}',
  -- Brief contains: persona_context, proof_points, tone, framework, 
  -- competitor_context, compliance_notes
  mode TEXT DEFAULT 'explore',  -- 'explore' (new angle) or 'scale' (iterate winner)
  status TEXT DEFAULT 'draft',  -- draft, testing, proven, fatigued
  source_ad_id UUID,            -- if scaling from a winning ad
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, angle, persona, core_message)
);

ALTER TABLE creative_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concepts_user" ON creative_concepts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "concepts_service" ON creative_concepts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Hook variations (different openings, same concept)
CREATE TABLE IF NOT EXISTS creative_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES creative_concepts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  hook_text TEXT NOT NULL,
  hook_type TEXT NOT NULL,  -- question, how_to, social_proof, direct_benefit, story_opening, bold_claim, pain_call, curiosity_gap
  proof_points_used JSONB,  -- which proof points this hook highlights
  status TEXT DEFAULT 'draft',  -- draft, testing, winner, loser
  test_results JSONB,       -- {ctr, cpa, conv_rate, spend, roas} when tested
  meta_notes TEXT,           -- media buyer notes on performance
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE creative_hooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hooks_user" ON creative_hooks FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "hooks_service" ON creative_hooks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Format executions (each hook → multiple formats)
CREATE TABLE IF NOT EXISTS creative_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_id UUID NOT NULL REFERENCES creative_hooks(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES creative_concepts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  format TEXT NOT NULL,  -- static_image, carousel, video_hq, video_ugc, ig_carousel
  content JSONB NOT NULL DEFAULT '{}',
  -- Content varies by format:
  -- static_image: {headline, body_text, cta_text, link_description, image_prompt}
  -- carousel: {slides: [{body_text, image_prompt}], cta_text}
  -- video_hq: {hook_script, body_script, cta_script, duration_seconds, visual_directions}
  -- video_ugc: {hook_script, body_script, cta_script, duration_seconds, style_notes}
  -- ig_carousel: {slides: [{title, body_text}]}
  image_url TEXT,
  status TEXT DEFAULT 'draft',  -- draft, approved, deployed, tested
  meta_ad_id TEXT,              -- linked to Meta ad when deployed
  performance JSONB,            -- linked metrics after testing
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE creative_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_user" ON creative_executions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "exec_service" ON creative_executions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_concepts_user_status ON creative_concepts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hooks_concept ON creative_hooks(concept_id);
CREATE INDEX IF NOT EXISTS idx_hooks_status ON creative_hooks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exec_hook ON creative_executions(hook_id);
CREATE INDEX IF NOT EXISTS idx_exec_concept ON creative_executions(concept_id);
