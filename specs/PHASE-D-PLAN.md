# Phase D: Generation Refinement — Detailed Plan

> **Created:** 2026-03-31 22:00 PHT
> **Author:** Dr. Strange (Coding Lead)
> **Reference:** `specs/ADS-ROADMAP-V2.md` Phase D section
> **Depends on:** Phase A ✅, Phase C ✅
> **Note:** Phase B (kill legacy pages) can happen in parallel — it's cleanup

---

## Current State

### What `/ads/create` does today (419 lines)
- **One screen, all options at once:** angle picker, persona picker, format picker, hook count slider
- Uses `?angle=X&persona=Y&mode=explore|scale` from recommendation CTAs
- Calls `/api/ads/creative-tree` → generates concept brief → hooks → format executions all at once
- Shows weekly plan recommendations at the top
- Shows angle coverage (which angles tested/untested)
- **Problem:** dumps everything on one screen. Grace has to understand angles, personas, frameworks, formats BEFORE she can generate. Too much cognitive load.

### What `/create` (organic content wizard) does (1004 lines)
- **Step-by-step wizard:** Mode → Platform → Goal → Structure → Topic → Loading → Results
- One question per screen, animated transitions
- AI suggestions at each step ("popular topics", "trending structures")
- KB-backed generation (knowledge entries, hooks library, brand voice, quality gate)
- Block editor for results (edit individual sections)
- Carousel-specific flows (text → design)
- Improve mode (paste existing content → AI improves it)
- **This is the reference pattern.**

### Generation Stack Gap
| Capability | `/create` (organic) | `/ads/create` (ads) |
|-----------|---------------------|---------------------|
| KB retrieval | ✅ knowledge_entries by lane + type | ❌ None |
| Brand voice | ✅ brand_persona table | ❌ Hardcoded in prompts |
| Hook library | ✅ hook knowledge entries | ❌ Generic LLM hooks |
| Quality gate | ✅ qualityScore 0-100, auto-rewrite | ❌ None |
| Structures | ✅ content_structures DB | ❌ Framework enum only |
| Progressive gen | ❌ All-at-once (but faster) | ❌ All-at-once |
| Block editing | ✅ BlockEditor component | ❌ Raw text only |

---

## Plan: 5 Sub-tasks

### D1. Wizard Flow (3 hrs) — **The big UI change**

Replace the single-screen `/ads/create` with a step-by-step wizard:

**Step 1: Mode** (pre-filled from rec CTA if available)
- "Create new ads" → explore mode
- "Scale a winning ad" → shows top performers with thumbnail + ROAS, pick one
- "Refresh a tired ad" → shows fatiguing ads, pick one
- If `?ref=<ad_id>` in URL → auto-selects that ad for scale/refresh

**Step 2: Angle** (skip if pre-filled)
- Strategy map mini-grid: tested ✅ vs untested ❌
- AI recommendation: "Try comparison — untested but 3 competitors use it"
- For scale/refresh: pre-filled from the selected ad

**Step 3: Audience** (skip if pre-filled)
- Persona cards with context: "New moms (your best — 10 ads, 6 winners)"
- For scale/refresh: pre-filled

**Step 4: Format + Hook Style**
- Format: Static / Carousel / Video / All
- Framework: PAS, AIDA, Before/After (show which worked for this angle)
- Hook count: 3 (default) / 5 / 7
- "Let AI decide" option for framework

**Step 5: Loading** (progressive)
- Show concept brief first (1-2 seconds)
- Then hooks as they arrive (streamed or polled)
- Then "Generate executions" per hook on demand

**Step 6: Results**
- Hook cards with format executions
- Edit inline (reuse BlockEditor from /create?)
- Save / Export / Schedule buttons

### D2. KB Integration (1.5 hrs) — **Close the generation gap**

Wire `/api/ads/creative-tree` to use the same KB pipeline as `/api/create/generate`:
- Import `getContentTypeContext` from `lib/create/kb-retriever`
- Load brand_persona for voice/tone
- Load knowledge_entries for ad-specific categories (hooks, frameworks, competitor intel)
- Pass KB context into the concept brief and hook generation prompts
- Add quality scoring (reuse from /create or simplified version)

### D3. Progressive Generation (1 hr)

Currently generates everything (brief + hooks + all format executions) in one 60-120s call.
Split into:
1. Brief generation: 2-5 seconds → show immediately
2. Hook generation: 5-10 seconds → show as they arrive
3. Execution generation: on-demand per hook ("Generate Images" / "Generate Video Script")

This means splitting `generateCreativeTree()` into 3 API calls:
- `POST /api/ads/creative-tree/brief` → returns concept brief
- `POST /api/ads/creative-tree/hooks` → returns hook variations
- `POST /api/ads/creative-tree/execute` → returns format executions for one hook

### D4. Concept History (0.5 hrs)

Already partially exists (GET `/api/ads/creative-tree` returns saved concepts).
- Add a "History" section at the bottom of the wizard results step
- Show last 10 concepts with angle, persona, date, hook count
- Click to expand and re-use

### D5. Weekly Planner Rebuild (optional, defer)

Rob said weekly planner gets its own page. But it should use V2 engine.
- This is Phase B territory (kill legacy) + D territory (rebuild)
- **Recommend deferring** until D1-D4 are solid
- When ready: `/ads/weekly` calls the same wizard API, pre-fills from `/api/ads/actions`

---

## Execution Order

| Order | Task | Effort | Why this order |
|-------|------|--------|----------------|
| 1 | D2: KB Integration | 1.5hr | Improves generation quality NOW, even on current single-screen UI |
| 2 | D3: Progressive Gen | 1hr | Better UX immediately — hooks show in seconds, not minutes |
| 3 | D1: Wizard Flow | 3hr | Big UI rewrite — builds on D2+D3 |
| 4 | D4: Concept History | 0.5hr | Quick add after wizard exists |
| 5 | D5: Weekly (defer) | — | After D1-D4 proven |

**Total: ~6 hours** (matches roadmap estimate)

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Wizard adds friction (more clicks before generating) | Pre-fill from recommendations, skip steps when params provided |
| KB retrieval adds latency to generation | Cache KB entries, load in parallel with user's wizard steps |
| Splitting generation into 3 calls adds complexity | Each call is simpler and faster — net UX improvement |
| /create wizard is 1004 lines — rewriting for ads is costly | Reuse patterns, not code. Ads wizard is simpler (no carousel design, no improve mode) |
