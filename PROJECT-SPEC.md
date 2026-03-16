# PROJECT-SPEC — Creative Dashboard v2: Research-Driven Content Engine

> **For:** Grace's content business
> **Owner:** Rob
> **Lead:** Dr. Strange (coding-lead)
> **Repo:** `alfredbot2026/gh-creative-dashboard`
> **Status:** Planning

---

## 1. Vision

Turn the existing Mission Control dashboard from a **content scheduler** into a **content creation machine** — one that deeply understands what works, why it works, and produces ready-to-shoot scripts + ready-to-post visuals across three content lanes.

The system researches → learns → creates → measures → improves. Continuously.

**This is not a generic content calendar with AI sprinkled on top.** It's a system where every piece of content is backed by specific research, tested patterns, and performance data — and where the AI gets measurably better over time because it learns from real results.

---

## 2. The Three Content Lanes

Each lane has different goals, formats, creation workflows, quality criteria, and feedback loops. They share a knowledge base and research engine but diverge everywhere else.

### 2a. Short-form (Reels / TikTok / Shorts)

| Aspect | Detail |
|---|---|
| **Goal** | Reach, virality, follower growth |
| **Volume** | 5/day target (35/week) |
| **Formats** | UGC selfie, talking head, B-roll montage, screen recording, trending audio overlay |
| **What the AI produces** | Full production script: hook (first 3s), scene-by-scene direction, exact dialogue (Taglish), text overlay copy, visual direction, format recommendation |
| **Key research inputs** | Superhook frameworks, virality triggers, trending formats, competitor hooks that worked |
| **Performance signals** | Views, shares, saves, comments, follows, reach |
| **Learning question** | "Which hook *type* gets the most saves? Which format drives follows?" |

### 2b. Ads (Meta — Static + Video)

| Aspect | Detail |
|---|---|
| **Goal** | ROAS, conversions, sales |
| **Volume** | Weekly batch (5-10 creatives per batch) |
| **Formats** | Static image ads, carousel ads (3-5 slides), video ads (15-30s) |
| **What the AI produces** | **Static:** Headline + body copy + CTA + image generation prompt (Gemini) with brand-consistent styling. **Carousel:** Per-slide copy + per-slide image prompt + narrative arc across slides. **Video:** Full script (same format as short-form but with ad-specific structure: problem → agitate → solution → CTA). |
| **Key research inputs** | Ad copy frameworks (PAS, AIDA, Before/After), winning ad angles from performance data, offer positioning, competitor ad analysis |
| **Performance signals** | ROAS, CTR, CPM, CPA, conversions, frequency |
| **Learning question** | "Which ad angle/copy framework drives the best ROAS? Which visual style gets highest CTR?" |

### 2c. Long-form (YouTube)

| Aspect | Detail |
|---|---|
| **Goal** | Watch time, subscriber growth, authority, search traffic |
| **Volume** | 1/week |
| **Formats** | Tutorial, vlog, listicle, deep-dive, challenge |
| **What the AI produces** | Full script: title + hook (first 30s) + chapter breakdown + per-chapter script with retention hooks + B-roll suggestions + outro/CTA + thumbnail concepts (3 variants) + SEO metadata (title, description, tags) |
| **Key research inputs** | YouTube retention patterns, chapter structure frameworks, SEO keyword data, competitor video analysis (from YouTube Data API), thumbnail psychology |
| **Performance signals** | AVD (average view duration), CTR (thumbnail), subscriber conversion, revenue, retention curve shape |
| **Learning question** | "Where does retention drop? What intro patterns hold viewers past 30s? Which thumbnail style gets highest CTR?" |

---

## 3. Knowledge Architecture (The Foundation)

This is the most critical piece. Everything else depends on it.

### 3a. Why the current approach fails

The current `research_insights` table is a flat list of text blobs with a `topic` string. When the content generator needs to write a hook, it gets... everything. No structure, no weighting, no lane-awareness. The NotebookLM queries are generic ("what hooks work?") rather than extracting structured, categorized knowledge.

