# TASK-054: Video Intelligence Pipeline + Ad Audit Page

## Overview
Two features: (1) Video ad understanding via Gemini multimodal analysis → enhanced classification, (2) Audit page to see/correct all ad classifications.

## Reference Files (READ FIRST)
- `references/ARCHITECTURE.md` — tech stack, file layout
- `lib/ads/classifier.ts` — current classifier (text-only, needs video context)
- `app/api/ads/creatives/sync/route.ts` — current sync flow
- `lib/llm/client.ts` — LLM client (Gemini SDK available)
- `supabase/migrations/021_ad_creatives.sql` — current schema

## Wave 1: Database + Video Analysis Library (~2 hrs)

### 1a. Migration `024_video_intelligence.sql`
Create in `supabase/migrations/024_video_intelligence.sql`:

```sql
-- Add video intelligence columns to ad_creatives
ALTER TABLE ad_creatives
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_transcription TEXT,
  ADD COLUMN IF NOT EXISTS frame_descriptions JSONB,  -- [{timestamp_s: number, description: string}]
  ADD COLUMN IF NOT EXISTS video_analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_analysis_model TEXT;
```

### 1b. Video Analyzer — `lib/ads/video-analyzer.ts`
Create `lib/ads/video-analyzer.ts`:

**Purpose:** Fetch Meta video URL, send to Gemini for unified audio transcription + visual analysis.

**Implementation:**
```typescript
import { GoogleGenAI } from '@google/genai'

interface VideoAnalysis {
  transcription: string         // full spoken text from the video
  frame_descriptions: Array<{   // key moments described
    timestamp_s: number
    description: string
  }>
  summary: string               // 1-2 sentence summary of what the ad shows/says
}

/**
 * Fetch the video source URL from Meta Graph API.
 * GET /{video_id}?fields=source
 * The `source` field returns a direct download URL.
 */
export async function getMetaVideoUrl(videoId: string, accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${videoId}?fields=source`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.source || null
}

/**
 * Analyze a video ad using Gemini's multimodal capabilities.
 * Downloads video, sends to Gemini for transcription + visual analysis.
 * 
 * Uses Gemini's File API to upload the video, then analyze it.
 */
export async function analyzeAdVideo(videoUrl: string): Promise<VideoAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  
  const ai = new GoogleGenAI({ apiKey })
  
  // Download video to buffer (Meta video URLs are temporary, need to be fetched)
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  
  // Upload to Gemini Files API
  const uploadResult = await ai.files.upload({
    file: new Blob([videoBuffer], { type: 'video/mp4' }),
    config: { mimeType: 'video/mp4' }
  })
  
  // Wait for processing
  let file = uploadResult
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 2000))
    file = await ai.files.get({ name: file.name! })
  }
  if (file.state !== 'ACTIVE') throw new Error(`Video processing failed: ${file.state}`)
  
  // Analyze with Gemini
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: file.uri!, mimeType: 'video/mp4' } },
          { text: `Analyze this ad video. Return JSON only (no markdown):

{
  "transcription": "Full verbatim transcription of ALL spoken words in the video. Include everything said.",
  "frame_descriptions": [
    {"timestamp_s": 0, "description": "What's shown at this moment"},
    {"timestamp_s": 5, "description": "What's shown at this moment"}
  ],
  "summary": "1-2 sentence summary of the ad's message and visual content"
}

For frame_descriptions, capture key visual moments every ~3-5 seconds:
- What products/people/scenes are shown
- Any text overlays or graphics
- Visual transitions or before/after shots
- The hook (first 1-3 seconds)
- The CTA/ending

For transcription: capture EVERY word spoken. This is critical for ad classification.` }
        ]
      }
    ],
    config: { temperature: 0.2 }
  })
  
  const text = response.text || ''
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  
  try {
    return JSON.parse(cleaned) as VideoAnalysis
  } catch {
    // Fallback: return raw text as transcription
    return {
      transcription: cleaned,
      frame_descriptions: [],
      summary: 'Analysis completed but JSON parsing failed'
    }
  }
}
```

**Verification:** `npx tsc --noEmit lib/ads/video-analyzer.ts` — should compile without errors.

### 1c. Enhance Classifier — Update `lib/ads/classifier.ts`

**Changes to `classifyBatch` function:**

The `AdCreativeInput` interface needs new optional fields:
```typescript
export interface AdCreativeInput {
  // ... existing fields ...
  video_transcription?: string | null
  frame_descriptions?: Array<{ timestamp_s: number; description: string }> | null
}
```

In `classifyBatch`, update the `adsBlock` construction to include video context when available:

After the existing `</ad_content>` block, add:
```typescript
ad.video_transcription ? `Video Transcription: ${sanitize(ad.video_transcription, 1500)}` : null,
ad.frame_descriptions?.length ? `Video Visuals: ${ad.frame_descriptions.map(f => `[${f.timestamp_s}s] ${sanitize(f.description, 200)}`).join(' | ')}` : null,
```

This gives the classifier the full picture: caption + spoken words + visual content.

**Verification:** Build compiles. The existing SYSTEM_PROMPT already handles visual context, just now it gets actual video content instead of just thumbnail URL.

## Wave 2: Enhanced Sync with Video Analysis (~1 hr)

### 2a. Update `app/api/ads/creatives/sync/route.ts`

After the existing upsert loop (step 4), add a new step before classification:

**Step 4.5: Video Analysis**
```
// Analyze video ads that haven't been analyzed yet
const { data: videoAds } = await supabase
  .from('ad_creatives')
  .select('id, meta_ad_id, creative_format')
  .eq('user_id', userId)
  .eq('creative_format', 'video')
  .is('video_analyzed_at', null)

