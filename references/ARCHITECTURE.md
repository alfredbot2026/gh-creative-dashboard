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
- `app/create/layout.module.css` — **Shared 3-panel generator layout** (CSS module). Imported by both `/create/short-form` and `/create/ads` pages. Contains: grid layout, panel, form controls, buttons, empty state, sidebar sections, knowledge itemList (with overflow scroll), meta badges.
- `components/` — React UI components
  - `components/create/QualityBadge.module.css` — Dark-mode badge CSS module (translucent backgrounds, CSS vars only)
  - `components/create/SceneCard.module.css` — Dark-mode scene card CSS module (CSS vars only)
- `lib/` — Shared utilities (supabase client, llm, knowledge types, `lib/eval/*` scoring engine, `lib/create/*` for script generation orchestration, `lib/create/performance-types.ts` for metrics)
- `supabase/migrations/` — SQL migrations for DB schema (incl. `eval_dataset`, `quality_scores`, and `shortform_performance`)
- `scripts/` — Seed scripts and utilities (e.g., `seed-eval-dataset.ts`)

## Design System
- **Token source:** `app/globals.css` `:root` block — all colors, spacing, radius, shadows
- **Shorthand aliases:** `--surface`, `--border`, `--text`, `--text-muted`, `--primary`, `--background`, `--surface-hover` defined in globals.css for CSS module compatibility
- **Accent colors:** `--accent-purple*`, `--accent-emerald`, `--accent-violet`, etc. defined in globals.css
- **Rule:** No hardcoded hex values anywhere in component or page CSS/TSX files. All colors must trace to a `:root` variable.

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

RLS enabled. Policy: least-privilege CRUD `USING (user_id = auth.uid())` (tightened in migration 008).

### `brand_style_guide`
Stores brand-level styling and generation rules.
- RLS enabled. Policy: `SELECT` for authenticated users. Writes restricted to `service_role` (enforced via missing INSERT/UPDATE/DELETE policies for authenticated users).

### `storage.objects` (`ad-creatives` bucket)
Stores generated static images and creative assets.
- RLS enabled. Policy: least-privilege CRUD restricting users to manage only their own objects based on `owner_id = auth.uid()::text`.

### `ad_performance`
Stores analytics data from Meta Ads and links back to the generated content.
- Now includes `content_item_id` (FK to `content_items(id)`) to trace performance back to the originally generated variant.

### Routes Added/Verified
- `POST /api/create/short-form` — Generates script + inserts into content_items
- `POST /api/create/ad` — (Phase 2a) Generates ad copy variants
- `POST /api/create/image` — (Phase 2a, TASK-016) Generates static image creatives via Gemini Nano Banana Pro; uploads to Supabase Storage `ad-creatives` bucket
- `GET/POST /api/eval/score` — Eval scorer
- `GET /analytics/short-form` — Short-form analytics
- `GET /calendar` — Calendar view

### Phase 2a: Ad Copy Generation
- **`lib/create/ad-types.ts`:** Type definitions for ad objective, formats, and API structures.
- **`lib/create/kb-retriever.ts`:** Modified to include `getAdGenerationContext` for retrieving ad frameworks and hooks from the KB.
- **`lib/create/ad-generator.ts`:** Core orchestration for ad copy. Loads brand style guide, framework definitions, retrieves KB entries, and calls LLM to generate 3-5 variants using different frameworks.
- **`lib/create/image-types.ts`:** (TASK-016) Type definitions for `ImageStyle`, `AspectRatio`, `ImageGenerationRequest`, `ImageGenerationResponse`.
- **`lib/create/image-generator.ts`:** (TASK-016) Loads brand style guide, builds brand-prefixed prompt, downloads optional reference images from storage, shells out to nano-banana-pro via `uv run` (execFile), uploads output PNG to `ad-creatives` bucket, returns public URL.
- **`app/api/create/ad/route.ts`:** API endpoint for ad copy generation. Validates requests, invokes the generator, and persists variants to the `content_items` table.
