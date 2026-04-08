# Ads System — Technical Documentation

> **Last Updated:** 2026-04-01  
> **Phase:** 4e-fix (Ads System Consolidation + Intelligence Layer) — All 5 phases COMPLETE  
> **Owner:** Coding Team  
> **Roadmap:** `specs/ADS-ROADMAP-V2.md` — Phases A through E all done  

---

## 1. Architecture Overview

The ads system has 5 subsystems:

```
┌──────────────────────────────────────────────────────────┐
│                    /ads (Main Dashboard)                   │
│  Campaign Tree + Daily Metrics + Filters + Corrections    │
│  Data: /api/ads/creatives + /api/ads/metrics              │
└──────────────┬──────────────┬─────────────┬──────────────┘
               │              │             │
    ┌──────────▼──┐   ┌──────▼──────┐  ┌───▼──────────┐
    │ /ads/create  │   │ /ads/strategy│  │/ads/competitors│
    │ Creative     │   │ Angle×Persona│  │ Competition  │
    │ Factory      │   │ Matrix       │  │ + Sentiment  │
    └──────────────┘   └─────────────┘  └──────────────┘
```

### Data Flow

```
Meta Ads API
    │
    ▼ (POST /api/ads/creatives/sync)
┌───────────────┐    ┌───────────────┐
│ ad_creatives  │◄───│ ad_performance│  (daily rows)
│ (per creative)│    │ (per ad×day)  │
└───────┬───────┘    └───────┬───────┘
        │                    │
        │  AI Classification │  Proper Aggregation
        │  (Gemini/fallback) │  (sum spend, sum revenue)
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│ Intelligence  │    │  /api/ads/    │
│ Map (strategy)│    │  metrics      │
└───────────────┘    └───────────────┘
```

**Single Source of Truth:** `/ads` renders the audit page. All metrics are computed from `ad_performance` daily rows using proper aggregation (ROAS = total_revenue / total_spend, not averaged).

---

## 2. Database Schema

### 2.1 `ad_creatives` — One row per ad creative

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| meta_ad_id | TEXT | Meta's ad ID |
| meta_campaign_id | TEXT | Meta's campaign ID |
| meta_adset_id | TEXT | Meta's ad set ID |
| campaign_name | TEXT | Human-readable campaign name |
| adset_name | TEXT | Human-readable ad set name |
| ad_name | TEXT | Human-readable ad name |
| campaign_objective | TEXT | OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, etc. |
| optimization_goal | TEXT | CONVERSATIONS, OFFSITE_CONVERSIONS, etc. |
| headline | TEXT | Ad headline |
| body_text | TEXT | Ad primary text |
| cta_text | TEXT | CTA button text |
| link_description | TEXT | Link description |
| image_url | TEXT | Creative image URL |
| video_thumbnail_url | TEXT | Video thumbnail |
| video_transcription | TEXT | AI-transcribed spoken words |
| frame_descriptions | JSONB | AI-described key frames [{timestamp_s, description}] |
| creative_format | TEXT | static_image, video, carousel, collection |
| carousel_cards | JSONB | For carousels: [{image_url, headline, body}] |
| **Classification (6 dimensions):** | | |
| angle | TEXT | pain_point, aspiration, education, urgency, curiosity, transformation, comparison, social_proof, authority, fear |
| persona | TEXT | new_mom_curious, beginner, price_sensitive, aspirational, skeptic, returning_buyer, advanced, busy_professional |
| framework | TEXT | PAS, AIDA, before_after, testimonial, urgency, FAB |
| hook_type | TEXT | question, how_to, social_proof, direct_benefit, story_opening, bold_claim, pain_call, curiosity_gap |
| offer_type | TEXT | discount, free_trial, value_stack, limited_time, social_proof, none |
| emotional_tone | TEXT | warm, urgent, educational, aspirational, fear |
| classification_version | TEXT | v1, manual (if human-corrected) |
| classification_confidence | DECIMAL | 0.000 – 1.000 |
| classification_raw | JSONB | Full AI response for debugging |
| classified_at | TIMESTAMPTZ | When classified |
| **Denormalized performance (from ad_performance):** | | |
| total_spend | DECIMAL | Lifetime spend |
| total_purchases | INT | Lifetime purchases |
| avg_roas | DECIMAL | Lifetime ROAS |
| avg_cpa | DECIMAL | Lifetime CPA |
| avg_ctr | DECIMAL | Lifetime CTR |
| first_active_date | DATE | First day with spend |
| last_active_date | DATE | Last day with spend |
| **Status:** | | |
| is_active | BOOLEAN | Currently running on Meta |
| ad_status | TEXT | winning, weak, tired, dead, new, unknown |
| llm_provider | TEXT | Which LLM classified this |
| llm_model | TEXT | Which model |

