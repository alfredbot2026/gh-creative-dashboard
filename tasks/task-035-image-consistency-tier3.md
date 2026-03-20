# TASK-035: Image Consistency Tier 3 — Multi-Turn + Anchor Chain

## Reference Files to Read
- `consistency-tests/RESEARCH-FINDINGS.md` — Full research on what works and what doesn't
- `lib/create/image-generator-api.ts` — Current image generation code (replace)
- `lib/create/image-types.ts` — Current types (extend)
- `app/api/create/image/route.ts` — Current image API route
- `app/api/create/generate/route.ts` — Main generation endpoint (calls image gen)
- `public/grace-reference.jpg` — Best frontal reference photo of Grace
- `public/grace-ref-1.jpg`, `public/grace-ref-3.jpg` — Additional reference photos
- `LESSONS-LEARNED.md` — Read before starting
- `BEST-PRACTICES.md` — Read before starting

## Overview
Rewrite the image generation system to achieve ~9/10 character consistency for Grace using:
1. **Model upgrade** to `gemini-3.1-flash-image-preview` (Nano Banana 2)
2. **Multi-turn conversation** via `@google/genai` SDK's `ai.chats.create()` — lock Grace's identity in Turn 1, generate variants in subsequent turns
3. **Anchor chain** — generate one "golden anchor" image, then use it as the primary reference for all subsequent generations
4. **Fix Supabase storage** — reference images must be accessible

## Wave 1: Fix Reference Image Access + Model Upgrade

### 1a. Store reference images locally (bypass Supabase storage issue)
- **File:** `lib/create/reference-images.ts` (Create)
- Read `public/grace-reference.jpg`, `public/grace-ref-1.jpg`, `public/grace-ref-3.jpg` at build time
- Export a function `getGraceReferenceImages()` that returns the images as base64 buffers
- This is the fallback — Supabase storage paths are broken (signed URLs fail with anon key)
- If `brand_persona.reference_images` paths fail to resolve, use local files

### 1b. Update model constant
- **File:** `lib/create/image-generator-api.ts` (Modify)
- Change `GEMINI_MODEL` from `gemini-3-pro-image-preview` to `gemini-3.1-flash-image-preview`
- This is the newer model with dedicated character consistency support

### Verify Wave 1:
```bash
npx tsc --noEmit
```

## Wave 2: Multi-Turn Conversation Engine

### 2a. Create conversation-based image generator
- **File:** `lib/create/image-conversation.ts` (Create)
- Use `@google/genai` SDK v1.44.0 (already installed)
- Implement `GraceImageSession` class:

```typescript
import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'fs'
import { join } from 'path'

const MODEL = 'gemini-3.1-flash-image-preview'

export class GraceImageSession {
  private chat: any  // Chat instance from SDK
  private initialized = false
  private anchorImage: Buffer | null = null
  
  constructor(private apiKey: string) {}
  
  /**
   * Turn 1: Initialize session by locking Grace's identity
   * Send reference photo(s) + identity description
   * Returns the first generated "anchor" image
   */
  async initialize(referenceImages: Buffer[]): Promise<Buffer> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey })
    
    this.chat = ai.chats.create({
      model: MODEL,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      }
    })
    
    // Build message parts: reference images + identity lock prompt
    const parts: any[] = []
    
    // Add reference images (use 1-2 max, more causes drift)
    for (const img of referenceImages.slice(0, 2)) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img.toString('base64'),
        }
      })
    }
    
    // Identity lock prompt (positive framing per Google's guide)
    parts.push({
      text: `This is Grace, a Filipina woman in her early-to-mid 30s. She has a round, full face with soft prominent cheeks, light-medium warm skin tone, black long hair past her shoulders, and distinctive transparent peach/pink hexagonal glasses frames. She has a warm, natural smile.

Please remember Grace's exact appearance from these reference photos. I will ask you to generate images of her in different scenes. Always preserve her exact face shape, skin tone, hair, and glasses from the reference photos.

First, generate a clean portrait of Grace, head and shoulders, neutral background, warm natural lighting. This will be our reference anchor image.`
    })
    
    const response = await this.chat.sendMessage({ message: parts })
    
    // Extract the generated anchor image
    this.anchorImage = this.extractImage(response)
    this.initialized = true
    return this.anchorImage
  }
  
  /**
   * Turn 2+: Generate Grace in a new scene
   * Uses the locked identity from Turn 1
   */
  async generateScene(scenePrompt: string, aspectRatio?: string): Promise<Buffer> {
    if (!this.initialized) throw new Error('Session not initialized')
    
    const message: any[] = []
    
    // Optionally re-send anchor image for reinforcement
    if (this.anchorImage) {
      message.push({
        inlineData: {
          mimeType: 'image/png',
          data: this.anchorImage.toString('base64'),
        }
      })
    }
    
    message.push({
      text: `Using Grace from the reference photos and the anchor portrait above, generate her in this scene: ${scenePrompt}

Keep her exact face shape (round, full cheeks), skin tone, hair, and glasses. Lifestyle photography style, warm natural lighting.`
    })
    
    const response = await this.chat.sendMessage({ message })
    return this.extractImage(response)
  }
  
  private extractImage(response: any): Buffer {
    const candidates = response.candidates || []
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64')
        }
      }
    }
    throw new Error('No image in response')
  }
}
```

