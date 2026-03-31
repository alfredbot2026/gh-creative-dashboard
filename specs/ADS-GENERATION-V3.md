# Ad Generation Architecture V3 — Media Buyer + Creative Director

> **Date:** 2026-03-31  
> **Context:** Rob's clarification — generation serves two AI roles (media buyer + creative director).  
> The user (Grace) confirms/edits, not configures.

---

## The Two Roles

### Role 1: Media Buyer Brain
**Job:** Analyze the ad account and decide WHAT to create.

**Inputs:**
- Ad performance data (daily rows, trend detection)
- Classification data (angles, personas, frameworks per ad)
- Strategy map (coverage matrix + gaps)
- Competitor intelligence (what angles they use, what's trending)
- Business context (product price, conv rates, thresholds)
- Creative fatigue signals (declining ROAS over time)

**Output: Creative Briefs**
Each brief is a concrete recommendation:
```
{
  brief_type: "explore" | "scale" | "refresh" | "kill",
  priority: 1-5,
  angle: "comparison",
  persona: "new_mom_curious",
  reason: "Untested angle. Competitors use heavily. Your pain_point ads are fatiguing.",
  context: {
    competitor_usage: "4 of 15 competitors use comparison",
    gap_size: "0 ads tested in this cell",
    related_winners: ["pain_point × new_mom at 4.5x ROAS — shows audience responds"],
    fatigue_signal: "pain_point ROAS declined 30% in 14 days"
  },
  suggested_frameworks: ["before_after", "PAS"],
  suggested_formats: ["static_image", "carousel"],
  estimated_variants: 3
}
```

**When does this run?**
- On demand when user visits `/ads` (cached 24h or until data changes)
- After each Meta sync (briefs recalculated with fresh data)
- Briefs are **SAVED to DB** — not recomputed every page load

**New table: `media_buyer_briefs`**
```sql
CREATE TABLE media_buyer_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  brief_type TEXT NOT NULL,  -- explore, scale, refresh, kill
  priority INTEGER NOT NULL,
  angle TEXT NOT NULL,
  persona TEXT NOT NULL,
  reason TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  suggested_frameworks TEXT[],
  suggested_formats TEXT[],
  estimated_variants INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',  -- pending, accepted, generating, completed, dismissed
  generated_concept_id UUID REFERENCES creative_concepts(id),  -- links to what was actually created
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,  -- briefs expire when data changes significantly
  UNIQUE(user_id, angle, persona, brief_type)
);
```

### Role 2: Creative Director Brain
**Job:** Take a brief and produce finished creatives.

**Inputs:**
- The brief (from media buyer)
- Brand voice rules (from brand_style_guide)
- Winning ad patterns for this angle (from ad_creatives + ad_performance)
- Product catalog (name, price, USPs, offer details)
- KB entries (hook library, ad frameworks, virality patterns)
- Visual style guide (for image prompts)

**Output: Creative Package**
A complete set of ready-to-deploy ad creatives:
- Concept brief (the anchor)
- N hook variations (each stays on-angle)
- Per hook: format-specific executions (static, carousel, video)
- Each execution: full copy + image prompt + visual treatment notes

**This SHOULD use the same generation stack as `/create`** but currently doesn't.

### Gap: Ad Engine vs Organic Engine

The organic content creation (`/create`) runs through a rich pipeline:
- KB hook library (tested patterns, tiered by effectiveness)
- KB scripting frameworks (PAS, AIDA, etc. from knowledge_entries)
- KB virality science (what makes content spread)
- KB content funnel (awareness → consideration → conversion context)
- KB platform intelligence (IG Reels vs Facebook vs YouTube specifics)
- Brand voice rubric (Taglish ratio target, tone descriptors, banned AI words, formality per platform, example phrases)
- Content structures (45 proven techniques with block timing)
- Quality gate (brand voice score, auto-reject below threshold)
- Tiered KB selection (Tier A proven + Tier B random for variety)

The ad engine (`creative-engine.ts`) has almost NONE of this:
- ❌ No KB entries loaded (except video scripts which route through shortform)
- ❌ Hardcoded `FRAMEWORK_MAP` instead of KB scripting frameworks
- ❌ Hardcoded brand voice string instead of loading `brand_style_guide`
- ❌ No virality science, content funnel, or platform intelligence
- ❌ No content structures (45 techniques not available)
- ❌ No quality gate on static/carousel (only video via shortform detour)
- ❌ No tiered KB selection
- ✅ Does load winning ad patterns + competitor context (organic engine doesn't)
- ✅ Does load product catalog

**The fix:** The Creative Director brain must use the SAME generation stack as `/create`, augmented with ad-specific context (winning patterns, competitor angles, media buyer brief). One pipeline, not two.

**Implementation:**
1. Ad generation calls the same `getGenerationContext()` + `getBrandContext()` as organic
2. Ad generation uses the same `buildShortFormPrompt()` architecture (KB + brand + structure)
3. PLUS: injects ad-specific context (winning patterns, competitor angles, brief reason)
4. PLUS: runs quality gate on ALL formats (not just video)
5. The `creative-engine.ts` hardcoded maps (FRAMEWORK_MAP, PERSONA_MAP, hardcoded tone) get replaced with DB-driven values

---

## The User Flow

### On `/ads` (Command Center)

The media buyer has already analyzed everything. Grace sees:

```
┌─────────────────────────────────────────────────────┐
│  📋 3 Recommendations                               │
│                                                      │
│  1. 🔍 EXPLORE: Comparison × New Mom                │
│     "Never tested. Competitors use this heavily."    │
│     [Create These Ads →]  [Dismiss]                  │
│                                                      │
│  2. 📈 SCALE: Pain Point × New Mom                  │
│     "Your best angle (4.5x ROAS). Fresh creative    │
│      needed — performance declining 30%."            │
│     [Create Fresh Versions →]  [Dismiss]             │
│                                                      │
│  3. ❌ KILL: Feb Campaign                            │
│     "Spent ₱5,995 with 0.3x ROAS. Stop this."      │
│     [Turn Off]  [Dismiss]                            │
└─────────────────────────────────────────────────────┘
```

### On `/ads/create` (Creative Factory)

Grace clicks "Create These Ads →" on a brief. She doesn't configure anything — the brief pre-fills everything.

**Step 1: Brief Review**
```
The media buyer recommends:
┌─────────────────────────────────────────┐
│  🔍 Explore: Comparison × New Mom       │
│                                          │
│  Why: Never tested. 4 of 15 competitors │
│  use comparison. Your audience responds  │
│  well to pain_point (4.5x) — comparison │
│  appeals to the same psychology.         │
│                                          │
│  Formats: Static Image + Carousel        │
│  Hooks: 3 variations                     │
│  Framework: Before/After                 │
│                                          │
│  [✓ Looks Good — Generate]               │
│  [✏️ Adjust]  (expand to edit config)    │
└─────────────────────────────────────────┘
```

If Grace clicks "Adjust" — she can change angle, persona, format, framework, hook count. But the default is ALREADY filled by the media buyer brain. Most of the time she just clicks "Looks Good."

**Step 2: Generation (Progressive)**

```
✅ Concept brief generated
✅ Hook 1: "Bakit ka pa mag-aral mag-isa kung..."  (question)
✅ Hook 2: "Before: walang kita. After: 6-digits..." (before_after)
✅ Hook 3: "Ang pinagkaiba ng ₱1,300 course vs..."  (comparison)
   ⏳ Generating static image for Hook 1...
   ⏳ Generating carousel for Hook 1...
```

Hooks appear as they generate. Format expansions happen per-hook on demand or all at once.

**Step 3: Review & Edit**

Each hook → its format executions. Grace can:
- Edit copy inline
- Regenerate a single hook
- Regenerate a single format execution
- Mark as approved
- Save to library
- Download

**Everything auto-saves.** Generated hooks and executions are written to DB immediately. If Grace closes and returns, they're still there.

### On `/ads/create` (Direct Entry — no brief)

Grace can also go to `/ads/create` directly (not from a recommendation). In that case:

**Step 1: What do you want to do?**
- Create new ads (explore)
- Scale a winner (shows top performers to pick from)
- Refresh tired ads (shows fatiguing ads to pick from)

**Step 2: If "Create new" — pick angle**
Strategy map shown inline. Tested cells vs gaps visible. Click a gap → pre-fills.

**Step 3-7:** Same as brief-driven flow above.

The difference: brief-driven flow skips Steps 1-2 because the media buyer already decided.

---

## Token Conservation Rules

### Save Everything
1. **Media buyer briefs** → saved to `media_buyer_briefs` table. Cached 24h. Not recomputed on every page load.
2. **Generated concepts/hooks/executions** → already saved to DB. Auto-save on generation, not on user action.
3. **Weekly plan** → saved to DB with week identifier. Not recomputed daily.
4. **Intelligence map** → cached in DB (or localStorage) with TTL. Recomputed only after data sync.
5. **`/create` scripts** → AUTO-SAVE all generated variants to `content_items` as drafts. Don't wait for user to click Save.

### Retrieve Before Regenerate
1. When user visits `/ads/create` → check for existing unsaved concepts for this angle+persona. Show them instead of generating new ones.
2. When brief recommends an angle+persona that was already generated → show existing, offer "Generate fresh" as secondary action.
3. Concept history visible on `/ads/create` — all past generations browsable.

### Minimize LLM Calls
1. Brief generation = 1 LLM call (batch all recommendations in one prompt, not per-recommendation)
2. Hook generation = 1 LLM call per concept (returns all hooks at once)
3. Format expansion = parallel for static/carousel, sequential for video
4. Don't regenerate hooks when only format needs changing
5. Cache intelligence map computations — only recalculate after sync

---

## What Changes vs Current

| Current | V3 |
|---------|-----|
| User picks angle/persona/format/hooks manually | Media buyer pre-fills from brief |
| All config on one screen | Brief review → adjust (optional) → generate |
| Results all at once after 1-2 min | Progressive: hooks first, then formats |
| No auto-save — close page = lost | Auto-save everything to DB |
| Weekly plan uses legacy factory | Weekly plan from saved briefs, V2 engine |
| Intelligence scattered across pages | Briefs surface on `/ads` as action cards |
| /create scripts not auto-saved | Auto-save as drafts |
| Recommendations recomputed on every visit | Cached in `media_buyer_briefs`, refreshed after sync |

---

## New Database Objects

### `media_buyer_briefs` (new table)
Stores the media buyer's recommendations. Each brief links to the concept it generated.

### Changes to existing:
- `creative_concepts.brief_id` → FK to `media_buyer_briefs.id` (tracks which brief triggered this concept)
- `content_items` → auto-save behavior (scripts from `/create` saved as drafts immediately)

---

## Implementation Notes

### Phase A (Data Integrity) — unchanged, do first
### Phase B (Consolidation) — unchanged, do second

### Phase C (Intelligence Layer) — revised
- `/ads` tabs: Overview (with action cards from `media_buyer_briefs`) | Campaigns | Strategy | Competitors
- Action cards are READ from DB, not computed on-the-fly
- "Create These Ads →" links to `/ads/create?briefId=xxx`

### Phase D (Generation) — revised  
- `/ads/create` reads `briefId` from URL → loads brief → shows pre-filled review
- If no `briefId` → manual entry wizard (Mode → Angle → Persona → Format → Framework)
- Progressive generation with auto-save
- Concept history section

### Phase E (Automation) — add
- After daily sync → recalculate briefs (1 LLM call for all recommendations)
- Expire old briefs when data changes significantly
- Auto-save `/create` scripts as drafts
