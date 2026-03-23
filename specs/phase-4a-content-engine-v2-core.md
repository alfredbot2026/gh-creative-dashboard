# Phase 4a — Content Engine V2: Structure-First Creation

> "Start with proven structures, not Frankenstein." — Rob, 2026-03-23
> Grace learns the structures by choosing them deliberately. Knowledge is visible, not invisible.

## Goal
Transform the content creation flow from "enter topic → get script" to "pick a proven structure → enter topic → get a script that follows that exact structure with timing markers."

## Dependencies
- ✅ Phase 3.5 (Learning Pipeline — performance data flowing)
- ✅ `references/CONTENT-STRUCTURES.md` (45 techniques, second-by-second timing)
- ✅ Analysis crons running (will provide Grace-specific performance data per structure)

## Architecture Decision
**Structure-first, not AI-first.** Grace picks the structure. AI fills it in. Grace sees the skeleton clearly labeled. Over time, performance data tells her which structures work best for HER audience.

---

## Wave 1: Structure Catalog + DB Schema

### 1a. `content_structures` table
```sql
CREATE TABLE content_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Identity
  name TEXT NOT NULL,                    -- "Show Then Tell"
  slug TEXT NOT NULL,                    -- "show-then-tell"
  description TEXT,                      -- 1-line for selection UI
  source_creator TEXT,                   -- "Chris Chung", "Briar Cochran"
  
  -- Classification
  content_type TEXT NOT NULL,            -- "reel", "youtube", "ad", "story"
  purpose TEXT[],                        -- ["educate", "sell", "inspire"]
  difficulty TEXT DEFAULT 'beginner',    -- "beginner", "intermediate", "advanced"
  
  -- The Structure Definition
  blocks JSONB NOT NULL,                 -- Ordered array of block definitions
  -- Each block: { 
  --   "id": "hook",
  --   "label": "Hook", 
  --   "timing": "0-3s",
  --   "duration_hint": "3s",
  --   "instruction": "Capture attention. Include transition on second 3.",
  --   "example": "Does the amount of water you use to boil pasta actually matter?",
  --   "rules": ["3-6 word text overlay", "3-6 cuts/shots", "No dead space at start"]
  -- }
  
  -- Timing
  ideal_length_min INTEGER,              -- seconds
  ideal_length_max INTEGER,              -- seconds
  
  -- Performance (populated by analysis pipeline)
  times_used INTEGER DEFAULT 0,
  avg_score FLOAT,                       -- average weighted_total from deep_analysis
  avg_engagement FLOAT,                  -- average engagement rate
  best_for_topics TEXT[],                -- topics where this structure excels
  
  -- Meta
  is_cutting_edge BOOLEAN DEFAULT false, -- ⭐ flag
  is_system BOOLEAN DEFAULT true,        -- system-provided vs user-created
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1b. Seed structures from `references/CONTENT-STRUCTURES.md`
Seed all 45 techniques with their block definitions, timing, and metadata.
Group by content_type:
- **Reels (7):** Hook-Hold-Reward, Show Then Tell, Myth Truth Move, Micro-Story Arc, Full Reel Anatomy, Iceberg Effect, Comparison
- **YouTube (4):** HEIT, 15-30 Min Structure, Value Front-Loading, 4 C's Intro
- **Storytelling (4):** 6-Step My Story, Year-by-Year, Three-Part Brand Story, 4 Founder Videos
- **Ads (6):** PAS, Before-After-Bridge, Hook-Story-Offer, WHO-WHY-OFFER-ACTION, Benefit-Caveat, PASTOR
- **Meta-techniques (hooks, retention, production):** Stored as technique_type, not full structures

### 1c. `technique_library` table (supplementary techniques)
Techniques that enhance structures but aren't structures themselves:
- Hook types (Triple Hook, Super Hook, Contrarian, etc.)
- Retention techniques (Re-hooks, Curiosity Stacking, Zeigarnik)
- Algorithm exploits (Trial Reels, Green Screen Clone, Comment Farming)
- Production tips (1.1x speed, dead space trim, active visual engagement)
- Meta-strategies (70/20/10, 4-on-4, CCN Fit, Accordion Method)

```sql
CREATE TABLE technique_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL,               -- "hook", "retention", "algorithm", "production", "strategy"
  description TEXT,
  source_creator TEXT,
  
  steps JSONB,                          -- Step-by-step instructions
  examples JSONB,                       -- Real examples
  timing_rules JSONB,                   -- When/where to apply
  
  -- Performance tracking
  times_applied INTEGER DEFAULT 0,
  avg_impact FLOAT,                     -- measured lift when used
  
  is_cutting_edge BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Verification:** `npx supabase db push` succeeds. Both tables queryable.

---

## Wave 2: Structure Browser UI (`/structures`)

### 2a. Structure Library page
**Route:** `/structures`
**Mobile-first layout:**

```
[Tab Bar: Reels | YouTube | Ads | Stories]

[Search / Filter bar]
  Filters: purpose (educate/sell/inspire), difficulty, source creator

[Structure Cards - grid on desktop, stack on mobile]
  ┌─────────────────────────────────┐
  │ ⭐ Show Then Tell               │
  │ "Show result first, explain how" │
  │ 15-30s • educate • Chris Chung  │
  │ [Use This] [Learn More]         │
  └─────────────────────────────────┘
```

