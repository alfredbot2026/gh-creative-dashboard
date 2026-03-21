# Phase 3 — YouTube Script Generation (Spec)

> Status: IN_PROGRESS. Script gen API + UI already exist. This spec covers the remaining gaps.

## What Already Exists
- `app/api/create/youtube-script/route.ts` — Script generation API (128 lines, functional)
- `app/create/youtube/page.tsx` — Full creation UI (366 lines, functional)
  - Topic input, video type picker, target length, purpose picker, product select
  - Hook/framework template pickers
  - Script preview with sections (HOOK, INTRO, MAIN CONTENT, CTA, OUTRO)
  - Title options, description, tags, thumbnail concept (text only)
  - Copy to clipboard functionality
  - Knowledge used sidebar
- KB retriever integration with pinned selections (hooks + frameworks)
- Brand context loading (business profile + persona)

## What's Missing (Roadmap Gaps)

### Gap 1: Thumbnail Image Generation
**Priority: P1** — The API returns a `thumbnail_concept` (text description) but doesn't generate an actual image.

**What to build:**
- After script generation, auto-generate 3 thumbnail images using the image generation pipeline
- Use the `thumbnail_concept` from the script as the image prompt
- Display thumbnails in the UI with regenerate/select actions
- Thumbnails should be 16:9 aspect ratio, 2K resolution
- Use the multi-turn Grace image session when Grace is in the thumbnail

### Gap 2: Retention Annotations
**Priority: P2** — The roadmap calls for retention markers in the script.

**What to build:**
- Add retention metadata to each script section:
  - `retention_risk`: "low" | "medium" | "high" — likelihood viewers drop off here
  - `retention_hook`: optional suggested technique to re-engage (pattern interrupt, question, visual change)
- Show in UI as visual indicators: ⚡ retention hook, ⚠️ drop-off risk
- This is a prompt engineering task — update the generation prompt to include these fields

### Gap 3: YouTube Performance Tracking
**Priority: P2** — Needed for Phase 4 learning loop.

**What to build:**
- New table: `youtube_performance`
  ```sql
  create table youtube_performance (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references tenants(id),
    content_item_id uuid references content_items(id),
    video_url text,
    title text,
    published_at timestamptz,
    views integer default 0,
    watch_hours numeric(10,2) default 0,
    avg_view_duration_seconds integer default 0,
    avg_view_percentage numeric(5,2) default 0,
    ctr numeric(5,2) default 0,
    impressions integer default 0,
    likes integer default 0,
    comments integer default 0,
    shares integer default 0,
    subscribers_gained integer default 0,
    revenue_usd numeric(10,2) default 0,
    retention_30s numeric(5,2),
    retention_60s numeric(5,2),
    retention_50pct numeric(5,2),
    updated_at timestamptz default now(),
    created_at timestamptz default now()
  );
  ```
- RLS: tenant-scoped (same pattern as all other tables)
- Manual entry UI at `/youtube` or modal from library
- Link to content_items for script → performance correlation

### Gap 4: Script Quality Improvements
**Priority: P2** — Current prompt could be stronger.

**What to improve:**
- Chapter-based structure with explicit chapter markers (for YouTube chapters feature)
- Per-chapter timing that adds up to the target length
- B-roll suggestions per section (currently in `visual_notes` but not structured)
- Structured Taglish: specify which lines are Filipino, which are English
- Better SEO: keyword density in description, first 2 lines optimized for search

### Gap 5: Save to Library
**Priority: P1** — Scripts should save to content_items table like other content types.

**What to build:**
- "Save to Library" button on the YouTube script result
- Saves to `content_items` with `content_type: 'youtube'`
- Stores full script data in the `script_data` JSONB column
- Saves generated thumbnail images to Supabase storage
- Links to product if one was selected

---

## Task Breakdown

### TASK-036: YouTube Thumbnail Generation
- Add thumbnail image generation after script generation
- Generate 3 thumbnail variants using image pipeline
- 16:9, 2K, use Grace multi-turn session when applicable
- UI: thumbnail grid with select/regenerate
- Files: `app/api/create/youtube-script/route.ts`, `app/create/youtube/page.tsx`

### TASK-037: YouTube Save to Library
- Add "Save to Library" functionality
- Save script + thumbnails to content_items
- Same pattern as social post / ad save flow
- Files: `app/create/youtube/page.tsx`, `app/actions/` (new server action)

### TASK-038: Retention Annotations
- Update generation prompt to include retention_risk and retention_hook per section
- UI indicators: ⚡ hooks, ⚠️ risk zones
- Files: `app/api/create/youtube-script/route.ts`, `app/create/youtube/page.tsx`

### TASK-039: YouTube Performance Table + UI
- Create migration for `youtube_performance` table
- RLS policies (tenant-scoped)
- Manual entry form (modal or dedicated page)
- Link to content_items
- Files: `supabase/migrations/`, new UI components

### TASK-040: Script Quality Polish
- Chapter markers with timestamps
- Structured B-roll suggestions
- Better SEO output (keyword density, optimized description)
- Per-chapter timing that sums to target
- Files: `app/api/create/youtube-script/route.ts`

---

## Recommended Order
1. **TASK-037** (Save to Library) — P1, enables everything else
2. **TASK-036** (Thumbnails) — P1, biggest user-facing gap
3. **TASK-038** (Retention) — P2, prompt engineering
4. **TASK-040** (Script Quality) — P2, prompt engineering
5. **TASK-039** (Performance Table) — P2, needed for Phase 4