### 2.2 `ad_performance` — One row per ad per day

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| meta_ad_id | TEXT | Links to ad_creatives.meta_ad_id |
| date_start | DATE | The day |
| date_stop | DATE | Same as date_start (daily) |
| campaign_name | TEXT | Denormalized for convenience |
| adset_name | TEXT | |
| ad_name | TEXT | |
| **Core metrics:** | | |
| spend | DECIMAL | Daily spend (₱) |
| impressions | INT | |
| clicks | INT | |
| conversions | INT | Purchase events |
| conversion_value | DECIMAL | Revenue from conversions |
| reach | INT | Unique people |
| **Computed (denormalized):** | | |
| roas | DECIMAL | conversion_value / spend |
| cpa | DECIMAL | spend / conversions |
| ctr | DECIMAL | clicks / impressions |
| cpc | DECIMAL | spend / clicks |
| cpm | DECIMAL | spend / impressions × 1000 |
| **Funnel metrics:** | | |
| messaging_conversations | INT | Messenger/IG DM conversations |
| leads | INT | Lead form submissions |
| link_clicks | INT | Outbound clicks |
| landing_page_views | INT | |
| post_engagement | INT | |
| **Video metrics:** | | |
| video_views | INT | 3-second views |
| video_views_p25 | INT | 25% completion |
| video_views_p50 | INT | 50% completion |
| video_views_p75 | INT | 75% completion |
| video_views_p100 | INT | Full completion |

**Unique constraint:** `(user_id, meta_ad_id, date_start)` — one row per user per ad per day.

### 2.3 `creative_concepts` — Creative Factory concepts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK |
| angle | TEXT | The angle being tested |
| persona | TEXT | Target persona |
| core_message | TEXT | Concept anchor message |
| concept_brief | JSONB | Full brief (product, framework, proof points, competitor context) |
| mode | TEXT | explore or scale |
| status | TEXT | draft, testing, proven, fatigued |
| llm_provider | TEXT | Which LLM generated the brief |
| llm_model | TEXT | |

### 2.4 `creative_hooks` — Hook variations per concept

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| concept_id | UUID | FK → creative_concepts |
| hook_text | TEXT | The opening line |
| hook_type | TEXT | question, bold_claim, pain_call, etc. |
| proof_points_used | JSONB | Which proof points this hook uses |
| status | TEXT | draft, testing, winner, loser |
| test_results | JSONB | Performance data when tested |
| llm_provider | TEXT | Which LLM generated this hook |
| llm_model | TEXT | |

### 2.5 `creative_executions` — Format-specific outputs per hook

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| hook_id | UUID | FK → creative_hooks |
| concept_id | UUID | FK → creative_concepts |
| format | TEXT | static_image, carousel, video_ugc, video_hq, ig_carousel |
| content | JSONB | Format-specific content (see §4.3) |
| image_url | TEXT | Generated image URL |
| status | TEXT | draft, approved, deployed, tested |
| meta_ad_id | TEXT | Linked Meta ad when deployed |
| performance | JSONB | Linked metrics after testing |
| llm_provider | TEXT | |
| llm_model | TEXT | |

### 2.6 Competition & Sentiment Tables

| Table | Purpose |
|-------|---------|
| `competitors` | Tracked competitor pages (page_name, page_id, niche) |
| `competitor_ads` | Individual ads from Meta Ad Library (classified same 6 dimensions) |
| `competitor_snapshots` | Weekly snapshot of competitor activity (ad counts, angle distribution) |
| `market_sentiment` | Brave Search + Gemini-summarized market signals |
| `tracked_terms` | Search terms for sentiment collection |

