-- ADS-005: link generated creative concepts back to plan briefs
ALTER TABLE creative_concepts
  ADD COLUMN IF NOT EXISTS plan_brief_id UUID REFERENCES plan_briefs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_creative_concepts_plan_brief_id
  ON creative_concepts(plan_brief_id);
