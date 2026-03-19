# TASK-023: Carousel Generation API

## Priority: P0
## Track: DEFAULT

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `lib/create/ad-generator.ts` — existing ad copy generator (follow same patterns)
3. `lib/create/kb-retriever.ts` — KB retrieval (reuse `getAdGenerationContext`)
4. `lib/create/shortform-prompt.ts` — prompt building patterns
5. `app/api/create/ad/route.ts` — existing ad API route pattern
6. `specs/phase-2b-carousel-learning.md` — full Phase 2b spec

## Wave 1: Carousel Types

### File: `lib/create/carousel-types.ts` (Create)

```typescript
export interface CarouselGenerationRequest {
  product_name: string
  offer_details?: string
  objective: 'conversions' | 'awareness' | 'traffic'
  platform: 'facebook' | 'instagram'
  slide_count: number  // 3-7
  style: 'educational' | 'storytelling' | 'product-showcase' | 'testimonial'
}

export type SlideRole = 'hook' | 'problem' | 'agitate' | 'solution' | 'proof' | 'cta'

export interface CarouselSlide {
  slide_number: number
  role: SlideRole
  headline: string
  body_text: string
  visual_description: string
  image_prompt: string
  text_overlay: string
  cta_text?: string
}

export interface CarouselGenerationResponse {
  slides: CarouselSlide[]
  carousel_theme: string
  caption: string
  hashtags: string[]
  techniques_used: Array<{
    entry_id: string
    entry_title: string
    category: string
    how_applied: string
  }>
  brand_voice_score: number
  generation_provenance: {
    model: string
    entries_loaded: Array<{ id: string; title: string; category: string }>
    tier: 'approved' | 'candidate'
    total_loaded: number
  }
}
```

## Wave 2: Carousel Prompt Builder

### File: `lib/create/carousel-prompt.ts` (Create)

Build the prompt that generates carousel copy. Follow the same patterns as `shortform-prompt.ts`:

1. Load brand style guide (voice rules, tone, Taglish ratio, banned words)
2. Load KB entries by category (use `getAdGenerationContext` — same categories work for carousel)
3. Structure the prompt with:
   - Brand voice rules section
   - Available hooks and frameworks from KB
   - Carousel-specific narrative arc rules (see spec)
   - Slide role assignments based on `slide_count`:
     - 3 slides: hook → solution+proof → cta
     - 4 slides: hook → problem → solution+proof → cta
     - 5 slides: hook → problem → agitate → solution → cta
     - 6 slides: hook → problem → agitate → solution → proof → cta
     - 7 slides: hook → problem → agitate → solution → proof → testimonial → cta
   - Style-specific instructions (educational = data-heavy; storytelling = first-person; product-showcase = feature-focused; testimonial = social proof heavy)
4. Request JSON output matching `CarouselGenerationResponse`
5. Include KB entry IDs in context so LLM can cite `techniques_used`

**Important:** Each slide's `image_prompt` must include:
- The `carousel_theme` for visual consistency
- Brand color palette from brand style guide
- "Maintain consistent visual style across all slides"
- The specific visual content for that slide

## Wave 3: Carousel Generator

### File: `lib/create/carousel-generator.ts` (Create)

Follow the pattern from `ad-generator.ts`:
1. Load brand style guide (`.limit(1).single()`)
2. Load KB context via `getAdGenerationContext(25)`
3. Build prompt via `buildCarouselPrompt()`
4. Call Gemini (same model as ad generator)
5. Parse JSON response
6. Run brand voice scorer on combined carousel text
7. Return `CarouselGenerationResponse`

**Handle JSON parsing defensively** — same pattern as ad-generator (strip markdown fences, try/catch).

## Wave 4: API Route

### File: `app/api/create/carousel/route.ts` (Create)

```typescript
export async function POST(request: NextRequest) {
  // 1. Auth check (same as ad route)
  // 2. Parse body as CarouselGenerationRequest
  // 3. Validate: product_name required, slide_count 3-7
  // 4. Call generateCarousel()
  // 5. Return response
}
```

Validation:
- `product_name` required
- `slide_count` must be 3-7 (default 5)
- `objective` must be valid enum
- `style` must be valid enum

## Verification
- [ ] Types compile clean
- [ ] `POST /api/create/carousel` returns valid carousel with correct slide count
- [ ] Each slide has a role matching the narrative arc
- [ ] Image prompts include brand colors and consistency instructions
- [ ] `techniques_used` populated with real KB entry IDs
- [ ] Brand voice score calculated
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `lib/create/carousel-types.ts` | Create | Type definitions |
| `lib/create/carousel-prompt.ts` | Create | Prompt builder |
| `lib/create/carousel-generator.ts` | Create | Generation orchestrator |
| `app/api/create/carousel/route.ts` | Create | API route |
