-- content_items: stores generated scripts/content for calendar scheduling
-- Note: current_tenant_id() pattern not in use in this repo.
-- Using simple per-user isolation (user_id = auth.uid()) as per references/supabase-rls-patterns.md.
-- tenant_id is populated with user.id until proper tenant model is introduced.

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  platform TEXT,
  script_data JSONB,
  status TEXT DEFAULT 'draft',
  scheduled_date TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist (idempotent for partial table states)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_items' AND column_name='user_id') THEN
    ALTER TABLE content_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_items' AND column_name='tenant_id') THEN
    ALTER TABLE content_items ADD COLUMN tenant_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_items' AND column_name='platform') THEN
    ALTER TABLE content_items ADD COLUMN platform TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_items' AND column_name='scheduled_date') THEN
    ALTER TABLE content_items ADD COLUMN scheduled_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_items' AND column_name='published_at') THEN
    ALTER TABLE content_items ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists, then recreate
DROP POLICY IF EXISTS "Users can manage their own content_items" ON content_items;
CREATE POLICY "Users can manage their own content_items" 
  ON content_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Requires update_updated_at function which is defined in 001_knowledge_entries.sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_content_items_updated_at'
  ) THEN
    CREATE TRIGGER update_content_items_updated_at
      BEFORE UPDATE ON content_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
