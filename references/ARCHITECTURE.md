# ARCHITECTURE.md — GH Creative Dashboard

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Database / Auth / Storage:** Supabase (PostgreSQL, row level security)
- **Styling:** CSS Modules / standard Tailwind (check existing code)
- **LLM:** Google Gemini via `@google/genai` (Node SDK)
- **Agent/Research:** NotebookLM via custom Python extraction backend/CLI
- **Security:** `isomorphic-dompurify` for XSS protection in rendered Markdown

## Core Modules
1. **Knowledge Base (`/knowledge`):** Structured database of frameworks, hooks, insights extracted from NotebookLM. Replaces flat insights.
2. **Eval Harness (`/eval`):** Gold standard dataset management and brand voice scorer (auto-eval against the brand style guide).
3. **Generation Pipeline:** Pulls from KB → generates scripts/copy (Phase 1-3). Includes `lib/create/` for LLM prompt generation, context retrieval (`kb-retriever`), and structured output for platforms (Instagram Reels, TikTok, YouTube Shorts). **Phase 2a uses [Ad Frameworks](AD-FRAMEWORKS.md) for generating ad copy.**
4. **Analytics (`/youtube`, `/analytics/short-form`, etc.):** Syncs performance data from Meta Ads / YouTube, and tracks short-form performance (`shortform_performance` table).

## File Organization
- `app/` — Next.js App Router pages and API routes (e.g., `app/api/eval/score`, `app/api/create/short-form/route.ts`, `app/analytics/short-form/page.tsx`)
- `app/actions/` — Next.js Server Actions (CRUD operations, e.g., `app/actions/performance.ts`)
- `components/` — React UI components
- `lib/` — Shared utilities (supabase client, llm, knowledge types, `lib/eval/*` scoring engine, `lib/create/*` for script generation orchestration, `lib/create/performance-types.ts` for metrics)
- `supabase/migrations/` — SQL migrations for DB schema (incl. `eval_dataset`, `quality_scores`, and `shortform_performance`)
- `scripts/` — Seed scripts and utilities (e.g., `seed-eval-dataset.ts`)

*(For more details, see `.agent/ARCHITECTURE.md` if it exists)*
## Database Tables (Updated TASK-012)

### `ad_performance` (migration 007)
Added link from ad performance rows to generated content items.

- `content_item_id` UUID → `content_items(id)`
- Index: `idx_ad_performance_content_item`

### `content_items` (migration 006)
Stores generated scripts and content items for calendar scheduling.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto-generated |
| tenant_id | UUID | Currently set to user.id (no tenant model yet) |
| user_id | UUID → auth.users | Owner |
| title | TEXT | Script/content title |
| content_type | TEXT | e.g., 'short-form' |
| platform | TEXT | e.g., 'instagram-reels', 'tiktok' |
| script_data | JSONB | Full generated script object |
| status | TEXT | 'draft', 'scheduled', 'published' |
| scheduled_date | TIMESTAMPTZ | Calendar date |
| published_at | TIMESTAMPTZ | When published |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

RLS enabled. Policy: `USING (true)` (to be tightened to `user_id = auth.uid()` post-data-migration).

### `ad_performance`
Stores analytics data from Meta Ads and links back to the generated content.
- Now includes `content_item_id` (FK to `content_items(id)`) to trace performance back to the originally generated variant.

### Routes Added/Verified
- `POST /api/create/short-form` — Generates script + inserts into content_items
- `POST /api/create/ad` — (Phase 2a) Generates ad copy variants
- `POST /api/create/image` — (Phase 2a) Generates static image creatives
- `GET/POST /api/eval/score` — Eval scorer
- `GET /analytics/short-form` — Short-form analytics
- `GET /calendar` — Calendar view
