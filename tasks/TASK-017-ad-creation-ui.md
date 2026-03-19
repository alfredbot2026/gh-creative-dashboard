# TASK-017: Ad Creation UI

## Priority: P1
## Track: DEFAULT
## Depends on: TASK-015, TASK-016

## Overview
Build the ad creation page at `/create/ads` — the UI for generating ad copy variants with images, previewing side-by-side, downloading, and adding to calendar.

## Reference Files to Read
1. `references/ARCHITECTURE.md` — project structure
2. `specs/phase-2a-ad-copy-static.md` — full spec (section 2a.3)
3. `app/create/short-form/page.tsx` — FOLLOW THIS PATTERN (left settings, center output, right actions)
4. `lib/create/ad-types.ts` — ad generation types (created in TASK-015)
5. `lib/create/image-types.ts` — image generation types (created in TASK-016)
6. `components/` — existing component patterns

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Wave 1: Page Layout + Settings Panel

### File: `app/create/ads/page.tsx`

**Left Panel — Ad Settings:**
- Product/Offer Name (text input, required)
- Offer Details (textarea — price, bonuses, description)
- Objective (dropdown: Conversions / Awareness / Traffic)
- Format (dropdown: Static Image / Video Script)
  - Carousel option: show but disabled with tooltip "Coming in Phase 2b"
- Platform (dropdown: Facebook / Instagram)
- "Generate Ad Variants" button (disabled until product name filled)

**Center Panel — Variants Display:**
- Initially: "No variants generated yet" placeholder (same pattern as short-form)
- After generation: Card grid (2 columns on desktop, 1 on mobile)
- Each variant card:
  - Framework badge (colored pill: PAS=blue, AIDA=green, Before/After=purple, etc.)
  - Brand voice score badge (green/yellow/red)
  - Headline (bold, large)
  - Primary text (body)
  - Description (smaller)
  - CTA button preview
  - "Generate Image" button → shows loading spinner → shows generated image
  - "Regenerate Copy" button (small, secondary)
  - "Regenerate Image" button (small, secondary, only after image exists)
  - Checkbox for selection

**Right Panel — Actions:**
- "Download Selected" button (zip if multiple, single PNG if one)
- Schedule Date picker
- "Add to Calendar" button (saves selected variants as content_items)
- "Knowledge Used" section (collapsible, shows KB entry titles used)
- "Regenerate All" button

### File: `app/create/ads/page.module.css`
Follow existing patterns from `app/create/short-form/page.module.css`

## Wave 2: API Integration

Wire up the UI to the APIs:
1. "Generate Ad Variants" → `POST /api/create/ad` → display variants
2. "Generate Image" per variant → `POST /api/create/image` with variant's image_prompt → display inline
3. "Add to Calendar" → save to content_items (reuse pattern from short-form)
4. "Download" → fetch image from Supabase Storage URL → trigger browser download

### State management:
- `variants` array (from API response)
- `selectedVariants` set of IDs
- `generatedImages` map of variant_id → image_url
- `isGenerating` / `isGeneratingImage` loading states

## Wave 3: Navigation

### File: Sidebar update
The sidebar already has "Create" section. Add "Ads" link under it:
- Create
  - Short-form Scripts (existing)
  - **Ads** (new) → `/create/ads`

Check how short-form was added to sidebar and follow same pattern.

## Wave 4: Verify

```bash
npx next dev --port 3100
```

Full browser test:
1. Login as grace@ghcreative.test
2. Navigate to /create/ads
3. Enter: Product="Papers to Profits Course", Offer="Complete paper crafting course - ₱2,997", Objective=Conversions, Format=Static, Platform=Facebook
4. Click "Generate Ad Variants"
5. Verify 3-5 variants appear with different frameworks
6. Click "Generate Image" on best-scored variant
7. Verify image appears inline
8. Select variant, set date, click "Add to Calendar"
9. Verify content_item created
10. Screenshot the full flow

- [ ] Settings panel renders correctly
- [ ] Generate produces 3-5 variants
- [ ] Framework badges display correctly
- [ ] Brand voice scores display with correct colors
- [ ] Image generation works inline
- [ ] Download works
- [ ] Add to Calendar saves content_item
- [ ] Sidebar updated with Ads link
- [ ] Mobile responsive
- [ ] `next build` passes
- [ ] Screenshots saved to `qa/TASK-017-*.png`

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `app/create/ads/page.tsx` | Create | Full ad creation page |
| `app/create/ads/page.module.css` | Create | Page styles |
| Sidebar component | Modify | Add Ads link under Create |