### 3b. What we need: A structured, lane-aware, performance-weighted knowledge base

Categories derived from actual notebook contents (queried 2026-03-16):

```
┌──────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE BASE                            │
│                                                                  │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────┐ │
│  │ Hook Library      │  │ Scripting          │  │ Content      │ │
│  │                  │  │ Frameworks         │  │ Funnel       │ │
│  │ - Iceberg Effect │  │ - Iverson Crossover│  │ Strategy     │ │
│  │ - Super Hook     │  │ - "Dance" Method   │  │              │ │
│  │ - Comparison     │  │ - "My Story" 6-Step│  │ - TOFU/MOFU/ │ │
│  │ - Storytelling   │  │ - 3-2-1 Method     │  │   BOFU       │ │
│  │ - "Ugly" Hooks   │  │ - Value Compression│  │ - 7-20-10    │ │
│  │ - Bridge Hooks   │  │ - "Dumbing Down"   │  │   Framework  │ │
│  │ - Awareness Level│  │ - Hook-Hold-Reward │  │ - 5 Pillars  │ │
│  │ - Contrarian     │  │ - Show Then Tell   │  │ - MEC        │ │
│  │ - Triple Hook    │  │ - Problem-Payoff-  │  │ - Series     │ │
│  │   (verbal/       │  │   Process          │  │ - Double Down│ │
│  │   written/visual)│  │                    │  │              │ │
│  └──────────────────┘  └───────────────────┘  └──────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────┐ │
│  │ Virality Science │  │ Ad Creative        │  │ Platform     │ │
│  │                  │  │ Frameworks         │  │ Intelligence │ │
│  │ - 5X Rule        │  │ - Angle Shifts     │  │              │ │
│  │ - STEPPS         │  │   (proof-first,    │  │ - IG: sends/ │ │
│  │ - Physiological  │  │   mistake-led,     │  │   reach      │ │
│  │   Arousal Theory │  │   time-reality)    │  │ - TikTok:    │ │
│  │ - 3-Second Rule  │  │ - Entity ID Trap   │  │   65% 3s     │ │
│  │ - Viral Video    │  │   (don't cluster)  │  │   retention  │ │
│  │   Hacking (7     │  │ - Creative AS      │  │ - YT: viewer │ │
│  │   components)    │  │   Targeting        │  │   satisfaction│ │
│  │ - Templatizing   │  │ - Objection Killing│  │ - Meta Ads:  │ │
│  │ - High arousal   │  │ - Sell-by-Chat     │  │   Andromeda, │ │
│  │   emotions       │  │ - CAPI tracking    │  │   broad      │ │
│  │                  │  │ - Budget console.  │  │   targeting  │ │
│  └──────────────────┘  └───────────────────┘  └──────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────┐ │
│  │ Competitor Intel │  │ AI Prompting       │  │ Brand        │ │
│  │                  │  │ Workflows          │  │ Identity     │ │
│  │ - P2P vs Bibong  │  │ (from notebooks)   │  │              │ │
│  │   Pinay analysis │  │                    │  │ - Voice/tone │ │
│  │ - Pre-validated  │  │ - Brand Voice      │  │ - Visual     │ │
│  │   ideas (outlier │  │   Injection        │  │   style      │ │
│  │   extraction)    │  │ - Hook Architect   │  │ - Colors     │ │
│  │ - Gap analysis   │  │ - Emotional Temp   │  │ - Grace ref  │ │
│  │                  │  │   Mapping          │  │   images     │ │
│  │                  │  │ - Visual Friction  │  │ - Product    │ │
│  │                  │  │ - Human Pass       │  │   styling    │ │
│  │                  │  │   (Red-Teaming)    │  │ - Caption    │ │
│  │                  │  │                    │  │   rules      │ │
│  └──────────────────┘  └───────────────────┘  └──────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌───────────────────┐                    │
│  │ Performance      │  │ CRO / Conversion  │                    │
│  │ Learnings        │  │ Patterns          │                    │
│  │ (auto-generated) │  │                    │                    │
│  │                  │  │ - From CRO         │                    │
│  │ - Top hooks      │  │   Research (53     │                    │
│  │ - Best formats   │  │   sources)         │                    │
│  │ - Winning angles │  │ - Landing page     │                    │
│  │ - Timing data    │  │   patterns         │                    │
│  │ - Lane-specific  │  │ - Checkout         │                    │
│  │   patterns       │  │   optimization     │                    │
│  └──────────────────┘  └───────────────────┘                    │
└──────────────────────────────────────────────────────────────────┘
```

