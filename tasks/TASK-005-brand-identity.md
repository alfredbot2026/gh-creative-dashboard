# TASK-005 — Brand Identity & Voice Rubric (Phase 0c)

## Reference Files (MUST read before starting)
- `references/BRAND-RESEARCH.md` — Real brand data, YouTube performance analysis, competitor intel
- `lib/knowledge/types.ts` — KB type definitions
- `app/actions/settings.ts` — Existing business profile actions
- `app/settings/page.tsx` — Existing settings UI
- `PROJECT-SPEC.md` §3c — Brand identity spec

## Context
Grace's content engine needs a structured brand identity that every generation step can load as mandatory first-read. Currently `business_profile` has basic fields (name, voice, audience). We need a full style guide + voice scoring rubric that the generation pipeline can use to ensure consistency.

**Key insight from research:** Grace's brand voice is Taglish (Filipino-English mix), warm/empowering, proof-focused. Her top-performing content uses specific peso amounts and "paano kumita" hooks. The brand identity must encode these patterns.

## Wave 1 — Database: Brand Style Guide Table

### Create migration: `supabase/migrations/003_brand_style_guide.sql`

```sql
-- Brand Style Guide (extends business_profile with generation-specific fields)
CREATE TABLE IF NOT EXISTS brand_style_guide (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Visual Identity
  color_palette JSONB DEFAULT '[]'::jsonb,         -- [{name, hex, usage}]
  typography JSONB DEFAULT '{}'::jsonb,              -- {heading_font, body_font, caption_font, rules}
  photography_style TEXT DEFAULT '',                  -- Description of visual style
  product_styling_rules TEXT DEFAULT '',              -- How products should be shown
  
  -- Brand Voice Rubric (quantitative scoring)
  voice_rubric JSONB DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   tone_descriptors: ["warm", "empowering", "knowledgeable"],
  --   taglish_ratio: { target: 0.4, min: 0.2, max: 0.6 },
  --   formality_levels: { instagram: "casual", youtube: "semi-formal", ads: "direct" },
  --   vocabulary_whitelist: ["mommy", "kumita", "puhunan", "negosyo"],
  --   vocabulary_blacklist: ["utilize", "leverage", "synergy", "delve"],
  --   banned_ai_words: ["delve", "tapestry", "landscape", "in conclusion", "it's important to note"],
  --   example_phrases: ["Kalma lang, Mommy", "Step-by-step lang"],
  --   scoring_weights: { tone: 0.3, vocabulary: 0.2, taglish: 0.2, formality: 0.15, banned_words: 0.15 }
  -- }
  
  -- Caption Rules (per platform)
  caption_rules JSONB DEFAULT '{}'::jsonb,
  -- { instagram: { max_length, hashtag_count, emoji_usage, cta_required }, ... }
  
  -- Grace's Appearance (for image generation consistency)
  creator_description TEXT DEFAULT '',                -- Physical description for AI image gen
  wardrobe_notes TEXT DEFAULT '',                     -- What Grace typically wears
  avoid_list TEXT[] DEFAULT '{}',                     -- Things to never include
  
  -- Reference Images (Supabase Storage paths)
  reference_images JSONB DEFAULT '[]'::jsonb,
  -- [{path, type: "headshot"|"product"|"lifestyle", description}]
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Only one row needed (single-user)
-- Trigger for updated_at
CREATE TRIGGER update_brand_style_guide_updated_at
  BEFORE UPDATE ON brand_style_guide
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Verify:
```bash
# After applying migration, verify table exists
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/brand_style_guide?select=id&limit=1" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
# Should return [] (empty array, not error)
```

## Wave 2 — TypeScript Types & Server Actions

### Create: `lib/brand/types.ts`
```typescript
export interface ColorEntry {
  name: string
  hex: string
  usage: string // "primary" | "secondary" | "accent" | "background" | "text"
}

export interface VoiceRubric {
  tone_descriptors: string[]
  taglish_ratio: { target: number; min: number; max: number }
  formality_levels: Record<string, string> // platform → level
  vocabulary_whitelist: string[]
  vocabulary_blacklist: string[]
  banned_ai_words: string[]
  example_phrases: string[]
  scoring_weights: {
    tone: number
    vocabulary: number
    taglish: number
    formality: number
    banned_words: number
  }
}

export interface CaptionRules {
  [platform: string]: {
    max_length: number
    hashtag_count: number
    emoji_usage: string // "heavy" | "moderate" | "minimal"
    cta_required: boolean
  }
}

export interface ReferenceImage {
  path: string
  type: 'headshot' | 'product' | 'lifestyle' | 'logo'
  description: string
}

