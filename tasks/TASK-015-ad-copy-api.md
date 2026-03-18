# TASK-015: Ad Copy Generation API

## Priority: P1
## Track: DEFAULT
## Depends on: TASK-014

## Overview
Build the ad copy generation API that produces 3-5 copy variants per request, each annotated with framework used, brand voice score, and provenance chain.

## Reference Files to Read
1. `references/ARCHITECTURE.md` — project structure
2. `references/AD-FRAMEWORKS.md` — ad copy frameworks (created in TASK-014)
3. `specs/phase-2a-ad-copy-static.md` — full spec
4. `lib/create/kb-retriever.ts` — how short-form retrieves KB entries (reuse pattern)
5. `lib/eval/quality-gate.ts` — brand voice scorer (reuse for ad scoring)
6. `app/api/create/short-form/route.ts` — existing generation route (follow same patterns)
7. `lib/brand/types.ts` — brand types

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Wave 1: Types + KB Retriever Extension

### File: `lib/create/ad-types.ts`
```typescript
export type AdObjective = 'conversions' | 'awareness' | 'traffic'
export type AdFormat = 'static' | 'video_script'
export type AdPlatform = 'facebook' | 'instagram'
export type AdFramework = 'PAS' | 'AIDA' | 'before_after' | 'social_proof' | 'urgency' | 'FAB'

export interface AdGenerationRequest {
  product: string
  offer_details: string
  objective: AdObjective
  ad_format: AdFormat
  platform: AdPlatform
  tone_override?: string
}

export interface AdVariant {
  id: string
  headline: string
  primary_text: string
  description: string
  cta: string
  framework_used: AdFramework
  framework_explanation: string
  image_prompt: string
  brand_voice_score: number
  knowledge_entries_used: string[]
}

export interface AdGenerationResponse {
  variants: AdVariant[]
  generation_provenance: {
    model: string
    kb_entries_loaded: number
    brand_guide_version: string
  }
}
```

### File: `lib/create/kb-retriever.ts` (Modify)
Add function to retrieve ad-specific KB entries:
- Pull from categories: "Ad Creative Frameworks", "Hook Library", "CRO / Conversion Patterns", "Brand Identity"
- Filter by lane: "ads"
- Sort by effectiveness_score DESC
- Limit to top 15 entries for context window management

## Wave 2: Ad Copy Generation Logic

### File: `lib/create/ad-generator.ts`
Core generation function:
1. Load brand_style_guide (mandatory — fail if not found)
2. Load AD-FRAMEWORKS.md reference content
3. Retrieve top KB entries for ads (via kb-retriever)
4. Build prompt:
   - System: Brand voice rubric + framework definitions
   - User: Product, offer, objective, format, platform
   - Instructions: Generate exactly 3-5 variants, each using a DIFFERENT framework. Include Taglish naturally. Each variant must have headline, primary_text, description, CTA, and an image generation prompt.
5. Call Gemini (same model as short-form generation)
6. Parse structured JSON response
7. Score each variant against brand voice rubric (reuse quality-gate.ts scorer)
8. Attach provenance (which KB entries were loaded, model used)

### File: `app/api/create/ad/route.ts`
POST handler:
- Auth check (redirect if not authenticated)
- Validate request body
- Call ad-generator
- Save to content_items with content_type='ad-static' or 'ad-video-script'
- Return AdGenerationResponse

## Wave 3: Verify

```bash
# Start dev server
npx next dev --port 3100

# Test via curl (need auth cookie — or test via browser)
# Verify via browser: login → navigate to API test or use the UI (TASK-016)
```

- [ ] API returns 3-5 variants with different frameworks
- [ ] Each variant has brand_voice_score
- [ ] Each variant has image_prompt
- [ ] Provenance chain included
- [ ] Saved to content_items
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `lib/create/ad-types.ts` | Create | Ad generation type definitions |
| `lib/create/ad-generator.ts` | Create | Core ad copy generation logic |
| `lib/create/kb-retriever.ts` | Modify | Add ad-specific KB retrieval |
| `app/api/create/ad/route.ts` | Create | API route handler |
