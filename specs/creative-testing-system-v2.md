# Creative Testing System V2 — Spec

> **Status:** SPEC_DRAFT — awaiting Rob review
> **Author:** Dr. Strange
> **Date:** 2026-03-27
> **Context:** Replaces the flat "generate 3 variants" factory with a proper creative testing system

---

## The Problem with V1

The current factory generates 3 text variants for a given angle × persona. That's not how ads are tested. It produces different angles disguised as "variations" and doesn't map to how Grace or Ian would actually deploy creatives.

## How Ads Are Actually Tested (2026 Meta)

From industry research (Foxwell Digital, Pilothouse 3-3-3, Ben & Vic 3-phase framework):

1. **A "concept" = one angle + one core message.** Not 3 different angles.
2. **Variations = same message, different executions.** Different hooks, different formats, different visual treatments — but the SAME core message.
3. **Meta's Andromeda algorithm penalizes redundancy** — creatives that look too similar get clustered (Lattice system) and compete against each other. Variations need to be visually/formatically distinct.
4. **Testing cadence:** 1-3 batches per week, 3-5 ads per batch. Each batch tests ONE variable (hook, format, or visual style).
5. **Winners get iterated, not replaced.** A winning hook gets new visual treatments, new CTAs, new format adaptations — not a new hook.

## The Creative Hierarchy

```
CONCEPT (one angle × one persona × one core message)
│
├── HOOK VARIATION 1 (different opening, same message)
│   ├── Format: High-quality video script
│   ├── Format: UGC/selfie video script
│   ├── Format: Static image ad
│   ├── Format: Carousel (4-6 slides)
│   └── Format: IG carousel with text titles
│
├── HOOK VARIATION 2 (different opening, same message)
│   ├── Format: High-quality video script
│   ├── Format: UGC/selfie video script
│   ├── Format: Static image ad
│   └── Format: Carousel
│
└── HOOK VARIATION 3 (different opening, same message)
    ├── Format: Static image ad
    └── Format: Carousel
```

**Critical rule:** All hook variations must share the SAME core message, SAME angle, SAME persona. The only thing changing is:
- The opening line / hook phrasing
- The specific proof points highlighted
- The visual treatment

They should NOT drift into different angles. If the concept is "Education × New Mom," every variation must be educational content targeting new moms — not transformation or aspiration pretending to be education.

## What Stays the Same vs What We Rebuild

### ✅ Stays (already built, works well)
- Strategy map (angle × persona grid) — entry point for "what to test"
- Ad classification system (6 dimensions)
- Business-aware thresholds (from product catalog)
- Competitor intelligence + sentiment
- Brand voice + product context loading

### 🔄 Rebuild (the creative factory)
- The generation flow: concept → hook variations → format expansions
- The UI: shows a creative tree, not flat cards
- The weekly planner: recommends concepts to test, not random angle/persona combos
- Variation control: ensures variations stay on-concept

## The New Creative Flow

### Step 1: Concept Selection

Grace opens the strategy map. She sees:
- **Winning angles** (green): Education × New Mom (9.7x ROAS), Urgency × Beginner (36x ROAS)
- **Untested gaps** (red): Comparison × New Mom, Curiosity × New Mom
- **Fatiguing** (yellow): Transformation × Price Sensitive (declining)

She clicks a cell. Two paths:

**Path A — Explore:** "Comparison × New Mom has never been tested. Create test batch."
**Path B — Scale:** "Education × New Mom is winning at 9.7x. Create fresh variations."

### Step 2: Concept Brief

The system generates (or pre-generates) a **Concept Brief**:

```
CONCEPT: Education × New Mom Curious
CORE MESSAGE: Papers to Profits teaches complete beginners how to start 
              a home-based printing business step-by-step
PRODUCT: Papers to Profits (₱1,300, lifetime access, 20+ videos, templates)
PERSONA CONTEXT: Moms 25-45, time-poor, wants income from home, overwhelmed 
                 by options, needs simple step-by-step guidance
TONE: Warm, encouraging, Taglish
FRAMEWORK: FAB (Features-Advantages-Benefits) — proven for this angle
PROOF POINTS TO USE (pick 2-3 per variation):
  - 20+ recorded video lessons
  - Lifetime access, one-time payment
  - Templates worth ₱5,000+
  - Private community + weekly live classes
  - Partner printer access (no equipment needed)
  - "Thousands have already started"
COMPETITOR CONTEXT: Competitors use pain_point. Education angle is DIFFERENTIATED.
COMPLIANCE: No income claims, no false scarcity, no "guaranteed"
```