if (videoAds?.length) {
  // Get access token for video download
  for (const ad of videoAds) {
    try {
      // Fetch video_id from the original Meta data (stored during upsert)
      // The Meta ad ID can be used to get the video
      const videoUrl = await getMetaVideoUrl(ad.meta_ad_id, accessToken)
      if (!videoUrl) continue
      
      const analysis = await analyzeAdVideo(videoUrl)
      
      await supabase.from('ad_creatives').update({
        video_url: videoUrl,
        video_transcription: analysis.transcription,
        frame_descriptions: analysis.frame_descriptions,
        video_analyzed_at: new Date().toISOString(),
        video_analysis_model: 'gemini-3-flash-preview',
      }).eq('id', ad.id)
      
      // Rate limit: 2 second delay between video analyses
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`[Video Analysis] Failed for ad ${ad.id}:`, err)
      // Continue with next ad — don't fail the whole sync
    }
  }
}
```

Also update the classification step to include video data:
```
// When building inputs for classification, include video fields
const inputs: AdCreativeInput[] = toClassify.map((c: any) => ({
  // ... existing fields ...
  video_transcription: c.video_transcription,
  frame_descriptions: c.frame_descriptions,
}))
```

**Important:** Add `import { getMetaVideoUrl, analyzeAdVideo } from '@/lib/ads/video-analyzer'` at top.

**Important:** The video analysis needs the ad's video_id, not meta_ad_id. Update the upsert in step 4 to also store the video_id:
- Add `video_id: creative.video_id || null` to the upsert row
- Add `video_id TEXT` to the migration (1a)

### 2b. Standalone Video Analysis API — `app/api/ads/creatives/analyze-video/route.ts`

Create endpoint to trigger video analysis for specific ads (used by audit page):

```typescript
// POST /api/ads/creatives/analyze-video
// Body: { adCreativeId: string }
// Analyzes a single ad's video and re-classifies it
```

**Verification:** 
- Run `npx next build` — should compile
- Test: `curl -X POST http://localhost:3000/api/ads/creatives/sync -H "Content-Type: application/json" -d '{"reclassify": true}'`

## Wave 3: Audit Page UI (~3 hrs)

### 3a. API: `app/api/ads/creatives/route.ts` — Add correction support

The existing GET already returns creatives. Add PATCH support:

```typescript
// PATCH /api/ads/creatives
// Body: { id: string, corrections: { angle?, persona?, framework?, hook_type?, offer_type?, emotional_tone? } }
// Updates classification fields + sets classification_version to 'manual'
```

