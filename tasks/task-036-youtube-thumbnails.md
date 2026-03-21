# TASK-036: YouTube Thumbnail Generation

## Reference Files to Read
- `app/api/create/youtube-script/route.ts` — Current script gen (has thumbnail_concept in output)
- `app/create/youtube/page.tsx` — Current UI (add thumbnail display)
- `lib/create/image-conversation.ts` — Multi-turn Grace image session
- `lib/create/session-manager.ts` — Session management
- `lib/create/image-generator-api.ts` — Single-shot image gen (fallback)
- `app/api/create/image/route.ts` — Image API route (reference for pattern)
- `LESSONS-LEARNED.md` — Read before starting
- `BEST-PRACTICES.md` — Read before starting

## Overview
After YouTube script generation, auto-generate 3 thumbnail image variants based on the `thumbnail_concept` from the script output. Display in the UI with select/regenerate functionality.

## Wave 1: Thumbnail API

### 1a. Create thumbnail generation endpoint
- **File:** `app/api/create/youtube-thumbnail/route.ts` (Create)
- POST endpoint
- Input: `{ thumbnail_concept: string, title: string, userId?: string }`
- Generate 3 thumbnail variants:
  - Use the multi-turn Grace image session via `getOrCreateSession()`
  - Aspect ratio: 16:9 (YouTube standard)
  - Prompt formula: `[thumbnail_concept] + YouTube thumbnail style + bold text overlay reading "[title]"`
  - Each variant should have slightly different framing/angle
- If multi-turn fails, fall back to single-shot `generateImage()`
- Return: array of 3 `{ image_url: string (data URL), variant: number }`
- Important: generate SEQUENTIALLY within same session (not parallel)

### Verify Wave 1:
```bash
npx tsc --noEmit
```

## Wave 2: UI Integration

### 2a. Add thumbnail section to YouTube result
- **File:** `app/create/youtube/page.tsx` (Modify)
- After script generation succeeds, show a "Generate Thumbnails" button
- On click: call the thumbnail API with the `thumbnail_concept` + selected title
- Show loading state with progress (generating 1/3, 2/3, 3/3)
- Display 3 thumbnail images in a grid (16:9 cards)
- Each thumbnail has:
  - "Select" radio/checkbox to pick the primary thumbnail
  - "Regenerate" button to regenerate just that one
- Selected thumbnail should be highlighted

### 2b. Add thumbnail to save flow
- **File:** `app/create/youtube/page.tsx` (Modify)
- When saving to library (TASK-037), include the selected thumbnail
- Store thumbnail data URL in the script_data JSON

### Verify Wave 2:
```bash
npm run build
```

## Final Verification
```bash
npm run build
npm run dev
# Test: generate a YouTube script, click "Generate Thumbnails"
# Verify: 3 thumbnails appear in 16:9 format
# Verify: can select and regenerate individual thumbnails
```

## Success Criteria
- "Generate Thumbnails" button appears after script generation
- 3 thumbnail variants generated in 16:9 format
- Each thumbnail uses the script's thumbnail_concept
- Can select/regenerate individual thumbnails
- Selected thumbnail saved with script when using Save to Library
- Build passes, no type errors

## Notes
- Thumbnails are P1 because they're the biggest user-facing gap
- YouTube thumbnails typically feature: bold text, expressive face, contrasting colors
- The thumbnail prompt should emphasize YouTube thumbnail style conventions
- Grace should appear in thumbnails when the concept mentions her