### 2.7 Legacy Tables (from earlier phases)

| Table | Status | Notes |
|-------|--------|-------|
| `ad_factory_batches` | Superseded by creative_concepts | Old batch mode factory |
| `ad_factory_variants` | Superseded by creative_executions | Old variant storage |

---

## 3. API Endpoints

### 3.1 Core Data

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ads/creatives` | GET | All classified ad creatives with filters (angle, persona, format, status) |
| `/api/ads/creatives` | PATCH | Inline correction of classification {id, corrections: {angle: "new_value"}} |
| `/api/ads/creatives/sync` | POST | Sync from Meta: fetch ads → classify → aggregate performance. Body: {reclassify?: boolean} |
| `/api/ads/creatives/analyze-video` | POST | Analyze video ad: transcribe + describe frames |
| `/api/ads/metrics` | GET | Daily-data metrics per ad. Params: period (7\|14\|30\|90\|lifetime), compare (true for trend) |
| `/api/ads/sync` | POST | Legacy: sync ad_performance daily rows from Meta |

### 3.2 Intelligence

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ads/intelligence/map` | GET | Strategy map: angle × persona matrix, gaps, saturation, recommendations |
| `/api/ads/angle-coverage` | GET | Tested vs untested angles with winner counts + best ROAS |
| `/api/ads/weekly-plan` | GET | 1-3 weekly creative testing recommendations |
| `/api/ads/correlation` | GET | Ad performance correlated with organic content classifications |

### 3.3 Creative Factory

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ads/creative-tree` | POST | Generate full tree: brief → hooks → format executions |
| `/api/ads/creative-tree` | GET | List saved concepts with hooks |
| `/api/ads/creative-tree` | PATCH | Update hook/execution status or content |
| `/api/ads/factory/generate` | POST | Legacy: single ad generation |
| `/api/ads/factory/batch` | POST | Legacy: batch generation |
| `/api/ads/factory/track` | POST | Match factory variants to live Meta ads |

### 3.4 Competition & Sentiment

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ads/competitors` | GET | Read competitor intelligence |
| `/api/ads/competitors` | POST | Add competitor manually |
| `/api/ads/sentiment` | GET | Read market sentiment data |
| `/api/ads/sentiment` | POST | Run sentiment collection via Brave Search |
| `/api/ads/performance` | GET | Legacy performance endpoint |

---

## 4. Library Modules (`lib/ads/`)

### 4.1 `classifier.ts` — AI Ad Classification

Classifies each ad across 6 dimensions using Gemini (or fallback chain). 

**Classification vocabularies:**
- **angle:** pain_point, aspiration, education, urgency, curiosity, transformation, comparison, social_proof, authority, fear
- **persona:** new_mom_curious, beginner, price_sensitive, aspirational, skeptic, returning_buyer, advanced, busy_professional
- **framework:** PAS, AIDA, before_after, testimonial, urgency, FAB
- **hook_type:** question, how_to, social_proof, direct_benefit, story_opening, bold_claim, pain_call, curiosity_gap
- **offer_type:** discount, free_trial, value_stack, limited_time, social_proof, none
- **emotional_tone:** warm, urgent, educational, aspirational, fear

**`calculateAdStatus()`** — Determines ad health:

| Condition | Status |
|-----------|--------|
| spend < ₱100 or < 3 days | `new` |
| **Engagement campaigns:** cost/conv ≤ 50% breakeven | `winning` |
| **Engagement:** cost/conv ≤ breakeven + declining | `tired` |
| **Engagement:** cost/conv > breakeven | `dead` |
| **Awareness:** CPM ≤ ₱50 | `winning` |
| **Awareness:** CPM > ₱100 | `dead` |
| **Sales:** ROAS ≥ 2.0x + not declining | `winning` |
| **Sales:** ROAS ≥ 1.5x + declining | `tired` |
| **Sales:** ROAS 1.0x–2.0x | `weak` |
| **Sales:** ROAS < 1.0x | `dead` |

Business thresholds are dynamic — loaded from `product_catalog` (price) and observed conversion rates.

### 4.2 `business-context.ts` — Dynamic Thresholds

