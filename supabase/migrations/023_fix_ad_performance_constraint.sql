-- Drop the legacy unique constraint that blocks daily ad performance upserts.
-- Old: UNIQUE(campaign_name, ad_name) — from original schema
-- New: UNIQUE(user_id, meta_ad_id, date_start) — from migration 020
ALTER TABLE ad_performance DROP CONSTRAINT IF EXISTS ad_performance_campaign_ad_unique;

-- Also add updated_at if missing (original table didn't have it)
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