**Source notebooks (queried 2026-03-16):**

| Notebook | Sources | Maps to KB categories |
|---|---|---|
| Personal Brand Launch — Viral Breakdown Library | 273 | Hook Library, Scripting Frameworks, Content Funnel Strategy, Virality Science, AI Prompting Workflows |
| Chris Chung — Viral Breakdown Library | 154 | Hook Library (Super Hook), Scripting Frameworks (Iverson, Dance, 3-2-1), Content Funnel Strategy, Ad Creative (Sell-by-Chat) |
| Viral Video Anatomy — Research Library | 18 | Virality Science (STEPPS, 3-Second Rule, Arousal Theory), Scripting Frameworks (Hook-Hold-Reward, Show Then Tell) |
| P2P Conversion Playbook | 12 | Ad Creative Frameworks (angle shifts, funnel structure, objection killing) |
| P2P Competitor Swipefile — PH + Global | 12 | Competitor Intel (pricing, positioning, hooks vs Bibong Pinay) |
| Meta Ads Intelligence | 44 | Ad Creative Frameworks (Entity ID, creative-as-targeting, CAPI), Platform Intelligence (Meta) |
| Gemini Image Generation API — Full Docs | 41 | (Technical reference for Phase 2 image gen — not KB content, but implementation guide) |
| CRO Research | 53 | CRO / Conversion Patterns |

### 3c. Knowledge entry structure

Each knowledge entry has:

| Field | Purpose |
|---|---|
| `category` | hook_library, scripting_framework, content_funnel, virality_science, ad_creative, platform_intelligence, competitor_intel, ai_prompting, brand_identity, cro_patterns, performance_learning |
| `subcategory` | Specific framework name (e.g., "iceberg_effect", "super_hook", "iverson_crossover", "STEPPS", "entity_id_trap") |
| `lanes` | Which content lanes this applies to: `['short-form', 'ads', 'youtube']` or any subset |
| `title` | Human-readable name (e.g., "The Iceberg Effect Hook") |
| `content` | The actual knowledge (detailed, with examples) |
| `examples` | Array of concrete examples (not theory — real hooks, real copy, real scripts) |
| `source` | Where this came from: `notebooklm`, `manual`, `performance_data`, `competitor_analysis` |
| `source_detail` | Notebook name/ID, URL, extraction run ID |
| `source_confidence` | Source reliability: `performance_data` (highest) > `curated_manual` > `notebooklm_extracted` > `unverified` |
| `review_status` | `candidate` → `approved` → `deprecated` → `archived` (only `approved` entries influence generation at full weight) |
| `reviewed_by` | Who approved this entry (grace / rob / auto) |
| `reviewed_at` | When |
| `effectiveness_score` | 0-100, updated by learning loop with Bayesian shrinkage (see §5b) |
| `confidence_interval` | Uncertainty range on effectiveness_score (wide = low data, narrow = reliable) |
| `min_sample_gate` | Entry cannot influence ranking until N pieces of content have used it (default: 3 for short-form, 2 for ads, 1 for youtube due to volume differences) |
| `times_used` | How many times the generator has used this entry |
| `times_successful` | How many times content using this entry performed above lane median |
| `last_used_at` | Prevent overuse of the same patterns |
| `times_approved` | Grace approved content using this entry without heavy edits |
| `times_rejected` | Grace rejected or heavily edited content using this entry |
| `approval_rate` | `times_approved / (times_approved + times_rejected)` — feeds into effectiveness_score alongside performance data |
| `saturation_penalty` | Increases when entry is used frequently without rest; decays over time |
| `tags` | Freeform tags for additional filtering |
| `extraction_version` | Which extraction run produced this entry (for rollback) |