Loads from DB:
- Product price (from `product_catalog`)
- Conversation-to-sale rate (computed from historical data)
- Winning CPA = productPrice × convToSaleRate × 0.5
- Breakeven CPA = productPrice × convToSaleRate

All ad intelligence thresholds derive from these — no hardcoded values.

### 4.3 `creative-engine.ts` — Creative Testing V2

**Flow:** Concept Brief → Hook Variations → Format Expansions

1. **`generateConceptBrief(angle, persona, userId, mode)`**
   - Loads: product catalog, winning ads for this angle, competitor angles, business context
   - **Explore mode:** Bold, varied hooks for untested angles
   - **Scale mode:** Loads top-10 ROAS ads, lists already-tested hook types, instructs AI to create different variations following the same emotional logic
   - Returns: ConceptBrief (core_message, framework, proof_points, competitor_context, winning_patterns)

2. **`generateHookVariations(brief, count)`**
   - Generates N hooks constrained to the concept (no angle drift)
   - Each hook: hook_text (Taglish), hook_type, proof_points_used
   - Compliance enforced: no income guarantees, no false scarcity

3. **`expandToFormats(brief, hook, formats)`**
   - **Static/Carousel:** Single batched LLM call, run in parallel across hooks
   - **Video (UGC/HQ):** Routes through full KB-backed `generateShortFormScript` pipeline (hook library, scripting frameworks, virality science, platform intelligence, brand voice rubric, quality gate)
   - Video runs sequentially to avoid KB pipeline overload

**Format-specific content schemas (stored in `creative_executions.content`):**

| Format | Fields |
|--------|--------|
| static_image | headline, body_text, cta_text, link_description, image_prompt |
| carousel | headline, slides[{body_text, image_prompt}], cta_text |
| ig_carousel | headline, slides[{title, body_text}] |
| video_ugc | hook_script, body_script, cta_script, duration_seconds, style_notes, scenes[], caption_draft, hashtags, kb_hooks_used, quality_score |
| video_hq | hook_script, body_script, cta_script, duration_seconds, visual_directions, scenes[], caption_draft, hashtags, kb_hooks_used, quality_score |

### 4.4 `intelligence.ts` — Media Buyer Brain

Builds the strategic view:
- **Matrix:** angle × persona grid with spend-weighted ROAS, ad count, status per cell
- **Gap Analysis:** Untested combos ranked by priority
- **Saturation Detection:** Ads with declining ROAS trends
- **Recommendations:** Ranked actions (create_new, scale, refresh, kill) with confidence scoring

**Confidence model:**
- high: ≥5 ads, ≥₱5,000 spend, ≥30 days data
- medium: ≥2 ads, ≥₱1,000 spend
- low: 1 ad or <₱1,000 spend
- gap: 0 ads

### 4.5 `video-analyzer.ts` — Multimodal Video Analysis

Uses Gemini to:
1. Transcribe spoken words from video ads
2. Describe key visual frames at timestamps
3. Summarize the ad's message

Output stored on `ad_creatives.video_transcription` and `ad_creatives.frame_descriptions`.

### 4.6 `factory.ts` — Legacy Factory

Generates ad copy + image prompts. Superseded by `creative-engine.ts` (Creative Testing V2) but still used by `/api/ads/factory/*` endpoints.

---

## 5. UI Pages

### 5.1 `/ads` — Main Dashboard (= Audit Page)

**File:** `app/ads/page.tsx` → re-exports `app/ads/audit/page.tsx`

**What it shows:**
- Business economics context bar (product price, winning CPA, conv rate)
- Account-level metrics: total spend, revenue, ROAS, purchases, convos, CTR, frequency
- Period selector: 7d / 14d / 30d / 90d / lifetime
- Filters: format (static/video/carousel), status (working/weak/kill/new), show inactive toggle
- Campaign tree: Campaign → Ad Set → individual ads
- Per-ad: thumbnail, classification chips (angle, persona, framework, hook, offer, tone), metrics (spend, ROAS/CPA/cost-per-conv based on objective), video metrics (hook rate, hold rate), trend badges
- Inline correction: click any classification chip → dropdown to fix → saved via PATCH

