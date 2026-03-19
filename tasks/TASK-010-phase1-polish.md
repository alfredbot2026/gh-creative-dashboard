# TASK-010 — Phase 1 Polish (Bug Fixes)

> **Track:** DEFAULT
> **Builder:** solo
> **Priority:** P1 — must fix before Phase 2

## Pre-Task Learning
1. Read `self-improving/corrections.md` — apply relevant past mistakes
2. Read `LESSONS-LEARNED.md`
3. Read `references/ARCHITECTURE.md`
4. Read `skills/next-best-practices/SKILL.md`

## Context
Phase 1 QA screenshots revealed two bugs that need fixing before we move forward.

## Changes

### Wave 1: Fix analytics loading spinner (TASK-009 bug)

#### Bug
`/analytics/short-form` — the "Recent Performance" table shows a perpetual loading spinner when there are zero entries. The empty state is never shown.

#### Fix
- **File:** `app/analytics/short-form/page.tsx`
- **Action:** Modify
- **What to do:**
  The data fetch likely returns an empty array `[]` but the component treats it as "still loading." Fix the loading state logic:
  1. Find the state that controls the spinner (likely `useState` for loading + data)
  2. After the fetch completes (even with empty result), set loading to `false`
  3. When `loading === false && entries.length === 0`, show an empty state: "No performance entries yet. Click '+ Add Entry' to log your first post."
  4. When `loading === false && entries.length > 0`, show the table

  Common pattern that causes this bug:
  ```typescript
  // BAD: only sets loading=false when data exists
  if (data.length > 0) setLoading(false)
  
  // GOOD: always set loading=false after fetch
  setLoading(false)
  ```
- **Verify:** `npm run build` + open `/analytics/short-form` in browser — should show empty state message, NOT a spinner

### Wave 2: Fix eval page tab label (TASK-006 bug)

#### Bug
`/eval` — the first tab label renders as just `|` instead of proper text (e.g., "Test Scorer").

#### Fix
- **File:** `app/eval/page.tsx`
- **Action:** Modify
- **What to do:**
  1. Find the tab/navigation component at the top of the page
  2. Check why the first tab label is rendering as `|` — likely a missing string, bad conditional render, or CSS clipping
  3. Fix the label to show the correct text
  4. Also check: the "Score Content" button looks unstyled/muted — if it's using a plain `<button>` without the project's button styles, add the appropriate CSS class

- **Verify:** `npm run build` + open `/eval` in browser — tab should show proper label text, button should be styled

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
```

Open BOTH pages in browser and take screenshots:
- `/analytics/short-form` — must show empty state, NOT spinner
- `/eval` — must show proper tab labels

Save screenshots to `active/gh-creative-dashboard/qa/TASK-010-*.png`

⚠️ **Screenshots are MANDATORY. No screenshots = rejected.**

## Commit
```bash
git add -A
git commit -m "fix: analytics empty state spinner + eval tab label (Phase 1 polish)"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-010.md`

## Output
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-010.md`
- Set WORKER-QUEUE.md: `state: WAITING_FOR_QA`, `result_file: active/gh-creative-dashboard/BUILD-REPORT-TASK-010.md`
