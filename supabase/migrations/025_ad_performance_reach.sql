-- Add reach + frequency to ad_performance (media buyer essentials)
ALTER TABLE ad_performance
  ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequency DECIMAL(6,3);