**Data sources:**
- `GET /api/ads/creatives` — all classified creatives
- `GET /api/ads/metrics?period=N&compare=true` — daily-aggregated metrics per ad

**Key design decision:** ROAS = total_revenue / total_spend (from daily rows), NOT averaged per-creative. Matches media buyer standard.

### 5.2 `/ads/create` — Creative Factory

**File:** `app/ads/create/page.tsx`

**What it shows:**
- Angle Coverage Panel: visual grid of all 10 angles (winner/tested/untested), click to select
- Weekly Plan recommendations (1-3 suggested concepts)
- Mode toggle: Explore vs Scale (with explanation of difference)
- Config: angle dropdown (with coverage tags), persona, format checkboxes (video flagged "~2min"), hook count
- Generate button shows: "2 hooks × 2 formats = 4 ads · ~1 min"
- Results: concept brief card → expandable hook sections → format-specific execution cards

**Execution cards** (`components/ads/ExecutionCard.tsx`):
- Edit toggle (inline editable fields)
- Generate Image button (static ads → hits `/api/studio/generate`)
- Build in Studio button (carousels → routes to `/create/ads` carousel builder)
- Save to Library button (→ `/api/library/save`)
- Winner/loser tracking per hook (🏆/❌ buttons)

**Data sources:**
- `GET /api/ads/angle-coverage` — angle stats
- `GET /api/ads/weekly-plan` — recommendations
- `POST /api/ads/creative-tree` — generation
- `PATCH /api/ads/creative-tree` — status/content updates

### 5.3 `/ads/strategy` — Strategy Map

**File:** `app/ads/strategy/page.tsx`

Interactive angle × persona matrix. Each cell shows ad count, ROAS, status color. Click cell → view ads or create new.

**Data source:** `GET /api/ads/intelligence/map`

### 5.4 `/ads/competitors` — Competitive Intelligence

**File:** `app/ads/competitors/page.tsx`

- Competitor list with ad counts
- Competitor ad gallery with classifications
- Market sentiment panel

**Data sources:**
- `GET /api/ads/competitors`
- `GET /api/ads/sentiment`

### 5.5 `/ads/weekly` — Weekly Planner

**File:** `app/ads/weekly/page.tsx`

Weekly creative testing calendar. Shows recommended tests per day.

**Data source:** `GET /api/ads/weekly-plan`

---

## 6. LLM Configuration

**Default chain (for classification, ad copy, analysis):**
1. Gemini (`gemini-3-flash-preview`) — `GEMINI_API_KEY`
2. MiniMax (`MiniMax-M2.7`) — `MINIMAX_API_KEY`
3. ZAI/GLM (`glm-5`) — `ZAI_API_KEY`
4. DeepSeek (`deepseek-chat`) — `DEEPSEEK_API_KEY`

**Creative chain (for scripts via KB pipeline):**
1. Claude Sonnet (`claude-sonnet-4-6`) — `ANTHROPIC_API_KEY`
2. Gemini Pro (`gemini-3.1-pro-preview`) — `GEMINI_API_KEY`
3. Falls back to default chain

**Image generation:** Gemini only (`gemini-3.1-flash-image-preview`)

**Logging:** Every LLM call logs `[LLM] ✅ Provider/model — N chars` to server console. Provider/model stored in DB on creative_hooks, creative_executions, content_items.

**Config:** `lib/llm/client.ts`

---

## 7. Sync Flow (Meta → DB)

**Trigger:** `POST /api/ads/creatives/sync` (manual via "Sync" button or cron)

**Steps:**
1. Auth check (user session or CRON_SECRET)
2. Fetch all ads from Meta Graph API (campaigns → ad sets → ads → creative details)
3. For video ads: call `analyzeAdVideo()` → transcribe + describe frames
4. Upsert into `ad_creatives` (keyed by user_id + meta_ad_id)
5. Classify unclassified ads using Gemini (6 dimensions)
6. Fetch daily ad_performance data from Meta Insights API
7. Upsert into `ad_performance` (keyed by user_id + meta_ad_id + date_start)
8. Aggregate performance → update denormalized fields on ad_creatives
9. Calculate ad_status using `calculateAdStatus()`

**Rate limits:** One sync per user at a time (sync_locks table).

---

## 8. Known Issues & Debt

