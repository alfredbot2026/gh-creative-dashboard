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
**Status:** `IN_PROGRESS` 🔄 — Core script gen + thumbnails + save to library shipped. Remaining: retention annotations, script quality, performance table (may be absorbed by V2).
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

## Phase 3.5 — Learning Pipeline (FOUNDATION)
**Goal:** Ingest Grace's historical content, classify it, build performance profile that drives V2.
**Status:** `SPEC_READY` 📋
**Depends on:** Phase 3 (YouTube OAuth exists), Meta API patterns exist
**Red-team:** Tony CONDITIONAL PASS — guardrails incorporated into spec

### 3.5a. Platform OAuth + Content Ingest
- Meta OAuth flow (Instagram + Facebook) + `meta_tokens` table
- YouTube content ingest (extend existing OAuth)
- `content_ingest` table — all historical posts/videos with metrics
- Settings UI: Connected Accounts panel

### 3.5b. AI Content Classification
- Classify each ingested post: hook type, structure, topic, visual style, CTA, etc.
- Gold set validation (20-30 manually classified posts, >80% agreement required)
- Classification uses KB vocabulary (labels match `knowledge_entries`)
- `content_analysis` table

### 3.5c. Performance Correlation + Profile
- Cross-reference classifications with metrics
- Build Performance Profile: ranked hooks, structures, topics, posting times
- Confidence levels based on sample size
- `performance_profile` table

### 3.5d. Continuous Pipeline
- Daily polling for new posts
- Metrics refresh on schedule (volatile → stable windows)
- Weekly profile recalculation
- Token lifecycle management (refresh, revocation, disconnect)

**Deliverables:** Performance profile generated from 500+ historical posts, continuous pipeline running.
**Spec:** `specs/phase-3.5-learning-pipeline.md`

---

## Phase 4a — Content Engine V2: Structure-First Creation
**Goal:** Structure catalog with 45 proven techniques + structure-first creation flow where Grace picks a structure, enters a topic, and gets a script that follows that exact structure with timing markers.
**Status:** `IN_PROGRESS` 🔄
**Depends on:** Phase 3.5 ✅ (performance data flowing)
**Key decision:** "Start with proven structures, not Frankenstein" — Grace learns structures by choosing them deliberately. Knowledge is VISIBLE, not invisible. (Rob, 2026-03-23)

### Wave 1: Structure Catalog + DB Schema (~2 hrs)
- `content_structures` table — 21 full script structures with block definitions + timing
- `technique_library` table — 24 supplementary techniques (hooks, retention, algorithm, production)
- Seed all 45 techniques from `references/CONTENT-STRUCTURES.md`
- Sources: Chris Chung, Briar Cochran, Sam Gaudet, Caleb Ralston + KB

### Wave 2: Structure Browser UI (~4 hrs)
- `/structures` — Browse structures by type (Reels/YouTube/Ads/Stories), filter by purpose/difficulty
- `/structures/[slug]` — Detail view with visual timeline, block timing, examples, when-to-use
- `/structures/techniques` — Hook formulas, retention tricks, algorithm exploits, production tips

### Wave 3: Structure-First Creation Flow (~6 hrs)
- Updated `/create` flow: Pick type → Pick structure → Enter topic → AI generates script following exact structure
- Structure-aware generation prompts (blocks + timing + rules baked into prompt)
- Labeled script editor showing structure annotations ("HOOK 0-3s", "SUPER HOOK 3-5s", etc.)

### Wave 4: Performance Integration (~3 hrs)
- Link deep_analysis results to matched structures
- "Recommended for you" sorting based on Grace's performance data
- Structure performance insights on detail pages

**Spec:** `specs/phase-4a-content-engine-v2-core.md`
**Reference:** `references/CONTENT-STRUCTURES.md`

