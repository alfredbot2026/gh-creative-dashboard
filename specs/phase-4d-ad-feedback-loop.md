# Phase 4d — Ad Performance Feedback Loop

> Close the loop: organic content → classify → run as ad → track real performance → feed back → generate better content.

## Context

Ryan Mathews (YouTube) documented building exactly this pipeline using Meta Ads API + Hyros + Claude. His key findings:
- Best-performing organic content (by **saves**, not views) converts best as ads
- One content-first ad produced 12.43x ROAS vs traditional ads
- The feedback loop (ad results → AI scoring → better generation) is the competitive moat
- He plans to add competitor content analysis — we already have this (Phase 4c)

**Our advantage:** We already have 3-platform ingest, Gemini classification, performance correlation, competitive intelligence, and 45 KB-sourced structures. We're missing the ad spend ↔ content correlation.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Organic Content  │────▶│  Classification   │────▶│  Performance     │
│  (IG/FB/YT)       │     │  (Gemini)         │     │  Correlation     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Ad Performance   │────▶│  Ad ↔ Content     │────▶│  Generation      │
│  (Meta Ads API)   │     │  Correlation      │     │  (weighted by    │
└──────────────────┘     └──────────────────┘     │  real ROAS)      │
         ▲                                         └──────────────────┘
         │                                                  │
         └──────────────── feedback loop ◀──────────────────┘
```

## Wave 1: Ad Performance Ingest (~2 hrs)

### Database
```sql
-- New table
CREATE TABLE ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content_item_id UUID REFERENCES content_items(id),  -- nullable until matched
  
  -- Meta Ads identifiers
  meta_ad_id TEXT NOT NULL,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  
  -- Source content matching
  source_post_id TEXT,           -- IG/FB post ID if content-first ad
  source_post_url TEXT,          -- For manual matching
  ad_creative_url TEXT,          -- The actual creative URL
  
  -- Metrics (daily granularity)
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(6,4),              -- click-through rate
  cpc DECIMAL(8,4),              -- cost per click
  cpm DECIMAL(8,4),              -- cost per 1000 impressions
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(8,4),             -- return on ad spend
  cpa DECIMAL(8,4),              -- cost per acquisition
  
  -- Engagement (ad-specific)
  video_views INTEGER DEFAULT 0,
  video_views_p25 INTEGER DEFAULT 0,
  video_views_p50 INTEGER DEFAULT 0,
  video_views_p75 INTEGER DEFAULT 0,
  video_views_p100 INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  
  -- Classification (inherited from content_items or re-classified)
  hook_type TEXT,
  structure_slug TEXT,
  content_goal TEXT,
  topic TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, meta_ad_id, date_start)
);

-- RLS
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own ad data" ON ad_performance
  FOR ALL USING (tenant_id = current_tenant_id());

-- Index for correlation queries
CREATE INDEX idx_ad_perf_structure ON ad_performance(structure_slug, roas);
CREATE INDEX idx_ad_perf_hook ON ad_performance(hook_type, roas);
CREATE INDEX idx_ad_perf_content ON ad_performance(content_item_id);
```

### API Route: `/api/ads/sync`
- Uses existing FB Ads skill (`gws` or direct Meta Marketing API)
- Pulls last 90 days of ad performance data
- Matches ads to content_items by:
  1. Post ID match (if ad was boosted organic post)
  2. URL match (if ad creative links to same content)
  3. Manual match (UI for unmatched ads)
- Runs on cron: daily sync

### API Route: `/api/ads/performance`
- GET: Returns ad performance data with filters
- Params: date_range, structure_slug, hook_type, content_goal, min_roas
- Joins with content_items for full classification data

## Wave 2: Saves-Weighted Scoring (~1 hr)

### Changes to `lib/analytics/performance-scoring.ts`
```typescript
// Current weights (approximate)
const WEIGHTS = {
  views: 1,
  likes: 2,
  comments: 3,
  shares: 4,
  saves: 3,  // CURRENT
}

