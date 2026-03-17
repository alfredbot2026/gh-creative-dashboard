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
3. **Generation Pipeline:** Pulls from KB → generates scripts/copy (Phase 1-3).
4. **Analytics (`/youtube` etc.):** Syncs performance data from Meta Ads / YouTube.

## File Organization
- `app/` — Next.js App Router pages and API routes (e.g., `app/api/eval/score`)
- `app/actions/` — Next.js Server Actions (CRUD operations)
- `components/` — React UI components
- `lib/` — Shared utilities (supabase client, llm, knowledge types, `lib/eval/*` scoring engine)
- `supabase/migrations/` — SQL migrations for DB schema (incl. `eval_dataset` and `quality_scores`)
- `scripts/` — Seed scripts and utilities (e.g., `seed-eval-dataset.ts`)

*(For more details, see `.agent/ARCHITECTURE.md` if it exists)*