export interface BrandStyleGuide {
  id: string
  color_palette: ColorEntry[]
  typography: Record<string, string>
  photography_style: string
  product_styling_rules: string
  voice_rubric: VoiceRubric
  caption_rules: CaptionRules
  creator_description: string
  wardrobe_notes: string
  avoid_list: string[]
  reference_images: ReferenceImage[]
  updated_at: string
}
```

### Create: `app/actions/brand.ts`
Server actions:
- `getBrandStyleGuide()` — fetch the single row (or return defaults)
- `upsertBrandStyleGuide(data: Partial<BrandStyleGuide>)` — create or update
- `getVoiceRubricForGeneration()` — lightweight fetch of just voice_rubric + tone_descriptors + banned words (used by generation pipeline)

### Verify:
```bash
npx tsc --noEmit
# Zero errors
```

## Wave 3 — Brand Identity Settings UI

### Modify: `app/settings/page.tsx`
Add a new tab/section: "Brand Style Guide" below the existing Business Profile section.

**Sections to add:**
1. **Voice Rubric Editor**
   - Tone descriptors (tag input)
   - Taglish ratio slider (0.0 – 1.0, default 0.4)
   - Vocabulary whitelist / blacklist (tag inputs)
   - Banned AI words (tag input, pre-populated with common AI slop words)
   - Example phrases (text area)
   - Platform formality levels (dropdown per platform)

2. **Visual Identity**
   - Color palette (color picker + name + usage)
   - Typography fields (heading/body/caption fonts)
   - Photography style (text area)
   - Product styling rules (text area)

3. **Creator Identity** (for image generation)
   - Creator description (text area)
   - Wardrobe notes (text area)
   - Avoid list (tag input)

4. **Reference Images**
   - Upload section (drag & drop or file select)
   - Preview grid of uploaded images with type labels
   - (Images stored in Supabase Storage bucket `brand-assets`)

**UI patterns:** Match existing settings page style. Use the same card layout, form patterns, and button styles.

### Verify:
```bash
npm run build
# Zero errors, /settings page renders with new sections
```

## Wave 4 — Seed Default Brand Data

### Create: `scripts/seed-brand-identity.ts`
A one-time script that inserts Grace's brand identity based on `references/BRAND-RESEARCH.md`:

```typescript
// Pre-populate with known data:
const defaultGuide = {
  voice_rubric: {
    tone_descriptors: ["warm", "empowering", "knowledgeable", "encouraging", "relatable"],
    taglish_ratio: { target: 0.4, min: 0.2, max: 0.6 },
    formality_levels: {
      instagram: "casual-taglish",
      facebook: "casual-taglish", 
      youtube: "semi-formal-taglish",
      tiktok: "casual-taglish",
      ads: "direct-proof-focused"
    },
    vocabulary_whitelist: ["mommy", "kumita", "puhunan", "negosyo", "step-by-step", "kaya mo 'to", "kalma lang"],
    vocabulary_blacklist: ["utilize", "leverage", "synergy", "paradigm", "framework"],
    banned_ai_words: ["delve", "tapestry", "landscape", "in conclusion", "it's important to note", "in today's world", "game-changer", "unlock"],
    example_phrases: [
      "Kalma lang, Mommy. Hindi mo kailangang mag-thesis para magsimula.",
      "Step-by-step lang, kaya mo 'to kahit simpleng setup lang.",
      "1K na puhunan to 6 digits income"
    ],
    scoring_weights: { tone: 0.3, vocabulary: 0.2, taglish: 0.2, formality: 0.15, banned_words: 0.15 }
  },
  caption_rules: {
    instagram: { max_length: 2200, hashtag_count: 15, emoji_usage: "moderate", cta_required: true },
    facebook: { max_length: 5000, hashtag_count: 3, emoji_usage: "moderate", cta_required: true },
    tiktok: { max_length: 300, hashtag_count: 5, emoji_usage: "heavy", cta_required: false }
  },
  creator_description: "Filipina woman, warm smile, approachable, often shown in home/workshop setting",
  photography_style: "Bright, clean, warm tones. Home workshop aesthetic. Products featured prominently with natural lighting.",
  product_styling_rules: "Show paper products (notebooks, journals, magnets) in use or being made. Include tools when relevant. Flat lay for product shots.",
  avoid_list: ["dark/moody aesthetics", "corporate stock photo style", "overly polished/unrealistic", "complex jargon"]
}
```

### Verify:
```bash
# Run seed script
npx tsx scripts/seed-brand-identity.ts
# Verify data exists
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/brand_style_guide?select=id,voice_rubric" ...
```

## Final Verification
```bash
npx tsc --noEmit  # Zero type errors
npm run build      # Clean build
# Navigate to /settings — brand style guide section visible and editable
# Verify brand data is seeded and retrievable
```

## UI Reference
Match existing settings page layout. No wireframe needed — extend current card-based settings UI.