**Governance rules (from red-team review):**
- New entries from extraction start as `candidate` — human reviews before `approved`
- Only `approved` entries can be "high influence" in generation prompts
- Score updates from learning loop start in **recommendation mode** (human approves) for first 8 weeks
- Entries can be `deprecated` (kept for audit) or `archived` (removed from generation)

### 3d. How knowledge gets populated

**Source 1: NotebookLM deep extraction** (primary research source)
- Not the current "ask 2 generic questions" approach
- Instead: per-notebook, per-category extraction with structured prompts
- Example extraction prompt: "From this notebook, extract every specific HOOK PATTERN mentioned. For each: name it, explain the structure, give 2-3 exact examples, and note which platforms it works best on. Format as JSON array."
- Run this as a batch job (not inline during generation)
- Extractions are reviewed + stored in the knowledge base

**Source 2: Performance analysis** (automatic)
- When content performs well (top 20% by lane metrics), analyze WHY
- Extract: hook type, format, topic, posting time, copy patterns
- Store as "Performance Learning" entries with high effectiveness scores

**Source 3: Competitor monitoring** (semi-automatic)
- YouTube Data API for competitor video analysis
- Manual input for IG/TikTok competitor observations (until APIs available)
- Stored as "Competitor Intel" entries

**Source 4: Manual curation** (Grace/Rob)
- Direct entry through the dashboard
- Import from other sources (articles, courses, etc.)

### 3e. How knowledge feeds into generation (70/20/10 Policy)

To prevent feedback-loop narrowing (where the system converges on a few "winning" patterns and stops experimenting), generation follows a **70/20/10 exploit/explore/novel** policy:

- **70% Exploit:** Top-scoring `approved` entries for the lane, weighted by effectiveness_score adjusted for saturation_penalty and recency
- **20% Explore:** Mid-range entries that haven't been used recently, or `candidate` entries being tested
- **10% Novel:** New entries, cross-lane transfers ("this ad hook might work for reels"), or prompts to generate something the KB doesn't cover

When generating content for a specific lane, the system:
1. Queries the knowledge base for `approved` entries matching the lane
2. Applies 70/20/10 selection with diversity constraints (no more than 2 entries from same subcategory per generation batch)
3. Includes relevant entries in the generation prompt as structured context with role labels ("PRIMARY: use this hook framework", "EXPLORE: try incorporating this pattern", "NOVEL: experiment with this angle")
4. After generation, creates an immutable **provenance record**: which KB entries were used (primary vs auxiliary), generation parameters, and output hash
5. After performance data comes in, updates `times_successful` and recalculates `effectiveness_score` using Bayesian shrinkage toward lane prior (prevents small-sample flukes from dominating)

**Provenance chain (from red-team review):**
Every generated piece traces: `output → KB entries used → extraction run/version → source notebook`. This makes it possible to debug "why did it generate this?" and roll back bad extractions.

**AI Prompting Workflows:**
The notebooks document a specific 5-step prompting workflow (Brand Voice Injection → Hook Architect → Emotional Temperature Mapping → Visual Friction → Human Pass). The generation engine should implement this pipeline natively rather than trying to do everything in one giant prompt. Each step is a focused LLM call with its own KB context.

---

## 4. Content Creation Engine

### 4a. Script Generation (all lanes)

**Current state:** The `generate-plan` route produces items with `script_data` but the scripts are generic because the research context is thin.

**Target state:** Research-dense, lane-specific script generation that produces content Grace can shoot immediately without further thinking.

**Architecture:**

```
Knowledge Base Query (lane-specific, weighted)
        ↓
Prompt Assembly (lane-specific template)
        ↓
Gemini Generation (with structured output)
        ↓
Quality Gate (does this script actually use the research?)
        ↓
Script Output (ready to shoot)
```