This brief is the anchor. Every variation must serve this brief.

### Step 3: Hook Variations (same message, different openings)

The system generates 3-5 hook variations, all staying within the concept:

```
Hook 1 (Question): "Alam mo ba na may negosyo na pwede mong simulan 
                     kahit nasa bahay ka lang?"

Hook 2 (How-to): "Paano magsimula ng printing business sa bahay — 
                   kahit wala kang experience"

Hook 3 (Social proof): "Join the 1,000+ moms na kumikita na habang 
                         nasa bahay gamit ang simpleng papel at printer"

Hook 4 (Direct benefit): "20+ video lessons, lifetime access, ₱1,300 lang — 
                           start your printing business this weekend"
```

Each hook is different but ALL serve the Education × New Mom concept. None drift into Transformation or Urgency angles.

### Step 4: Format Expansion

For each hook, the system generates format-specific versions:

**Static Image Ad:**
- Headline + body text + CTA + image prompt
- Image: warm tones, Filipina mom, paper products, home setting

**Carousel:**
- 4-6 slides, each building the FAB narrative
- Slide 1: Hook (the question/claim)
- Slide 2: Feature (what's inside)
- Slide 3: Advantage (why it works)
- Slide 4: Benefit (the outcome)
- Slide 5: CTA + offer details

**High-Quality Video Script:**
- Full script with scene directions, B-roll notes
- Opening hook (first 3 seconds) = the hook variation
- 30-60 second format
- Professional lighting/setup assumed

**UGC/Selfie Video Script:**
- Same core script, adapted for phone selfie delivery
- More conversational, less polished
- "Hey momshie!" energy
- 15-30 second format

**IG Carousel Titles:**
- 5-7 slides, each with a title + short body
- Swipe-through educational format
- Same content as the ad carousel but optimized for organic + boosted

### Step 5: Batch Assembly

Grace reviews the creative tree and picks 3-5 for this week's test batch:
- Maybe Hook 1 as static image + carousel
- Hook 3 as UGC video
- Hook 4 as high-quality video

That's 4 ads, one batch, ONE concept being tested with different executions.

### Step 6: Results → Iteration

After 7 days:
- Hook 3 (social proof) got the best CTR and conversations
- Static image performed better than carousel
- UGC video outperformed high-quality video

**Next iteration:**
- Keep Hook 3 (winning hook)
- Generate NEW variations of Hook 3:
  - Same social proof hook, but with different proof points ("2,000+ moms" vs "moms from all over the Philippines")
  - Same hook, different CTA (Sign Up vs Send Message)
  - Same hook, different visual treatment
  - Same hook, but as a carousel now (test format again)

The winning hook becomes a "proven hook" for this angle. The system tracks which hooks are proven and suggests iterating on them.

## Pre-Generation (Token Efficiency)

Rob's point: don't generate everything from scratch every time.

**What can be pre-built (stored in DB):**
- Concept briefs per angle × persona (generated once, reused)
- Hook templates per framework (PAS hooks, AIDA hooks, etc.)
- Proof point library (from product catalog, updated when product changes)
- Body templates per framework (PAS structure, FAB structure, etc.)
- Format-specific rules (video = spoken word, static = text copy, carousel = slide-by-slide)

**What needs LLM at generation time:**
- Filling hook templates with specific details (the creative part)
- Adapting body templates to the selected hook + proof points
- Image prompts (need to be specific to the hook/message)

**Token cost reduction:**
- Pre-build concept briefs: ~500 tokens each, done once per angle × persona
- Hook generation: ~200 tokens per hook (just fill in template)
- Format expansion: ~300 tokens per format (apply format rules to hook + body)
- Total per batch: ~2,000 tokens vs current ~4,000 tokens

## Weekly Planner (Recommendation Engine)

The weekly planner recommends 1-3 concepts to test based on:

1. **Strategy map gaps** — untested combos with strategic potential
2. **Winning angles ready for iteration** — proven concepts that need fresh hooks
3. **Fatiguing creatives** — ads with rising frequency that need replacement
4. **Competitor signals** — angles competitors aren't using (differentiation opportunity)
5. **Market sentiment** — trending topics or shifting interest

Output:
```
THIS WEEK'S CREATIVE PLAN

Batch 1 (Tuesday): SCALE — Education × New Mom
  Reason: 9.7x ROAS, proven angle. Frequency 2.8 — needs fresh creatives.
  Suggested: 3 new hook variations of the winning hook, deployed as 
             1 static + 1 carousel + 1 UGC video

Batch 2 (Thursday): EXPLORE — Comparison × New Mom  
  Reason: Never tested. Competitors don't use it. Your audience loves 
          "before/after" content organically.
  Suggested: 2 hook variations, deployed as 2 static + 1 carousel

Batch 3 (Saturday): ITERATE — Urgency × Beginner (winning hook refresh)
  Reason: 36x ROAS but only 1 ad. Need more data. Test same hook 
          in new formats.
  Suggested: Same winning hook, 1 high-quality video + 1 UGC video + 1 static
```

## What's Missing from V1 That This Adds

| V1 (current) | V2 (this spec) |
|---|---|
| Generates 3 random variants | Generates a structured creative tree |
| Variants drift across angles | All variations stay on-concept |
| No hook tracking | Tracks which hooks win per angle |
| No iteration flow | Winners get iterated, not abandoned |
| Generate from scratch every time | Pre-built concept briefs + templates |
| Weekly planner = 3 random batches | Weekly planner = strategic recommendations |
| One format per generation | Multiple formats per hook |
| No distinction between explore/scale | Explicit explore vs scale modes |
| No concept brief | Concept brief anchors all variations |
| No winning hook memory | Proven hooks tracked and reused |

## Data Model Changes

### New: `creative_concepts` table
```
- id, user_id
- angle, persona
- core_message (the anchor)
- concept_brief (JSON: persona context, proof points, tone, framework)
- status: 'draft' | 'testing' | 'proven' | 'fatigued'
- created_at, updated_at
```

### New: `creative_hooks` table
```
- id, concept_id
- hook_text (the opening line)
- hook_type (question, how_to, social_proof, direct_benefit, story_opening)
- status: 'draft' | 'testing' | 'winner' | 'loser'
- test_results: JSON (CTR, CPA, conv rate when tested)
- created_at
```

### New: `creative_executions` table
```
- id, hook_id, concept_id
- format: 'static_image' | 'carousel' | 'video_hq' | 'video_ugc' | 'ig_carousel'
- content: JSON (headline, body, slides, script, image_prompt, etc.)
- image_url (generated image if static)
- status: 'draft' | 'approved' | 'deployed' | 'tested'
- meta_ad_id (linked to actual Meta ad when deployed)
- performance: JSON (linked metrics after testing)
- created_at
```

## Implementation Plan

### Wave 1: Concept Briefs + Hook Generation (~4 hrs)
- `creative_concepts` table + API
- Concept brief generator (pre-generate for top 20 angle × persona combos)
- Hook variation generator (constrained to stay on-concept)

### Wave 2: Format Expansion + Creative Tree UI (~6 hrs)
- Format-specific template system (static, carousel, video_hq, video_ugc, ig_carousel)
- Creative tree UI: concept → hooks → formats (expandable tree)
- Hook-level tracking (which hooks are being tested, which won)

### Wave 3: Weekly Planner V2 (~4 hrs)
- Recommendation engine (explore vs scale vs iterate)
- Batch assembly UI (pick from creative tree → assemble test batch)
- Post-test flow (mark winners, trigger iteration)

### Wave 4: Iteration Engine (~3 hrs)
- Winning hook → generate new variations of the same hook
- Winner memory (track proven hooks per angle)
- Fatigue detection → suggest hook refresh

**Total: ~17 hrs**

---

## Open Questions for Rob

1. **How does Grace deploy ads today?** Does she download images and upload to Meta Ads Manager manually? Or is there a more automated path?

2. **High-quality vs UGC video:** Does Grace shoot both? Or is UGC/selfie the main format? This affects whether we generate HQ scripts at all.

3. **How many formats per hook is realistic?** We can generate 5 formats per hook, but will Grace actually produce all 5? Maybe start with 2-3 most useful formats.

4. **Should the concept brief be editable?** Or is it always auto-generated from the angle × persona × product data?

5. **Ian's involvement:** Does Ian review the creative plan before Grace produces? Or does Grace decide independently? This affects whether the weekly planner is a shared view.
