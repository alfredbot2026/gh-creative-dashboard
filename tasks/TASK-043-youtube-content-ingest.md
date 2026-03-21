# Task: TASK-043 — YouTube Content Ingest API

> **Track:** DEFAULT
> **Builder:** solo (can run parallel with TASK-042)
> **Requires review:** Tony (no)
> **Depends on:** TASK-041 (content_ingest table from TASK-042, but YouTube OAuth already exists)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5a, YouTube sections
- [ ] `app/api/youtube/callback/route.ts` — existing YouTube OAuth
- [ ] `app/api/youtube/channel/route.ts` — existing channel API
- [ ] `supabase/migrations/014_content_ingest.sql` — table from TASK-042

## Objective
Pull all historical YouTube videos with stats and analytics into `content_ingest` table, extending existing YouTube OAuth.

## Changes

### Wave 1: YouTube Ingest Library

#### Task 1.1: YouTube content client
- **File:** `lib/youtube/content-client.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // Core functions:
  
  // 1. fetchAllChannelVideos(accessToken, channelId) → all video IDs
  //    Strategy: Use channels.list to get uploads playlist ID (1 unit)
  //    Then playlistItems.list to get all video IDs (1 unit per 50 results)
  //    DO NOT use search.list (100 units per call!)
  //    For ~100 videos: ~3 API calls = 3 units. Efficient.
  
  // 2. fetchVideoDetails(accessToken, videoIds[]) → batch video details
  //    Endpoint: GET /youtube/v3/videos?part=snippet,statistics,contentDetails&id={comma-separated}
  //    Batch up to 50 IDs per call (1 unit per call)
  //    Returns: title, description, tags, publishedAt, viewCount, likeCount, commentCount,
  //             duration, thumbnail URL
  
  // 3. fetchVideoAnalytics(accessToken, videoId, startDate, endDate) → analytics
  //    Endpoint: YouTube Analytics API
  //    GET /youtubeAnalytics/v1/reports?ids=channel==MINE
  //      &dimensions=video&filters=video=={videoId}
  //      &metrics=views,estimatedMinutesWatched,averageViewDuration,
  //               averageViewPercentage,subscribersGained,likes,comments,shares,
  //               impressions,impressionClickThroughRate
  //      &startDate={}&endDate={}
  //    Note: Analytics API has separate quota (200 req/day default)
  //    Batch by date range to minimize calls
  //    For initial ingest: one call per video with full date range
  
  // 4. refreshYouTubeToken(refreshToken) → new access token
  //    Endpoint: POST https://oauth2.googleapis.com/token
  //    grant_type=refresh_token
  
  // QUOTA TRACKING:
  // - YouTube Data API: 10,000 units/day
  // - Track units used per session in memory
  // - If approaching 8,000 units, pause and log warning
  // - YouTube Analytics API: 200 requests/day (separate)
  // - Log all API calls with unit cost
  ```

### Wave 2: API Route

#### Task 2.1: YouTube ingest endpoint
- **File:** `app/api/ingest/youtube/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/ingest/youtube
  // Body: { mode: 'full' | 'incremental', includeAnalytics: boolean }
  
  // Flow:
  // 1. Get YouTube tokens from youtube_tokens table
  // 2. Refresh token if expired
  // 3. Get channel ID and uploads playlist ID
  // 4. Fetch all video IDs from uploads playlist
  // 5. Batch fetch video details (50 per call)
  // 6. For each video: upsert into content_ingest
  //    - platform: 'youtube'
  //    - platform_id: video ID
  //    - content_type: 'youtube_video'
  //    - caption: title
  //    - description: description
  //    - tags: tags array
  //    - media_url: thumbnail URL
  //    - published_at: publishedAt
  //    - metrics: { views, likes, comments, duration, ... }
  // 7. If includeAnalytics: fetch analytics per video (respecting 200/day quota)
  //    - Merge analytics metrics into existing metrics JSONB
  //    - If quota would be exceeded, skip remaining and note in response
  // 8. Return { ingested: N, updated: N, analytics_fetched: N, quota_used: N }
  
  // NOTE: YouTube scopes may need updating.
  // Current OAuth may only have basic scopes.
  // If yt-analytics.readonly is missing, analytics fetch will fail gracefully.
  // Return a flag: analytics_available: true/false
  ```

#### Task 2.2: Update ingest status endpoint
- **File:** `app/api/ingest/status/route.ts`
- **Action:** Modify (add YouTube status — may already be partially done in TASK-042)
- **What to do:**
  - Ensure YouTube section shows: connected status, last sync time, total videos ingested
  - Check if `yt-analytics.readonly` scope is granted (from youtube_tokens scopes if stored)

### Wave 3: YouTube OAuth Scope Update

#### Task 3.1: Add analytics scope to YouTube connect
- **File:** `app/api/youtube/connect/route.ts`
- **Action:** Modify
- **What to do:**
  - Add `https://www.googleapis.com/auth/yt-analytics.readonly` to requested scopes
  - Keep existing scopes
  - Note: Users who already connected will need to re-authorize to get the new scope

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# If YouTube credentials available: POST /api/ingest/youtube → check content_ingest table
# Verify quota tracking logs appear in console
```

## Commit
```bash
git add -A
git commit -m "feat(ingest): YouTube content ingest API + analytics support

- YouTube content client (playlist-based video discovery, NOT search.list)
- POST /api/ingest/youtube (full + incremental + analytics)
- Quota tracking for Data API (10k/day) and Analytics API (200/day)
- Analytics scope added to YouTube OAuth connect
- Token refresh on expired tokens"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-043.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-043.md`
- Notify: Dr. Strange via sessions_send
