# Phase 2a Spec — Ad Copy Generation + Static Image Creation

> **Goal:** Grace can generate ad copy variants + branded static images, preview them side-by-side, and add to calendar.
> **Depends on:** Phase 0 ✅ (KB), Phase 0.5 ✅ (Eval), Phase 1 ✅ (Short-form)

---

## Scope (2a only — carousel + learning loop deferred to 2b)

### 2a.1 Ad Copy Generation API
**Route:** `POST /api/create/ad`

**Inputs:**
- `product` (string) — product/offer name
- `offer_details` (string) — what's being offered, price, bonuses
- `objective` (enum) — conversions | awareness | traffic
- `ad_format` (enum) — static | video_script (carousel deferred)
- `platform` (enum) — facebook | instagram
- `tone_override` (optional string) — override brand voice for this generation

**Outputs (3-5 variants per request):**
```json
{
  "variants": [
    {
      "id": "uuid",
      "headline": "...",
      "primary_text": "...",
      "description": "...",
      "cta": "Shop Now | Learn More | Sign Up",
      "framework_used": "PAS | AIDA | Before/After | Social Proof | Urgency",
      "framework_explanation": "Why this framework fits the objective",
      "image_prompt": "Gemini image generation prompt with brand guide prepended",
      "brand_voice_score": 78,
      "knowledge_entries_used": ["entry-id-1", "entry-id-2"]
    }
  ],
  "generation_provenance": {
    "model": "gemini-...",
    "kb_entries_loaded": 12,
    "brand_guide_version": "2026-03-18T..."
  }
}
```

**Generation pipeline:**
1. Load brand_style_guide (mandatory first read)
2. Retrieve relevant KB entries: ad copy frameworks, winning patterns for this objective
3. Generate 3-5 copy variants with different frameworks
4. Score each variant against brand voice rubric
5. Generate image prompt for each variant (brand guide prepended)
6. Return with provenance chain (which KB entries influenced output)

**KB categories to pull from:**
- 📢 Ad Creative Frameworks (PAS, AIDA, etc.)
- 🪝 Hook Library (for headlines)
- 📊 CRO / Conversion Patterns
- 🎨 Brand Identity

### 2a.2 Image Generation API
**Route:** `POST /api/create/image`

**Inputs:**
- `prompt` (string) — image description
- `style` (enum) — product_shot | lifestyle | promotional | faceless_quote | creator_featured
- `aspect_ratio` (enum) — 1:1 | 4:5 | 16:9 | 9:16
- `reference_images` (optional array of Supabase Storage paths) — for character/style consistency

**Implementation:**
- Use Gemini `gemini-3-pro-image-preview` (Nano Banana Pro) for generation
- Prepend brand style guide to every prompt: color palette, photography style, product styling rules
- For `creator_featured` style: include Grace's creator_description + reference images
- For `faceless_quote` style: use brand colors + typography rules
- Return: generated image as base64 + Supabase Storage URL after upload

**Storage:**
- Upload generated images to Supabase Storage bucket `ad-creatives`
- Path: `{user_id}/{date}/{variant_id}.png`
- Store metadata in `content_items` with `content_type = 'ad-static'`

### 2a.3 Ad Creation UI
**Route:** `/create/ads`

**Layout (similar to short-form script generator):**

**Left panel — Ad Settings:**
- Product/Offer name (text input)
- Offer details (textarea)
- Objective dropdown (Conversions / Awareness / Traffic)
- Format dropdown (Static Image / Video Script) — carousel greyed out with "Coming in Phase 2b" tooltip
- Platform dropdown (Facebook / Instagram)
- "Generate Ad Variants" button

**Center panel — Variants:**
- Card grid showing 3-5 variants
- Each card shows: headline, primary text, CTA, framework badge, brand voice score
- Click to expand full view
- "Generate Image" button per variant → shows generated image inline
- "Regenerate Copy" button per variant
- "Regenerate Image" button per variant

**Right panel — Actions:**
- Select variant(s) to keep
- Download selected images (individual or zip)
- "Add to Calendar" with date picker
- "Knowledge Used" section showing which KB entries backed generation

### 2a.4 Content Items Integration
- Generated ad variants saved to `content_items` table with:
  - `content_type`: 'ad-static' or 'ad-video-script'
  - `platform`: facebook / instagram
  - `script_data`: full variant JSON (copy + image prompt + framework)
  - `status`: draft → scheduled → published
- Wire existing `ad_performance` table: add `content_item_id` FK
- Dashboard "Top Performing Ads" cards should link to content_items when available

### 2a.5 Ad Frameworks Reference File
Create `references/AD-FRAMEWORKS.md` documenting:
- PAS (Problem-Agitate-Solution)
- AIDA (Attention-Interest-Desire-Action)
- Before/After/Bridge
- Social Proof / Testimonial
- Urgency / Scarcity
- FAB (Features-Advantages-Benefits)
Each with: when to use, structure template, Grace-specific examples

---

## Database Changes

### New migration: `007_ad_content.sql`
```sql
-- Add content_item_id to ad_performance for linking
ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES content_items(id);

-- Add index
CREATE INDEX IF NOT EXISTS idx_ad_performance_content_item ON ad_performance(content_item_id);
```

### Supabase Storage
- Create bucket: `ad-creatives` (public read, authenticated write)
- RLS: users can only write to their own `{user_id}/` prefix

---

## UI Reference
- Follow existing create/short-form page patterns (left settings, center output, right actions)
- Brand voice score badge: green (≥80%), yellow (60-79%), red (<60%)
- Framework badges: colored pills matching the ad creative framework category in KB

---

## Verification Checklist
- [ ] Ad copy API generates 3-5 variants with different frameworks
- [ ] Each variant includes brand voice score
- [ ] Image generation produces branded static images
- [ ] Images uploaded to Supabase Storage
- [ ] UI shows variants with copy + image side-by-side
- [ ] Download works (individual + batch)
- [ ] Add to Calendar creates content_item
- [ ] ad_performance can link to content_item
- [ ] Brand guide loaded as mandatory first context
- [ ] Provenance chain tracked (which KB entries used)
- [ ] `next build` passes
- [ ] Browser screenshots of full flow

---

## Red Team Findings Addressed
- **3.1 (Image consistency):** RESOLVED — Nano Banana 2 supports 5-char consistency + 14 ref images
- **3.2 (No visual acceptance tests):** Image generation includes brand guide compliance; manual review before calendar commit
- **7.2 (Provenance):** Generation provenance record included in API response + stored in content_items.script_data
- **3.3 (Carousel coherence):** DEFERRED to Phase 2b
- **1.2 (Feedback narrowing):** DEFERRED to Phase 2b (learning loop)