// New weights (saves = best ad conversion predictor)
const WEIGHTS = {
  views: 1,
  likes: 2,
  comments: 3,
  shares: 4,
  saves: 9,  // 3x boost — Hormozi data shows saves predict ad conversion
}
```

### Changes to `/insights/[id]` detail page
- Show saves count prominently (currently buried or not shown)
- Add "Ad Potential" badge: posts with high saves flagged as "Strong ad candidate"
- Sort/filter by saves in `/insights` list view

## Wave 3: Ad ↔ Content Correlation Dashboard (~3 hrs)

### New UI: `/insights/ads` 
(or new tab within existing `/insights`)

**Section 1: Overview**
- Total ad spend (period)
- Average ROAS
- Best/worst performing ad
- Content-first ads vs traditional ads comparison

**Section 2: Structure Performance as Ads**
- Table: structure_slug → avg ROAS, avg CPA, avg CTR, sample_size
- Bar chart: which structures convert best as ads
- Insight: "PASTOR ads average 4.2x ROAS vs PAS at 2.1x"

**Section 3: Hook Performance as Ads**
- Same breakdown by hook_type
- "Curiosity Gap hooks have 40% lower CPA than Tutorial Preview hooks"

**Section 4: Best Organic → Ad Candidates**
- Posts with high saves + high engagement but NOT yet run as ads
- Ranked by "predicted ad potential" score
- One-click: "Boost this post" (link to Meta Ads Manager)

**Section 5: Content-First Ad Pipeline**
- Recent ads matched to organic content
- Side-by-side: organic metrics vs ad metrics
- Which organic posts "survived" as ads (positive ROAS) vs flopped

## Wave 4: Feedback into Generation (~2 hrs)

### Changes to `/api/create/generate/route.ts`
When generating new scripts, inject ad performance context:

```typescript
// Pull top-performing ad patterns
const adContext = await getAdPerformanceContext(tenant_id)

// Inject into system prompt
const adInsights = `
AD PERFORMANCE DATA (from Grace's actual ads):
- Best-converting structures: ${adContext.topStructures.join(', ')}
- Best-converting hooks: ${adContext.topHooks.join(', ')}
- Topics that convert as ads: ${adContext.topTopics.join(', ')}
- Average ROAS by structure: ${adContext.roasByStructure}

When generating content, prefer patterns that have proven ad conversion data.
If the user's goal is "sell" or "announce", heavily weight ad-proven patterns.
`
```

### Changes to quality gate (`lib/eval/quality-gate.ts`)
- New check: "ad_conversion_potential"
- If structure/hook combo historically underperforms as ads, flag it
- Suggest alternatives that convert better

### Changes to structure recommendation
- When showing structures in `/create` wizard, add "🔥 Top ad converter" badge
- Sort structures by ad ROAS when goal is "sell"

## Wave 5: Synthetic Audience Testing (Future)

### Concept
Build AI personas from:
1. Grace's engagement data (comments, DMs patterns)
2. **Chatbot conversation data** (buying triggers, objections, FAQ)
3. Customer demographic data (if available)

### Implementation
- `/api/create/test-audience` — takes a script, returns predicted scores per persona
- Each persona has: demographic, buying triggers, deal breakers, "scam detectors"
- AI scores: "Would this persona click? Would they buy? What would turn them off?"
- Surface in UI: "Tested against 5 customer personas → 4/5 would engage"

**Blocked on:** Phase 4e (chatbot data integration) for richer personas

## Dependencies
- Phase 3.5 ✅ (classified content with organic metrics)
- FB Ads skill ✅ (exists, needs wiring)
- Phase 4c ✅ (competitive intelligence for benchmarking)
- Meta Ads API access (Grace needs ad account connected — already has Meta OAuth from TASK-041)

## Success Criteria
- [ ] Grace can see which of her organic content performs best as ads
- [ ] Generation engine weights ad-proven patterns higher
- [ ] "Saves" prominently shown and weighted in scoring
- [ ] Dashboard shows ROAS breakdown by structure/hook/topic
- [ ] At least 10 ads matched to classified organic content
