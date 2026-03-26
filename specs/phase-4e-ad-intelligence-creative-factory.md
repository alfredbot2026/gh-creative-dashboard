# Phase 4e — Ad Intelligence + Creative Factory

> **Status:** SPEC_DRAFT
> **Author:** Dr. Strange
> **Date:** 2026-03-26
> **Depends on:** Phase 4d (Ad Performance Ingest)
> **Builds on:** Phase 4d spec, AD-FRAMEWORKS.md, CONTENT-ENGINE-V2-VISION.md
> **Red-team:** Required before implementation

---

## The Problem

Grace's ad account has ~12-15 ads. She needs 12-20 new creatives per week to scale to 1,000 purchases/month (currently ~250/month at ₱17k/week spend). She can't produce that volume alone — especially video. But static images, carousels, and text-overlay creatives CAN be generated.

The bigger problem: there's no strategic layer. Ads are created intuitively, not systematically. Nobody's mapping which angles have been tested, which personas are covered, what's saturating, or what gaps exist.

## The Vision

Two systems working together:

### System 1: Ad Intelligence (The Media Buyer Brain)

An audit + strategy engine that answers:
- **What do we have?** — Every ad mapped by angle, persona, framework, offer, creative type
- **What's working?** — Performance by angle/persona/framework (ROAS, CPA, CTR)
- **What's dying?** — Saturation detection (declining ROAS over time on same creative)
- **What's missing?** — Gap analysis: untested angle × persona combinations
- **What should we test next?** — Ranked recommendations with reasoning

### System 2: Creative Factory (The Agency)

A production engine that takes the buyer's recommendations and produces actual creatives:
- One angle → multiple executions (different hooks, formats, visuals)
- Static images, carousels, ad copy variants
- Uses existing tools: carousel builder, image gen, copy engine
- Grace reviews → approves → downloads/exports
- Batch mode: "Generate this week's test creatives"

---

## Data We Already Have

| Source | Status | What it gives us |
|--------|--------|-----------------|
| FB Ads daily report | ✅ Running (cron) | Campaign-level spend, purchases, CPP, CTR |
| FB Ads Python scripts | ✅ Built | Ad-level insights via Meta Marketing API |
| Content classification (IG) | ✅ Complete | Hook type, structure, topic for all IG posts |
| Content classification (YT) | ✅ Complete (1,001/1,003) | Same classifications for YouTube |
| Content classification (FB) | 🔄 In progress (868 remaining) | Same classifications for Facebook |
| Competitor data | ✅ 30 creators | Trending topics, hooks, structures |
| AD-FRAMEWORKS.md | ✅ Reference | 6 frameworks: PAS, AIDA, Before/After, Testimonial, Urgency, FAB |
| Content structures | ✅ 45 techniques seeded | Proven script structures from KB |
| Carousel builder | ✅ Built | Canvas preview, text overlay, download |
| Image generation | ✅ Built | Gemini API for static images |
| Brand identity | ✅ Built | Voice, style, Grace reference images |

## What We Need to Build

### Phase 4d (prerequisite — data foundation)
Already spec'd in `specs/phase-4d-ad-feedback-loop.md`. Summary:
- `ad_performance` table (per-ad metrics from Meta API)
- Daily sync cron pulling ad-level data
- Ad-to-content matching (boosted organic → classified content)

### Phase 4e Wave 1: Ad Creative Ingest + Classification (~4 hrs)

**Goal:** Pull every ad creative from Grace's Meta account, classify each one.

#### Meta API: Ad Creative Data
```
GET /{ad_id}?fields=creative{
  body,title,link_description,call_to_action,
  image_url,image_hash,thumbnail_url,
  object_story_spec,asset_feed_spec
}
```

For each ad we extract:
- **Copy:** headline, body text, CTA text, link description
- **Visual:** image URL (static), video thumbnail URL (video), carousel card images
- **Format:** static image, video, carousel, collection
- **Targeting context:** ad set name often encodes audience (e.g., "Retargeting - website pageviews")

