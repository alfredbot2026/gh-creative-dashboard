# ROADMAP — Creative Dashboard v2

> Each phase builds on the previous. No phase should start until the prior phase is functional.
> Detailed specs are written per-phase in `specs/` before implementation begins.

---

## Phase 0 — Knowledge Architecture (Foundation)
**Goal:** Build the structured knowledge base that everything else depends on.
**Status:** `COMPLETE` ✅ (TASK-001 through TASK-005)

### 0a. Knowledge base schema + API
- Design and migrate `knowledge_entries` table (replaces flat `research_insights` for generation)
- Keep `research_insights` for raw NotebookLM query results (reading room)
- CRUD API: `/api/knowledge/` — create, read, update, delete, search
- Filtering: by category, subcategory, lane, effectiveness score, source
- Admin UI: `/knowledge` page — browse, filter, add, edit entries

### 0b. NotebookLM structured extraction pipeline
- Redesign extraction: per-notebook, per-category with structured prompts
- Extraction produces `knowledge_entries` not raw text blobs
- Extraction prompt templates for each category:
  - Hook patterns → Hook Library entries
  - Ad copy patterns → Ad Framework entries
  - Competitor analysis → Competitor Intel entries
  - General strategy → appropriate category
- Batch extraction UI: pick notebook → pick categories → run → review before saving
- Retain existing `research_insights` for browsing/querying (separate from generation pipeline)

### 0c. Brand identity expansion
- Extend `business_profile` or create `brand_style_guide` table
- Fields: color palette, typography rules, photography style, Grace's reference description, wardrobe notes, product styling rules, caption rules, avoid-list
- **Brand voice scoring rubric** stored in DB: tone descriptors, vocabulary whitelist/blacklist, Taglish ratio target, formality levels per platform, banned "AI slop" words list
- **Brand identity as mandatory first-read:** flagged in schema so every generation step loads it before any other KB entry
- Settings UI update: add brand style guide section + voice rubric editor
- Upload reference images (Grace headshot, product photos) — stored in Supabase Storage

### 0d. Seed the knowledge base
- Run extraction on all existing NotebookLM notebooks
- Manually curate critical entries (superhook frameworks, core brand rules)
- Validate: can the system retrieve relevant entries per lane?

**Deliverables:** Knowledge base populated, extraction pipeline working, brand identity configured.
**Spec:** `specs/phase-0-knowledge-architecture.md`

---

## Phase 0.5 — Eval Harness + Quality Baseline
**Goal:** Before generating at scale, establish how we measure "good."
**Status:** `COMPLETE` ✅ (TASK-006, TASK-013 hotfix)
**Depends on:** Phase 0

### 0.5a. Eval dataset
- Curate 10-15 "gold standard" scripts (past content that performed well + manually written ideal examples)
- Create scoring rubric: hook specificity, research backing, brand voice match, production readiness, Taglish naturalness
- These become the benchmark for generation quality

### 0.5b. Prompt regression testing
- Snapshot current generation prompts + outputs
- When prompts change, re-run against eval dataset and compare scores
- Prevents "improved the prompt but quality actually dropped" scenarios

### 0.5c. Output quality gate
- Every generated piece gets an automated brand voice score (rubric-based: tone, vocabulary, Taglish ratio, formality, banned words)
- Below threshold → triggers automatic rewrite (Step 5 Human Pass) before showing to Grace
- Above threshold → shown to Grace for approve/reject/edit
- Grace's decisions tracked per KB entry (`times_approved`, `times_rejected`, `approval_rate`)
- Tracks quality over time: is the system improving? Is Grace approving more over time?

**Deliverables:** Eval dataset, scoring rubric, regression test harness, quality gate API.
**Spec:** `specs/phase-0.5-eval-harness.md`

---

## Phase 1 — Short-form Script Generation
**Goal:** Generate research-backed, ready-to-shoot short-form scripts.
**Status:** `COMPLETE` ✅ (TASK-007 through TASK-012, live-verified 2026-03-18)
**Depends on:** Phase 0, Phase 0.5

### 1a. Script generation API
- `/api/create/short-form` — generate a single short-form script
- Pulls knowledge: hook patterns, virality triggers, brand voice
- Structured output: script_data format (already defined in schema)
- Quality gate: validate hook references a knowledge entry, no recent duplicates

### 1b. Creation UI: `/create/short-form`
- Topic input (or AI suggests based on calendar gaps)
- Shows which knowledge entries are backing the generation
- Full script preview: scene-by-scene with visual direction
- Regenerate button (individual sections or whole script)
- "Approve → Add to Calendar" action

### 1c. Integrate with existing calendar
- Calendar "Generate Script" action on existing items
- Script detail view enhancement (already has `ScriptDetail` component)

### 1d. Short-form performance tracking
- New table: `shortform_performance` (metrics: views, shares, saves, follows, reach)
- Manual entry UI (until Instagram API is available)
- Link performance data to content items

**Deliverables:** Grace can generate short-form scripts backed by research, add to calendar.
**Spec:** `specs/phase-1-shortform-scripts.md`

---

## Phase 2 — Ad Content Engine
**Goal:** Generate ad copy + visual creatives (static + carousel) with brand consistency.
**Status:** `IN_PROGRESS` 🔄
**Depends on:** Phase 0 ✅, Phase 0c ✅
**Split:** Phase 2a (copy + static images + UI) now, Phase 2b (carousel + learning loop) after 2a proves out.
**Note:** Gemini Nano Banana 2 (Feb 2026) supports 5-character consistency + 14 reference images — face/brand consistency is now viable via API.

