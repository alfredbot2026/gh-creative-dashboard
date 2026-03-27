-- Campaign objective + ad set optimization goal
-- Needed to show the RIGHT metrics per campaign type
ALTER TABLE ad_creatives
  ADD COLUMN IF NOT EXISTS campaign_objective TEXT,
  ADD COLUMN IF NOT EXISTS optimization_goal TEXT;
