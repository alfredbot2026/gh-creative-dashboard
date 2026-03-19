-- Gold standard evaluation dataset
CREATE TABLE IF NOT EXISTS eval_dataset (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Content
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('short-form-script', 'ad-copy', 'youtube-script', 'carousel-copy', 'caption')),
  lane TEXT NOT NULL CHECK (lane IN ('short-form', 'ads', 'youtube')),
  
  -- The actual content being evaluated
  content TEXT NOT NULL,                              -- Full script/copy text
  script_data JSONB,                                  -- Structured script if applicable
  
  -- Scoring (human-assigned ground truth)
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  source TEXT DEFAULT 'manual',                       -- 'manual' | 'past_content' | 'generated'
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quality scores for generated content
CREATE TABLE IF NOT EXISTS quality_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id UUID,                               -- Link to content_items if applicable
  
  -- What was scored
  content_type TEXT NOT NULL,
  content_text TEXT NOT NULL,
  
  -- Automated scores (from brand voice rubric)
  auto_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Human override (Grace's verdict)
  human_verdict TEXT CHECK (human_verdict IN ('approved', 'rejected', 'edited')),
  human_notes TEXT,
  
  -- Threshold check
  passed_gate BOOLEAN NOT NULL DEFAULT false,
  threshold_used FLOAT NOT NULL DEFAULT 0.7,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quality_scores_content_item ON quality_scores(content_item_id);
CREATE INDEX idx_quality_scores_passed ON quality_scores(passed_gate);
CREATE INDEX idx_eval_dataset_type ON eval_dataset(content_type, lane);

CREATE TRIGGER update_eval_dataset_updated_at
  BEFORE UPDATE ON eval_dataset
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: deny all by default, allow authenticated users only
ALTER TABLE eval_dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage eval_dataset" ON eval_dataset FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage quality_scores" ON quality_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