1. **`ad_factory_batches` / `ad_factory_variants`** — Superseded by creative_concepts/hooks/executions. Legacy endpoints still exist (`/api/ads/factory/*`). Should be deprecated.

2. **`/api/ads/intelligence/map`** — Still uses ad_creatives denormalized data (spend-weighted ROAS). The `/ads/strategy` page reads from this. Ideally should also use daily data like audit does.

3. **Video analysis** — Requires Gemini. No fallback for video transcription/frame analysis when Gemini is disabled.

4. **Image generation** — Gemini only, no fallback chain. Breaks when Gemini API is off.

5. **Generation speed** — Video scripts take ~2-3min each (KB pipeline). Static/carousel are ~20s per hook batch (parallel). Default UI now warns about video cost.

6. **22 "unknown" status ads** — Need reclassification or manual correction via audit page.

---

## 9. File Index

```
app/
├── ads/
│   ├── page.tsx                    # Main dashboard (re-exports audit)
│   ├── page.module.css             # Orphaned (old dashboard CSS)
│   ├── audit/
│   │   ├── page.tsx                # Campaign tree + daily metrics + corrections
│   │   └── page.module.css
│   ├── create/
│   │   ├── page.tsx                # Creative Factory (concept → hooks → formats)
│   │   └── page.module.css
│   ├── strategy/
│   │   ├── page.tsx                # Angle × Persona matrix
│   │   └── page.module.css
│   ├── competitors/
│   │   ├── page.tsx                # Competitive intelligence
│   │   └── page.module.css
│   └── weekly/
│       ├── page.tsx                # Weekly creative planner
│       └── page.module.css
├── api/ads/
│   ├── actions/route.ts            # GET media buyer brain recommendations
│   ├── angle-coverage/route.ts     # GET tested/untested angles
│   ├── competitors/route.ts        # GET/POST competitor data
│   ├── correlation/route.ts        # GET ad↔content correlations
│   ├── creative-tree/
│   │   ├── route.ts                # POST/GET/PATCH creative tree (monolithic, backward compat)
│   │   ├── brief/route.ts          # POST step 1: generate concept brief (~5s)
│   │   ├── hooks/route.ts          # POST step 2: generate hook variations (~8s)
│   │   └── expand/route.ts         # POST step 3: expand hook into format executions
│   ├── creatives/
│   │   ├── route.ts                # GET/PATCH ad creatives
│   │   ├── sync/route.ts           # POST sync from Meta (+ fatigue detection)
│   │   └── analyze-video/route.ts  # POST video analysis
│   ├── intelligence/
│   │   └── map/route.ts            # GET strategy map data
│   ├── metrics/route.ts            # GET daily-data metrics
│   ├── sentiment/route.ts          # GET/POST sentiment data
│   └── weekly-plan/route.ts        # GET weekly recommendations
├── api/cron/
│   ├── ads-sync/route.ts           # GET daily sync (Vercel cron, 6AM PHT)
│   └── competitor-refresh/route.ts # GET weekly competitor refresh (Mon 7AM PHT)
components/ads/
│   ├── ExecutionCard.tsx            # Interactive ad execution card
│   ├── ExecutionCard.module.css
│   ├── ClassificationChip.tsx       # Editable classification badge
│   └── ClassificationChip.module.css
lib/ads/
│   ├── business-context.ts          # Dynamic business thresholds
│   ├── classifier.ts                # AI classification + status calc
│   ├── creative-engine.ts           # Creative Testing V2 engine
│   ├── factory.ts                   # Legacy ad factory
│   ├── intelligence.ts              # Media buyer brain
│   └── video-analyzer.ts            # Video transcription + analysis
supabase/migrations/
│   ├── 020_ad_performance_phase4d.sql
│   ├── 021_ad_creatives.sql
│   ├── 022_ad_factory.sql
│   ├── 023_fix_ad_performance_constraint.sql
│   ├── 025_ad_performance_reach.sql
│   ├── 026_campaign_objective.sql
│   ├── 027_funnel_metrics.sql
│   ├── 028_competition_sentiment.sql
│   ├── 029_creative_testing_v2.sql
│   └── 030_llm_provider_tracking.sql
```