#### New table: `ad_creatives`
```sql
CREATE TABLE ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  meta_ad_id TEXT NOT NULL,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  
  -- Creative content
  headline TEXT,
  body_text TEXT,
  cta_text TEXT,
  link_description TEXT,
  image_url TEXT,
  video_thumbnail_url TEXT,
  creative_format TEXT, -- 'static_image', 'video', 'carousel', 'collection'
  
  -- AI Classification (Gemini)
  angle TEXT,           -- 'pain_point', 'aspiration', 'fear', 'social_proof', 'comparison', 'education', 'urgency'
  persona TEXT,         -- 'new_mom_curious', 'returning_buyer', 'price_sensitive', 'aspirational', 'skeptic'
  framework TEXT,       -- 'PAS', 'AIDA', 'before_after', 'testimonial', 'urgency', 'FAB'
  hook_type TEXT,       -- matches content_ingest classification vocabulary
  offer_type TEXT,      -- 'discount', 'free_trial', 'value_stack', 'limited_time', 'social_proof'
  emotional_tone TEXT,  -- 'warm', 'urgent', 'educational', 'aspirational', 'fear'
  
  -- Performance (joined from ad_performance)
  total_spend DECIMAL(10,2) DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  avg_roas DECIMAL(8,4),
  avg_cpa DECIMAL(8,4),
  avg_ctr DECIMAL(6,4),
  
  -- Metadata
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, meta_ad_id)
);
```

#### AI Classification Prompt
For each ad creative, Gemini classifies:
```
Given this Meta ad creative:
- Headline: "{headline}"
- Body: "{body_text}"  
- CTA: "{cta_text}"
- Image: [image_url passed as context or described]
- Ad set: "{adset_name}" (hints at targeting)

Classify:
1. angle: What approach is this ad taking?
2. persona: Who is this targeting? (be specific to this niche)
3. framework: Which ad copy framework?
4. hook_type: What type of hook opens this ad?
5. offer_type: What's the offer/incentive?
6. emotional_tone: What emotion does this ad trigger?
```

#### API: `/api/ads/creatives/sync`
- Pulls all ads from Meta account
- For each: fetch creative details, classify with Gemini, store
- Incremental: only processes new/changed ads
- Called daily via cron or manually from UI

### Phase 4e Wave 2: Ad Account Map + Gap Analysis (~3 hrs)

**Goal:** Build the strategic view of the ad account.

#### The Ad Account Map
A matrix visualization showing:

```
             | New Mom | Returning | Price-Sensitive | Aspirational | Skeptic
-------------|---------|-----------|-----------------|--------------|--------
Pain Point   | 2 ads ✅ | 1 ad 🟡  | 0 ads ❌        | 0 ads ❌     | 0 ads ❌
Aspiration   | 1 ad 🟡 | 0 ads ❌  | 0 ads ❌        | 1 ad 🟡     | 0 ads ❌
Social Proof | 0 ads ❌ | 1 ad ✅  | 0 ads ❌        | 0 ads ❌     | 0 ads ❌
Comparison   | 0 ads ❌ | 0 ads ❌  | 0 ads ❌        | 0 ads ❌     | 0 ads ❌
Education    | 1 ad 🟡 | 0 ads ❌  | 0 ads ❌        | 0 ads ❌     | 0 ads ❌
Urgency      | 0 ads ❌ | 0 ads ❌  | 1 ad 🟡        | 0 ads ❌     | 0 ads ❌
```

Color coding:
- ✅ Has ads with positive ROAS
- 🟡 Has ads but performance is mediocre or small sample
- ❌ No ads tested in this cell — **GAP**

