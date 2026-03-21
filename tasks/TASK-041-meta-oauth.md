# Task: TASK-041 — Meta OAuth Flow + Token Storage

> **Track:** SECURITY
> **Builder:** solo
> **Requires review:** Tony (yes — OAuth + token storage)

## Pre-Task Learning
**Read these FIRST — before writing any code:**
1. `corrections.md` — Are any past corrections relevant? Apply proactively.
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `app/api/youtube/callback/route.ts` — existing OAuth pattern to follow
- [ ] `app/api/youtube/connect/route.ts` — existing connect pattern
- [ ] `supabase/migrations/` — existing migration patterns
- [ ] `specs/phase-3.5-learning-pipeline.md` — full spec (Sub-phase 3.5a section)

## Objective
Implement Meta OAuth 2.0 flow for Instagram/Facebook, store tokens securely, and add Connected Accounts UI to Settings page.

## Changes

### Wave 1: Database Migration

#### Task 1.1: Create `meta_tokens` table
- **File:** `supabase/migrations/013_meta_tokens.sql`
- **Action:** Create
- **What to do:**
  ```sql
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
  ```
- **Verify:** Run migration via Supabase CLI or dashboard. Check table exists.

### Wave 2: API Routes

#### Task 2.1: Meta OAuth connect route
- **File:** `app/api/meta/connect/route.ts`
- **Action:** Create
- **What to do:**
  - `GET /api/meta/connect` — redirects to Meta OAuth URL
  - Env vars: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`
  - Scopes: `instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement`
  - Include `state` param with user ID for CSRF protection
  - Redirect URL: `https://www.facebook.com/v21.0/dialog/oauth?client_id={}&redirect_uri={}&scope={}&state={}`

#### Task 2.2: Meta OAuth callback route
- **File:** `app/api/meta/callback/route.ts`
- **Action:** Create
- **What to do:**
  - `GET /api/meta/callback?code=xxx&state=xxx`
  - Exchange code for short-lived token: `POST https://graph.facebook.com/v21.0/oauth/access_token`
  - Exchange short-lived for long-lived token: `GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&...`
  - Get IG Business Account: `GET /me/accounts` → find page → `GET /{page-id}?fields=instagram_business_account`
  - Store in `meta_tokens`: access_token, ig_user_id, page_id, page_name, token_expires_at (60 days from now)
  - Redirect to `/settings?meta=connected`

#### Task 2.3: Meta disconnect route
- **File:** `app/api/meta/disconnect/route.ts`
- **Action:** Create
- **What to do:**
  - `POST /api/meta/disconnect`
  - Delete row from `meta_tokens` for current user
  - Optionally purge `content_ingest` rows where platform = 'instagram' or 'facebook' (query param `?purge=true`)
  - Return `{ success: true }`

#### Task 2.4: Meta token refresh utility
- **File:** `lib/meta/token-refresh.ts`
- **Action:** Create
- **What to do:**
  - `refreshMetaToken(userId: string): Promise<string>` — checks if token is expiring within 7 days, if so exchanges for new long-lived token
  - `getValidMetaToken(userId: string): Promise<string | null>` — gets token, auto-refreshes if needed, returns null if no token or refresh fails
  - On refresh failure: log error, mark token as expired in DB

### Wave 3: Settings UI

#### Task 3.1: Connected Accounts section on Settings page
- **File:** `app/settings/page.tsx` (or create `components/settings/ConnectedAccounts.tsx`)
- **Action:** Modify / Create
- **What to do:**
  - New section: "Connected Accounts"
  - Show YouTube status: connected (channel name) or "Connect YouTube" button
  - Show Meta/Instagram status: connected (IG username, page name) or "Connect Instagram" button
  - Connect buttons link to `/api/youtube/connect` and `/api/meta/connect`
  - Disconnect buttons call respective disconnect endpoints
  - Fetch connection status via server action or API call to check if tokens exist
- **Verify:** Visit `/settings`, see Connected Accounts section

### Wave 4: Env vars

#### Task 4.1: Add env vars to `.env.local.example`
- **File:** `.env.local.example`
- **Action:** Modify
- **What to do:**
  ```
  # Meta OAuth (Instagram/Facebook)
  META_APP_ID=
  META_APP_SECRET=
  META_REDIRECT_URI=http://localhost:3000/api/meta/callback
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# Visit /settings — Connected Accounts section visible
# Click "Connect Instagram" — redirects to Meta OAuth (will fail without real credentials, but route should not 500)
```

## Commit
```bash
git add -A
git commit -m "feat(auth): Meta OAuth flow + meta_tokens table + Connected Accounts UI

- Meta OAuth connect/callback/disconnect routes
- meta_tokens table with RLS
- Token refresh utility
- Connected Accounts section on Settings page
- Follows existing YouTube OAuth pattern"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-041.md`

## Output
- Branch: `main` (or `feat/meta-oauth` if preferred)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-041.md`
- Notify: Dr. Strange via sessions_send
