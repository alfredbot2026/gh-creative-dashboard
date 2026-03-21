CREATE TABLE IF NOT EXISTS meta_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  ig_user_id TEXT,
  page_id TEXT,
  page_name TEXT,
  ig_username TEXT,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meta_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own meta tokens" ON meta_tokens;
CREATE POLICY "Users manage own meta tokens"
  ON meta_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_meta_tokens_updated_at'
  ) THEN
    CREATE TRIGGER update_meta_tokens_updated_at
      BEFORE UPDATE ON meta_tokens
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