#### API: `/api/ads/intelligence/map`
Returns:
```json
{
  "matrix": {
    "pain_point": {
      "new_mom_curious": { "ad_count": 2, "avg_roas": 3.2, "status": "winning" },
      "returning_buyer": { "ad_count": 1, "avg_roas": 1.1, "status": "weak" },
      "price_sensitive": { "ad_count": 0, "status": "gap" }
    }
  },
  "gaps": [
    { "angle": "comparison", "persona": "new_mom_curious", "priority": "high", "reason": "Comparison ads untested but competitors use heavily" },
    { "angle": "social_proof", "persona": "skeptic", "priority": "high", "reason": "Skeptics need proof — zero ads targeting this" }
  ],
  "saturation": [
    { "angle": "pain_point", "persona": "new_mom_curious", "trend": "declining", "roas_30d": 2.8, "roas_7d": 1.9, "recommendation": "Needs fresh creative" }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "Create 3-5 comparison ads targeting new moms",
      "reason": "Zero comparison ads tested. Competitor data shows comparison hooks get 2.5x avg engagement in this niche.",
      "suggested_angles": ["Your planner vs generic planner", "Before/after organization", "Cost per use breakdown"],
      "estimated_creative_count": 5
    }
  ]
}
```

#### API: `/api/ads/intelligence/recommendations`
The media buyer brain — takes the map + performance data + competitor data and generates strategic recommendations.

