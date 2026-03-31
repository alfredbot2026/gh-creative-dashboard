# Ads System — Roadmap V2

> **Created:** 2026-03-31  
> **Context:** Post-audit rewrite. Previous roadmap (Phase 4d/4e) was built incrementally  
> and produced fragmented results. This roadmap consolidates everything based on the  
> [full audit](../docs/ADS-AUDIT-2026-03-31.md) and Rob's original vision:  
>  
> _"We're creating a media buyer company + a creative company that creates the missing  
> ads based on the media buyer brain. All of this comes from our research."_  

---

## UI/UX Principles (apply to ALL ads pages)

1. **One source of truth.** Every page pulls from the same data. If `/ads` shows 25 winning ads, `/ads/create` shows 25. No conflicting numbers.

2. **Data flows down: daily → aggregated → displayed.** The `ad_performance` daily rows are truth. Everything else is derived. If daily data is missing for an ad, that ad shows "No data" — not phantom numbers.

3. **Think like a media buyer, speak like a friend.** Internal logic uses ROAS/CPA/CTR. UI translates: "This ad made ₱4 for every ₱1 spent" not "ROAS 4.0x". But power-user detail is available on expand/click.

4. **Every insight leads to an action.** "This angle is untested" → Create button. "This ad is fatiguing" → Refresh button. "Competitors use comparison" → Counter button. No dead-end insights.

5. **Show what you have before asking what to create.** The user should understand their current ad account before the system recommends new creatives. Context first, generation second.

6. **One page per job.** `/ads` = understand your account. `/ads/create` = make new ads. Don't make `/ads` do both poorly. But link them tightly.

7. **Stale data is labeled.** If daily data is >48h old, show a banner: "Data last synced 5 days ago" with a Sync button. Don't silently show old numbers.

8. **No legacy code paths.** One generation engine. One sync flow. One data source. If something is superseded, remove it — don't leave it accessible.

---

## Current State (Post-Audit)

### What Works
- ✅ Meta sync: fetches 50 ads, classifies 6 dimensions, stores in `ad_creatives`
- ✅ Daily performance: 882 rows across 39 ads in `ad_performance`
- ✅ Campaign tree UI: Campaign → Ad Set → Ad with daily-aggregated metrics
- ✅ Period selector, filters, inline classification correction
- ✅ Business-aware thresholds from product_catalog
- ✅ Objective-aware metrics (Sales=ROAS, Engagement=Cost/Conv, Awareness=CPM)
- ✅ Strategy map (angle × persona matrix)
- ✅ Creative Factory V2 (concept → hooks → format executions)
- ✅ KB-backed video scripts
- ✅ Competitor intelligence (15 competitors, 11 ads)
- ✅ LLM provider tracking + logging

### What's Broken
- ❌ 11 ads have denormalized spend/ROAS but ZERO daily rows (phantom data)
- ❌ Strategy map + create page use phantom data (different numbers from audit page)
- ❌ Daily data 5 days stale, no cron
- ❌ Legacy factory engine (ad_factory_batches/variants) still accessible via /ads/weekly
- ❌ `/ads/weekly` calls legacy factory, not V2
- ❌ `/insights/ads` is yet another ads page (4th view of same data)
- ❌ `/create/ads` is a 5th ad creation flow (separate from `/ads/create`)
- ❌ Recommendations scattered across 4 pages

### Page Inventory (ads-related)
| Page | Purpose | Status |
|------|---------|--------|
| `/ads` | Main dashboard (re-exports audit) | ⚠️ Data-correct but no intelligence layer |
| `/ads/audit` | Campaign tree + daily metrics | ✅ Working, accurate |
| `/ads/strategy` | Angle × Persona matrix | ⚠️ Uses wrong data source |
| `/ads/create` | Creative Factory V2 | ⚠️ Shows phantom ROAS numbers |
| `/ads/weekly` | Weekly planner | ❌ Uses legacy factory engine |
| `/ads/competitors` | Competition + sentiment | ⚠️ Stale data, no auto-refresh |
| `/insights/ads` | Another ad view | ❌ Redundant |
| `/create/ads` | Another ad creation page | ❌ Redundant with /ads/create |

---

## Roadmap

### Phase A: Data Integrity (P0) — ~4 hrs

> **Goal:** Make the numbers trustworthy. Every metric shown is derived from daily data.