**Quality gate:** After generation, check that:
- `research_refs` actually map to knowledge base entries
- The hook follows a pattern from the hook library (not generic)
- The script has enough detail for a non-writer to shoot it
- No repetition of hooks/topics from recent content

### 4b. Visual Content Generation (Gemini Image Gen)

This is the part that makes the dashboard a real creation tool, not just a planning tool.

**What needs to be generated:**

| Visual Type | Description | Consistency Requirements |
|---|---|---|
| **Static ad images** | Product shots, lifestyle images, promotional graphics | Brand colors, product placement, Grace's aesthetic |
| **Carousel slides** | 3-5 slide sequences with narrative arc | Consistent slide template, typography, color palette |
| **Thumbnail concepts** | YouTube thumbnail mockups (3 variants per video) | Consistent style, face expression patterns, text treatment |
| **Social media graphics** | Quote cards, tip graphics, announcement posts | Brand template adherence |

**Brand consistency system:**

The biggest challenge with AI image generation is consistency. Grace needs images that look like they come from the same brand, not random AI art.

**Realistic capabilities (from Gemini Image Gen API notebook, 41 sources):**
- ✅ Consistent character via **reference images** (up to 4-5 images for character resemblance)
- ✅ Brand logo/face preservation during edits ("keep face unchanged")
- ✅ Product/material integration with natural lighting
- ✅ Precise typography in prompts (quoted text + font style description)
- ✅ Batch variations for A/B comparison
- ✅ Sequential art / storyboard panels for carousels
- ✅ Production-ready aspect ratios (16:9, 9:16, 1:1)
- ⚠️ Cross-generation character consistency requires reference images every time (not just text description)
- ⚠️ Complex multi-element compositions may drift — needs human QA gate

Solution: **Brand Style Guide + Reference Image Library + Acceptance Tests**

```
brand_style_guide:
  colors:
    primary: "#..."
    secondary: "#..."
    accent: "#..."
    background: "#..."
  typography:
    headlines: "Bold, clean, [specific font style]"
    body: "[specific style]"
    overlays: "[specific treatment]"
  photography_style:
    lighting: "Natural, warm, [specifics]"
    composition: "[specifics]"
    product_placement: "[rules]"
  reference_images:              # CRITICAL for consistency
    grace_headshots: [Supabase Storage URLs — multiple angles]
    product_shots: [list]
    brand_elements: [logos, icons, etc.]
  grace_reference:
    description: "Filipina woman, [physical description for consistent character]"
    typical_setting: "[where Grace usually shoots]"
    wardrobe_style: "[typical clothing/look]"
  avoid:
    - "Overly polished/fake look"
    - "Cold blue tones"
    - "[other anti-patterns]"
```

Reference images + style guide get included in every image generation call.

**Acceptance criteria for generated images (from red-team review):**
- Color palette compliance (automated check against brand hex values)
- Typography/layout rule compliance
- **Human approval checkpoint** — Grace rates every generation (👍/👎) before it goes to calendar
- Feedback feeds back into prompt refinement over time

**Carousel generation flow:**
1. User requests carousel on a topic (or AI suggests one in the content plan)
2. System pulls relevant knowledge (ad copy frameworks for ads, hook patterns for organic)
3. Gemini generates **shared art direction packet first** (global scene/style/lighting constraints for the whole carousel — prevents per-slide drift)
4. Per-slide: copy + image prompt inheriting the art direction packet
5. Image prompts enriched with brand style guide + Grace reference images
6. Gemini generates images for each slide
7. Dashboard shows preview: copy + images side by side
8. Grace can regenerate individual slides, tweak copy, approve
9. Download as image pack (zip) for posting

### 4c. Generation Pipeline (5-Step, from notebook research)

The Personal Brand Launch notebook documents a proven 5-step AI prompting workflow. Instead of one monolithic "generate everything" prompt, we implement this as a **pipeline of focused LLM calls**:

