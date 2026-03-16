# Task: TASK-003 — Knowledge Base UI Page

> **Track:** FAST
> **Builder:** solo
> **Requires review:** No
> **Depends on:** TASK-001 + TASK-002 (schema + API must exist)

## Pre-Task Learning
**Read `corrections.md` FIRST if it exists.**

## Context
**Read these FIRST before writing any code:**
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/lib/knowledge/types.ts` — types + category labels
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/actions/knowledge.ts` — server actions
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/research/page.tsx` — existing page pattern (filters, cards, CRUD)
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/calendar/page.tsx` — existing page pattern
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/components/ui/PageHeader.tsx` — page header component
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/components/ui/StatusBadge.tsx` — status badge component
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/layout.tsx` — sidebar navigation (add /knowledge link)

## Objective
Build the `/knowledge` page — a browsable, filterable, editable view of the knowledge base. Grace and Rob use this to review extracted entries, approve/reject them, add manual entries, and see KB health stats.

## Design Direction
- Match the existing dashboard aesthetic (dark theme, card-based layout, filter pills)
- Look at `/research` page for reference — similar concept (browse entries, filter by topic, delete)
- But more powerful: category filters, lane filters, review status badges, effectiveness score display, bulk approve action

## Changes

### Wave 1: Page + styles

#### Task 1.1: Knowledge page
- **File:** `app/knowledge/page.tsx`
- **Action:** Create
- **What to do:** Create a client component page with:
  1. **PageHeader**: title "Knowledge Base", subtitle "Structured research backing every generated content piece"
  2. **Stats bar**: total entries, entries by status (candidate/approved), average effectiveness score — fetched from `/api/knowledge?stats=true`
  3. **Filter row**: 
     - Category dropdown (from KNOWLEDGE_CATEGORIES + labels)
     - Lane filter pills: All | Short-form | Ads | YouTube
     - Review status pills: All | Candidate | Approved | Deprecated
     - Search input (debounced, searches title + content)
  4. **Entry cards grid**: each card shows:
     - Category icon + label (from CATEGORY_LABELS)
     - Title (bold)
     - Content (truncated to ~200 chars, expandable)
     - Lane badges (colored: short-form=purple, ads=orange, youtube=red)
     - Subcategory tag
     - Source badge (notebooklm/manual/performance_data)
     - Effectiveness score bar (visual, 0-100, color-coded: red→yellow→green)
     - Review status badge
     - Approval stats: "👍 N / 👎 N" if any
     - Actions: Approve / Deprecate / Edit / Delete
  5. **Add entry button**: opens a modal/form for manual entry creation
  6. **Bulk approve**: checkbox selection + "Approve Selected" button for reviewing extraction batches
  
  Follow the same patterns as `/research/page.tsx` — `createBrowserClient` for Supabase, `useState` for filters, `useCallback` for fetch, `useEffect` for initial load.
  
  BUT use the API routes (`/api/knowledge`) instead of direct Supabase queries for the filtered list. Direct Supabase is fine for real-time updates after mutations.

- **Verify:** Page renders at `/knowledge` without errors

#### Task 1.2: Knowledge page styles
- **File:** `app/knowledge/page.module.css`
- **Action:** Create
- **What to do:** CSS modules matching existing dashboard style. Reference `app/research/page.module.css` and `app/ads/page.module.css` for the card grid, filter pills, and stats bar patterns. Add:
  - `.statsBar` — horizontal row of stat cards
  - `.filterRow` — category dropdown + lane pills + status pills + search
  - `.entryCard` — card with all the entry info
  - `.effectivenessBar` — small horizontal bar showing 0-100 score
  - `.laneBadge` — colored badge for each lane
  - `.bulkActions` — sticky bar that appears when entries are selected
  - `.addEntryForm` — modal/form for creating new entries
  
- **Verify:** Styles don't conflict with existing pages

### Wave 2: Navigation + integration

#### Task 2.1: Add knowledge page to sidebar navigation
- **File:** `app/layout.tsx` (or wherever the sidebar nav is defined)
- **Action:** Modify
- **What to do:** Add a navigation link for `/knowledge` with a BookOpen or Brain icon (from lucide-react). Place it after "Research" in the sidebar order. Label: "Knowledge Base"
- **Verify:** Navigation link appears in sidebar and routes to `/knowledge`

#### Task 2.2: Add entry creation modal component
- **File:** `components/knowledge/AddEntryModal.tsx`
- **Action:** Create
- **What to do:** A modal form for creating manual knowledge entries:
  - Category dropdown (required)
  - Subcategory text input (required)
  - Title text input (required)
  - Content textarea (required)
  - Examples textarea (one per line, split into array on save)
  - Lane checkboxes (multi-select: short-form, ads, youtube)
  - Source dropdown (defaults to 'manual')
  - Source detail text input (optional)
  - Tags input (comma-separated)
  - Submit button → calls `createKnowledgeEntry` server action
  - Cancel button → closes modal
  
  Pattern: simple modal with form, similar to how the calendar page handles content creation.
- **Verify:** Modal opens, form submits, entry appears in knowledge list

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# Manually verify: open http://localhost:3000/knowledge — page renders
# Manually verify: sidebar shows "Knowledge Base" link
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(knowledge): add knowledge base UI page with filters, cards, and manual entry creation"
```

## Build Report (5-point handoff — ALL required)
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-003.md`

## Output
- Branch: `feat/knowledge-base-schema` (same branch as TASK-001/002)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-003.md`
- Notify: Dr. Strange via sessions_send