### 2b. Create session manager (caches sessions per user)
- **File:** `lib/create/session-manager.ts` (Create)
- In-memory cache of `GraceImageSession` instances per user
- Sessions expire after 30 minutes of inactivity
- On first image request: initialize session (generates anchor) → cache
- Subsequent requests: reuse cached session
- If session is expired or errored: create new one

```typescript
const sessions = new Map<string, { session: GraceImageSession, lastUsed: number }>()
const SESSION_TTL = 30 * 60 * 1000 // 30 minutes

export async function getOrCreateSession(userId: string, referenceImages: Buffer[]): Promise<GraceImageSession> {
  const cached = sessions.get(userId)
  if (cached && Date.now() - cached.lastUsed < SESSION_TTL) {
    cached.lastUsed = Date.now()
    return cached.session
  }
  
  const apiKey = process.env.GEMINI_API_KEY!
  const session = new GraceImageSession(apiKey)
  await session.initialize(referenceImages)
  sessions.set(userId, { session, lastUsed: Date.now() })
  return session
}
```

### Verify Wave 2:
```bash
npx tsc --noEmit
```

## Wave 3: Update API Routes

### 3a. Update the image generation API
- **File:** `app/api/create/image/route.ts` (Modify)
- Replace direct `generateImage()` call with session-based approach:
  1. Get/create session for user
  2. Call `session.generateScene(prompt)` 
  3. Return base64 data URL (same response format)
- Keep the existing response interface (`ImageGenerationResponse`)
- Fallback: if multi-turn fails (e.g., session error), fall back to single-shot with improved prompt

### 3b. Update the generate endpoint for 3-variant flow
- **File:** `app/api/create/generate/route.ts` (Modify)
- When generating 3 variants with images:
  1. Get/create session (initializes anchor if new)
  2. Generate all 3 scene variants within the SAME session (sequential, not parallel)
  3. This ensures all 3 variants share the same identity lock
- Important: sequential generation within one session, NOT 3 parallel sessions

### 3c. Create test route for experimentation
- **File:** `app/api/test/image-consistency/route.ts` (Create)
- GET endpoint, no auth required (dev only)
- Generates 3 images of Grace in different scenes using the multi-turn session
- Returns all 3 as base64 data URLs in JSON
- Purpose: Rob can test consistency without going through the full UI flow

### Verify Wave 3:
```bash
npm run build
```

## Wave 4: Anchor Management

### 4a. Store and reuse anchor images
- **File:** `lib/create/anchor-store.ts` (Create)
- After initial session generates an anchor, save it to `public/grace-anchor.png`
- On subsequent sessions, load the saved anchor instead of regenerating
- This means the SAME anchor image is used across all sessions = maximum consistency
- Include a "regenerate anchor" option for the test route

### 4b. Update session initialization to use stored anchor
- **File:** `lib/create/image-conversation.ts` (Modify)
- In `initialize()`: check if `public/grace-anchor.png` exists
  - If yes: load it as the anchor, skip generating a new one, but still send reference photos + anchor to lock identity
  - If no: generate new anchor and save it

### Verify Wave 4:
```bash
npm run build
# Then test via: curl http://localhost:3000/api/test/image-consistency
```

## Wave 5: Cleanup + Prompt Polish

### 5a. Remove old identity lock code
- **File:** `lib/create/image-generator-api.ts` (Modify)
- Keep the file but simplify — it's now the fallback path only
- Remove the massive `[CRITICAL IDENTITY LOCK]` prompt block
- Replace with the simple Google-recommended formula: `[Reference] + [Instruction] + [Scene]`

### 5b. Update prompt formula
In both `image-conversation.ts` and the fallback path, use Google's recommended formula:
- `[Reference images] + [Relationship instruction] + [New scenario]`
- Positive framing only: "round full face with soft cheeks" (NOT "do NOT slim face")
- Subject + Action + Location + Composition + Style format for scene prompts

### Verify Wave 5:
```bash
npm run build
```

## Final Verification
```bash
# Build
npm run build

# Start dev server
npm run dev &

# Test the consistency endpoint
curl -s http://localhost:3000/api/test/image-consistency | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log('Images generated:', data.images?.length || 0);
console.log('Anchor exists:', data.anchor ? 'yes' : 'no');
data.images?.forEach((img, i) => console.log('Image', i+1, ':', img.scene, '-', img.image_url ? 'OK' : 'FAIL'));
"
```

## Success Criteria
- All 3 variant images in a generation request look like the SAME person
- Anchor image is generated once and reused across sessions
- Multi-turn conversation maintains identity within a session
- Test route works and produces 3 consistent Grace images
- Build passes, no type errors
- Fallback to single-shot works if multi-turn fails

## Notes
- `@google/genai` v1.44.0 already installed
- SDK has `ai.chats.create()` for multi-turn, `chat.sendMessage({ message: parts })` for each turn
- `message` in `sendMessage` accepts `PartListUnion` — array of text/inlineData parts
- Model supports up to 4 character consistency reference images
- Sequential generation within session (NOT parallel) — the model needs to process each turn