### Deferred to later phases:
- Block swap UI (after structures are proven)
- Topic intelligence engine (data prerequisites now met — build after 4e, see red-team notes in memory/2026-03-26.md)
- Working documents + PDF export
- Image+text compositing (Phase 4b)
- Competitive intelligence (Phase 4c)

---

## Phase 4b — Visual Studio + Carousel Engine
**Goal:** Separate `/studio` page for all image/visual work. Image generator (Nano Banana UI), text carousel builder (static image + text overlays), visual carousel builder (AI-composed from winning ad layouts).
**Status:** `IN_PROGRESS` 🔄
**Depends on:** Phase 4a (structures), Phase 3.5 (performance data), Grace identity lock (8 refs)
**Key decision:** `/create` = scripts only. `/studio` = all image work. (Rob, 2026-03-24)

### Wave 1: Studio Page + Image Generator (~4 hrs)
- `/studio` page with upload zone, free-form prompting, Grace character toggle
- Style presets (product, lifestyle, promo, BTS), aspect ratio picker
- Gallery of recent generations
- `POST /api/studio/generate` — image gen with identity lock

### Wave 2: Text Carousel — Low Quality (~5 hrs)
- Upload ONE static image → AI writes story/script → text overlay changes per slide
- Font picker (5-6 fonts), text color, overlay darkness, text position
- Per-slide text editing, live preview
- Server-side compositing via `sharp` or `canvas`
- Export as individual PNGs or ZIP

### Wave 3: Visual Carousel — High Quality (~8 hrs)
- Upload product image → pick layout from winning ad reference library → AI recomposes
- Two-pass: AI generates base image → compositor adds crisp text
- Editable text overlays on the result
- Reference ad layout library (categorized: product-centered, lifestyle, testimonial, comparison)

### Wave 4: Polish + Export (~3 hrs)
- PDF export, ZIP download, save to library, duplicate & edit

**Spec:** `specs/phase-4b-visual-studio.md`

---

## Phase 4c — Competitive Intelligence
**Goal:** Top creator identification, niche trend analysis, integration into suggestions.
**Status:** `COMPLETE` ✅
**Depends on:** Phase 3.5 (same classification framework)

**Delivered:**
- Auto-discovery of top creators via YouTube API (30 creators found)
- Video classification using same Gemini framework as Grace's content
- Niche trends dashboard: top hooks, structures, topics, content mix
- UI: `/insights/competitive` (Trends tab + Creators tab)

**Spec:** `specs/CONTENT-ENGINE-V2-VISION.md` (section: Top Creator Analysis)

---

## Phase 4d — Ad Performance Feedback Loop
**Goal:** Close the loop between organic content → ad spend → real conversions → smarter content generation.
**Status:** `COMPLETE` ✅ (all 4 tasks shipped)
**Depends on:** Phase 3.5 (classified content), FB Ads skill (existing)
**Inspired by:** Ryan Mathews / Alex Hormozi content-first ad strategy

**Spec:** `specs/phase-4d-ad-feedback-loop.md`

### 4d-1. Ad Performance Ingest (~2 hrs)
- Pull Grace's Meta Ads data via existing FB Ads skill
- Match ads to classified organic content (by post ID, URL, or content hash)
- Store: ad_id, content_item_id, spend, impressions, clicks, conversions, ROAS, CPA
- New table: `ad_performance` linked to `content_items`

### 4d-2. Saves-Weighted Scoring (~1 hr)
- Bump "saves" to 3x weight in performance scoring (best predictor of ad conversion per Hormozi data)
- Update performance correlation engine to factor in saves
- Surface saves count prominently in `/insights/[id]` post detail

### 4d-3. Ad ↔ Content Correlation Dashboard (~3 hrs)
- New section in `/insights`: "Ad Performance"
- Show: which classified content performs best as ads
- Breakdown by: structure type, hook type, topic, content goal
- Key metrics: ROAS, CPA, CTR per structure/hook/topic
- "Best organic → ad candidates" — posts with high saves but not yet boosted

