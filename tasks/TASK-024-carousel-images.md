# TASK-024: Carousel Image Generation (Sequential + Consistent)

## Priority: P0
## Track: DEFAULT
## Depends On: TASK-023

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `lib/create/image-generator.ts` — existing image generator (reuse pattern)
3. `lib/create/carousel-types.ts` — carousel types from TASK-023
4. `specs/phase-2b-carousel-learning.md` — full spec

## Problem
Carousel slides need visually consistent images — same color palette, same style, same mood. We already have `generateAdImage()` for single images. We need a wrapper that generates images sequentially with style consistency.

## Wave 1: Carousel Image Generator

### File: `lib/create/carousel-image-generator.ts` (Create)

```typescript
export interface CarouselImageRequest {
  slides: CarouselSlide[]
  carousel_theme: string
  userId: string
}

export interface CarouselImageResult {
  slide_number: number
  image_url: string | null  // signed URL from Supabase Storage
  storage_path: string | null
  error?: string
}

export async function generateCarouselImages(
  request: CarouselImageRequest
): Promise<CarouselImageResult[]> {
  // 1. Load brand style guide (same as image-generator.ts)
  // 2. Build a "style preamble" from slide 1's visual + carousel_theme + brand colors
  // 3. For each slide sequentially:
  //    a. Build prompt: style preamble + slide.image_prompt + "Slide N of M in carousel"
  //    b. Add: "Maintain identical visual style, color palette, typography treatment as slide 1"
  //    c. Call existing Gemini image generation (same shell script pattern as image-generator.ts)
  //    d. Upload to Supabase Storage: ad-creatives/{userId}/carousel-{timestamp}/slide-{N}.png
  //    e. Get signed URL (3600s)
  //    f. Collect result
  // 4. Return all results (some may have errors — don't fail entire batch)
}
```

**Key points:**
- Sequential generation (not parallel) — each slide builds on the style context
- Use same `ad-creatives` bucket (already has RLS)
- Storage path: `{userId}/carousel-{timestamp}/slide-{N}.png` — groups slides together
- Handle individual slide failures gracefully (return `error` string, continue with next)
- Signed URLs (3600s) — bucket is private (TASK-018)

## Wave 2: API Route for Carousel Images

### File: `app/api/create/carousel/images/route.ts` (Create)

```typescript
export async function POST(request: NextRequest) {
  // 1. Auth check
  // 2. Parse body: { slides: CarouselSlide[], carousel_theme: string }
  // 3. Call generateCarouselImages({ slides, carousel_theme, userId: user.id })
  // 4. Return results array
}
```

This is a separate endpoint from carousel text generation because:
- Image gen takes longer (~10-15s per slide × 5 slides = 50-75s)
- UI can show text immediately, then generate images on demand
- User might want to regenerate individual slide images

## Verification
- [ ] Carousel images generate for 5 slides without crashing
- [ ] All images stored in same folder: `{userId}/carousel-{timestamp}/`
- [ ] Signed URLs work (can view images)
- [ ] Individual slide failure doesn't kill the batch
- [ ] Brand style guide prefix included in every image prompt
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `lib/create/carousel-image-generator.ts` | Create | Sequential image generator |
| `app/api/create/carousel/images/route.ts` | Create | API route for carousel images |
