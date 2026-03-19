# TASK-016: Gemini Image Generation API

## Priority: P1
## Track: DEFAULT
## Depends on: TASK-014

## Overview
Build the image generation API using Gemini Nano Banana Pro. Supports product shots, lifestyle images, promotional graphics, faceless quotes, and creator-featured content with brand consistency.

## Reference Files to Read
1. `references/ARCHITECTURE.md` — project structure
2. `specs/phase-2a-ad-copy-static.md` — full spec
3. `lib/brand/types.ts` — brand types (BrandStyleGuide, ReferenceImage)
4. `app/actions/brand.ts` — how to load brand_style_guide from Supabase

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Important: Use the nano-banana-pro Skill Script

**DO NOT hand-roll Gemini API calls.** Use the installed skill script at:
```
/home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py
```

**Key capabilities:**
- Character consistency across up to 5 subjects
- Up to 14 reference images via `-i` flag
- Resolutions: 1K (default), 2K, 4K
- Aspect ratios: 1:1, 4:5, 9:16, 16:9, etc.
- Handles API key via `GEMINI_API_KEY` env var

**Usage patterns:**

Generate a new image:
```bash
uv run /home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "your brand-prepended prompt" \
  --filename "/path/to/output.png" \
  --resolution 2K \
  --aspect-ratio 1:1
```

Generate with reference images (for brand/character consistency):
```bash
uv run /home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "ad image matching brand style of references" \
  --filename "/path/to/output.png" \
  -i /path/to/reference1.png \
  -i /path/to/reference2.png \
  --resolution 2K
```

**In the Next.js API route:** use `child_process.execFile` or `execa` to shell out to this script. Do NOT reimplement the Gemini image API in TypeScript.

## Wave 1: Types + Supabase Storage Setup

### File: `lib/create/image-types.ts`
```typescript
export type ImageStyle = 'product_shot' | 'lifestyle' | 'promotional' | 'faceless_quote' | 'creator_featured'
export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16'

export interface ImageGenerationRequest {
  prompt: string
  style: ImageStyle
  aspect_ratio: AspectRatio
  reference_images?: string[]  // Supabase Storage paths
}

export interface ImageGenerationResponse {
  image_url: string           // Supabase Storage public URL
  storage_path: string        // Path in ad-creatives bucket
  prompt_used: string         // Final prompt with brand guide
  model: string
}
```

### Supabase Storage
Ensure bucket `ad-creatives` exists (should be created by TASK-014 migration).
If not, create via Supabase dashboard or SQL.

## Wave 2: Image Generation Logic

### File: `lib/create/image-generator.ts`

Core function `generateAdImage(request: ImageGenerationRequest)`:
1. Load brand_style_guide from Supabase
2. Build prompt prefix from brand guide:
   - Color palette: "Use these brand colors: {hex codes and usage}"
   - Photography style: "{photography_style}"
   - Product styling: "{product_styling_rules}"
   - For `creator_featured`: append creator_description + wardrobe_notes
   - For `faceless_quote`: "Use brand colors {palette}, clean typography, no faces"
3. Combine prefix + user prompt
4. If reference_images provided: download from Supabase Storage to temp dir
5. Shell out to nano-banana-pro script:
   ```typescript
   import { execFile } from 'child_process'
   
   const args = [
     'run',
     '/home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py',
     '--prompt', fullPrompt,
     '--filename', outputPath,
     '--resolution', '2K',
     '--aspect-ratio', request.aspect_ratio,
   ]
   // Add reference images
   for (const ref of localRefPaths) {
     args.push('-i', ref)
   }
   execFile('uv', args, { env: { ...process.env } })
   ```
6. Read output file, upload to Supabase Storage: `ad-creatives/{user_id}/{date}/{uuid}.png`
7. Return public URL + storage path

### File: `app/api/create/image/route.ts`
POST handler:
- Auth check
- Validate request
- Call image-generator
- Return ImageGenerationResponse

## Wave 3: Verify

```bash
npx next dev --port 3100
```

Test via browser:
1. Login as grace@ghcreative.test
2. Call API with a test prompt (can use browser dev tools or a test page)
3. Verify image is generated and uploaded to Supabase Storage
4. Verify brand guide was prepended to prompt

- [ ] Image generated via Gemini
- [ ] Image uploaded to Supabase Storage
- [ ] Brand guide prepended to every prompt
- [ ] Reference images work (if configured)
- [ ] Multiple aspect ratios work
- [ ] `next build` passes
- [ ] Screenshot of generated image saved to `qa/TASK-016-image-gen.png`

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `lib/create/image-types.ts` | Create | Image generation type definitions |
| `lib/create/image-generator.ts` | Create | Core image generation + upload logic |
| `app/api/create/image/route.ts` | Create | API route handler |
