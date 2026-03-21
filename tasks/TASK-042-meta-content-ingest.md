# Task: TASK-042 — Meta Content Ingest API

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-041 (Meta OAuth must be working)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5a, Meta sections
- [ ] `lib/meta/token-refresh.ts` — token utility from TASK-041
- [ ] `lib/meta/client.ts` — existing Meta API patterns (ads sync)

## Objective
Create `content_ingest` table and API to pull all historical Instagram + Facebook content with metrics from Meta Graph API.

## Changes

### Wave 1: Database

#### Task 1.1: Create `content_ingest` table
- **File:** `supabase/migrations/014_content_ingest.sql`
- **Action:** Create
- **What to do:**
  ```sql
  CREATE TABLE IF NOT EXISTS content_ingest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube')),
    platform_id TEXT NOT NULL,
    platform_url TEXT,
    content_type TEXT NOT NULL,
    caption TEXT,
    description TEXT,
    media_url TEXT,
    tags TEXT[],
    published_at TIMESTAMPTZ NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    metrics_updated_at TIMESTAMPTZ,
    metrics_snapshot_count INT DEFAULT 0,
    raw_api_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform, platform_id)
  );

  ALTER TABLE content_ingest ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users manage own ingested content" ON content_ingest;
  CREATE POLICY "Users manage own ingested content"
    ON content_ingest FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

  CREATE INDEX IF NOT EXISTS idx_content_ingest_user_platform 
    ON content_ingest(user_id, platform);
  CREATE INDEX IF NOT EXISTS idx_content_ingest_published 
    ON content_ingest(user_id, published_at DESC);

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_content_ingest_updated_at'
    ) THEN
      CREATE TRIGGER update_content_ingest_updated_at
        BEFORE UPDATE ON content_ingest
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
  END $$;
  ```

### Wave 2: Meta Ingest Library

#### Task 2.1: Meta Graph API client for content
- **File:** `lib/meta/content-client.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // Core functions:
  
  // 1. fetchAllInstagramMedia(accessToken, igUserId) → paginated cursor loop
  //    Endpoint: GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,
  //              thumbnail_url,timestamp,permalink&limit=100
  //    Returns: all posts (paginate until no more `after` cursor)
  
  // 2. fetchMediaInsights(accessToken, mediaId, mediaType) → insights for one post
  //    Endpoint: GET /{media-id}/insights?metric=impressions,reach,engagement,saved,shares
  //    For Reels: plays,reach,likes,comments,shares,saved
  //    Note: insights may not be available for posts older than ~2 years
  //    Handle gracefully: if 400 error, return null metrics
  
  // 3. fetchFacebookPagePosts(accessToken, pageId) → paginated
  //    Endpoint: GET /{page-id}/posts?fields=id,message,created_time,permalink_url,type&limit=100
  
  // 4. fetchPostInsights(accessToken, postId) → Facebook post insights
  //    Endpoint: GET /{post-id}/insights?metric=post_impressions,post_engaged_users,
  //              post_reactions_by_type_total
  
  // RATE LIMIT HANDLING:
  // - Meta rate limit: 200 calls/user/hour
  // - Implement: exponential backoff on 429
  // - Track call count, pause if approaching limit
  // - For 500+ posts: spread across multiple hours if needed
  // - Add delay between insight calls (100ms minimum)
  ```

### Wave 3: API Route

#### Task 3.1: Meta ingest endpoint
- **File:** `app/api/ingest/meta/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/ingest/meta
  // Body: { mode: 'full' | 'incremental' }
  //   full = pull everything from the beginning
  //   incremental = pull only posts newer than most recent ingest
  
  // Flow:
  // 1. Get valid Meta token (auto-refresh if needed)
  // 2. If no token, return 400 "Meta account not connected"
  // 3. Fetch all IG media (paginated)
  // 4. For each post:
  //    a. Check if already in content_ingest (by platform_id)
  //    b. If new: fetch insights, upsert into content_ingest
  //    c. If exists and mode=full: refresh metrics only
  // 5. If page_id exists: repeat for Facebook page posts
  // 6. Return { ingested: N, updated: N, errors: N, total: N }
  
  // IMPORTANT: This may take several minutes for 500+ posts.
  // Return immediately with a job ID, or process synchronously with
  // progress tracking (simpler for V1 — just make it work).
  // For V1: synchronous is fine, just set a generous timeout.
  ```

#### Task 3.2: Ingest status endpoint
- **File:** `app/api/ingest/status/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/ingest/status
  // Returns: {
  //   meta: { connected: bool, last_sync: timestamp, total_posts: number },
  //   youtube: { connected: bool, last_sync: timestamp, total_videos: number },
  //   total_ingested: number
  // }
  // Query content_ingest grouped by platform + meta_tokens/youtube_tokens existence
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# If Meta credentials available: POST /api/ingest/meta → check content_ingest table
# Otherwise: verify types compile, routes don't 500 on missing credentials
```

## Commit
```bash
git add -A
git commit -m "feat(ingest): Meta content ingest API + content_ingest table

- content_ingest table with RLS + indexes
- Meta Graph API client for IG media + insights + FB page posts
- POST /api/ingest/meta (full + incremental modes)
- GET /api/ingest/status
- Rate limit handling with exponential backoff"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-042.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-042.md`
- Notify: Dr. Strange via sessions_send
