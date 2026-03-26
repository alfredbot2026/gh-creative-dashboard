# Task: TASK-052 — Phase 4d Wave 3: Ad ↔ Content Correlation Dashboard

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-050 (ad data must exist)

## Pre-Task Learning
**Read these FIRST — before writing any code:**
1. `corrections.md` — Are any past corrections relevant? Apply proactively.
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md` — Don't repeat team mistakes.
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md` — Follow established patterns.

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `specs/phase-4d-ad-feedback-loop.md` — full phase spec (Wave 3 section)
- [ ] `skills/next-best-practices/SKILL.md` — Next.js patterns
- [ ] `skills/code-review/SKILL.md` — self-review before reporting done

## ⚠️ Design System Rules
- **NO hardcoded hex values.** All colors from `:root` CSS variables in `app/globals.css`.
- **Use CSS Modules** — follow existing patterns in the codebase.
- **Grace-friendly language** — no jargon like "ROAS", "CPM", "CPA" in primary UI. Use translations: "cost per purchase", "return per ₱ spent", "click rate".

## Objective
Build an ad performance correlation dashboard showing which classified content performs best as ads, broken down by structure, hook, and topic. Surface "best organic → ad candidates".

## Changes

### Wave 1: Correlation API

#### Task 1.1: Ad correlation endpoint
- **File:** `app/api/ads/correlation/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/ads/correlation
  // Auth: requires authenticated user
  //
  // Returns aggregated ad performance correlated with content classifications:
  // {
  //   overview: {
  //     total_spend: number,
  //     avg_roas: number,
  //     total_purchases: number,
  //     best_ad: { name, roas, spend },
  //     worst_ad: { name, roas, spend },
  //     content_first_vs_traditional: { content_first_roas, traditional_roas }
  //   },
  //   by_structure: [{ structure_slug, ad_count, avg_roas, avg_cpa, avg_ctr, total_spend }],
  //   by_hook: [{ hook_type, ad_count, avg_roas, avg_cpa, avg_ctr, total_spend }],
  //   by_topic: [{ topic, ad_count, avg_roas, avg_cpa, total_spend }],
  //   ad_candidates: [{ content_item_id, title, saves, engagement_rate, is_boosted: false }]
  //     // Posts with high saves + engagement but NOT yet run as ads
  // }
  //
  // Joins ad_performance with content_items/content_ingest for classification data
  // content_first_vs_traditional: split by whether content_item_id is null
  // ad_candidates: content_items with saves > median AND no matching ad_performance row
  ```
- **Verify:** API returns structured data after TASK-050 sync has run

### Wave 2: Dashboard UI

#### Task 2.1: Ad insights page
- **File:** `app/insights/ads/page.tsx`
- **Action:** Create
- **What to do:**
  Build the Ad Performance Insights page with these sections:

  **Section 1: Overview Cards**
  - Total spent (period), Average return per ₱ spent, Total purchases
  - Best/worst performing ad (name + key metric)
  - Content-first ads vs direct ads comparison

  **Section 2: Performance by Structure**
  - Table: structure name → avg return, avg cost per purchase, avg click rate, sample size
  - Sort by avg return descending
  - Highlight top 3 with accent color
  - Show insight text: e.g., "PASTOR structure averages 4.2x return vs PAS at 2.1x"

  **Section 3: Performance by Hook**
  - Same table format by hook_type
  - Auto-generated insight comparing top vs bottom hooks

  **Section 4: Best Organic → Ad Candidates**
  - Card grid of posts with high saves that haven't been run as ads
  - Each card: thumbnail, title, saves count, engagement rate, "⚡ Strong Ad Candidate" badge
  - CTA: "Boost this post" (external link to Meta Ads Manager — `https://business.facebook.com/adsmanager`)

  **Section 5: Content-First Pipeline**
  - Recent ads matched to organic content (side-by-side: organic metrics vs ad metrics)
  - Which organic posts "survived" as ads (positive ROAS) vs flopped

  **Navigation:** Add "Ad Performance" link to the existing insights nav/sidebar.

- **Verify:** Page renders at `/insights/ads` with all sections

#### Task 2.2: CSS Module for ad insights
- **File:** `app/insights/ads/page.module.css`
- **Action:** Create
- **What to do:**
  Style the page using CSS Modules. Follow existing patterns in the codebase.
  Use only `:root` CSS variables from `globals.css` — no hardcoded colors.
  Make it responsive (mobile-friendly).
- **Verify:** Visually clean, matches existing dashboard aesthetic

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# Navigate to /insights/ads — page loads without errors
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(insights): ad ↔ content correlation dashboard"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-052.md`

## Output
- Branch: `feat/phase-4d-ad-performance` (same branch)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-052.md`
- Notify: Dr. Strange via sessions_send (1-line: ✅ status + report path)
