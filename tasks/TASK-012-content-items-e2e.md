# TASK-012 — Content Items Migration + End-to-End Verification

> **Track:** DEFAULT
> **Priority:** P0 — completes Phase 1
> **Depends on:** TASK-011 (auth must work first)

## Pre-Task Learning
1. Read `self-improving/corrections.md`
2. Read `LESSONS-LEARNED.md`
3. Read `references/ARCHITECTURE.md`
4. Read `skills/next-best-practices/SKILL.md`

## Context
Phase 1c (calendar integration) was skipped because `content_items` table doesn't exist. The "Add to Calendar" button in `/create/short-form` fails. This task adds the migration and does a full end-to-end test of the entire Phase 1 flow.

## Changes

### Wave 1: Content Items Migration

#### 1.1 Create migration
- **File:** `supabase/migrations/006_content_items.sql`
- **Action:** Create
- Read existing migrations (001-005) to understand the schema patterns
- `content_items` table needs at minimum:
  - `id` UUID PK default gen_random_uuid()
  - `tenant_id` UUID NOT NULL (composite PK pattern)
  - `user_id` UUID NOT NULL references auth.users
  - `title` TEXT NOT NULL
  - `content_type` TEXT NOT NULL (e.g., 'short-form', 'ad', 'youtube')
  - `platform` TEXT (instagram-reels, tiktok, youtube-shorts, etc.)
  - `script_data` JSONB (the full generated script)
  - `status` TEXT DEFAULT 'draft' (draft, scheduled, published)
  - `scheduled_date` TIMESTAMPTZ
  - `published_at` TIMESTAMPTZ
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - `updated_at` TIMESTAMPTZ DEFAULT now()
- Enable RLS
- RLS policy: users can CRUD their own tenant's items (`current_tenant_id()` pattern)
- Add composite PK if that's the project pattern: `PRIMARY KEY (tenant_id, id)`

#### 1.2 Apply migration
```bash
npx supabase db push --project-ref mnqwquoewvgfztenyygf
```
- If supabase CLI is not linked, use:
```bash
npx supabase migration up --project-ref mnqwquoewvgfztenyygf
```
- Or apply via Supabase SQL editor if CLI fails

- **Verify:** Table exists in Supabase dashboard

### Wave 2: Verify "Add to Calendar" Works

#### 2.1 Check server action
- **File:** `app/actions/create.ts`
- **Action:** Read and verify `addScriptToCalendar` inserts into `content_items`
- Fix any column name mismatches between the server action and the new migration
- **Verify:** `npx tsc --noEmit`

### Wave 3: End-to-End Functional Test (MANDATORY)

This is the most important part. You MUST do all of these steps and capture evidence.

#### 3.1 Start dev server
```bash
npm run dev
```

#### 3.2 Test login
1. Open browser → navigate to app
2. Should redirect to `/login`
3. Log in with `grace@ghcreative.test` / `GHCreative2026!`
4. **Screenshot:** Successful dashboard after login

#### 3.3 Test script generation
1. Navigate to `/create/short-form`
2. Enter topic: "3 common mistakes when scaling Facebook ads"
3. Select platform: Instagram Reels
4. Click "Generate Script"
5. **Wait for response** — should show generated script with scenes
6. **Screenshot:** Generated script result
7. If generation fails: check console errors, check API route, fix and retry

#### 3.4 Test "Add to Calendar"
1. After script generates, set a schedule date
2. Click "Add to Calendar"
3. **Screenshot:** Success state (or error if it fails — then fix)

#### 3.5 Test eval scorer
1. Navigate to `/eval`
2. Enter test content in the scorer
3. Click "Score Content"
4. **Screenshot:** Score result

#### 3.6 Test analytics
1. Navigate to `/analytics/short-form`
2. Click "+ Add Entry"
3. Fill in test data and submit
4. **Screenshot:** Entry appears in the table (not just empty state)

Save ALL screenshots to `active/gh-creative-dashboard/qa/TASK-012-*.png`

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
```

Include in build report:
- Build output (pasted)
- Screenshot of each step above
- Any errors encountered and how they were fixed

⚠️ **This is the Phase 1 sign-off task. If ANY step fails, fix it and retry. Do not report done with failures.**

## Commit
```bash
git add -A
git commit -m "feat: add content_items migration + Phase 1 e2e verification"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-012.md`

## Output
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-012.md`
- Set WORKER-QUEUE.md: `state: WAITING_FOR_QA`, `result_file: active/gh-creative-dashboard/BUILD-REPORT-TASK-012.md`
