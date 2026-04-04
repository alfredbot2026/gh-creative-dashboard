# GH Creative Dashboard

> AI-powered content creation platform for Graceful Homeschooling — a Filipino paper crafting business education brand.

**Live:** https://gh-creative-dashboard.vercel.app  
**Repo:** https://github.com/alfredbot2026/gh-creative-dashboard  
**Stack:** Next.js 15 · Supabase · Vercel · Multiple LLM providers  

---

## Quick Start

```bash
# Install
npm install

# Set up env (copy from Vercel or ask Rob)
cp .env.example .env.local

# Dev
npm run dev        # → http://localhost:3000

# Build
npx next build
```

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (server-side, crons) |
| `CRON_SECRET` | Auth for Vercel cron jobs |
| `FB_ADS_TOKEN` | Meta Marketing API token |
| `FB_AD_ACCOUNT_ID` | Meta ad account ID |
| `FB_APP_ID` | Meta app ID |
| `YOUTUBE_CLIENT_ID` | YouTube OAuth client |
| `YOUTUBE_REDIRECT_URI` | YouTube OAuth callback |

LLM provider keys are managed by the OpenClaw gateway (multi-provider fallback).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│                                                      │
│  /create ─────── Bank-first content generation       │
│  /ads/create ─── Bank-first ad creative factory      │
│  /batch ──────── Bulk generation                     │
│  /library ────── Saved content library               │
│  /insights ───── Performance analytics               │
│  /ads ─────────── Campaign dashboard + metrics       │
│  /settings ───── Profile, brand voice, products      │
│                                                      │
├──────────────────────┬──────────────────────────────┤
│    Content Banks     │     Knowledge Base            │
│  ┌──────────────┐    │  ┌────────────────────┐      │
│  │ topic_bank   │    │  │ knowledge_entries   │      │
│  │ hook_bank    │    │  │ (frameworks, hooks, │      │
│  │ script_bank  │    │  │  virality science,  │      │
│  └──────┬───────┘    │  │  brand rules)       │      │
│         │            │  └────────────────────┘      │
│         ▼            │                               │
│  Bank-first serving  │  LLM retrieval-augmented      │
│  (instant, free)     │  generation (fallback)        │
├──────────────────────┴──────────────────────────────┤
│                    Supabase                           │
│  33 migrations · RLS policies · Storage · Auth       │
├─────────────────────────────────────────────────────┤
│                  Vercel (Production)                  │
│  Auto-deploy from main · 3 cron jobs                 │
└─────────────────────────────────────────────────────┘
```

---

## Key Documentation

| Document | Path | What |
|----------|------|------|
| **This README** | `README.md` | Project overview, architecture, setup |
| **Content Bank System** | `docs/CONTENT-BANK.md` | Bank-first architecture, seed data, serving logic |
| **Ads System** | `docs/ADS-SYSTEM.md` | Ad campaign data flow, sync, intelligence layer |
| **LLM Battle Results** | `docs/LLM-BATTLE.md` | Model comparison for hook/script generation |
| **Status** | `STATUS.md` | Current state, recent work, blockers |
| **Roadmap** | `ROADMAP.md` | All phases with status |
| **Content Engine V2 Vision** | `specs/CONTENT-ENGINE-V2-VISION.md` | Full product vision |
| **Ads Roadmap V2** | `specs/ADS-ROADMAP-V2.md` | Ads consolidation plan (5 phases) |
| **Generation V3** | `specs/ADS-GENERATION-V3.md` | Media Buyer + Creative Director architecture |

---

## Pages & Routes

### User-Facing Pages

| Route | Purpose | Key Features |
|-------|---------|-------------|
| `/` | Home dashboard | Quick stats, recent content, navigation |
| `/create` | Content creation wizard | Bank-first script generation, 6 platforms, 10 content goals |
| `/batch` | Bulk generation | Generate multiple pieces at once |
| `/library` | Content library | Saved scripts, search, export |
| `/insights` | Performance insights | Content analytics, topic clusters |
| `/ads` | Ad campaign dashboard | Campaign tree, daily metrics, strategy map |
| `/ads/create` | Ad creative factory | Bank-first hooks, concept briefs, multi-format execution |
| `/ads/competitors` | Competitor intelligence | Competitor tracking, sentiment analysis |
| `/settings` | Business settings | Profile, brand persona, products, connections |
| `/onboarding` | First-time setup | Profile, brand, product catalog configuration |
| `/structures` | Content structures | Browse/edit proven frameworks (PASTOR, Hook-Hold-Reward, etc.) |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/create/generate` | POST | Generate content (bank-first, LLM fallback) |
| `/api/create/topics` | POST | Topic suggestions (topic_bank first, LLM fallback) |
| `/api/create/improve` | POST | Improve existing script via LLM |
| `/api/create/regenerate-block` | POST | Regenerate a single block/scene |
| `/api/create/carousel` | POST | Carousel generation |
| `/api/ads/bank` | GET | Serve hooks/scripts from bank |
| `/api/ads/bank` | POST | Update hook/script status |
| `/api/ads/bank/seed` | POST | Generate new hooks into bank via LLM |
| `/api/ads/creatives/sync` | POST | Sync ad data from Meta API |
| `/api/ads/metrics` | GET | Ad performance metrics |
| `/api/batch/generate` | POST | Bulk content generation |
| `/api/batch/save` | POST | Save batch results |
| `/api/export` | POST | Export content |
| `/api/library/save` | POST | Save content to library |
| `/api/structures` | GET | List content structures |
| `/api/knowledge/*` | CRUD | Knowledge base management |
| `/api/cron/ads-sync` | GET | Daily Meta ad sync (6AM PHT) |
| `/api/cron/competitor-refresh` | GET | Weekly competitor refresh (Mon 7AM) |
| `/api/cron/bank-fill` | GET | Nightly bank pre-generation (2AM PHT) |