### 4d-4. Feedback into Generation (~2 hrs)
- When generating new scripts, pull top-performing ad patterns
- Weight structure/hook/topic recommendations by actual ad ROAS, not just organic metrics
- Prompt injection: "Structures that convert best as ads in your niche: [X, Y, Z]"
- Quality gate: flag if generated script uses a pattern that historically underperforms as an ad

### 4d-5. Synthetic Audience Testing (Future — lower priority)
- Build customer personas from Grace's actual engagement data
- Test generated scripts against AI personas before going live
- Score: "predicted conversion likelihood" based on persona triggers/objections
- **Future enhancement:** integrate chatbot conversation data for richer persona modeling

---

## Phase 4e — Ad Intelligence + Creative Factory
**Goal:** AI media buyer brain that audits the ad account, finds gaps, and a creative factory that produces the missing ads.
**Status:** `SHIPPED_WITH_ISSUES` ⚠️ — All 5 waves built. Audit (2026-03-31) found data integrity issues, fragmented pages, and legacy code paths. See `specs/ADS-ROADMAP-V2.md` for the fix plan.
**Depends on:** Phase 4d (Ad Performance Ingest)
**Builds on:** Phase 4d, AD-FRAMEWORKS.md, Content Engine V2 Vision, existing carousel builder + image gen
**Decision:** Rob 2026-03-26 — "We're creating a media buyer company + creative company. SaaS-ready UI."

### System 1: Ad Intelligence (Media Buyer Brain)
- Ingest ALL ad creatives from Meta (images, copy, metrics)
- AI classification: angle, persona, framework, hook, offer, tone per ad
- Ad Account Map: angle × persona matrix showing coverage + performance
- Gap analysis: untested combos, saturation detection, strategic recommendations

### System 2: Creative Factory (Agency)
- Takes media buyer recommendations → generates ready-to-use creatives
- Single ad mode: 3-5 variants per angle (copy + static image + carousel)
- Batch mode: "Generate this week's test creatives" (3 batches × 3-5 ads)
- Weekly creative planner aligned with 3-phase testing framework
- Performance loop: track factory-generated ads, learn, improve recommendations

### Waves
1. Ad Creative Ingest + Classification (~4 hrs)
2. Ad Account Map + Gap Analysis (~3 hrs)
3. Creative Factory — Single Ad (~4 hrs)
4. Batch Mode + Weekly Planner (~3 hrs)
5. Performance Loop + Learning (~2 hrs)

**Total: ~16 hrs | Spec:** `specs/phase-4e-ad-intelligence-creative-factory.md`

### UI Pages
- `/ads` — Dashboard (Working ✅ / Tired 😴 / Kill ❌ + recommendations)
- `/ads/strategy` — Ad Account Map (interactive angle × persona matrix)
- `/ads/create` — Creative Factory (single ad generation)
- `/ads/weekly` — Weekly Creative Planner (batch generation)

### SaaS considerations
- Self-explanatory UI (no media buyer jargon)
- Onboarding: connect Meta → classify → show map → first recommendation in < 5 min
- Ad Account Map is the "aha moment"
- Multi-tenant, RLS enforced

---

## Phase 4e-fix — Ads System Consolidation + Intelligence Layer
**Goal:** Fix data integrity, remove fragmentation, build the command center that was promised.
**Status:** `COMPLETE` ✅ (all 5 sub-phases shipped, 8 commits, 2026-04-01)
**Depends on:** Phase 4e (shipped with issues)
**Spec:** `specs/ADS-ROADMAP-V2.md`
**Audit:** `docs/ADS-AUDIT-2026-03-31.md`

### Sub-phases:
- **A: Data Integrity** ✅ — Pagination fix, 936 rows synced
- **B: Consolidation** ✅ — -517 lines, 5→3 pages
- **C: Intelligence Layer** ✅ — ROAS fix, profit headline, actionable recs, rich competitors
- **D: Generation Refinement** ✅ — KB integration, progressive gen, wizard flow, concept history, unified edit
- **E: Automation** ✅ — Daily sync cron 6AM PHT, weekly competitor refresh, fatigue auto-detection

