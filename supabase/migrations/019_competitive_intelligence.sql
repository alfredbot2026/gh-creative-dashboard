-- Phase 4c: Competitive Intelligence
-- Tables for tracking competitor channels, videos, and niche trends

-- -------------------------------------------------------
-- competitor_channels: Top creators in Grace's niche
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitor_channels (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id        text UNIQUE NOT NULL,
  channel_title     text NOT NULL,
  channel_description text,
  subscriber_count  int,
  video_count       int,
  avg_views         int,
  niche_tags        text[] DEFAULT '{}',
  language          text DEFAULT 'mixed',
  last_analyzed_at  timestamptz,
  discovery_source  text DEFAULT 'auto',
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- competitor_videos: Their top-performing content
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitor_videos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      text NOT NULL REFERENCES competitor_channels(channel_id) ON DELETE CASCADE,
  video_id        text UNIQUE NOT NULL,
  title           text,
  description     text,
  published_at    timestamptz,
  view_count      int DEFAULT 0,
  like_count      int DEFAULT 0,
  comment_count   int DEFAULT 0,
  duration_seconds int,
  thumbnail_url   text,
  tags            text[] DEFAULT '{}',
  -- AI classification (same schema as content_analysis)
  analysis        jsonb,
  analyzed_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS competitor_videos_channel_idx ON competitor_videos(channel_id);
CREATE INDEX IF NOT EXISTS competitor_videos_views_idx ON competitor_videos(view_count DESC);

-- -------------------------------------------------------
-- niche_trends: Aggregated weekly trend snapshot
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS niche_trends (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  computed_at   timestamptz DEFAULT now(),
  top_hooks     jsonb DEFAULT '[]',
  top_structures jsonb DEFAULT '[]',
  top_topics    jsonb DEFAULT '[]',
  trending_now  jsonb DEFAULT '[]',
  sample_size   int DEFAULT 0
);
