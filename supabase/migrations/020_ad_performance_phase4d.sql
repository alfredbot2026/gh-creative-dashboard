-- Ensure ad_performance table exists
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist via ALTER TABLE
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES content_items(id);
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS meta_ad_id TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS meta_adset_id TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS adset_name TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS ad_name TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS source_post_id TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS source_post_url TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS ad_creative_url TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS date_start DATE;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS date_stop DATE;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS spend DECIMAL(10,2) DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS ctr DECIMAL(6,4);
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS cpc DECIMAL(8,4);
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS cpm DECIMAL(8,4);
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS roas DECIMAL(8,4);
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS cpa DECIMAL(8,4);
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS video_views INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS video_views_p25 INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS video_views_p50 INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS video_views_p75 INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS video_views_p100 INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS hook_type TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS structure_slug TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS content_goal TEXT;
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS topic TEXT;

-- Pre-cleanup nulls to safely apply NOT NULL
UPDATE ad_performance SET meta_ad_id = 'unknown_' || id::text WHERE meta_ad_id IS NULL;
UPDATE ad_performance SET date_start = CURRENT_DATE WHERE date_start IS NULL;
UPDATE ad_performance SET date_stop = CURRENT_DATE WHERE date_stop IS NULL;

-- Enforce constraints
ALTER TABLE ad_performance ALTER COLUMN meta_ad_id SET NOT NULL;
ALTER TABLE ad_performance ALTER COLUMN date_start SET NOT NULL;
ALTER TABLE ad_performance ALTER COLUMN date_stop SET NOT NULL;

-- Unique constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_ad_perf_user_ad_date'
  ) THEN
    ALTER TABLE ad_performance ADD CONSTRAINT uq_ad_perf_user_ad_date UNIQUE(user_id, meta_ad_id, date_start);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_perf_user_structure ON ad_performance(user_id, structure_slug, roas);
CREATE INDEX IF NOT EXISTS idx_ad_perf_user_hook ON ad_performance(user_id, hook_type, roas);
CREATE INDEX IF NOT EXISTS idx_ad_perf_user_ad ON ad_performance(user_id, meta_ad_id);

-- Sync Locks Table (for single-flight rate limiting)
CREATE TABLE IF NOT EXISTS sync_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  is_running BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
ALTER TABLE sync_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own locks" ON sync_locks;
CREATE POLICY "Users can read own locks" ON sync_locks FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own locks" ON sync_locks;
CREATE POLICY "Users can insert own locks" ON sync_locks FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own locks" ON sync_locks;
CREATE POLICY "Users can update own locks" ON sync_locks FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Ensure RLS
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users see own ad data" ON ad_performance;
DROP POLICY IF EXISTS "Users insert own ad data" ON ad_performance;
DROP POLICY IF EXISTS "Users update own ad data" ON ad_performance;
DROP POLICY IF EXISTS "Service can manage all ad data" ON ad_performance;

-- Recreate policies using user_id pattern
CREATE POLICY "Users see own ad data" ON ad_performance
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own ad data" ON ad_performance
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own ad data" ON ad_performance
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service can manage all ad data" ON ad_performance
  FOR ALL USING (auth.role() = 'service_role');
