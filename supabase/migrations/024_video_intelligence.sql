-- Add video intelligence columns to ad_creatives
ALTER TABLE ad_creatives
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_transcription TEXT,
  ADD COLUMN IF NOT EXISTS frame_descriptions JSONB,  -- [{timestamp_s: number, description: string}]
  ADD COLUMN IF NOT EXISTS video_analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_analysis_model TEXT;
