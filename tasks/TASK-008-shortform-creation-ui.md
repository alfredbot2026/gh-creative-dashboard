# TASK-008 — Short-form Creation UI (Phase 1b)

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** No
> **Depends on:** TASK-007 (generation API must exist)

## Pre-Task Learning
**Read `corrections.md` FIRST.** Are any past corrections relevant to this task? If yes, note them and apply proactively.

## Context
**Read these FIRST before writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `lib/create/types.ts` — ShortFormScript, GenerateShortFormRequest/Response (from TASK-007)
- [ ] `app/knowledge/page.tsx` — existing page layout pattern to match
- [ ] `components/` — existing component patterns (PageHeader, etc.)
- [ ] `lib/brand/types.ts` — BrandStyleGuide, VoiceRubric

## Objective
Build the `/create/short-form` page where Grace inputs a topic, generates a research-backed script, previews it scene-by-scene, and can approve it to the content calendar.

## Changes

### Wave 1: Page layout & topic input

#### Task 1.1: Create creation page
- **File:** `app/create/short-form/page.tsx`
- **Action:** Create
- **What to do:**
  Page with three sections:
  1. **Input panel (left/top):**
     - Topic text input (required)
     - Platform select: Instagram Reels / TikTok / YouTube Shorts
     - Style select (optional): Tutorial / Storytelling / Proof / Mistake / Hook-first
     - Target duration slider: 15-90 seconds (default 45)
     - "Generate Script" button
  2. **Script preview (center/main):**
     - Shows generated script scene-by-scene
     - Each scene card: scene number, duration badge, visual direction, script text, hook type badge (if applicable), B-roll suggestion
     - Quality score badge (if available): green (passed) / yellow (borderline) / red (failed)
     - Quality feedback list (if any)
  3. **Context sidebar (right):**
     - "Knowledge Used" section: lists which KB entries informed this script
     - Hooks used, frameworks used
     - "Regenerate" button (whole script)
     - "Add to Calendar" button (disabled until script exists)

  Use existing CSS module pattern (create `app/create/short-form/page.module.css`).
  Match the existing dashboard aesthetic — check `app/knowledge/page.tsx` for patterns.

  State management: `useState` for form inputs + generated result. `fetch('/api/create/short-form', { method: 'POST' })` on generate.
- **Verify:** `npx tsc --noEmit`

#### Task 1.2: Add to sidebar navigation
- **File:** Modify the sidebar/navigation component (check `components/Sidebar.tsx` or `app/layout.tsx`)
- **Action:** Modify
- **What to do:**
  Add new nav section "Create" with sub-item:
  - 🎬 Short-form Scripts → `/create/short-form`
  Place after "Knowledge" in the nav order.
- **Verify:** `npx tsc --noEmit`

### Wave 2: Scene editor & regeneration

#### Task 2.1: Scene card component
- **File:** `components/create/SceneCard.tsx`
- **Action:** Create
- **What to do:**
  Reusable component for displaying a single scene:
  ```typescript
  interface SceneCardProps {
    scene: ScriptScene
    onRegenerate?: (sceneNumber: number) => void
  }
  ```
  - Scene number badge (top-left)
  - Duration badge (top-right, e.g. "5s")
  - Visual direction in italic/muted text
  - Script text as main content
  - Hook type badge (if present, highlighted)
  - B-roll suggestion in a small callout
  - "Regenerate this scene" button (optional, for future use)
- **Verify:** `npx tsc --noEmit`

#### Task 2.2: Quality score display component
- **File:** `components/create/QualityBadge.tsx`
- **Action:** Create
- **What to do:**
  Shows the quality gate result:
  - Composite score as percentage
  - Color: green (≥0.8), yellow (0.6-0.8), red (<0.6)
  - Expandable feedback list
  - "Passed" / "Needs revision" label
- **Verify:** `npx tsc --noEmit`

### Wave 3: Calendar integration

#### Task 3.1: "Add to Calendar" action
- **File:** `app/actions/create.ts`
- **Action:** Create
- **What to do:**
  Server action that:
  1. Takes a `ShortFormScript` + optional date
  2. Inserts into `content_items` table (check existing schema — there should be a content_items or calendar table from v1)
  3. Records provenance in `generation_provenance` table (which KB entries were used)
  4. Returns the created item ID

  ```typescript
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import type { ShortFormScript } from '@/lib/create/types'

  export async function addScriptToCalendar(
    script: ShortFormScript,
    scheduledDate?: string
  ) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Insert content item
    const { data: item, error } = await supabase
      .from('content_items')
      .insert({
        title: script.title,
        content_type: 'short-form',
        script_data: script,
        status: 'draft',
        scheduled_date: scheduledDate || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Record provenance
    if (item && script.knowledge_entries_used.length > 0) {
      await supabase.from('generation_provenance').insert({
        content_item_id: item.id,
        lane: 'short-form',
        primary_entries: script.knowledge_entries_used,
        auxiliary_entries: [],
        generation_params: { topic: script.topic, angle: script.angle },
        pipeline_steps: [{ step: 'shortform-generator', model: 'gemini' }],
      })
    }

    return item
  }
  ```
  **Note:** Check existing `content_items` table schema first. Adapt column names to match what exists. If the table doesn't exist, flag it in the build report — do NOT create a new migration for it (that's a separate task).
- **Verify:** `npx tsc --noEmit`

#### Task 3.2: Wire "Add to Calendar" into the UI
- **File:** `app/create/short-form/page.tsx`
- **Action:** Modify
- **What to do:**
  - Date picker (optional) next to "Add to Calendar" button
  - On click: call `addScriptToCalendar` server action
  - Show success toast with link to calendar page
  - Disable button while saving
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run build
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# /create/short-form page renders
# Generate button calls API and displays script
# Add to Calendar saves to DB
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat: add short-form script creation UI (Phase 1b)"
```

## Build Report (5-point handoff — ALL required)
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-008.md`:
1. What was done
2. Where artifacts are
3. How to verify
4. Known issues
5. What's next — "Ready for Bruce QA"

## Post-Task Reflection
If you received corrections or caught mistakes during this task:
- Append to `corrections.md`: `CONTEXT: | MISS: | FIX: | DATE:`

## Output
- Branch: `feat/shortform-creation-ui`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-008.md`
- Notify: Dr. Strange via sessions_send
