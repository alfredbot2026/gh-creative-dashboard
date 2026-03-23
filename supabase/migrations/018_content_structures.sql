-- 018_content_structures.sql
-- Phase 4a: Content Structures catalog + Technique Library

-- Full script structures (e.g., "Show Then Tell", "PAS", "HEIT")
CREATE TABLE IF NOT EXISTS content_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  source_creator TEXT,
  
  -- Classification
  content_type TEXT NOT NULL,                -- 'reel', 'youtube', 'ad', 'story'
  purpose TEXT[] DEFAULT '{}',               -- ['educate', 'sell', 'inspire', 'story', 'prove', 'trend']
  difficulty TEXT DEFAULT 'beginner',         -- 'beginner', 'intermediate', 'advanced'
  
  -- The Structure Definition (ordered blocks with timing)
  blocks JSONB NOT NULL DEFAULT '[]',
  -- Each block: { "id": "hook", "label": "Hook", "timing": "0-3s", "duration_hint": "3s",
  --   "instruction": "...", "example": "...", "rules": ["..."] }
  
  -- Timing
  ideal_length_min INTEGER,                  -- seconds
  ideal_length_max INTEGER,                  -- seconds
  
  -- Performance (populated by analysis pipeline)
  times_used INTEGER DEFAULT 0,
  avg_score FLOAT,
  avg_engagement FLOAT,
  best_for_topics TEXT[] DEFAULT '{}',
  
  -- Meta
  is_cutting_edge BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplementary techniques (hooks, retention tricks, algorithm exploits, production tips)
CREATE TABLE IF NOT EXISTS technique_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,                    -- 'hook', 'retention', 'algorithm', 'production', 'strategy'
  description TEXT,
  source_creator TEXT,
  
  steps JSONB DEFAULT '[]',                  -- Step-by-step instructions
  examples JSONB DEFAULT '[]',               -- Real examples
  timing_rules JSONB DEFAULT '{}',           -- When/where to apply
  
  -- Performance tracking
  times_applied INTEGER DEFAULT 0,
  avg_impact FLOAT,
  
  is_cutting_edge BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_content_structures_type ON content_structures(content_type);
CREATE INDEX idx_content_structures_purpose ON content_structures USING gin(purpose);
CREATE INDEX idx_technique_library_category ON technique_library(category);
