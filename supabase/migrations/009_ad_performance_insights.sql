-- Ad Performance Insights — learning from what works
CREATE TABLE ad_performance_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'framework_performance', 'hook_performance', 
    'format_performance', 'audience_insight'
  )),
  framework TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  sample_size INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kb_entries_used UUID[],
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE ad_performance_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_insights" ON ad_performance_insights
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_insights" ON ad_performance_insights
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_insights_user_type ON ad_performance_insights(user_id, insight_type);
CREATE INDEX idx_insights_period ON ad_performance_insights(period_start, period_end);