### Also completed (2026-04-02):
- **TASK-035:** Seeded 190 generated hooks into `knowledge_entries` (hook_library, ads+short-form lanes)
- **TASK-036:** Unified ad engine with KB pipeline — replaced hardcoded maps, angle-aware hooks, quality gate on all formats
- **E2E verified:** `/ads/create` → Comparison × Beginner → KB-backed hooks → 6 ads generated successfully

**Target page architecture:** `/ads` (command center) + `/ads/create` (factory) + `/ads/competitors` (intel)

**UI/UX Principles:** One source of truth, daily data as truth, think like buyer / speak like friend, every insight → action, stale data labeled, no legacy code paths.

---

## Phase 4g — Bank-First Creative Flow
**Goal:** Grace opens the app and browses pre-generated, complete ad concepts — not waiting for LLM to generate from scratch every time. A creative bank that fills itself overnight and learns from what she picks and what performs.
**Status:** `COMPLETE` ✅ (2026-04-02)
**Depends on:** Phase 4e-fix ✅ (unified KB pipeline), Phase 4d ✅ (ad performance data)
**Spec:** `tasks/TASK-037-bank-first-hook-flow.md`

### Why this phase exists

The original vision (Rob, 2026-03-26): _"We're creating a media buyer company + creative company that creates the missing ads based on the media buyer brain."_

What this means for Grace's experience: **she shouldn't be creating ads — she should be picking from a curated library of ready-made concepts that the system generated overnight.** The media buyer brain decides WHAT to create. The creative director produces it. Grace reviews and approves.

Today's reality: Grace picks an angle × persona → waits 30-60s → LLM generates everything from scratch. The `hook_bank` and `script_bank` tables exist but are empty and not connected to the UI. The 190 hooks in `knowledge_entries` are only used as prompt reference material, not served directly.

### What "bank-first" means

1. **Pre-generated complete ads sit in a bank, ready to browse.** Not just hooks — full concepts: hook + static ad copy + carousel slides + video script.
2. **The bank fills itself.** A nightly cron picks the top untested/fatigued angle×persona combos, generates complete creative trees, stores everything.
3. **Grace browses a grid, picks favorites.** No waiting. Instant.
4. **"Generate Fresh" is the escape hatch.** When bank options don't appeal, one click generates new ones — guaranteed different from everything in the bank (negative constraints).
5. **Performance feeds back.** Deployed ads get ROAS data → bank entries get scored → KB effectiveness_score updates → future generations get smarter.

### Three data stores, one flow

| Store | Role | Scope |
|-------|------|-------|
| `knowledge_entries` | System-wide knowledge (hooks, frameworks, virality science) | Shared, not user-scoped |
| `hook_bank` + `script_bank` | User-facing creative library (freshness tracked, performance linked) | Per-user |
| `creative_hooks` + `creative_executions` | Hooks/ads attached to a specific concept/campaign | Per-concept |

**Flow:** `knowledge_entries` seeds → `hook_bank`/`script_bank` (serve to UI) → user picks → `creative_hooks`/`creative_executions` (attached to concept) → deployed → ROAS flows back to `hook_bank` → propagates to `knowledge_entries.effectiveness_score`

### Wave 1: Seed bank from KB + Wire to UI (~4 hrs)
- Copy 190 KB hooks into `hook_bank` for Grace's user_id (one-time + ongoing sync)
- Replace Step 3 in `/ads/create` with bank serve call (grid UI, multi-select)
- Show hook type badges, proof points, performance data when available
- Cross-persona suggestions ("This hook also works for price_sensitive")
- "Use Selected" → creates `creative_hooks` entries → proceeds to Step 4
- Fallback: if bank empty for this combo, auto-seed from KB first

