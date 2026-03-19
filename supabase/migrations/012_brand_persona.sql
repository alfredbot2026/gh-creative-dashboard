-- 012: Brand Persona + Voice Presets
CREATE TABLE IF NOT EXISTS brand_persona (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL DEFAULT 'Grace',
  backstory TEXT,
  appearance TEXT,
  avatar_url TEXT,
  reference_images JSONB DEFAULT '[]'::jsonb,
  voice_preset TEXT DEFAULT 'warm_empowering',
  custom_voice_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_persona ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own persona" ON brand_persona
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Seed Grace's persona
INSERT INTO brand_persona (character_name, backstory, voice_preset) VALUES
  ('Grace', 'Filipino mompreneur who turned her love of paper crafting into a thriving home-based business. Started with zero business experience, now teaches other moms to do the same through Papers to Profits.', 'warm_empowering');
