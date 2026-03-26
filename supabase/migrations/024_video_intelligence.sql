-- Video intelligence columns for ad_creatives
-- Stores Gemini multimodal analysis: transcription + frame descriptions

ALTER TABLE ad_creatives
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_transcription TEXT,
  ADD COLUMN IF NOT EXISTS frame_descriptions JSONB,
  ADD COLUMN IF NOT EXISTS video_analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_analysis_model TEXT;