Each card shows:
- Name + ⭐ badge if cutting-edge
- 1-line description
- Duration range + purpose tags + source
- (Later) Performance badge: "3.2x your average" if data available

### 2b. Structure Detail view
**Route:** `/structures/[slug]`

Shows:
- Full description + source creator
- **Visual timeline** showing blocks with timing markers
- Example script using this structure
- When to use / when NOT to use
- Related techniques (e.g., "Pair with Triple Hook for max impact")
- (Later) Grace's performance data for this structure

### 2c. Technique Library browser
**Route:** `/structures/techniques`

Separate tab/page for supplementary techniques:
- Hook formulas, retention tricks, algorithm exploits, production tips
- Each with step-by-step + examples
- "Apply to current script" action (for later integration)

**Verification:** Pages render, cards display, detail views load. Mobile responsive.

---

## Wave 3: Structure-First Creation Flow

### 3a. Updated Create flow
**Route:** `/create` (modify existing)

New flow:
1. **What are you creating?** → Reel / YouTube / Ad / Story
2. **Pick a structure** → Shows filtered structure cards for that type
   - "Recommended for you" section (based on performance data, if available)
   - "All structures" section
   - Quick preview of each structure's block timeline
3. **Enter your topic** → Free text input
   - (Later) AI topic suggestions based on content mix + freshness
4. **AI generates script** → Following the EXACT chosen structure
5. **Script editor** → Shows structure labels on each block

### 3b. Structure-aware script generation
Update `/api/create/short-form` and `/api/create/youtube`:
- Accept `structure_id` parameter
- Load structure's `blocks` definition
- Generation prompt includes:
  - The structure's block sequence with timing
  - Each block's instruction and rules
  - Grace's brand voice + Taglish ratio
  - KB best practices relevant to this structure
- Output maps 1:1 to structure blocks

### 3c. Labeled script editor
The script preview shows structure annotations:

```
┌─ HOOK (0-3s) ────────────────────────┐
│ "Alam mo ba na pwede kang kumita     │
│  sa journal making kahit sa bahay?"  │
│                                       │
│  📝 Rules: 3-6 word text overlay,    │
│  transition on second 3              │
├─ SUPER HOOK (3-5s) ──────────────────┤
│ "After 5 years of selling journals   │
│  online, here's what I learned..."   │
│                                       │
│  📝 Establishes credibility          │
├─ CONTEXT (5-7s) ─────────────────────┤
│ ...                                   │
└───────────────────────────────────────┘
```

Each block:
- Labeled with structure name + timing
- Shows the rules/instructions from the structure definition
- Can be individually regenerated
- (Later) Can be swapped with alternative techniques

**Verification:** Full flow works: pick structure → enter topic → get labeled script. Build passes.

---

## Wave 4: Performance Integration

### 4a. Link deep_analysis to structures
- When analysis pipeline runs, match detected structure to `content_structures`
- Update `times_used`, `avg_score`, `avg_engagement` on matched structures
- Track which structures Grace has never tried

### 4b. "Recommended" sorting
- On structure selection, sort by:
  1. Structures with >2x Grace's average engagement
  2. Structures she hasn't tried yet (encourage experimentation)
  3. Structures matching her top-performing topics

### 4c. Structure performance insights
- On structure detail page: "Your videos using this structure average X views"
- On dashboard: "Try 'Myth Truth Move' — similar creators get 3x engagement"

**Verification:** Recommendations appear. Performance data populates after analysis completes.

---

## What This Phase Does NOT Include
- ❌ Block swap UI (Phase 4a.3 — deferred until structures are proven)
- ❌ Image/text compositing (Phase 4b)
- ❌ Competitive intelligence (Phase 4c)
- ❌ Automated topic suggestions (later — needs more performance data)
- ❌ PDF export (later — needs working documents first)
- ❌ Invisible knowledge application (later — Grace needs to learn structures first)

---

## Estimates
| Wave | Scope | Effort |
|------|-------|--------|
| Wave 1 | DB schema + seed data | ~2 hours |
| Wave 2 | Structure browser UI (3 pages) | ~4 hours |
| Wave 3 | Creation flow update + labeled editor | ~6 hours |
| Wave 4 | Performance integration | ~3 hours |
| **Total** | | **~15 hours** |

---

## Files to Create/Modify

### Create
- `supabase/migrations/018_content_structures.sql`
- `app/structures/page.tsx` + `page.module.css`
- `app/structures/[slug]/page.tsx` + `page.module.css`
- `app/structures/techniques/page.tsx` + `page.module.css`
- `app/api/structures/route.ts`
- `app/api/structures/[slug]/route.ts`
- `lib/structures/seed-data.ts` (all 45 structures as typed objects)
- `lib/structures/types.ts`
- `app/api/structures/seed/route.ts` (one-time seed endpoint)

### Modify
- `app/api/create/short-form/route.ts` — accept structure_id, use structure blocks in prompt
- `app/api/create/youtube/route.ts` — accept structure_id
- `app/create/*/page.tsx` — add structure selection step
- `components/layout/Sidebar.tsx` — add Structures nav item
- `components/layout/BottomNav.tsx` — add Structures nav item
