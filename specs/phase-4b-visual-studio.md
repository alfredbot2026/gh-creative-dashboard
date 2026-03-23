# Phase 4b — Visual Studio + Carousel Engine

> Separate from `/create` (scripts only). New `/studio` page for all image/visual work.
> Rob: "Move image creation to a separate page. The wizard is just scripts."

## Overview

Three capabilities on one page:

1. **Image Generator** — Upload product photo + prompt → AI generates images with Grace character consistency. Like a Nano Banana UI.
2. **Text Carousel Builder (Low Quality)** — Upload ONE static image → AI writes story/script → same image on every slide with text overlay changing. Font/style controls.
3. **Visual Carousel Builder (High Quality)** — Upload product image → system references winning ad layouts → AI recomposes image matching proven structures → editable text overlays.

---

## Wave 1: Studio Page + Image Generator (~4 hrs)

**Goal:** `/studio` page with image upload + free-form prompting + Grace character toggle.

### UI
- **Upload zone**: drag & drop product photo(s)
- **Prompt textarea**: describe what you want
- **Character toggle**: "Include Grace" (on/off) — when on, injects identity lock + reference photos
- **Style presets**: Product shot, Lifestyle, Promotional, Behind-the-scenes
- **Aspect ratio picker**: 1:1 (feed), 9:16 (story/reel), 4:5 (carousel), 16:9 (YouTube thumb)
- **Generate button** → shows result with download button
- **Gallery**: recent generations (stored in Supabase Storage, linked to `content_items`)

### API
- `POST /api/studio/generate` — accepts uploaded image(s) + prompt + options
  - Uploads product image to Supabase Storage temp
  - Builds prompt with brand prefix + identity lock (if character enabled)
  - Calls Nano Banana 2 with reference images
  - Returns generated image URL
- Reuses existing `image-generator.ts` logic

### Files to create/modify
- `app/studio/page.tsx` — main studio page
- `app/studio/studio.module.css`
- `app/api/studio/generate/route.ts` — image gen endpoint
- `components/layout/Sidebar.tsx` + `BottomNav.tsx` — add Studio nav item

---

## Wave 2: Text Carousel Builder — Low Quality (~5 hrs)

**Goal:** Upload one image → AI writes script → text overlay on static background across slides.

### Concept
- User uploads ONE background image (product photo, flat lay, lifestyle shot)
- AI generates a story/script (uses existing script generation + structure picker)
- Each slide = same image + different text overlay (like Instagram story text posts)
- User controls: font family, font size, text color, text position (top/center/bottom), background overlay opacity

### UI Flow
1. Upload image (or pick from recent generations in Wave 1)
2. Enter topic OR pick structure (reuse wizard goal/structure steps)
3. AI generates 5-10 text slides (hook → story → value → CTA)
4. Preview: carousel viewer showing all slides with text overlaid
5. **Per-slide editing**: click any slide → edit text inline
6. **Style controls panel**: font picker (5-6 fonts), text color, overlay darkness, text position
7. Export: download all slides as individual PNGs (or ZIP)

### Text Compositing Engine
- Server-side: `sharp` or `canvas` (node-canvas) for text overlay
- `POST /api/studio/composite` — accepts image + text + style → returns composited image
- Text rendering: multi-line support, auto font-size to fit, text shadow for readability
- Brand color defaults from `brand_style_guide`

### API
- `POST /api/studio/carousel/text` — generate carousel text slides
  - Input: image (uploaded or storage path), topic, structure_slug, style options
  - Returns: array of { slide_number, text, composited_image_url }
- `POST /api/studio/carousel/recomposite` — re-render single slide with edited text/style

### Files
- `app/studio/carousel/page.tsx` — carousel builder sub-page (or tab within studio)
- `lib/studio/text-compositor.ts` — sharp/canvas text overlay engine
- `lib/studio/fonts.ts` — font definitions + paths
- `app/api/studio/composite/route.ts`
- `app/api/studio/carousel/text/route.ts`

---

## Wave 3: Visual Carousel Builder — High Quality (~8 hrs)

**Goal:** Upload product image → AI recomposes based on winning ad layouts → editable result.

### Concept
- User uploads product image
- System shows reference layouts from a curated "winning ads" library
- User picks a layout style (or "let AI decide")
- AI generates a recomposed image: product placed in the layout with headline, subheadline, CTA, brand colors
- User can edit text overlays on the result
- Multiple slides for carousel (each slide can have different layout/text)

### Reference Ad Library
- Curated collection of high-performing static ad layouts
- Categorized: product-centered, lifestyle, testimonial, comparison, feature-highlight
- Stored as style descriptions (not actual copyrighted images) — AI generates in that style
- Could eventually use Grace's own top-performing ads from the insights data

### UI Flow
1. Upload product image
2. Pick layout style from reference gallery (or "AI picks best")
3. Enter headline + optional subheadline + CTA text (or AI generates from topic)
4. AI generates the composed image
5. **Text editor overlay**: drag text positions, change fonts, resize
6. For carousel: repeat for each slide (or AI generates full carousel set)
7. Export

### Technical Approach
- Gemini image generation with product photo as reference input
- Layout prompt: "Create a professional ad layout in [style] with this product..."
- Text overlay handled server-side (Wave 2 compositor reused)
- Two-pass: AI generates base image → compositor adds crisp text (AI text in images is unreliable)

### API
- `POST /api/studio/carousel/visual` — full visual carousel generation
- Reuses text compositor from Wave 2
- Layout descriptions stored in `ad_layout_library` table (or JSON file initially)

### Files
- `lib/studio/layout-library.ts` — winning ad layout definitions
- `app/api/studio/carousel/visual/route.ts`
- Extends studio page with "Visual Carousel" tab

---

## Wave 4: Polish + Export (~3 hrs)

- PDF export (all slides in one PDF, ready for print or send)
- ZIP download (individual slide PNGs)
- Save carousel to library (`content_items`)
- "Duplicate & edit" — copy a carousel and modify text/style
- Share link (public URL for carousel preview)

---

## Dependencies

- `sharp` npm package (for server-side image compositing) — already likely in deps
- Or `@napi-rs/canvas` for more font control
- Font files: need 5-6 good fonts bundled (Inter, Montserrat, Playfair Display, etc.)
- Supabase Storage: `ad-creatives` bucket for uploads + generated images

## Timeline Estimate

| Wave | Scope | Est. Hours |
|------|-------|------------|
| 1 | Studio page + Image Generator | ~4 hrs |
| 2 | Text Carousel (low quality) | ~5 hrs |
| 3 | Visual Carousel (high quality) | ~8 hrs |
| 4 | Polish + Export | ~3 hrs |
| **Total** | | **~20 hrs** |

## Key Decisions (Rob, 2026-03-24)
- `/create` = scripts only (wizard)
- `/studio` = all image/visual work (separate page)
- Low quality carousel = one static image + text overlay changing per slide
- High quality carousel = AI-composed based on winning ad reference layouts
- Font and style controls required
- Text must be editable on the output
- Grace character consistency via identity lock (8 reference photos)
