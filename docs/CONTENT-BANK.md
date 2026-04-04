# Content Bank System — Technical Documentation

> **Last Updated:** 2026-04-04  
> **Status:** Live, seeded, bank-first serving active  
> **Owner:** Coding Team  

---

## 1. Overview

The Content Bank is a pre-generated content reservoir that serves topics, hooks, and full scripts **instantly** without LLM calls. It operates on a **bank-first** principle: always check the bank before calling an LLM.

### Why Bank-First?

| Approach | Latency | Cost | Quality Control |
|----------|---------|------|-----------------|
| LLM on-demand | 15-60s | ~$0.02-0.10/call | Variable |
| Bank-first | <1s | $0 (pre-generated) | Pre-vetted, consistent |

The bank is filled in two ways:
1. **Bulk seed import** — offline batch generation (129 batches, 1,161 variants)
2. **Nightly cron** — `/api/cron/bank-fill` tops up depleted angle×persona combos

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Content Flow                           │
│                                                           │
│  User picks goal+platform                                 │
│       │                                                   │
│       ▼                                                   │
│  ┌─────────────┐   hit    ┌──────────────┐               │
│  │ topic_bank  │ ◄────── │ /api/create/  │               │
│  │ (320 topics)│  miss    │   topics     │               │
│  └──────┬──────┘ ──────► │ → LLM gen 20 │               │
│         │                 │ → store bank │               │
│         │                 └──────────────┘               │
│         ▼                                                 │
│  User picks topic                                         │
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────┐  hit   ┌──────────────┐               │
│  │ script_bank  │ ◄───── │ /api/create/ │               │
│  │ (1,026)      │  miss  │   generate   │               │
│  └──────┬───────┘ ─────► │ → LLM gen 3  │               │
│         │                 └──────────────┘               │
│         ▼                                                 │
│  Results shown with source label:                         │
│  📦 From Bank  or  ✨ AI Generated                        │
└──────────────────────────────────────────────────────────┘
```

### Ads Flow (`/ads/create`)

```
┌──────────────────────────────────────────────────────────┐
│  User picks angle × persona                               │
│       │                                                   │
│       ▼                                                   │
│  ┌──────────────┐  serve  ┌──────────────┐               │
│  │ hook_bank    │ ◄────── │ /api/ads/bank│               │
│  │ (1,178)      │         │  ?type=hooks │               │
│  └──────┬───────┘         └──────────────┘               │
│         │                                                 │
│         ▼                                                 │
│  User selects hooks → Generate Ads                        │
│       │                                                   │
│       ▼                                                   │
│  LLM expands hooks into full ad creatives                 │
│  (static image, carousel, video per hook)                 │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Database Tables

### `topic_bank` (Migration: `20260326_topic_bank.sql`)

Pre-generated topic suggestions, served 8 at a time.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → auth.users |
| `platform` | TEXT | reel, youtube, facebook-post, etc. |
| `goal` | TEXT | educate, story, prove, sell, inspire, etc. |
| `title` | TEXT | Topic title (displayed to user) |
| `angle` | TEXT | What makes this angle unique |
| `category` | TEXT | practical, emotional, contrarian, seasonal, behind-the-scenes |
| `hook_idea` | TEXT | Sample hook for this topic |
| `source` | TEXT | `seed` (batch import) or `llm` (generated on-demand) |
| `evidence` | TEXT | Optional supporting evidence |
| `shown` | BOOL | Has this topic been shown to user? |
| `used` | BOOL | Has this topic been used to generate content? |
| `shown_at` | TIMESTAMPTZ | When shown |
| `used_at` | TIMESTAMPTZ | When used |

**Current count:** 320 (146 from seed, 174 from LLM)

### `hook_bank` (Migration: `031_hook_script_bank.sql`)

Pre-generated hooks with freshness tracking and performance feedback.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → auth.users |
| `angle` | TEXT | Content angle (prove, sell, educate, story, inspire) |
| `persona` | TEXT | Target persona (grace, new_mom_curious, beginner, etc.) |
| `hook_text` | TEXT | The hook line |
| `hook_type` | TEXT | question, social_proof, curiosity_gap, contrarian, bold_claim, etc. |
| `proof_points_used` | TEXT[] | KB entries referenced |
| `generated_by` | TEXT | Model/source (seed-batch, kimi-k2-turbo, etc.) |
| `generated_model` | TEXT | Exact model ID |
| `quality_score` | REAL | 0-1 quality rating |
| `generation_context` | JSONB | Batch number, variant ID, source info |
| `status` | TEXT | `fresh` → `shown` → `selected` → `deployed` → `retired` |
| `times_shown` | INT | How many times served |
| `times_selected` | INT | How many times user picked it |
| `last_shown_at` | TIMESTAMPTZ | |
| `deployed_ad_id` | UUID | FK → ad_creatives (if deployed as ad) |
| `deployed_concept_id` | UUID | FK → creative_concepts |
| `ad_roas` | REAL | Performance feedback from deployed ad |
| `ad_status` | TEXT | winning, tired, dead |
| `exclusion_hash` | TEXT | MD5 of hook_text for dedup |

