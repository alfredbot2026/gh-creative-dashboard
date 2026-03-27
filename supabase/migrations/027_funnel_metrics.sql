-- Funnel metrics: conversations, leads, link clicks
-- Needed because CPA means different things for different objectives
ALTER TABLE ad_performance
  ADD COLUMN IF NOT EXISTS messaging_conversations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_clicks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landing_page_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_engagement INTEGER DEFAULT 0;
