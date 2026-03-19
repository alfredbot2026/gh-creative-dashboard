# TASK-025: Carousel UI (Enable Format + Preview + Download)

## Priority: P0
## Track: DEFAULT
## Depends On: TASK-023, TASK-024

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `app/create/ads/page.tsx` — existing ads page (modify this)
3. `app/create/ads/page.module.css` — existing ads styles
4. `app/create/layout.module.css` — shared 3-panel layout
5. `lib/create/carousel-types.ts` — carousel types

## Problem
The ads page currently has "Carousel (Coming in Phase 2b)" as a disabled option. We need to enable it and show a carousel-specific UI with slide preview and image generation.

## Wave 1: Enable Carousel Format

### File: `app/create/ads/page.tsx` (Modify)

- Remove the `[disabled]` attribute from the "Carousel" option
- When format = "Carousel", show additional controls:
  - Slide count selector: dropdown 3-7, default 5
  - Style picker: dropdown (Educational / Storytelling / Product Showcase / Testimonial)
- When format = "Carousel", the "Generate Ad Variants" button changes to "Generate Carousel"
- Generate button calls `/api/create/carousel` instead of `/api/create/ad`

## Wave 2: Carousel Preview

### File: `app/create/ads/page.tsx` (Modify) + new component

When carousel is generated, show:

1. **Carousel theme banner** — shows the unifying visual concept
2. **Horizontal scrollable slide strip** — each slide as a card:
   - Role badge (color-coded): hook=purple, problem=red, agitate=orange, solution=green, proof=blue, cta=gold
   - Slide number
   - Headline (bold)
   - Body text
   - Image placeholder (gray with camera icon) or generated image
   - Text overlay preview
   - CTA text (only on CTA slide)
3. **Caption section** — full Taglish caption + hashtags
4. **Per-slide actions:**
   - "Regenerate Text" — re-calls carousel API for just this slide (or full regen)
   - "Generate Image" — calls `/api/create/carousel/images` for this slide only
5. **Bulk actions:**
   - "Generate All Images" — generates images for all slides sequentially, shows progress
   - "Download All" — zips all generated images + a text file with copy

### Component: `components/create/CarouselSlideCard.tsx` (Create)

```typescript
interface CarouselSlideCardProps {
  slide: CarouselSlide
  imageUrl?: string | null
  isGeneratingImage?: boolean
  onGenerateImage: () => void
}
```

Use CSS modules (NOT inline styles). Follow the design system from TASK-022:
- Dark mode colors from `globals.css` variables
- Translucent badges (same pattern as QualityBadge)
- Consistent typography (var(--text-base), var(--text-sm))

### File: `components/create/CarouselSlideCard.module.css` (Create)
Dark-mode card styling matching SceneCard patterns.

## Wave 3: Image Generation Progress

When "Generate All Images" is clicked:
- Show a progress indicator: "Generating slide 1 of 5..."
- Each slide card updates individually as its image arrives
- If a slide fails, show error state on that card (not full page error)
- Other slides continue generating

State management:
```typescript
const [slideImages, setSlideImages] = useState<Record<number, string | null>>({})
const [generatingSlide, setGeneratingSlide] = useState<number | null>(null)
```

Call the images API once for all slides, or sequentially per slide — either works, but show progress per slide.

## Wave 4: Download

"Download All" button:
- If no images generated: download just the text (carousel copy as .txt or .md)
- If images generated: create a zip with:
  - `slide-1.png`, `slide-2.png`, etc.
  - `carousel-copy.txt` (all slide text + caption)
- Use client-side zip generation (JSZip or similar) or a server-side route

Simple approach: just offer individual slide image downloads (click to save) + a "Copy All Text" button. Skip zip for now if JSZip isn't already a dependency.

## Wave 5: Knowledge Used + Brand Voice

Same pattern as static ads:
- Show techniques_used with entry titles + category emojis
- Show brand_voice_score badge
- Actions above Knowledge Used (per TASK-022 fix)

## Verification
- [ ] Carousel format is selectable (not disabled)
- [ ] Slide count (3-7) and style selectors appear for carousel format
- [ ] Carousel generates with correct number of slides
- [ ] Each slide shows role badge, headline, body, image placeholder
- [ ] "Generate All Images" works with per-slide progress
- [ ] Individual slide image generation works
- [ ] Knowledge Used shows entry titles with emojis
- [ ] Brand voice score displays correctly
- [ ] All styles use CSS modules (no inline styles)
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `app/create/ads/page.tsx` | Modify | Enable carousel, add carousel-specific UI |
| `components/create/CarouselSlideCard.tsx` | Create | Slide preview card |
| `components/create/CarouselSlideCard.module.css` | Create | Dark-mode slide card styles |
| `app/create/ads/page.module.css` | Modify | Add carousel-specific styles if needed |