**Current count:** 1,178 (976 from seed, 202 from LLM/prior seeding)

**Status lifecycle:**
```
fresh → shown (served to user) → selected (user picked it) → deployed (used in ad) → retired (exhausted/performing poorly)
```

### `script_bank` (Migration: `031_hook_script_bank.sql`)

Pre-generated full scripts/content with freshness tracking.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → auth.users |
| `angle` | TEXT | Content angle |
| `persona` | TEXT | Target persona |
| `format` | TEXT | `video_ugc`, `static_image`, `carousel` |
| `hook_text` | TEXT | The hook this script opens with |
| `scenes` | JSONB | Full scene/block array |
| `caption_draft` | TEXT | Optional caption |
| `hashtags` | TEXT[] | Suggested hashtags |
| `cta` | TEXT | Call to action |
| `total_duration_seconds` | INT | Estimated duration |
| `generated_by` | TEXT | Model/source |
| `generated_model` | TEXT | Exact model ID |
| `quality_score` | REAL | 0-1 quality rating |
| `kb_hooks_used` | TEXT[] | KB hook entries used |
| `kb_frameworks_used` | TEXT[] | KB framework entries used |
| `generation_context` | JSONB | Batch info, source |
| `status` | TEXT | `fresh` → `shown` → `selected` |
| `times_shown` | INT | |
| `times_selected` | INT | |
| `last_shown_at` | TIMESTAMPTZ | |

**Current count:** 1,026 (751 from seed, 275 from LLM/prior seeding)

---

## 4. Serving Logic

### `/api/create/topics` (POST)

1. Check `topic_bank` for unseen topics matching `platform` + `goal`
2. If ≥8 unshown topics → serve from bank (mark as `shown`)
3. If <8 → call LLM to generate 20 → store in `topic_bank` → serve 8
4. Response includes `source: 'seed'|'llm'` per topic

### `/api/ads/bank` (GET)

Hooks: `?angle=X&persona=Y&count=N`
1. Pull `fresh` hooks first (never shown)
2. If not enough, pull `shown` hooks (seen but not recently)
3. Ensure `hook_type` variety (no duplicate types)
4. Boost hooks similar to past deployed winners
5. If bank depleted (<3 fresh), flag `needs_refill`
6. Mark served hooks as `shown`, increment `times_shown`

Scripts: `?type=scripts&angle=X&persona=Y&format=F&count=N`
1. Pull fresh/shown scripts matching angle+persona+format
2. Order by quality_score descending
3. Mark as shown

### `/create` page (bank-first logic)

```javascript
// 1. Try bank first
const bankRes = await fetch(`/api/ads/bank?type=scripts&angle=${goal}&persona=grace&format=${format}&count=3`)
if (scripts.length >= 3) {
  // Serve from bank — instant, free
  variants = scripts.map(s => ({ ...s, source: 'bank' }))
} else {
  // Fallback: LLM generation — 15-60s, costs tokens
  const res = await fetch('/api/create/generate', { ... })
  variants = data.variants.map(v => ({ ...v, source: 'generated' }))
}
```

---

## 5. Seed Data Pipeline

### Generation (2026-04-03 → 2026-04-04)

129 batch files generated using parallel subagent workers:

| Step | Detail |
|------|--------|
| **Task files** | `/home/rob/.openclaw/workspace-coding/seed-tasks/batch-{1..129}.txt` |
| **Output files** | `/home/rob/.openclaw/workspace-coding/seed-output/batch-{1..129}.json` |
| **Model** | `moonshot/kimi-k2.5` (primary), `anthropic/claude-sonnet-4-6` (fallback) |
| **Parallelism** | 4 concurrent subagent workers |
| **Per batch** | 3 topics × 3 variants = 9 variants per batch |
| **Total** | 129 batches × 9 = 1,161 variants |
| **Bad files** | 13 batches had corrupted JSON (rate-limit crashes): 12, 16, 25, 45, 47, 51, 58, 60, 70, 72, 81, 91, 93 |
| **Time** | ~2.5 hours total |

### Task File Format