#### A1. Fix phantom performance data
- Investigate WHY 11 ads have denormalized spend but no daily rows
- If Meta doesn't report daily data for engagement ads → clear the denormalized fields (set to 0/null)
- Rule: `ad_creatives.total_spend` is ONLY set from aggregating `ad_performance` rows. Never from Meta ad-level insights directly.
- Add validation: if an ad has spend > 0 but zero daily rows, flag it as "unverified"

#### A2. Sync fresh daily data
- Run a full Meta sync now (backfill missing days)
- Ensure engagement campaign ads get daily rows (or document why they don't)

#### A3. Unify data source
- Strategy map (`/api/ads/intelligence/map`) → compute metrics from `ad_performance` daily rows, not `ad_creatives` denormalized fields
- Angle coverage (`/api/ads/angle-coverage`) → same: use daily data
- Weekly plan (`/api/ads/weekly-plan`) → same

#### A4. Staleness banner
- If latest `ad_performance.date_start` is >48 hours ago, show banner on all ads pages: "Ad data last synced [date]. [Sync Now]"
- Show sync age next to metrics

**Deliverable:** All ads pages show the same numbers. Phantom data eliminated.

### Phase B: Consolidation (P0-P1) — ~3 hrs

> **Goal:** Remove fragmentation. One engine, one flow, fewer pages.

#### B1. Kill legacy factory
- Remove `/ads/weekly` page entirely (or rebuild on V2 — see Phase D)
- Deprecate `/api/ads/factory/*` endpoints (generate, batch, track)
- Keep `ad_factory_batches` and `ad_factory_variants` tables but mark as archived
- Remove any nav links to `/ads/weekly`

#### B2. Remove redundant pages
- Delete `/insights/ads` (redundant with `/ads`)
- Delete `/create/ads` page OR redirect to `/ads/create`
- Update any internal links pointing to these pages

#### B3. Remove `/ads/audit` as separate page
- `/ads` already re-exports audit. Remove `/ads/audit` as a standalone route.
- Keep the component file — `/ads` imports it.
- Update all links that point to `/ads/audit` → `/ads`

#### B4. Clean up nav
- Sidebar: `/ads` stays. No sub-nav for strategy/competitors — those are linked from within `/ads`.
- `/ads/create` linked prominently from `/ads` header + recommendation CTAs

**Deliverable:** 3 ads pages total: `/ads` (dashboard), `/ads/create` (factory), `/ads/competitors` (intel). Everything else gone.

### Phase C: Intelligence Layer (P1-P2) — ~6 hrs

> **Goal:** The /ads page becomes the command center. Shows what you have, what's working,  
> what's dying, what's missing — with action buttons for each.

#### C1. Redesign `/ads` page layout
Top-to-bottom:
1. **Health Bar** — Account-level metrics (spend, ROAS, purchases, convos) + staleness indicator
2. **Action Cards** — 3-5 cards: "2 ads fatiguing → Refresh", "3 angles untested → Explore", "Top performer → Scale". Each links to `/ads/create` pre-configured.
3. **Strategy Map (inline)** — Small version of the angle × persona matrix embedded. Not a separate page. Click cell → go to `/ads/create` with that angle+persona.
4. **Campaign Tree** — Existing audit view. Collapsible. This is the detail layer.
5. **Competitor Signal** — Small section: "Competitors use pain_point heavily. You're winning there. They don't use comparison — opportunity." Links to `/ads/competitors`.

#### C2. Action cards API
- New endpoint: `GET /api/ads/actions` — returns top 3-5 recommended actions
- Each action: type (refresh/explore/scale/kill), target (angle+persona), reason, urgency, linked_ad_ids
- Computed from: daily metrics, fatigue detection, strategy map gaps, competitor data
- All data from daily rows (consistent with audit numbers)

#### C3. Inline strategy map
- Compact 5×5 matrix (top angles × top personas only)
- Same data source as campaign tree (daily data)
- Click cell → navigate to `/ads/create?angle=X&persona=Y&mode=explore|scale`

#### C4. Competitor signal section
- Pull top 3 insights from competitor data
- Format: plain-language observations + action buttons
- "Competitors focus on [pain_point]. You're strong there. They don't use [comparison] — try it → [Create]"

**Deliverable:** `/ads` is a one-stop command center. User lands here, sees what to do, clicks a button, lands in create with everything pre-filled.

### Phase D: Generation Refinement (P2) — ~4 hrs

> **Goal:** The creative factory produces better output, faster, and integrates  
> seamlessly with the intelligence layer.

#### D1. Show winning patterns in Scale mode
- When user selects Scale, show: "Your top ads for this angle:" with actual ad thumbnails/text
- "The AI will create new variations that follow the same emotional logic but different hooks"
- Make Scale mode feel like it's actually learning from your winners

#### D2. Concept history
- `/ads/create` shows previously generated concepts at the bottom
- Can revisit, re-edit, or regenerate from an existing concept
- Prevents duplicate generation

#### D3. Fix carousel routing
- "Build in Studio" on carousel executions → routes to the correct carousel builder
- One carousel flow, not two

#### D4. Generation speed
- Show progress per hook (not just a single spinner)
- Consider: generate hooks first, show them, THEN expand to formats on demand ("Generate Images" button per hook)
- Avoids the 2+ minute wait before seeing anything

#### D5. Weekly planner (rebuilt on V2)
- If we want a weekly view: rebuild as a section on `/ads/create` or `/ads`
- Uses Creative Tree V2 engine, not legacy factory
- "This week's plan" with Tue/Thu/Sat batches
- Based on /api/ads/actions recommendations

### Phase E: Automation + Freshness (P2) — ~2 hrs

> **Goal:** Data stays fresh without manual intervention.

#### E1. Daily sync cron
- OpenClaw cron or Vercel cron: daily sync of `ad_performance` from Meta
- Also refreshes `ad_creatives` status (is_active, ad_status recalculation)
- Runs at 6am PHT daily

#### E2. Weekly competitor refresh
- OpenClaw cron: weekly Ad Library scrape for tracked competitors
- Updates `competitor_ads` and `competitor_snapshots`

#### E3. Fatigue auto-detection
- After daily sync: check all active ads for declining ROAS trend
- If an ad transitions winning → tired → dead, it shows in the Action Cards on `/ads`
- No manual check needed

---

## Page Architecture (Target State)

```
/ads                          ← Command center (health + actions + strategy map + campaign tree)
/ads/create                   ← Creative factory (generate concepts → hooks → formats)
/ads/competitors              ← Competition + sentiment intel
```

That's it. Three pages.

- `/ads/strategy` → absorbed into `/ads` as inline matrix
- `/ads/weekly` → removed (rebuilt as section in /ads or /ads/create)
- `/ads/audit` → IS `/ads` (already merged)
- `/insights/ads` → removed (redundant)
- `/create/ads` → removed (redundant with /ads/create)

---

## Data Architecture (Target State)

```
Meta Ads API
    │
    ▼ (daily sync cron)
ad_performance (daily rows)     ← SINGLE SOURCE OF TRUTH
    │
    ├──▶ /api/ads/metrics       ← aggregates daily rows per ad + period
    ├──▶ /api/ads/actions       ← computes recommended actions
    ├──▶ ad_creatives.total_*   ← denormalized (derived from daily rows ONLY)
    │
    ▼
/ads page                       ← reads from /api/ads/metrics + /api/ads/actions
/ads/create                     ← reads from /api/ads/angle-coverage (from daily data)
/ads/competitors                ← reads from competitors + competitor_ads tables
```

No page reads directly from `ad_creatives` denormalized fields for metrics. Those fields exist for convenience/caching but are always computed from `ad_performance`.

---

## Milestones

| Phase | Est. Hours | What Changes for User |
|-------|------------|----------------------|
| A: Data Integrity | ~4 hrs | Numbers become trustworthy |
| B: Consolidation | ~3 hrs | Fewer pages, no confusion |
| C: Intelligence | ~6 hrs | /ads tells you what to do |
| D: Generation | ~4 hrs | Better creative output + history |
| E: Automation | ~2 hrs | Data stays fresh automatically |
| **Total** | **~19 hrs** | **Complete ads command center** |

---

## Open Questions for Rob

1. **Weekly planner** — Do we want it as a section on `/ads` or `/ads/create`? Or kill it entirely and just rely on the Action Cards?
2. **Competitor page** — Keep as separate page or absorb key insights into `/ads` Action Cards section?
3. **Strategy map** — Inline on `/ads` (compact version) or keep as a link to full page?
4. **Generation approach** — Should we generate everything upfront (current: wait 1-2 min) or show hooks first, then generate formats on-demand?