### 2a. Ad copy generation API
- `/api/create/ad` — generate ad copy variants
- Inputs: product/offer, objective (conversions, awareness, traffic), ad format (static, carousel, video)
- Pulls knowledge: ad copy frameworks, winning ad patterns, brand voice
- Output: 3-5 copy variants per request (headline + body + CTA for each)
- Each variant annotated with which framework it uses (PAS, AIDA, etc.)

### 2b. Gemini image generation integration
- `/api/create/image` — generate a single image via Gemini (Imagen)
- Brand style guide prepended to every prompt
- Support for: product shots, lifestyle images, promotional graphics
- Grace reference consistency (when she's in the image)

### 2c. Carousel generation
- `/api/create/carousel` — generate multi-slide carousel
- Per-slide: copy + image generation prompt → image
- Narrative arc across slides (hook → problem → solution → proof → CTA)
- Consistent visual treatment across slides (same template style)

### 2d. Ad creation UI: `/create/ads`
- Select format: Static / Carousel / Video script
- Input product/offer details
- Preview: copy variants + generated images side by side
- Regenerate individual slides/variants
- Download generated images
- Approve → adds to calendar as ad content

### 2e. Ad performance learning
- Enhance existing `ad_performance` with link to `content_items`
- When ads perform well → extract patterns → update knowledge base
- Surface insights: "Ads using [Before/After framework] averaged 3.2x ROAS"

**Deliverables:** Grace can generate ad copy + images, create carousels, download assets.
**Spec:** `specs/phase-2-ad-engine.md`

---

## Phase 3 — Long-form YouTube
**Goal:** Generate full YouTube scripts with retention optimization + SEO.
**Status:** `NOT_STARTED`
**Depends on:** Phase 0 (knowledge base)

### 3a. YouTube script generation API
- `/api/create/youtube` — generate full long-form script
- Pulls knowledge: retention patterns, chapter frameworks, SEO data, competitor analysis
- Output:
  - Title (SEO-optimized)
  - Hook / intro (first 30s — critical for retention)
  - Chapter breakdown with per-chapter: script, retention hooks, B-roll suggestions
  - Outro / CTA
  - 3 thumbnail concepts (text + visual description + Gemini image prompt)
  - SEO metadata: description, tags, category

### 3b. YouTube creation UI: `/create/youtube`
- Topic input + target keywords
- Full script preview with chapter navigation
- Retention annotations: "⚡ retention hook here", "⚠️ potential drop-off point"
- Thumbnail preview section (3 variants, can regenerate)
- SEO panel: title, description, tags

### 3c. YouTube performance tracking
- Table: `youtube_performance` (AVD, CTR, subs gained, revenue, retention curve data points)
- Integration with existing YouTube Analytics API (OAuth already started)
- Link performance to content items

### 3d. YouTube learning loop
- Identify retention patterns: where do viewers drop off?
- Extract: which intro styles hold viewers, which chapter structures work
- Feed back into knowledge base as YouTube Playbook entries

**Deliverables:** Grace can generate full YouTube scripts with SEO + thumbnails.
**Spec:** `specs/phase-3-youtube-scripts.md`

---

## Phase 4 — Learning Loop + Analytics
**Goal:** Automated performance analysis that feeds back into the knowledge base.
**Status:** `NOT_STARTED`
**Depends on:** Phases 1-3 (need performance data to learn from)

### 4a. Performance analysis engine
- `/api/analytics/learning` — run analysis across all lanes
- Calculate per-item performance scores (lane-specific composite metrics)
- Identify top 20% and bottom 20% per lane
- For top performers: which knowledge entries were used? What patterns?
- For bottom performers: what should be de-prioritized?

### 4b. Knowledge base auto-update
- Top performer patterns → boost `effectiveness_score` on used entries
- Bottom performer patterns → reduce scores
- New emergent patterns → create "candidate" entries for human review
- Weekly digest: "Here's what the AI learned this week"

### 4c. Analytics dashboard: `/analytics`
- Per-lane performance overview
- Top/bottom content with analysis
- Knowledge base health: most/least effective entries
- Trend lines: is the system improving over time?
- Suggested actions: "Consider making more [format type] — 80% of your top performers use this"

### 4d. Cross-lane intelligence
- Patterns that work across lanes: "This hook works for both reels and ads"
- Cross-pollination suggestions: "Your top reel hook would make a great ad angle"
- Unified performance view: what topics/themes perform across all channels

**Deliverables:** Automated learning loop, analytics dashboard, cross-lane insights.
**Spec:** `specs/phase-4-learning-loop.md`

---

## Phase 5 — Polish + Consistency
**Goal:** Production-grade consistency, templates, and workflow refinement.
**Status:** `NOT_STARTED`
**Depends on:** Phases 1-4

### 5a. Template system
- Reusable templates for each content type (script templates, carousel templates, ad templates)
- Grace can save a successful format as a template
- "Generate like this one" — use a past piece as a style reference

### 5b. Batch generation
- Generate a full week across all lanes in one action
- Review dashboard: see all generated content at a glance
- Bulk approve / edit / reject

### 5c. Export + integration
- Export scripts as PDF / Google Docs
- Export carousel images as zip
- Export YouTube script + thumbnail in creator-friendly format
- Calendar sync (Google Calendar for shoot scheduling)

### 5d. Onboarding wizard
- First-run experience: set up brand profile, connect APIs, run first extraction
- Guided knowledge base seeding

**Deliverables:** Templates, batch generation, export, onboarding.
**Spec:** `specs/phase-5-polish.md`

---

## Non-goals (deferred indefinitely)

- Automated posting to platforms
- Video editing / rendering
- Multi-user / SaaS (deferred to post-MVP)
- Real-time trend detection
- Audio/voiceover generation