### 3b. Page: `app/ads/audit/page.tsx`

Create the audit page with these sections:

**Layout:** Full-width table/card view

**Header:**
- Title: "Ad Classification Audit"
- Stats bar: Total ads | Classified | Video analyzed | Avg confidence
- Action buttons: "Sync Now" (triggers /api/ads/creatives/sync), "Reclassify All" (with reclassify=true)

**Filters:**
- Format: All / Static / Video / Carousel
- Confidence: All / Low (<0.6) / Medium (0.6-0.8) / High (>0.8)
- Status: All / Winning / Weak / Tired / Dead / New
- Classification version: All / v1 / manual

**Table/Cards:**
Each ad shows:
- **Left:** Thumbnail (image_url or video_thumbnail_url) — small
- **Middle:**
  - Ad name (truncated)
  - Campaign > Ad Set (small text)
  - Format badge (Static/Video/Carousel)
  - Performance: Spend / ROAS / CPA / Status badge
- **Classification chips** (editable):
  - Angle | Persona | Framework | Hook Type | Offer Type | Emotional Tone
  - Each chip is a dropdown — click to change (updates via PATCH)
  - Confidence indicator (green/yellow/red dot)
- **"What AI Saw" expandable section:**
  - Caption/Body text
  - Video transcription (if video)
  - Frame descriptions timeline (if video)
  - Classifier reasoning

**Styling:** Match existing dark theme. Use CSS modules. Reference `app/ads/page.tsx` for pattern.

### 3c. Inline Correction Component — `components/ads/ClassificationChip.tsx`

Reusable component:
- Shows current value as a chip/badge
- On click: dropdown with all valid values for that dimension
- On select: calls PATCH API, updates locally
- Visual indicator when manually corrected (different border/badge)

**Verification:**
- Page loads at `/ads/audit`
- All ads displayed with classifications
- Click any classification chip → dropdown appears with valid options
- Select new value → saves immediately (check DB)
- "What AI Saw" expands to show transcription for video ads
- Filters work correctly

## Wave 4: Reclassify + Test (~1 hr)

### 4a. Run full sync with video analysis

After all code is deployed:
1. Run migration: `supabase db push` or apply SQL manually
2. Trigger sync: `POST /api/ads/creatives/sync` with `{ "reclassify": true }`
3. Wait for video analysis to complete (may take a few minutes for all video ads)
4. Verify in DB: video ads should now have `video_transcription` and `frame_descriptions`
5. Verify classifications changed/improved for video ads

### 4b. Test the audit page
1. Navigate to `/ads/audit`
2. Verify all ads appear with classifications
3. Filter to video ads → verify transcription shows in "What AI Saw"
4. Edit a classification → verify it persists
5. Check that confidence indicators make sense

## Final Verification
```bash
npx next build  # Must pass
# Dev server test
npx next dev &
# Test endpoints
curl http://localhost:3000/ads/audit  # Should render
curl -X POST http://localhost:3000/api/ads/creatives/sync -d '{}' -H "Content-Type: application/json"
```

## Files to Create/Modify
| File | Action | What |
|------|--------|------|
| `supabase/migrations/024_video_intelligence.sql` | CREATE | New columns for video analysis |
| `lib/ads/video-analyzer.ts` | CREATE | Gemini video analysis library |
| `lib/ads/classifier.ts` | MODIFY | Add video context to classification |
| `app/api/ads/creatives/sync/route.ts` | MODIFY | Add video analysis step |
| `app/api/ads/creatives/analyze-video/route.ts` | CREATE | Single-ad video analysis API |
| `app/api/ads/creatives/route.ts` | MODIFY | Add PATCH for corrections |
| `app/ads/audit/page.tsx` | CREATE | Audit page UI |
| `app/ads/audit/page.module.css` | CREATE | Audit page styles |
| `components/ads/ClassificationChip.tsx` | CREATE | Inline correction component |
| `components/ads/ClassificationChip.module.css` | CREATE | Chip styles |

## Track: DEFAULT (Blackwidow → build + self-verify → Bruce smoke test)
