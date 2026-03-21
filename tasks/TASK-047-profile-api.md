# Task: TASK-047 — Profile API + Insights Endpoint

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-046 (performance profile exists)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5c
- [ ] `lib/pipeline/profile-types.ts` — from TASK-046

## Objective
Create a human-readable insights API that translates the performance profile into actionable recommendations. This will be consumed by the V2 creation flows and by a future insights UI.

## Changes

### Wave 1: Insights Engine

#### Task 1.1: Insights generator
- **File:** `lib/pipeline/insights-generator.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // generateInsights(profile: PerformanceProfile): Insight[]
  //
  // Translates raw ranked data into plain-language insights:
  //
  // interface Insight {
  //   type: 'recommendation' | 'pattern' | 'warning' | 'opportunity'
  //   title: string           // "Your best hook is Comparison"
  //   detail: string          // "Comparison hooks get 2.5x more saves than your average"
  //   confidence: 'low' | 'medium' | 'high'
  //   data: Record<string, any>  // backing data for UI rendering
  //   actionable: boolean     // can the system act on this?
  // }
  //
  // Generate insights for:
  // 1. Top 3 hooks by engagement (recommendation)
  // 2. Best posting time slots (recommendation)
  // 3. Content mix imbalance: actual vs optimal (warning)
  // 4. Topics that are "stale" — not posted in >2x their normal frequency (opportunity)
  // 5. Declining trends: hook/structure that used to work but isn't anymore (warning)
  // 6. Rising trends: techniques gaining momentum (pattern)
  // 7. Platform differences: "X works better on IG, Y works better on YT" (pattern)
  //
  // Keep insights <15 total. Prioritize by confidence + actionability.
  ```

### Wave 2: API Routes

#### Task 2.1: Insights endpoint
- **File:** `app/api/profile/insights/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/profile/insights
  // Returns: { insights: Insight[], profile_version: number, generated_at: string }
  // If no profile: return 404 with { message: "No performance profile yet" }
  ```

#### Task 2.2: Profile summary for creation flows
- **File:** `app/api/profile/recommendations/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/profile/recommendations?purpose=educate&platform=instagram
  // Returns targeted recommendations for a specific creation context:
  // {
  //   recommended_hooks: [{ name, reason, confidence }],
  //   recommended_structures: [{ name, reason, confidence }],
  //   recommended_posting_time: { day, hour, reason },
  //   topic_suggestions: [{ topic, days_since_last, reason }],
  //   style_recommendation: { visual_style, reason }
  // }
  //
  // This is the endpoint that V2 creation flows will call to inject
  // performance intelligence into the generation process.
  // If no profile exists: return generic KB-based recommendations.
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# GET /api/profile/insights → returns insights array
# GET /api/profile/recommendations?purpose=educate → returns recommendations
```

## Commit
```bash
git add -A
git commit -m "feat(pipeline): insights generator + recommendations API

- Insights generator: translates profile into plain-language recommendations
- GET /api/profile/insights
- GET /api/profile/recommendations (context-specific for creation flows)
- Graceful fallback to KB when no profile exists"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-047.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-047.md`
- Notify: Dr. Strange via sessions_send