```
Step 1: Brand Voice Injection
  → Load: brand profile, voice rules, banned AI words list, 3 past successful posts
  → Output: voice-calibrated system prompt for all subsequent steps

Step 2: Hook Architect
  → Load: Hook Library entries (70/20/10 selection), topic, lane
  → Identifies common niche advice on the topic
  → Generates "Contrarian Perspective" hooks that argue the opposite
  → Output: 3-5 hook candidates ranked by pattern match

Step 3: Script/Copy Generation
  → Load: Selected hook, Scripting Framework entries, content funnel position
  → For short-form: scene-by-scene script with dialogue + visual direction
  → For ads: headline/body/CTA variants using Ad Creative frameworks
  → For YouTube: chapter breakdown with retention hooks
  → Output: full draft with Emotional Temperature Mapping (tension arc from problem → "Aha!")

Step 4: Visual Direction
  → Load: Brand style guide, reference images, script/copy from Step 3
  → Generates "Visual Friction" concepts (images that slightly contrast text to increase engagement)
  → For image gen: structured prompts with art direction packet
  → For video: scene briefs, B-roll suggestions, text overlay specs
  → Output: visual direction per content piece

Step 5: Human Pass (Red-Team)
  → LLM audits its own draft for: robotic phrasing, generic advice, brand voice violations
  → Rewrites weak sections from different personas (Mentor, Peer, Skeptic)
  → Checks: does the hook match a KB framework? Is the CTA specific? Would Grace actually say this?
  → Output: final draft with confidence score + flagged areas for Grace to review
```

Each step is a separate API call with focused context. This prevents the "dump everything in one prompt" problem and makes each step auditable.

**Pipeline design principles (inspired by subagent orchestration patterns):**

1. **Brand Identity as mandatory first-read.** Every generation step loads the brand identity KB entry before anything else. It's not one input among many — it's the foundation everything reads. Like a skill file that calibrates every downstream decision.

2. **No context bleed between steps.** Each step gets clean, explicit inputs from the previous step — not leaked context. Step 2 (Hook Architect) receives only: topic, lane, selected KB entries. Not the raw brand voice calibration from Step 1. Clean handoffs with typed input/output contracts.

3. **Approval-as-training-signal.** Grace's approve/reject/edit decisions are tracked as quality signals *independent of performance metrics*. If she consistently rejects a hook style, that's immediate feedback before any post goes live. Tracked per KB entry:
   - `times_approved` — Grace approved content using this entry without heavy edits
   - `times_rejected` — Grace rejected or heavily edited content using this entry
   - `approval_rate` — feeds into effectiveness_score alongside performance data

4. **Brand voice scoring rubric.** The Human Pass (Step 5) doesn't just check "does it sound right?" — it scores against a quantitative rubric:
   - Tone match (0-10): does it match Grace's voice?
   - Vocabulary match (0-10): does it use her words, not AI words?
   - Taglish ratio: is the English/Filipino mix natural?
   - Formality level: appropriate for the platform?
   - Banned words check: does it use any "AI slop" words from the banned list?
   - Overall brand score → below threshold triggers rewrite before showing to Grace

### 4d. Caption / Text Overlay System

Consistent captions and text overlays across all content. This is separate from the script because it's the *visual treatment* of text.

**Caption style guide:**
- Font style/weight for different content types
- Color rules (text on light backgrounds vs dark)
- Text overlay positioning rules
- Hashtag strategy per platform
- Emoji usage patterns
- Taglish voice rules

This is stored in the brand identity section of the knowledge base and included in every generation prompt that produces text for visual display.

---

## 5. Learning Loop (The Feedback Flywheel)

### 5a. Data collection (per lane)

**Short-form:** Instagram Insights API / manual entry → views, shares, saves, follows
**Ads:** Meta Marketing API (already integrated) → ROAS, CTR, CPM, conversions
**YouTube:** YouTube Analytics API (partially integrated) → AVD, CTR, subs gained, retention curve

### 5b. Performance analysis (with statistical rigor)