Uses Gemini with context:
- Ad account map (what's tested, what's not)
- Performance by angle/persona (what works)
- Competitor creative analysis (what's trending)
- Grace's organic content performance (what resonates with her audience)
- Business context (product, price point, audience)

Output: Prioritized list of "creative briefs" — each one is a strategy recommendation that the Creative Factory can execute.

### Phase 4e Wave 3: Creative Factory — Single Ad (~4 hrs)

**Goal:** Take a recommendation → generate ready-to-use ad creatives.

#### Flow (UI)
1. User sees recommendation: "Create comparison ads for new moms"
2. Clicks "Create Ads" → enters Creative Factory
3. Factory generates:
   - 3 ad copy variants (different hooks/frameworks for the same angle)
   - Per copy variant: static image + carousel option
   - Each variant shows: headline, body, CTA, preview image
4. User can:
   - Edit copy inline
   - Regenerate image
   - Pick text overlay style
   - Download individual creatives
   - Approve all → batch download

#### API: `/api/ads/factory/generate`
Input:
```json
{
  "angle": "comparison",
  "persona": "new_mom_curious",
  "framework": "before_after",  // optional — AI picks if not specified
  "offer": "free_trial",        // optional
  "count": 3,                   // how many variants
  "formats": ["static_image", "carousel"]
}
```

Output:
```json
{
  "variants": [
    {
      "id": "v1",
      "headline": "Hindi mo kailangan ng ₱5,000 planner...",
      "body": "Dati, hindi ko rin alam kung saan mag-start...",
      "cta": "Get Started Free",
      "hook_type": "comparison",
      "framework": "before_after",
      "image_prompt": "Split image: left messy desk with scattered papers, right organized desk with colorful planner",
      "image_url": null,  // generated on demand
      "carousel_slides": null  // generated on demand
    }
  ]
}
```

#### Copy Generation
Uses existing `generateCreativeJSON` with enhanced context:
- AD-FRAMEWORKS.md for framework structure
- Business profile for brand voice
- Performance data: "Comparison hooks with Taglish get 2.5x engagement for your audience"
- Persona context: "This targets new moms who are curious but hesitant"

#### Image Generation
Uses existing Gemini image gen (`/api/studio/generate`) with:
- Brand style guide prepended
- Grace identity lock (if she's in the image)
- Ad-specific composition rules from KB

### Phase 4e Wave 4: Creative Factory — Batch Mode (~3 hrs)

**Goal:** "Generate this week's test creatives" in one click.

#### Flow (UI)
1. Dashboard shows: "This week's creative testing plan"
2. Based on recommendations, proposes:
   - Batch 1: 3 comparison ads (new mom persona) — Tuesday
   - Batch 2: 3 social proof ads (skeptic persona) — Thursday
   - Batch 3: 3 refreshed pain point ads (replace saturating ones) — Saturday
3. User can adjust the plan (swap angles, change dates, add/remove batches)
4. "Generate All" → produces all creatives for the week
5. Download as ZIP organized by batch

#### Weekly Creative Calendar
```
MON: Review last week's results (auto-generated report)
TUE: Launch Batch 1 (new angle test)
THU: Launch Batch 2 (new persona test)  
SAT: Launch Batch 3 (refresh saturating creatives)
```

This aligns with the industry standard 3-phase testing framework:
- Phase 1: Test new creatives against each other (our batches)
- Phase 2: Winners go against current BAU
- Phase 3: Scale winners

### Phase 4e Wave 5: Performance Loop + Learning (~2 hrs)

**Goal:** Close the loop — track what we generated, learn from results.

#### Auto-tracking
- Every generated creative gets a `factory_batch_id`
- When synced with Meta (after Grace uploads and creates the ad), match by image hash or copy text
- Track: which factory-generated ads performed well vs poorly

#### Learning
- Update angle/persona scoring: "Comparison + new_mom = 4.2x ROAS"
- Feed back into recommendations: next week, rank proven combos higher
- Detect creative fatigue: "This angle has been running 14 days, ROAS declining → suggest refresh"

---

## UI Design (Grace-friendly, SaaS-ready)

> Design principle: Grace should never see ROAS, CPM, or CPA unless she wants to.
> The UI translates data into decisions.

### Screen 1: Ad Dashboard (`/ads`)
```
┌─────────────────────────────────────────────────┐
│  Your Ads                                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  ✅ 4    │  │  😴 3    │  │  ❌ 2    │      │
│  │ Working  │  │  Tired   │  │  Kill    │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  💡 3 new ad ideas ready for you                │
│  [Create This Week's Ads →]                     │
│                                                  │
│  ┌─ What's Working ──────────────────────────┐  │
│  │ "Hindi mo kailangan..." — Comparison ad   │  │
│  │ ₱142 per purchase · Running 8 days        │  │
│  │ 🟢 Keep running                           │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Needs Attention ─────────────────────────┐  │
│  │ "Graduation season..." — Getting tired     │  │
│  │ Cost went up 40% this week                │  │
│  │ 🟡 Consider refreshing  [Make New Version]│  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ What's Missing ──────────────────────────┐  │
│  │ You've never tested: social proof ads     │  │
│  │ Your competitors use them a lot            │  │
│  │ 💡 [Create Social Proof Ads →]            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Screen 2: Ad Account Map (`/ads/strategy`)
```
┌─────────────────────────────────────────────────┐
│  Your Ad Strategy Map                            │
│                                                  │
│  Each cell = an angle × audience combo           │
│  ✅ = tested & working  🟡 = tested, meh        │
│  ❌ = never tested (opportunity!)                │
│                                                  │
│  [visual matrix grid — interactive]              │
│  Click any cell to see ads or create new ones    │
│                                                  │
│  Coverage: 4/30 cells tested (13%)              │
│  "You have a lot of room to explore!"           │
│                                                  │
│  Top recommendation:                             │
│  "Try comparison ads for hesitant first-timers  │
│   — competitors are winning with this combo"     │
│  [Create These Ads →]                           │
└─────────────────────────────────────────────────┘
```

### Screen 3: Creative Factory (`/ads/create`)
```
┌─────────────────────────────────────────────────┐
│  Create New Ads                                  │
│                                                  │
│  Strategy: Comparison ads for new moms          │
│  "Show them why your planner is different"       │
│                                                  │
│  ┌─ Variant 1 ──────────────────────────────┐  │
│  │ [Image preview]  "Hindi mo kailangan..."  │  │
│  │                  Body text here...         │  │
│  │                  [Edit] [Regenerate]       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Variant 2 ──────────────────────────────┐  │
│  │ [Image preview]  "Ang pinagkaiba ng..."   │  │
│  │                  Body text here...         │  │
│  │                  [Edit] [Regenerate]       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Variant 3 ──────────────────────────────┐  │
│  │ [Image preview]  "Before vs After..."     │  │
│  │                  Body text here...         │  │
│  │                  [Edit] [Regenerate]       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [Download All]  [Create Carousel Versions]     │
└─────────────────────────────────────────────────┘
```

### Screen 4: Weekly Planner (`/ads/weekly`)
```
┌─────────────────────────────────────────────────┐
│  This Week's Creative Plan                       │
│                                                  │
│  Based on your ad performance + gaps:            │
│                                                  │
│  Tuesday — Test Batch 1                         │
│  ┌─ 3 comparison ads (new mom audience) ─────┐  │
│  │ ✅ Generated  [Preview] [Download]        │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Thursday — Test Batch 2                        │
│  ┌─ 3 social proof ads (skeptic audience) ───┐  │
│  │ ⏳ Not yet  [Generate Now]                │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Saturday — Refresh                             │
│  ┌─ 3 new versions of tired ads ─────────────┐  │
│  │ ⏳ Not yet  [Generate Now]                │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [Generate All Batches] [Adjust Plan]           │
└─────────────────────────────────────────────────┘
```

---

## Implementation Order

### Prerequisites (from Phase 4d)
1. `ad_performance` table + Meta Ads sync (ad-level, not just campaign)
2. Daily performance sync cron

### Wave 1: Ad Creative Ingest + Classification (~4 hrs)
- `ad_creatives` table + migration
- `/api/ads/creatives/sync` — pull from Meta API + Gemini classification
- Manual trigger from Settings page

### Wave 2: Ad Account Map + Gap Analysis (~3 hrs)
- `/api/ads/intelligence/map` — build the matrix
- `/api/ads/intelligence/recommendations` — media buyer brain
- UI: `/ads` dashboard + `/ads/strategy` map

### Wave 3: Creative Factory — Single Ad (~4 hrs)
- `/api/ads/factory/generate` — angle + persona → variants
- UI: `/ads/create` — review, edit, regenerate, download
- Connects to existing image gen + carousel builder

### Wave 4: Batch Mode + Weekly Planner (~3 hrs)
- `/api/ads/factory/batch` — generate week's creatives
- UI: `/ads/weekly` — plan, generate, download
- ZIP export

### Wave 5: Performance Loop (~2 hrs)
- Match factory-generated creatives to live ads
- Update angle/persona scoring
- Creative fatigue detection

**Total estimate: ~16 hrs across 5 waves**
**Blocked on: Phase 4d (ad data ingest) being complete first**

---

## Risks + Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Only 12-15 ads = thin data for classifications | Medium | Use competitor data + KB frameworks to supplement |
| Gemini image quality for ads | Medium | Generate multiple, let Grace pick. Static images work better than AI video. |
| Meta API rate limits on creative fetch | Low | Only ~15 ads, well within limits |
| Classification accuracy on small sample | Medium | Manual review UI for Grace to correct classifications |
| Creative fatigue detection with 4mo data | Medium | Start simple (ROAS trend over 7d windows), refine with more data |
| SaaS users won't have competitor data | Medium | System works without it, competitor data is bonus layer |

---

## SaaS Considerations

Since this will become a paid service:
- All UI must be self-explanatory (no "media buyer" jargon visible to user)
- Onboarding: connect Meta Ads → auto-sync → classify → show map → first recommendation in < 5 min
- Multi-tenant: `user_id` on all tables, RLS enforced
- Pricing hook: "Your first 3 creative batches are free" → show the value before paywall
- The Ad Account Map is the "aha moment" — "I didn't know I was missing all these angles"