### Wave 2: "Generate Fresh" with negative constraints (~3 hrs)
- Button appears after user sees bank options
- Queries ALL existing `hook_bank` hooks for this angle×persona
- Passes them as "DO NOT repeat or paraphrase" to LLM
- Forces unused hook types and underused proof points
- New hooks saved to bank (for future sessions) + shown inline
- Auto-save to `knowledge_entries` if quality gate passes (grows the shared KB)

### Wave 3: Full creative tree pre-generation cron (~6 hrs)
- Nightly cron picks top 3-5 angle×persona combos to fill:
  - Untested combos (never in bank)
  - Fatigued combos (winning hooks are all "tired" status)
  - Combos below minimum bank threshold (<10 fresh hooks)
- For each combo: generate complete creative tree (brief + 5 hooks + static + carousel + video script)
- Store hooks in `hook_bank`, scripts in `script_bank`, full concepts in `creative_concepts`
- Track generation credits for SaaS metering
- Grace wakes up to 15-25 fresh complete ad concepts every morning

### Wave 4: Performance feedback loop (~3 hrs)
- Ads sync cron (already runs daily) → after updating `ad_creatives`:
  - Match back to `hook_bank` entries by `deployed_ad_id` or content similarity
  - Update `hook_bank.ad_roas`, `hook_bank.ad_status` (winning/tired/dead)
  - Propagate to `knowledge_entries.effectiveness_score`:
    - Winning hook: +10 score
    - Tired hook: -5 score
    - Dead hook: -15 score
  - Update `times_successful` / `times_used` counters
- Bank serve logic already boosts hooks similar to winners (built in `/api/ads/bank` GET)
- Surface in UI: hooks with performance data show ROAS badge, "🏆 Winner" / "😴 Tired" status

### Rob's UX decisions (2026-04-02)
- **Grid layout** (not swipe/Tinder-style) — see all hooks at once, multi-select
- **Auto-seed** — first time Grace picks an angle×persona, auto-fill from KB
- **Show performance** — when available, display ROAS/status on hook cards
- **Cross-persona** — suggest hooks from adjacent personas
- **Cron-based seeding** — nightly pre-generation, not just on-demand

**Total: ~16 hrs across 4 waves**

---

## Phase 4f — Chatbot Intelligence Integration (FUTURE)
**Goal:** Mine GH Creative chatbot conversations for customer insights that improve content generation.
**Status:** `QUEUED` — data available, spec needed
**Depends on:** Chatbot data access, Phase 4e (ad intelligence infrastructure)

**Concept:**
- Extract buying triggers, objections, pain points, and FAQ patterns from chatbot logs
- Build customer persona profiles from real conversation data
- Feed into synthetic audience testing (Phase 4e Wave 5)
- Surface "what customers actually ask about" as topic suggestions in `/create`
- Identify product/content gaps: "Customers keep asking about X but Grace has no content on it"

**Data source:** Existing chatbot conversations (muni-chatbot or GH chatbot data)

---

## Phase 4 — Learning Loop + Analytics (LEGACY — superseded by 3.5 + 4a-c)
**Goal:** Automated performance analysis that feeds back into the knowledge base.
**Status:** `SUPERSEDED` — Replaced by Phase 3.5 (Learning Pipeline) + Phase 4a-c (Content Engine V2)
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

### 5a. Template system — COMPLETE ✅ (2026-04-02)
- ✅ "Save as Template" button in all create flows (short-form, YouTube, social-post, ads)
- ✅ Templates save form params + sample output for reuse
- ✅ Template picker displays saved templates as quick-select chips

### 5b. Batch generation — COMPLETE ✅ (2026-04-02)
- ✅ `/batch` page generates full week across all lanes in one action
- ✅ Configurable content mix (reels, YouTube, social, ads)
- ✅ Review dashboard: see all generated content at a glance
- ✅ Bulk approve / reject per item
- ✅ Save approved items to calendar

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
