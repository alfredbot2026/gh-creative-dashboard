# TASK-026: Ad Performance Learning API + Insights Table

## Priority: P1
## Track: DEFAULT
## Independent of: TASK-023/024/025 (can run in parallel)

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `supabase/migrations/` — existing migrations (follow numbering)
3. `app/api/create/ad/route.ts` — how ad variants store provenance
4. `specs/phase-2b-carousel-learning.md` — full spec

## Wave 1: Migration

### File: `supabase/migrations/009_ad_performance_insights.sql` (Create)

```sql
-- Ad Performance Insights — learning from what works
CREATE TABLE ad_performance_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'framework_performance', 'hook_performance', 
    'format_performance', 'audience_insight'
  )),
  framework TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  sample_size INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kb_entries_used UUID[],
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE ad_performance_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_insights" ON ad_performance_insights
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_insights" ON ad_performance_insights
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_insights_user_type ON ad_performance_insights(user_id, insight_type);
CREATE INDEX idx_insights_period ON ad_performance_insights(period_start, period_end);
```

Apply to remote Supabase (same pattern as previous migrations — use psql or supabase CLI).

## Wave 2: Learning Engine

### File: `lib/analytics/learning-engine.ts` (Create)

```typescript
export interface LearningResult {
  insights: AdPerformanceInsight[]
  kb_updates: Array<{ entry_id: string; score_delta: number; reason: string }>
  summary: string
}

export async function analyzeAdPerformance(
  userId: string,
  periodDays: number = 30
): Promise<LearningResult> {
  // 1. Query ad_performance joined with content_items
  //    - Only rows where content_item_id is not null (linked to generated content)
  //    - Within the period window
  
  // 2. Parse content_items.script_data to extract:
  //    - framework used (from variant metadata)
  //    - kb_entries_used (from generation_provenance)
  
  // 3. Group by framework:
  //    - Calculate avg ROAS, CTR, CPC, CPM per framework
  //    - Calculate sample size per framework
  
  // 4. Identify top 20% and bottom 20% by ROAS
  //    - For top performers: collect kb_entries_used
  //    - For bottom performers: collect kb_entries_used
  
  // 5. Generate insights:
  //    - framework_performance: "PAS averaged 3.2x ROAS (12 ads)"
  //    - hook_performance: if hook type is tracked
  //    - format_performance: static vs carousel vs video
  
  // 6. Generate KB score updates:
  //    - Top performer entries: +0.05 effectiveness_score (cap 1.0)
  //    - Bottom performer entries: -0.02 (floor 0.0)
  
  // 7. Insert insights into ad_performance_insights
  // 8. Apply KB score updates to knowledge_entries
  // 9. Return results
}
```

**Important:** Only update KB scores if sample_size >= 3 for that framework. Don't adjust scores based on 1-2 data points.

## Wave 3: API Route

### File: `app/api/analytics/learn/route.ts` (Create)

```typescript
export async function POST(request: NextRequest) {
  // 1. Auth check
  // 2. Parse body: { period_days?: number } (default 30)
  // 3. Call analyzeAdPerformance(user.id, period_days)
  // 4. Return LearningResult
}
```

## Verification
- [ ] Migration applies cleanly
- [ ] RLS policies work (user can only read own insights)
- [ ] Learning API returns insights grouped by framework
- [ ] KB effectiveness_score updates only when sample_size >= 3
- [ ] Score updates respect cap (1.0) and floor (0.0)
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `supabase/migrations/009_ad_performance_insights.sql` | Create | New table + RLS |
| `lib/analytics/learning-engine.ts` | Create | Performance analysis logic |
| `app/api/analytics/learn/route.ts` | Create | API route |