---

## Database Schema (Key Tables)

### Content Banks
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `topic_bank` | Pre-generated topic suggestions | `title, goal, platform, source (seed/llm), shown, used` |
| `hook_bank` | Pre-generated hooks with freshness tracking | `hook_text, angle, persona, hook_type, quality_score, status, exclusion_hash` |
| `script_bank` | Pre-generated full scripts | `scenes (JSONB), format, angle, persona, quality_score, status` |

### Knowledge Base
| Table | Purpose |
|-------|---------|
| `knowledge_entries` | Frameworks, hooks, virality science, brand rules, angle techniques |
| `content_structures` | Proven structures (PASTOR, Hook-Hold-Reward, Full Reel Anatomy) |

### Content & Library
| Table | Purpose |
|-------|---------|
| `content_items` | Saved/generated content pieces |
| `content_calendar` | Scheduled content |
| `business_profile` | Brand info, voice, pillars |
| `brand_persona` | Character (Grace), backstory, voice notes |
| `product_catalog` | Products with prices and descriptions |

### Ads System
| Table | Purpose |
|-------|---------|
| `ad_creatives` | Synced ad creatives from Meta |
| `ad_performance` | Daily ad metrics (spend, impressions, clicks, revenue) |
| `creative_concepts` | Ad concept briefs (angle × persona) |
| `creative_hooks` | Hooks tied to concepts |
| `creative_executions` | Full ad content per hook per format |
| `meta_tokens` | Meta API tokens |

### Intelligence & Analytics
| Table | Purpose |
|-------|---------|
| `competitor_videos` | Tracked competitor content |
| `topic_clusters` | Aggregated topic performance |
| `performance_profile` | Channel performance summary |

Full migration history: `supabase/migrations/` (33 migrations)

---

## Cron Jobs (Vercel)

| Schedule | Path | Purpose |
|----------|------|---------|
| `0 22 * * *` (6AM PHT) | `/api/cron/ads-sync` | Sync Meta ad performance data |
| `0 23 * * 0` (Mon 7AM PHT) | `/api/cron/competitor-refresh` | Refresh competitor intelligence |
| `0 18 * * *` (2AM PHT) | `/api/cron/bank-fill` | Pre-generate hooks/scripts for depleted bank combos |

**Note:** Cron jobs require `CRON_SECRET` env var on Vercel.

---

## Deployment

- **Platform:** Vercel (auto-deploy from `main` branch)
- **Region:** Default (closest to user)
- **Build:** `next build` (~2 min)
- **Domain:** `gh-creative-dashboard.vercel.app`

Push to `main` → Vercel builds automatically → Live in ~2 minutes.

---

## Project History

See `ROADMAP.md` for full phase history. Key milestones:

| Date | Milestone |
|------|-----------|
| 2026-03 | Phases 0–4e complete (KB, eval, generation, ads, intelligence) |
| 2026-03-31 | Ads system audit + 5-phase fix (4e-fix A–E) |
| 2026-04-02 | KB pipeline unification (TASK-035, TASK-036) |
| 2026-04-03 | Hook & Script Bank (Option C), seed data generation |
| 2026-04-04 | Content bank seeded (1,178 hooks, 1,026 scripts, 146 topics), bank-first serving, source labels |
