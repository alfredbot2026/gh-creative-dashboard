-- Link ad_performance to content_items
ALTER TABLE ad_performance 
  ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES content_items(id);

CREATE INDEX IF NOT EXISTS idx_ad_performance_content_item 
  ON ad_performance(content_item_id);

-- Create storage bucket for ad creatives (run via Supabase dashboard or SQL)
-- INSERT INTO storage.buckets (id, name, public) 
--   VALUES ('ad-creatives', 'ad-creatives', true)
--   ON CONFLICT (id) DO NOTHING;
