# TASK-009 — Short-form Performance Tracking (Phase 1d)

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** No
> **Depends on:** TASK-008 (creation UI must exist for linking)

## Pre-Task Learning
**Read `corrections.md` FIRST.** Are any past corrections relevant to this task? If yes, note them and apply proactively.

## Context
**Read these FIRST before writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `supabase/migrations/` — existing migration numbering
- [ ] `app/youtube/page.tsx` — existing analytics page pattern
- [ ] `lib/create/types.ts` — ShortFormScript types (from TASK-007)

## Objective
Add a `shortform_performance` table for tracking views/shares/saves and a manual entry UI. This closes the loop: generate → publish → track → learn.

## Changes

### Wave 1: Schema

#### Task 1.1: Create migration
- **File:** `supabase/migrations/005_shortform_performance.sql`
- **Action:** Create
- **What to do:**
  ```sql
  -- Short-form content performance tracking
  CREATE TABLE IF NOT EXISTS shortform_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID,                    -- link to content_items
    
    -- Platform
    platform TEXT NOT NULL CHECK (platform IN ('instagram-reels', 'tiktok', 'youtube-shorts')),
    post_url TEXT,                            -- link to the actual post
    posted_at TIMESTAMPTZ,
    
    -- Metrics (manual entry for now)
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    follows_gained INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    
    -- Computed
    engagement_rate FLOAT GENERATED ALWAYS AS (
      CASE WHEN views > 0 
        THEN (likes + comments + shares + saves)::FLOAT / views 
        ELSE 0 
      END
    ) STORED,
    
    -- Metadata
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX idx_sf_perf_content ON shortform_performance(content_item_id);
  CREATE INDEX idx_sf_perf_platform ON shortform_performance(platform);
  CREATE INDEX idx_sf_perf_engagement ON shortform_performance(engagement_rate DESC);

  ALTER TABLE shortform_performance ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Authenticated users can manage shortform_performance" 
    ON shortform_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);

  CREATE TRIGGER update_shortform_performance_updated_at
    BEFORE UPDATE ON shortform_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```
- **Verify:** Migration file exists, SQL is valid

#### Task 1.2: Create types
- **File:** `lib/create/performance-types.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  export interface ShortFormPerformance {
    id: string
    content_item_id: string | null
    platform: 'instagram-reels' | 'tiktok' | 'youtube-shorts'
    post_url: string | null
    posted_at: string | null
    views: number
    likes: number
    comments: number
    shares: number
    saves: number
    follows_gained: number
    reach: number
    engagement_rate: number
    notes: string
    created_at: string
    updated_at: string
  }

  export type ShortFormPerformanceInsert = Omit<ShortFormPerformance, 
    'id' | 'created_at' | 'updated_at' | 'engagement_rate'
  >
  ```
- **Verify:** `npx tsc --noEmit`

### Wave 2: Server actions

#### Task 2.1: CRUD actions
- **File:** `app/actions/performance.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import type { ShortFormPerformanceInsert } from '@/lib/create/performance-types'

  export async function addPerformanceEntry(data: ShortFormPerformanceInsert) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: entry, error } = await supabase
      .from('shortform_performance')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return entry
  }

  export async function getPerformanceEntries(limit = 50) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('shortform_performance')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  export async function updatePerformanceEntry(
    id: string, 
    updates: Partial<ShortFormPerformanceInsert>
  ) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('shortform_performance')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
  ```
- **Verify:** `npx tsc --noEmit`

### Wave 3: Performance tracking UI

#### Task 3.1: Performance page
- **File:** `app/analytics/short-form/page.tsx`
- **Action:** Create
- **What to do:**
  Page with:
  1. **Summary cards (top):** Total posts, Average engagement rate, Best performing post, Total reach
  2. **Entry form:** Modal/inline form to log a new performance entry
     - Platform select
     - Post URL (optional)
     - Date posted
     - Metrics: views, likes, comments, shares, saves, follows gained, reach
     - Link to content_item (optional dropdown of recent content items)
     - Notes
  3. **Performance table:** Sortable table of all entries
     - Columns: Date, Platform, Title/URL, Views, Engagement Rate, Shares, Saves
     - Click to edit inline
  
  Use existing page layout patterns. CSS module.
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run build
  ```

#### Task 3.2: Add to navigation
- **File:** Modify sidebar/navigation
- **Action:** Modify
- **What to do:**
  Add under "Analytics" section:
  - 📊 Short-form Performance → `/analytics/short-form`
- **Verify:** `npm run build`

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# /analytics/short-form page renders
# Can add a performance entry
# Summary cards calculate correctly
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat: add short-form performance tracking (Phase 1d)"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-009.md`

## Output
- Branch: `feat/shortform-performance`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-009.md`
- Notify: Dr. Strange via sessions_send