Each task file contains:
- Grace's brand identity + voice rules
- Business context (products, USPs, audience)
- Content format (video, carousel, static image)
- Content structure (Comparison, PASTOR, Before-After-Bridge, Hook-Story-Offer, etc.)
- KB frameworks + virality science + angle techniques
- 3 specific topics to generate variants for
- Anti-repetition rules, product rotation, Taglish requirements

### Output JSON Format

```json
{
  "variants": [
    {
      "id": "t1v1",
      "number": 1,
      "hook": "Hook text in Taglish...",
      "content": {
        "platform": "TikTok/Reels",
        "scenes": [
          {
            "block_id": "hook",
            "block_label": "HOOK",
            "timing": "0-3s",
            "script_text": "What Grace says...",
            "visual_direction": "What viewer sees..."
          }
        ]
      },
      "qualityScore": 92
    }
  ]
}
```

Content structure varies by format:
- **Video scripts:** `content.scenes[]` — block_id, timing, script_text, visual_direction
- **Carousels:** `content.slides[]` — title, text, imagePrompt
- **Static images:** `content.blocks[]` — headline, subtext, imagePrompt
- Some batches use `content.blocks[]` for all formats

### Import Script

**Path:** `scripts/import-seed-variants.js`

```bash
cd gh-creative-dashboard
export $(grep -v '^#' .env.local | xargs)
node scripts/import-seed-variants.js
```

**What it does:**
1. Reads all `batch-*.json` from seed-output directory
2. Extracts hooks → `hook_bank` (with dedup via MD5 hash)
3. Extracts full scripts → `script_bank` (scenes normalized from blocks/slides/scenes)
4. Infers `angle` from content keywords (prove, sell, educate, story, inspire)
5. Infers `format` from content structure (video_ugc, carousel, static_image)
6. Infers `hook_type` from hook text patterns
7. Skips bad JSON files gracefully
8. Inserts in batches of 50

**Import results (2026-04-04):**
- Hooks: 976 new + 202 existing = **1,178 total**
- Scripts: 751 new + 275 existing = **1,026 total**
- Topics: 146 existing updated to `source: 'seed'`
- 55 duplicate hooks skipped
- 13 bad JSON files skipped

### Topic Seeding

Topics were extracted from task files (387 total, 146 unique) and matched against existing `topic_bank` entries. All 146 were already present (inserted during earlier LLM-based topic generation which used the same KB). Updated `source` from `'llm'` to `'seed'` for matching entries.

---

## 6. Nightly Bank Fill (Cron)

**Path:** `/api/cron/bank-fill`  
**Schedule:** Daily at 2:00 AM PHT (`0 18 * * *` UTC)  
**Auth:** `CRON_SECRET` bearer token

### Logic:
1. Check all angle×persona combos for fresh hook count
2. Find combos below `MIN_FRESH_HOOKS` (5)
3. For up to 5 combos per run:
   - Call `/api/ads/bank/seed` to generate new hooks via LLM
   - Target `TARGET_HOOKS_PER_COMBO` (10) per combo
4. Track generation credits

### Angles checked:
`pain_point, aspiration, education, urgency, curiosity, transformation, comparison, social_proof, authority, fear`

### Personas checked:
`new_mom_curious, beginner, price_sensitive, aspirational, skeptic`

---

## 7. Source Labels (UI)

All content shown to Grace includes a source indicator:

| Label | Meaning | Where shown |
|-------|---------|-------------|
| 📦 From Bank | Served from pre-generated bank | Script variant cards on `/create` |
| ✨ AI Generated | Generated fresh by LLM | Script variant cards on `/create` |
| 📦 bank | Topic from seed data | Topic suggestion cards on `/create` |
| Hook Bank (header) | Section of bank-sourced hooks | `/ads/create` hook picker |

Implementation:
- Variant interface includes `source?: 'bank' | 'generated'`
- Topic API returns `source: 'seed' | 'llm'` per topic
- CSS badge: `.sourceBadge` (purple, pill-shaped)
- CSS badge: `.topicSourceBadge` (smaller, inline with category)

---

## 8. Diagnostics & Troubleshooting

### Check bank health

```sql
-- Hook bank by status
SELECT status, count(*) FROM hook_bank GROUP BY status ORDER BY count DESC;

-- Script bank by format
SELECT format, status, count(*) FROM script_bank GROUP BY format, status ORDER BY format;

-- Topic bank by source
SELECT source, count(*), count(*) FILTER (WHERE shown = false) as unshown
FROM topic_bank GROUP BY source;

-- Depleted combos (need refill)
SELECT angle, persona, count(*) FILTER (WHERE status = 'fresh') as fresh
FROM hook_bank
GROUP BY angle, persona
HAVING count(*) FILTER (WHERE status = 'fresh') < 5
ORDER BY fresh;
```