Triggered weekly (or on-demand):
1. Pull performance data for content created in the last 7-30 days
2. For each piece, calculate a **lane-specific performance score** using versioned, logged formulas:
   - Short-form: composite of saves + shares + reach (weighted, formula versioned)
   - Ads: ROAS primarily, CTR secondary (formula versioned)
   - YouTube: AVD × CTR composite (formula versioned)
3. **Lane-specific minimum-N gates** before analysis is meaningful:
   - Short-form: min 15 pieces before pattern detection (high volume)
   - Ads: min 5 creatives per angle before scoring
   - YouTube: min 4 videos before any automated scoring (low volume lane — handle manually until threshold)
4. Identify top 20% and bottom 20% per lane (only when N > minimum gate)
5. For top performers: trace provenance → which KB entries were primary context
6. For bottom performers: flag but **do not auto-penalize experimental/novel content** (10% novel bucket gets grace period)

### 5c. Knowledge base updates (recommendation mode first)

**First 8 weeks: RECOMMENDATION MODE**
- System proposes score changes → human (Grace/Rob) approves or rejects
- This prevents early bad analytics from corrupting KB rankings
- Builds trust in the system before going autonomous

**After 8 weeks (if confidence is high): SEMI-AUTONOMOUS**
- Small score adjustments (±5 points) auto-applied
- Large adjustments (±15+ points) still require human approval
- New "Performance Learning" entries always start as `candidate`

