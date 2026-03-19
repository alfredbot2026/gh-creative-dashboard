-- 011: Content Calendar + Templates
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_purpose TEXT,           -- educate, story, sell, prove, trend, inspire
  content_lane TEXT DEFAULT 'short-form', -- short-form, ads, youtube, social-post
  platform TEXT,
  product_id UUID REFERENCES product_catalog(id) ON DELETE SET NULL,
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'planned',  -- planned, drafted, generated, posted, skipped
  generated_content JSONB,       -- stores the full generation response
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own calendar" ON content_calendar
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX idx_content_calendar_user_date ON content_calendar(user_id, scheduled_date);

-- Content Templates (save winning outputs for reuse)
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_purpose TEXT,
  content_lane TEXT,
  hook_entry_id UUID,              -- KB hook used
  framework_entry_id UUID,         -- KB framework used
  product_id UUID REFERENCES product_catalog(id) ON DELETE SET NULL,
  template_params JSONB NOT NULL,  -- saved generation request params
  sample_output JSONB,             -- the output that was saved as template
  times_used INTEGER DEFAULT 0,
  avg_performance REAL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON content_templates
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
