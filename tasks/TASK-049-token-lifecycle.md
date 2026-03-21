# Task: TASK-049 — Token Lifecycle + Rate Limit Safety

> **Track:** SECURITY
> **Builder:** solo (can run parallel with TASK-042+)
> **Requires review:** Tony (yes — auth + security)
> **Depends on:** TASK-041 (Meta OAuth exists)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5d, Tony guardrails
- [ ] `reviews/V2-VISION-REVIEW.md` — Tony's security concerns
- [ ] `app/api/youtube/callback/route.ts` — existing YouTube token storage
- [ ] `lib/meta/token-refresh.ts` — from TASK-041

## Objective
Harden token storage, implement auto-refresh, add disconnection/revocation flows, and add rate limit tracking with safety cutoffs for all external API calls.

## Changes

### Wave 1: Rate Limit Tracker

#### Task 1.1: API quota tracker
- **File:** `lib/pipeline/quota-tracker.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // QuotaTracker — tracks API usage per day per service
  //
  // interface QuotaConfig {
  //   service: 'youtube_data' | 'youtube_analytics' | 'meta_graph'
  //   daily_limit: number        // youtube_data: 10000, youtube_analytics: 200, meta: 200/user/hour
  //   warning_threshold: number  // 0.8 = warn at 80%
  // }
  //
  // trackUsage(service, units): void
  //   - Increment daily counter
  //   - If > warning_threshold: log warning
  //   - If > daily_limit: throw QuotaExhaustedError
  //
  // getUsage(service): { used, limit, remaining, percentage }
  //
  // canProceed(service, estimatedUnits): boolean
  //   - Returns false if adding estimatedUnits would exceed limit
  //
  // resetDaily(): void — called at midnight UTC
  //
  // Storage: in-memory Map (resets on server restart — acceptable for V1)
  // Future: persist to DB or Redis for multi-instance
  //
  // YOUTUBE DATA API COSTS:
  // search.list = 100 units (NEVER use in recurring jobs)
  // channels.list = 1 unit
  // playlistItems.list = 1 unit
  // videos.list = 1 unit
  ```

### Wave 2: Token Health Checks

#### Task 2.1: Token health checker
- **File:** `lib/pipeline/token-health.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // checkTokenHealth(userId): Promise<TokenHealthReport>
  //
  // interface TokenHealthReport {
  //   meta: {
  //     connected: boolean
  //     token_valid: boolean
  //     expires_in_days: number | null
  //     needs_refresh: boolean  // < 7 days to expiry
  //     scopes: string[]
  //   } | null
  //   youtube: {
  //     connected: boolean
  //     token_valid: boolean
  //     has_analytics_scope: boolean
  //     last_refresh: string | null
  //   } | null
  // }
  //
  // For Meta: check token_expires_at, attempt a lightweight API call (GET /me)
  // For YouTube: attempt GET /youtube/v3/channels?mine=true (1 unit, lightweight)
  // If call fails: mark as invalid
  //
  // refreshAllTokens(userId): refresh any tokens nearing expiry
  ```

### Wave 3: Disconnect + Purge

#### Task 3.1: YouTube disconnect endpoint
- **File:** `app/api/youtube/disconnect/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/youtube/disconnect
  // Body: { purge?: boolean }
  // 1. Delete from youtube_tokens for current user
  // 2. If purge=true: DELETE from content_ingest WHERE platform='youtube' AND user_id=auth.uid()
  //    Also: DELETE from content_analysis WHERE ingest_id IN (purged ingest IDs)
  // 3. Return { success: true, purged: boolean }
  ```

#### Task 3.2: Token health API
- **File:** `app/api/tokens/health/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/tokens/health
  // Returns TokenHealthReport for current user
  // Used by Settings page to show connection status + warnings
  ```

### Wave 4: Integrate Safety into Existing Clients

#### Task 4.1: Add quota tracking to Meta client
- **File:** `lib/meta/content-client.ts`
- **Action:** Modify
- **What to do:**
  - Import QuotaTracker
  - Before each API call: `quotaTracker.canProceed('meta_graph', 1)`
  - After each call: `quotaTracker.trackUsage('meta_graph', 1)`
  - On 429 response: exponential backoff (1s, 2s, 4s, 8s, max 30s, max 5 retries)

#### Task 4.2: Add quota tracking to YouTube client
- **File:** `lib/youtube/content-client.ts`
- **Action:** Modify
- **What to do:**
  - Import QuotaTracker
  - Before each Data API call: `quotaTracker.canProceed('youtube_data', unitCost)`
  - Track with correct unit costs per endpoint
  - Before each Analytics call: `quotaTracker.canProceed('youtube_analytics', 1)`
  - On quota exhaustion: gracefully stop, return partial results with warning

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# GET /api/tokens/health → shows token status
# POST /api/youtube/disconnect → disconnects + optionally purges
# Verify quota tracker logs warnings when approaching limits
```

## Commit
```bash
git add -A
git commit -m "feat(security): token lifecycle + rate limit safety

- API quota tracker with daily limits and safety cutoffs
- Token health checker (validity, expiry, scope verification)
- YouTube disconnect + data purge endpoint
- Quota tracking integrated into Meta and YouTube clients
- Exponential backoff on rate limit errors"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-049.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-049.md`
- Notify: Dr. Strange via sessions_send