### Re-import seed data

If bank data is lost or corrupted:

```bash
cd gh-creative-dashboard
export $(grep -v '^#' .env.local | xargs)

# Re-import (dedup-safe — skips existing hashes)
node scripts/import-seed-variants.js
```

### Regenerate bad batches

13 batch files have corrupted JSON. To regenerate:

```bash
# Check which are bad
cd /home/rob/.openclaw/workspace-coding/seed-output
for f in batch-*.json; do python3 -c "import json; json.load(open('$f'))" 2>/dev/null || echo "BAD: $f"; done

# Re-run the task for a specific batch
# (use OpenClaw sessions_spawn with the task file)
```

Bad batch numbers: 12, 16, 25, 45, 47, 51, 58, 60, 70, 72, 81, 91, 93

### Bank not serving (falls through to LLM)

Check:
1. Are there fresh scripts matching the angle+format? (query `script_bank` where `status = 'fresh'`)
2. Is the angle mapping correct? `/create` maps goals to angles: prove→prove, sell→sell, educate→educate, etc.
3. Is the format mapping correct? reels→video_ugc, carousel→carousel, static-image→static_image
4. Does the user_id match? Bank is per-user.

### Cron not running

1. Check `CRON_SECRET` is set on Vercel env vars
2. Check Vercel dashboard → Cron Jobs tab for execution logs
3. Manual trigger: `curl -H "Authorization: Bearer $CRON_SECRET" https://gh-creative-dashboard.vercel.app/api/cron/bank-fill`

---

## 9. File Structure (Key Paths)

```
gh-creative-dashboard/
├── app/
│   ├── create/           # Content creation wizard
│   │   ├── page.tsx      # Bank-first generation flow
│   │   └── create.module.css
│   ├── ads/
│   │   ├── create/       # Ad creative factory (bank-first hooks)
│   │   └── page.tsx      # Campaign dashboard
│   ├── batch/            # Bulk generation
│   ├── library/          # Content library
│   ├── api/
│   │   ├── create/
│   │   │   ├── generate/ # LLM generation (fallback)
│   │   │   └── topics/   # Topic suggestions (bank-first)
│   │   ├── ads/
│   │   │   └── bank/     # Hook & script bank API
│   │   │       ├── route.ts   # GET (serve) + POST (update status)
│   │   │       └── seed/      # POST (generate new hooks via LLM)
│   │   └── cron/
│   │       ├── ads-sync/      # Daily Meta ad sync
│   │       ├── bank-fill/     # Nightly bank pre-generation
│   │       └── competitor-refresh/
│   └── ...
├── lib/
│   ├── create/           # Generation logic
│   │   ├── kb-retriever.ts    # Knowledge base retrieval
│   │   ├── session-manager.ts # Multi-turn LLM sessions
│   │   └── types.ts
│   ├── llm/
│   │   └── client.ts     # Multi-provider LLM client
│   ├── ads/              # Ad system logic
│   └── supabase/         # Supabase client helpers
├── scripts/
│   ├── import-seed-variants.js  # Import batch JSON → hook_bank + script_bank
│   └── seed-hooks-from-json.ts  # Legacy hook import (knowledge_entries)
├── supabase/
│   └── migrations/       # 33 SQL migrations
├── docs/
│   ├── CONTENT-BANK.md   # This document
│   ├── ADS-SYSTEM.md     # Ads system documentation
│   └── LLM-BATTLE.md     # Model comparison results
├── specs/                # Phase specs and vision docs
├── STATUS.md             # Current project status
├── ROADMAP.md            # Full phase roadmap
└── vercel.json           # Cron job configuration
```

---

## 10. Related Systems

| System | Connection |
|--------|-----------|
| **Knowledge Base** (`knowledge_entries`) | KB entries are retrieved during LLM generation. Hooks, frameworks, virality science, angle techniques all feed into prompts. |
| **Content Structures** (`content_structures`) | Structures like PASTOR, Hook-Hold-Reward define the block layout for generated scripts. |
| **Ad Performance** (`ad_creatives`, `ad_performance`) | Deployed hooks get performance feedback (`ad_roas`, `ad_status`). Winners boost similar hooks in serving. |
| **Nightly Cron** (`bank-fill`) | Automatically fills depleted bank combos. Checks all angle×persona pairs. |
| **Seed Tasks** (offline) | Batch task files define topics, structures, and constraints. Generated variants imported via script. |
