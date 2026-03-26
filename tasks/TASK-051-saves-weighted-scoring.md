# Task: TASK-051 — Phase 4d Wave 2: Saves-Weighted Scoring + Ad Potential Badge

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-050

## Pre-Task Learning
**Read these FIRST — before writing any code:**
1. `corrections.md` — Are any past corrections relevant? Apply proactively.
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md` — Don't repeat team mistakes.
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md` — Follow established patterns.

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `specs/phase-4d-ad-feedback-loop.md` — full phase spec (Wave 2 section)
- [ ] `skills/next-best-practices/SKILL.md` — Next.js patterns
- [ ] `skills/code-review/SKILL.md` — self-review before reporting done

## Objective
Boost "saves" to 3x weight in the performance scoring engine (best predictor of ad conversion per Hormozi data), surface saves prominently in the insights UI, and add an "Ad Potential" badge to high-save posts.

## Changes

### Wave 1: Scoring Engine Update

#### Task 1.1: Update performance scoring weights
- **File:** `lib/analytics/performance-scoring.ts` (or wherever the performance composite score is calculated — search for weight/scoring logic in `lib/`)
- **Action:** Modify
- **What to do:**
  Find the current scoring weights object. Update saves weight from current value to 9 (3x boost):
  ```typescript
  // Old: saves: 3 (or whatever current value)
  // New:
  const WEIGHTS = {
    views: 1,
    likes: 2,
    comments: 3,
    shares: 4,
    saves: 9,  // 3x boost — saves predict ad conversion (Hormozi data)
  }
  ```
  If no explicit weights file exists, search for where `saves` is used in scoring calculations across `lib/` and `app/` directories.
- **Verify:** `grep -rn "saves" lib/ app/ | grep -i "weight\|score\|rank"` — confirm new weight applied

### Wave 2: UI Enhancements

#### Task 2.1: Surface saves in post detail page
- **File:** `app/insights/[id]/page.tsx` (or the post detail component — find it)
- **Action:** Modify
- **What to do:**
  - Make saves count prominently visible (not buried in a metrics list)
  - Show saves with a bookmark/save icon
  - If saves > top 20% threshold for user's posts: show "🔥 High Save Rate" indicator
- **Verify:** Navigate to a post detail page, confirm saves is prominent

#### Task 2.2: Add "Ad Potential" badge
- **File:** `components/insights/AdPotentialBadge.tsx` (or inline in the post card component)
- **Action:** Create
- **What to do:**
  ```typescript
  // Badge component shown on posts with high ad conversion potential
  // Criteria: saves_count > median_saves * 1.5 AND engagement_rate > 2%
  // Display: "⚡ Strong Ad Candidate" badge with tooltip explaining why
  // 
  // This badge should appear on:
  // 1. Post detail page (/insights/[id])
  // 2. Post list/cards in /insights
  //
  // Tooltip: "Posts with high saves tend to convert well as ads"
  ```
- **Verify:** Posts with high saves show the badge

#### Task 2.3: Add saves filter/sort to insights list
- **File:** `app/insights/page.tsx` (the insights list page)
- **Action:** Modify
- **What to do:**
  - Add sort option: "Sort by saves" in the existing sort controls
  - If filter controls exist, add: "High ad potential only" toggle
- **Verify:** Can sort by saves, toggle shows only high-save posts

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(insights): saves-weighted scoring + ad potential badge"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-051.md`

## Output
- Branch: `feat/phase-4d-ad-performance` (same branch as TASK-050)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-051.md`
- Notify: Dr. Strange via sessions_send (1-line: ✅ status + report path)
