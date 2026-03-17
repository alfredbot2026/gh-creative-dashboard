# STATUS — Creative Dashboard v2

## Current State
- **Phase:** Planning (pre-Phase 0)
- **Last updated:** 2026-03-16

## What exists (from v1)
- Next.js 16 dashboard with 7 pages
- Supabase backend with content planning tables
- Agentic chat with Gemini function calling (11 tools)
- Content calendar with CRUD + basic AI plan generation
- YouTube analytics + 4 AI coaching features
- NotebookLM integration (Python FastAPI backend, flaky)
- Meta Ads sync
- LLM fallback chain (Gemini → Moonshot → ZAI → DeepSeek)
- Business profile settings

## What's planned (v2)
- Structured knowledge base (replacing flat research_insights for generation)
- NotebookLM deep extraction pipeline
- Three-lane content creation (short-form, ads, YouTube)
- Gemini image generation for ad creatives + carousels
- Brand consistency system (style guide, reference images)
- Performance-driven learning loop
- Analytics dashboard

## Decisions
- 2026-03-16: Separated research gathering from knowledge availability (NotebookLM → Knowledge Base → Generation)
- 2026-03-16: Three content lanes with separate creation flows, analytics, and learning loops
- 2026-03-16: Phase 0 (Knowledge Architecture) is the foundation — nothing else starts without it
- 2026-03-16: Ads include both static images and video scripts
- 2026-03-16: Brand consistency via structured style guide injected into all generation prompts

## Red-Team Review (Tony) — Complete
See `specs/RED-TEAM-REVIEW.md` — key P1 findings incorporated into spec:
- Bayesian scoring + minimum sample gates for learning loop
- 70/20/10 exploit/explore/novel policy to prevent feedback narrowing
- Learning loop starts in recommendation mode (human approves) for 8 weeks
- Provenance chain on all generated content
- Image consistency via reference images + human QA gate (not just prompt description)
- Phase 0.5 eval harness added before scaling generation
- Governance lifecycle for KB entries (candidate → approved → deprecated)

## NotebookLM Research (Complete)
Queried all 8 relevant notebooks on 2026-03-16. Key findings:
- Personal Brand Launch has 273 sources — named frameworks (Iceberg, 5X Rule, etc.)
- 5-step AI prompting pipeline already documented (Brand Voice Injection → Hook Architect → etc.)
- Gemini Image Gen docs confirm reference-image-based character consistency is viable
- P2P is Grace's product — real ad data, competitor analysis, conversion playbooks exist

## Design Inputs
- 2026-03-16: Claude Code "Marketing Superpowers" pattern (from @shannholmberg) — skill files as foundation, no context bleed between subagents, approval-as-training-signal, brand-voice scoring rubric. Patterns incorporated into pipeline design.

## Active Work
- **TASK-001** through **TASK-004** — Knowledge Base foundation and Extraction Pipeline → Complete. (Phase 0a)

## KB Seeding Progress
- 8 hook_library entries inserted from Personal Brand Launch notebook
- Extraction script created (`/tmp/extract_all.py`) for all 7 notebooks × categories
- NLM auth expires frequently during batch runs — auto-retry with re-auth added
- Supabase tables live: `knowledge_entries` + `generation_provenance`

## Blockers
- **TASK-006 security gate:** P0 security issues flagged (see `qa/SECURITY-SCAN-2026-03-16.md`) — must resolve XSS surface + add RLS/policies + protect eval endpoints before proceeding.
- ~~NLM auth expired~~ — resolved (growth team confirmed working 2026-03-17)

## Task Pipeline
- **TASK-005** (Phase 0c) — Brand identity ✅ QA PASS
- **TASK-005b** (Hotfix) — XSS fix 🔄 In progress (Blackwidow)
- **TASK-006** (Phase 0.5) — Eval harness + quality gate → blocked on 005b
- **TASK-007** (Phase 1a) — Short-form generation API → spec written, blocked on 006
- **TASK-008** (Phase 1b) — Short-form creation UI → spec written, blocked on 007
- **TASK-009** (Phase 1d) — Short-form performance tracking → spec written, blocked on 008

**Last updated:** 2026-03-17 08:08
