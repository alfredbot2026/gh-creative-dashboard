-- Provenance chain: every generated piece traces back to KB entries used
-- See PROJECT-SPEC.md §3e for documentation

CREATE TABLE IF NOT EXISTS generation_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was generated
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  lane TEXT NOT NULL CHECK (lane IN ('short-form', 'ads', 'youtube')),
  
  -- Which KB entries were used
  primary_entries UUID[] DEFAULT '{}',    -- KB entry IDs that were primary context
  auxiliary_entries UUID[] DEFAULT '{}',   -- KB entry IDs that were explore/novel context
  
  -- Generation metadata
  generation_params JSONB DEFAULT '{}'::jsonb,  -- prompt config, model, temperature, etc.
  pipeline_steps JSONB DEFAULT '[]'::jsonb,     -- which pipeline steps ran, their outputs
  brand_voice_score NUMERIC(5,2),               -- automated brand voice rubric score
  
  -- Outcome tracking (filled in later by learning loop)
  performance_score NUMERIC(5,2),
  grace_decision TEXT CHECK (grace_decision IN ('approved', 'rejected', 'edited', NULL)),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provenance_content_item ON generation_provenance(content_item_id);
CREATE INDEX idx_provenance_lane ON generation_provenance(lane);
CREATE INDEX idx_provenance_created ON generation_provenance(created_at DESC);
