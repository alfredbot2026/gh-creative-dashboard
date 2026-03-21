# Task: TASK-046 — Performance Correlation Engine

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-045 (classified content)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5c
- [ ] `lib/pipeline/classification-types.ts` — ContentClassification shape

## Objective
Cross-reference content classifications with performance metrics to build Grace's Performance Profile — ranked hooks, structures, topics, posting times, and content mix.

## Changes

### Wave 1: Database

#### Task 1.1: Create `performance_profile` table
- **File:** `supabase/migrations/016_performance_profile.sql`
- **Action:** Create
- **What to do:**
  ```sql
  CREATE TABLE IF NOT EXISTS performance_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    profile JSONB NOT NULL,
    version INT NOT NULL DEFAULT 1,
    total_posts_analyzed INT,
    confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, version)
  );

  ALTER TABLE performance_profile ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users read own profile" ON performance_profile;
  CREATE POLICY "Users read own profile"
    ON performance_profile FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  ```

### Wave 2: Correlation Engine

#### Task 2.1: Performance profile types
- **File:** `lib/pipeline/profile-types.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  export interface PerformanceProfile {
    user_id: string
    generated_at: string
    sample_size: number
    
    hook_performance: RankedMetric[]
    structure_performance: RankedMetric[]
    topic_performance: RankedMetric[]
    purpose_performance: RankedMetric[]
    visual_style_performance: RankedMetric[]
    cta_performance: RankedMetric[]
    
    best_posting_times: PostingTimeSlot[]
    best_posting_days: { day: string; avg_engagement: number }[]
    
    content_mix_actual: Record<string, number>
    content_mix_optimal: Record<string, number>  // from KB
    
    topic_freshness: TopicFreshness[]
    
    platform_performance: Record<string, PlatformSummary>
    
    confidence_level: 'low' | 'medium' | 'high'
  }
  
  export interface RankedMetric {
    label: string
    sample_size: number
    avg_engagement_rate: number
    avg_reach: number
    avg_saves: number
    confidence: 'low' | 'medium' | 'high'
    trend: 'rising' | 'stable' | 'declining'
  }
  
  export interface PostingTimeSlot {
    day_of_week: number   // 0=Sunday
    hour: number          // 0-23
    avg_engagement: number
    sample_size: number
  }
  
  export interface TopicFreshness {
    topic: string
    last_posted: string
    frequency_days: number
    performance: 'above_avg' | 'average' | 'below_avg'
    platform: string
  }
  
  export interface PlatformSummary {
    total_posts: number
    avg_engagement_rate: number
    best_hook: string
    best_structure: string
    best_day: string
  }
  ```

#### Task 2.2: Correlation engine
- **File:** `lib/pipeline/correlation-engine.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // generatePerformanceProfile(userId): Promise<PerformanceProfile>
  //
  // 1. Join content_ingest + content_analysis for this user
  //    WHERE content_analysis.classification IS NOT NULL
  //    AND content_ingest.metrics != '{}'
  //
  // 2. For each dimension (hook_type, structure, topic_category, etc.):
  //    a. Group by that dimension's value
  //    b. For each group:
  //       - Calculate avg engagement rate: sum(engagement) / sum(reach)
  //       - Calculate avg saves (strongest signal)
  //       - Calculate avg reach
  //       - Count sample size
  //       - Determine confidence: n<5=low, 5-15=medium, 15+=high
  //       - Calculate trend: compare last 90 days vs all-time
  //    c. Sort by avg_engagement_rate descending
  //    d. Filter: only include groups with sample_size >= 3
  //
  // 3. Best posting times:
  //    - Group by day_of_week + hour (from published_at)
  //    - Calculate avg engagement per slot
  //    - Top 5 slots
  //
  // 4. Content mix:
  //    - content_mix_actual: count by content_purpose / total
  //    - content_mix_optimal: read from knowledge_entries where relevant
  //
  // 5. Topic freshness:
  //    - For each topic_category: last published_at, avg days between posts, performance vs avg
  //    - Per platform (not just global)
  //
  // 6. Platform performance:
  //    - Aggregate per platform
  //
  // 7. Overall confidence:
  //    - <50 analyzed posts = 'low'
  //    - 50-200 = 'medium'
  //    - 200+ = 'high'
  //
  // 8. Store in performance_profile table (increment version)
  //
  // ENGAGEMENT RATE CALCULATION:
  // Instagram: (likes + comments + saves + shares) / reach
  // YouTube: (likes + comments) / views  (or use avg_view_percentage as quality signal)
  // Facebook: engaged_users / impressions
  // Normalize across platforms by using percentile ranking, not raw rates
  ```

### Wave 3: API Routes

#### Task 3.1: Profile generation endpoint
- **File:** `app/api/profile/generate/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/profile/generate
  // Runs generatePerformanceProfile for current user
  // Returns: { version, total_analyzed, confidence, generated_at }
  ```

#### Task 3.2: Profile read endpoint
- **File:** `app/api/profile/current/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // GET /api/profile/current
  // Returns latest performance_profile for current user
  // If none exists: return { exists: false, message: "Run classification first" }
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# POST /api/profile/generate → creates profile
# GET /api/profile/current → returns ranked hooks, structures, etc.
# Spot-check: top hooks should have higher engagement than bottom ones
```

## Commit
```bash
git add -A
git commit -m "feat(pipeline): performance correlation engine + profile generation

- PerformanceProfile types with ranked metrics
- Correlation engine: groups by dimension, calculates engagement, ranks
- Posting time analysis, content mix, topic freshness
- performance_profile table with RLS
- POST /api/profile/generate + GET /api/profile/current"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-046.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-046.md`
- Notify: Dr. Strange via sessions_send
