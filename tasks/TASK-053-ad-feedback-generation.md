# Task: TASK-053 — Phase 4d Wave 4: Feed Ad Performance into Generation Engine

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-050, TASK-052

## Pre-Task Learning
**Read these FIRST — before writing any code:**
1. `corrections.md` — Are any past corrections relevant? Apply proactively.
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md` — Don't repeat team mistakes.
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md` — Follow established patterns.

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `specs/phase-4d-ad-feedback-loop.md` — full phase spec (Wave 4 section)
- [ ] `lib/create/ad-generator.ts` — existing ad copy generation (understand current flow)
- [ ] `lib/create/kb-retriever.ts` — how KB context is pulled for generation
- [ ] `skills/next-best-practices/SKILL.md` — Next.js patterns
- [ ] `skills/code-review/SKILL.md` — self-review before reporting done

## Objective
Close the feedback loop: inject actual ad ROAS/performance data into the generation engine so new scripts prefer structures/hooks/topics that convert as ads, not just organically.

## Changes

### Wave 1: Ad Performance Context Builder

#### Task 1.1: Build ad performance context utility
- **File:** `lib/create/ad-performance-context.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // Pulls aggregated ad performance data to inject into generation prompts
  //
  // getAdPerformanceContext(userId: string): Promise<AdPerformanceContext>
  //
  // Returns:
  // {
  //   topStructures: string[]     // Top 5 structures by avg ROAS
  //   topHooks: string[]          // Top 5 hook types by avg ROAS
  //   topTopics: string[]         // Top 5 topics by avg ROAS
  //   roasByStructure: Record<string, { avg_roas: number, sample_size: number }>
  //   roasByHook: Record<string, { avg_roas: number, sample_size: number }>
  //   hasEnoughData: boolean      // True if >5 ads with >₱3,000 total spend
  //   dataWindow: string          // e.g., "Last 90 days"
  // }
  //
  // Query: aggregate ad_performance by structure_slug, hook_type, topic
  //   WHERE user_id = userId AND spend > 0
  //   GROUP BY each dimension, ORDER BY avg(roas) DESC, LIMIT 5
  //
  // If hasEnoughData is false, return empty arrays — don't inject unreliable data
  // Uses Supabase service client for aggregation (or user client with RLS)
  ```
- **Verify:** TypeScript compiles, function signature correct

### Wave 2: Generation Engine Integration

#### Task 2.1: Inject ad context into script generation
- **File:** `lib/create/ad-generator.ts` (or the main generation orchestrator)
- **Action:** Modify
- **What to do:**
  After loading existing KB context (brand voice, frameworks, etc.), ALSO load ad performance context:
  ```typescript
  const adContext = await getAdPerformanceContext(userId)
  
  // If we have enough data, prepend to system prompt:
  if (adContext.hasEnoughData) {
    const adInsights = `
  AD PERFORMANCE DATA (from your actual ads — last 90 days):
  - Best-converting structures: ${adContext.topStructures.join(', ')}
  - Best-converting hooks: ${adContext.topHooks.join(', ')}  
  - Topics that convert as ads: ${adContext.topTopics.join(', ')}
  
  When generating content, prefer patterns that have proven ad conversion data.
  If the goal is "sell" or "announce", heavily weight ad-proven patterns.
  `
    // Append to the existing system prompt context
  }
  ```
  This should apply to BOTH short-form and ad copy generation endpoints.
- **Verify:** Generate a script and check the LLM prompt includes ad context (add debug log if needed, then remove)

#### Task 2.2: Add ad-proven badges to structure recommendations
- **File:** The structure browser/picker UI (likely `app/structures/page.tsx` or similar)
- **Action:** Modify
- **What to do:**
  When displaying structures in the creation flow:
  - Query ad performance by structure
  - If a structure has avg_roas > 2.0 with sample_size >= 2: show "🔥 Top ad converter" badge
  - Sort structures with ad-proven ones first when user's goal is "sell"
- **Verify:** Structure list shows badges for ad-proven structures

#### Task 2.3: Quality gate ad conversion check
- **File:** `lib/eval/quality-gate.ts` (or wherever the quality gate runs)
- **Action:** Modify
- **What to do:**
  Add a new quality check: `ad_conversion_potential`
  - If the generated script uses a structure/hook combo that historically underperforms as ads (roas < 1.0 with sample_size >= 3), flag it
  - Severity: warning (not blocking) — just surface it as "⚠️ This pattern hasn't performed well as an ad"
  - Only apply when user's goal includes ad/sell intent
- **Verify:** Quality gate includes the new check

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(create): inject ad performance feedback into generation engine"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-053.md`

## Output
- Branch: `feat/phase-4d-ad-performance` (same branch)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-053.md`
- Notify: Dr. Strange via sessions_send (1-line: ✅ status + report path)
