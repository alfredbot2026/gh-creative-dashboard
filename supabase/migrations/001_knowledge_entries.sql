-- Knowledge Base table for structured, categorized, performance-weighted entries
-- See PROJECT-SPEC.md §3c for full field documentation

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'hook_library', 'scripting_framework', 'content_funnel', 
    'virality_science', 'ad_creative', 'platform_intelligence',
    'competitor_intel', 'ai_prompting', 'brand_identity', 
    'cro_patterns', 'performance_learning'
  )),
  subcategory TEXT NOT NULL,  -- e.g., 'iceberg_effect', 'super_hook', 'STEPPS'
  lanes TEXT[] NOT NULL DEFAULT '{}',  -- content lanes: 'short-form', 'ads', 'youtube'
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  examples JSONB DEFAULT '[]'::jsonb,  -- array of concrete examples
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN (
    'notebooklm', 'manual', 'performance_data', 'competitor_analysis'
  )),
  source_detail TEXT,  -- notebook name/ID, URL, extraction run ID
  source_confidence TEXT NOT NULL DEFAULT 'notebooklm_extracted' CHECK (source_confidence IN (
    'performance_data', 'curated_manual', 'notebooklm_extracted', 'unverified'
  )),
  extraction_version TEXT,  -- which extraction run produced this entry (for rollback)
  
  -- Governance
  review_status TEXT NOT NULL DEFAULT 'candidate' CHECK (review_status IN (
    'candidate', 'approved', 'deprecated', 'archived'
  )),
  reviewed_by TEXT,  -- who approved: 'grace', 'rob', 'auto'
  reviewed_at TIMESTAMPTZ,
  
  -- Effectiveness scoring
  effectiveness_score NUMERIC(5,2) DEFAULT 50.00,  -- 0-100
  confidence_interval NUMERIC(5,2) DEFAULT 50.00,  -- uncertainty range (wide = low data)
  min_sample_gate INTEGER DEFAULT 3,  -- entries can't influence ranking until N uses
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Approval tracking (Grace's approve/reject decisions)
  times_approved INTEGER DEFAULT 0,
  times_rejected INTEGER DEFAULT 0,
  
  -- Anti-repetition
  saturation_penalty NUMERIC(5,2) DEFAULT 0.00,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_mandatory_first_read BOOLEAN DEFAULT FALSE,  -- brand identity entries = true
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX idx_knowledge_lanes ON knowledge_entries USING GIN(lanes);
CREATE INDEX idx_knowledge_review_status ON knowledge_entries(review_status);
CREATE INDEX idx_knowledge_effectiveness ON knowledge_entries(effectiveness_score DESC);
CREATE INDEX idx_knowledge_source ON knowledge_entries(source);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_entries_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
