# Task: TASK-045 — Batch Classification Pipeline

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-042/043 (ingested content), TASK-044 (classification prompt validated)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5b
- [ ] `lib/pipeline/classification-prompt.ts` — from TASK-044
- [ ] `lib/pipeline/classification-types.ts` — from TASK-044

## Objective
Classify all ingested content in batches. Store results in `content_analysis` table. Handle rate limits and partial failures gracefully.

## Changes

### Wave 1: Database

#### Task 1.1: Create `content_analysis` table
- **File:** `supabase/migrations/015_content_analysis.sql`
- **Action:** Create
- **What to do:**
  ```sql
  CREATE TABLE IF NOT EXISTS content_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ingest_id UUID NOT NULL REFERENCES content_ingest(id) ON DELETE CASCADE,
    classification JSONB NOT NULL,
    model_used TEXT NOT NULL,
    classification_version INT DEFAULT 1,
    confidence_avg FLOAT,
    manual_overrides JSONB,
    user_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ingest_id, classification_version)
  );

  ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users manage own content analysis" ON content_analysis;
  CREATE POLICY "Users manage own content analysis"
    ON content_analysis FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

  CREATE INDEX IF NOT EXISTS idx_content_analysis_user 
    ON content_analysis(user_id);
  CREATE INDEX IF NOT EXISTS idx_content_analysis_ingest 
    ON content_analysis(ingest_id);
  ```

### Wave 2: Batch Classifier

#### Task 2.1: Batch classification engine
- **File:** `lib/pipeline/batch-classifier.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // classifyBatch(userId, batchSize = 20, options?)
  //
  // 1. Query content_ingest WHERE user_id = userId 
  //    AND NOT EXISTS in content_analysis (unclassified only)
  //    ORDER BY published_at DESC
  //    LIMIT batchSize
  //
  // 2. For each item:
  //    a. Build classification prompt (using KB vocabulary)
  //    b. Call Gemini Flash with JSON mode
  //    c. Parse response into ContentClassification
  //    d. Calculate confidence_avg
  //    e. Upsert into content_analysis
  //
  // 3. Rate limiting:
  //    - 100ms delay between API calls
  //    - On 429: exponential backoff (1s, 2s, 4s, 8s, max 30s)
  //    - On persistent failure: skip item, log error, continue
  //
  // 4. Return: { classified: N, skipped: N, errors: string[], remaining: N }
  
  // classifyAll(userId) — loops classifyBatch until all done
  // Progress callback: (classified, total) => void
  ```

### Wave 3: API Routes

#### Task 3.1: Batch classification endpoint
- **File:** `app/api/classify/batch/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/classify/batch
  // Body: { batchSize?: number }  (default 20, max 50)
  // Runs one batch of classification
  // Returns: { classified, skipped, errors, remaining }
  
  // POST /api/classify/all
  // Runs classifyAll — may take several minutes
  // For V1: synchronous (generous timeout)
  // Returns: { total_classified, total_errors, duration_seconds }
  ```

#### Task 3.2: Classification status endpoint
- **File:** `app/api/classify/status/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/classify/status
  // Returns: {
  //   total_ingested: number,
  //   total_classified: number,
  //   total_unclassified: number,
  //   classification_version: number,
  //   last_classified_at: timestamp
  // }
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# POST /api/classify/batch → classifies up to 20 items
# GET /api/classify/status → shows progress
# Check content_analysis table has rows with valid JSONB classification
```

## Commit
```bash
git add -A
git commit -m "feat(pipeline): batch content classification + content_analysis table

- content_analysis table with RLS
- Batch classifier with rate limiting and error handling
- POST /api/classify/batch and /api/classify/all
- GET /api/classify/status
- Gemini Flash for cheap, fast classification"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-045.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-045.md`
- Notify: Dr. Strange via sessions_send
