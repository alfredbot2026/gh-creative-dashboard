# Task: TASK-048 — Continuous Pipeline (Polling + Metrics Refresh)

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-042/043 (ingest), TASK-045 (classification), TASK-046 (profile)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5d
- [ ] `lib/meta/content-client.ts` — from TASK-042
- [ ] `lib/youtube/content-client.ts` — from TASK-043
- [ ] `lib/pipeline/batch-classifier.ts` — from TASK-045
- [ ] `lib/pipeline/correlation-engine.ts` — from TASK-046

## Objective
Set up recurring pipeline: detect new posts, refresh metrics on recent posts, reclassify new content, and recalculate the performance profile.

## Changes

### Wave 1: Pipeline Orchestrator

#### Task 1.1: Pipeline orchestrator
- **File:** `lib/pipeline/orchestrator.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // runPipelineCycle(userId): Promise<PipelineResult>
  //
  // Full cycle:
  // 1. INGEST: Pull new posts since last sync
  //    - Meta: incremental ingest (posts after most recent in content_ingest)
  //    - YouTube: incremental ingest
  //    - Log: "Ingested N new posts"
  //
  // 2. METRICS REFRESH: Update metrics on recent posts
  //    - Posts 0-24h old: refresh (volatile period)
  //    - Posts 1-7d old: refresh
  //    - Posts 7-30d old: refresh only if metrics_snapshot_count < 5
  //    - Posts 30d+: skip (metrics stabilized)
  //    - Update metrics JSONB and metrics_updated_at
  //    - Increment metrics_snapshot_count
  //    - Log: "Refreshed metrics on N posts"
  //
  // 3. CLASSIFY: Run batch classification on unclassified content
  //    - Only new posts that haven't been classified yet
  //    - Log: "Classified N posts"
  //
  // 4. PROFILE: Recalculate performance profile
  //    - Only if new classifications were added
  //    - Or if metrics refresh changed significant data
  //    - Debounce: skip if profile was recalculated within last 24h
  //    - Log: "Profile recalculated (version N)"
  //
  // 5. Return: PipelineResult with counts and timing per step
  
  // interface PipelineResult {
  //   new_posts_ingested: number
  //   metrics_refreshed: number
  //   posts_classified: number
  //   profile_recalculated: boolean
  //   duration_seconds: number
  //   errors: string[]
  //   timestamp: string
  // }
  ```

### Wave 2: API Routes

#### Task 2.1: Pipeline run endpoint
- **File:** `app/api/pipeline/run/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/pipeline/run
  // Body: { steps?: ('ingest' | 'metrics' | 'classify' | 'profile')[] }
  // Default: all steps
  // Can specify subset: { steps: ['ingest', 'classify'] }
  // Returns: PipelineResult
  ```

#### Task 2.2: Pipeline status endpoint
- **File:** `app/api/pipeline/status/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/pipeline/status
  // Returns: {
  //   last_run: PipelineResult | null,
  //   next_scheduled: string | null,
  //   connected_platforms: string[],
  //   health: 'healthy' | 'stale' | 'error'
  //   // stale = last run > 48h ago
  //   // error = last run had errors
  // }
  ```

### Wave 3: Pipeline Cron Route (Next.js cron)

#### Task 3.1: Cron-triggered pipeline
- **File:** `app/api/pipeline/cron/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/pipeline/cron
  // Protected by cron secret (CRON_SECRET env var)
  // Header: Authorization: Bearer {CRON_SECRET}
  //
  // Runs pipeline for ALL users with connected accounts
  // For now: single user (Grace), but designed for multi-user
  //
  // Query: SELECT DISTINCT user_id FROM meta_tokens
  //        UNION SELECT DISTINCT user_id FROM youtube_tokens (extract from channel_id → user mapping)
  //
  // For each user: runPipelineCycle(userId)
  // Returns: { users_processed: N, results: PipelineResult[] }
  
  // Vercel cron config (vercel.json):
  // { "crons": [{ "path": "/api/pipeline/cron", "schedule": "0 */12 * * *" }] }
  // Runs every 12 hours
  ```

### Wave 4: Pipeline History

#### Task 4.1: Store pipeline run history
- **File:** `lib/pipeline/history.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // Store last 30 pipeline runs in a simple table or JSONB column
  // For V1: store in a pipeline_runs table
  
  // CREATE TABLE pipeline_runs (
  //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  //   user_id UUID NOT NULL,
  //   result JSONB NOT NULL,
  //   created_at TIMESTAMPTZ DEFAULT now()
  // );
  //
  // Auto-prune: DELETE WHERE created_at < now() - interval '30 days'
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# POST /api/pipeline/run → runs full cycle
# GET /api/pipeline/status → shows health
# Verify: new posts ingested, metrics refreshed, classified, profile updated
```

## Commit
```bash
git add -A
git commit -m "feat(pipeline): continuous pipeline orchestrator + cron

- Pipeline orchestrator: ingest → metrics refresh → classify → profile
- POST /api/pipeline/run (manual trigger, supports step selection)
- GET /api/pipeline/status (health check)
- Cron route for automated 12-hour cycles
- Pipeline run history (30-day retention)"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-048.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-048.md`
- Notify: Dr. Strange via sessions_send