**Score update math:**
- Bayesian shrinkage toward lane prior (prevents single lucky/unlucky post from swinging scores)
- Recency weighting with bounded decay (recent performance matters more, but old wins don't vanish)
- Confidence interval narrows with more data — wide CI entries are clearly marked in UI
- Separate "experimental" content from baseline — first-run variants get softer penalties

**Pattern detection:**
- New patterns that don't match existing entries → flag for human review ("We noticed 3 of your top reels used a 'before/after transition' — should we add this as a hook pattern?")
- Cross-lane pattern detection deferred to Phase 4

### 5d. Generation improvement

The next time the generator runs, it naturally favors higher-scored entries and avoids recently-failed patterns within the 70/20/10 framework. The 20% explore + 10% novel buckets ensure the system keeps testing new approaches even when it has "winners."

**Auditability:** Every score change is logged with: old score, new score, evidence (which content pieces), formula version, and whether it was auto-applied or human-approved.

---

## 6. Dashboard UX Changes

### 6a. New pages / major changes

| Page | Status | Changes |
|---|---|---|
| `/` (Dashboard) | Exists | Add per-lane performance summary, knowledge base health indicator |
| `/calendar` | Exists | Lane-aware color coding, per-item "generate script" action |
| `/create` | **NEW** | The creation studio: pick lane → generate script/visual → preview → approve |
| `/create/short-form` | **NEW** | Short-form script generator with hook library integration |
| `/create/ads` | **NEW** | Ad creative generator: copy + image/carousel gen |
| `/create/youtube` | **NEW** | YouTube script generator: chapters, retention, SEO |
| `/knowledge` | **NEW** | Knowledge base browser: view, filter, add, edit entries by category |
| `/knowledge/extract` | **NEW** | NotebookLM extraction tool: pick notebook → extract structured knowledge |
| `/analytics` | **NEW** | Per-lane analytics with learning insights ("here's what's working") |
| `/ads` | Exists | Add creative preview, link to ad creation flow |
| `/research` | Exists | Integrate with knowledge base (extracted insights auto-populate) |
| `/youtube` | Exists | Add script generation integration |
| `/settings` | Exists | Add brand style guide section (colors, typography, Grace's reference photos) |

### 6b. Creation studio UX flow

```
Grace opens /create
    → Picks lane: "Short-form" / "Ad" / "YouTube"
    → Picks or confirms topic (AI suggests based on calendar gaps + research)
    → System pulls relevant knowledge, shows what research backs this topic
    → Clicks "Generate"
    → Gets full script / ad copy / carousel with images
    → Can regenerate, edit, tweak individual sections
    → Approves → auto-adds to calendar with status "created"
    → For visuals: downloads generated images or sends to design tool
```

---

## 7. Technical Architecture

### 7a. Backend changes

| Component | Current | Target |
|---|---|---|
| **Knowledge Base** | `research_insights` (flat) | New `knowledge_entries` table (structured, categorized, scored) |
| **Performance tracking** | `ad_performance` only | + `shortform_performance`, `youtube_performance` |
| **Content generation** | Single `generate-plan` route | Per-lane generation APIs with knowledge base integration |
| **Image generation** | None | Gemini image gen API integration |
| **Learning loop** | None | Automated analysis + knowledge base update pipeline |
| **NotebookLM** | 2 generic queries inline | Batch extraction pipeline with structured prompts |
| **Brand identity** | `business_profile` (basic) | Extended with visual style guide, reference images, caption rules |

### 7b. API routes (new/modified)

```
/api/knowledge/          — CRUD for knowledge base entries
/api/knowledge/extract   — Run NotebookLM extraction into knowledge base
/api/knowledge/search    — Semantic search across knowledge base

/api/create/short-form   — Generate short-form script
/api/create/ad           — Generate ad creative (copy + image prompts)
/api/create/youtube      — Generate YouTube script
/api/create/image        — Generate image via Gemini
/api/create/carousel     — Generate carousel (multi-image + copy)

/api/analytics/learning  — Run performance analysis + knowledge update
/api/analytics/short-form — Short-form performance data
/api/analytics/youtube   — YouTube performance data

/api/brand/style-guide   — Brand visual identity CRUD
```

### 7c. Gemini integration

- **Text generation:** Already using `@google/genai` SDK with `gemini-3-flash-preview`
- **Image generation:** Add Gemini image generation (Imagen 4 via the same SDK)
- **Structured output:** Use Gemini's JSON mode for reliable structured responses
- **Long context:** YouTube scripts may need `gemini-3.1-pro-preview` for quality

---

## 8. Failure Modes + Graceful Degradation

| Dependency | Failure Mode | Fallback |
|---|---|---|
| NotebookLM | Auth expired, API changed, extraction fails | KB still has all previously extracted knowledge. Generation continues from cached KB. UI shows "⚠️ Research backend offline — using cached knowledge" |
| Gemini Image Gen | Rate limited, quality drops, API changes | Text-only mode: generate copy/scripts without images. Manual prompt fallback: show the image prompt for Grace to use in another tool |
| Gemini Text Gen | Rate limited or down | LLM fallback chain already exists (Moonshot → ZAI → DeepSeek). Quality may drop but generation doesn't stop |
| Supabase | DB down | Full stop — nothing works. But this is shared infra, not project-specific risk |
| YouTube Analytics | OAuth expired, API quota | Cached analytics data. Learning loop pauses for YT lane but doesn't affect generation |
| Meta Ads API | Token expired, API changes | Cached ad performance. Existing sync already handles this |

**Extraction health monitoring:**
- Each extraction run is versioned with timestamp and entry count
- If extraction quality drops (fewer entries, malformed data), diff against last-known-good and alert
- Rollback capability: revert KB to previous extraction version
- UI indicator: "Knowledge base last refreshed: [date] — [N] entries"

---

## 9. What's NOT in scope (for now)

- Automated posting to platforms (Instagram API, YouTube upload)
- Video editing / generation (just scripts + image assets)
- Real-time trending audio detection
- Multi-user / SaaS features
- TikTok analytics integration (no reliable API)
- A/B testing automation for ads (manual for now)
- Audio generation (voiceovers, music)

---

## 9. Success Criteria

1. **Grace can generate a week's content plan** with full scripts in under 10 minutes
2. **Every generated script references specific research** — no generic advice
3. **Ad creatives include generated images** that are brand-consistent
4. **The system demonstrably improves** — month 2 content plan quality > month 1, backed by performance data
5. **Knowledge base grows automatically** from performance feedback, not just manual entry
6. **Grace doesn't need to be a prompt engineer** — the dashboard handles all the complexity behind a simple creation flow
