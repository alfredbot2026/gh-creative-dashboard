# Research: Gemini API for YouTube Video Analysis

> Date: 2026-03-21 | Researcher: Dr. Strange (Coding Lead)

## Key Finding: Gemini Can Process YouTube URLs Directly

**No need to download videos.** Gemini API accepts YouTube URLs natively as `fileData` parts.

### API Usage (JavaScript / @google/genai)

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: [{
    role: 'user',
    parts: [
      {
        fileData: {
          fileUri: 'https://www.youtube.com/watch?v=VIDEO_ID',
          mimeType: 'video/*',
        },
        // Optional: clip to specific segment
        videoMetadata: {
          startOffset: '0s',
          endOffset: '60s',
        }
      },
      { text: 'Your prompt here' }
    ]
  }]
});
```

### What Gemini Can Extract from Videos
1. **Full transcript** — spoken words with timestamps
2. **Visual description** — what's shown on screen
3. **Scene segmentation** — different sections/topics
4. **Hook analysis** — what happens in first 3-5 seconds
5. **Retention predictors** — pacing, topic changes, visual variety
6. **Thumbnail relevance** — does thumbnail match content?
7. **CTA identification** — when and how CTAs are presented
8. **Production quality** — lighting, audio, framing assessment

### Advantages over YouTube Captions API
- Works even when auto-captions are disabled
- Gives VISUAL context (not just audio/text)
- Can analyze thumbnail effectiveness
- Can identify visual hooks, B-roll transitions, text overlays
- Single API call = transcript + visual analysis + classification

### Rate Limits (Free Tier — Gemini 3 Flash)
- **RPM:** 15 requests/minute (free), 150+ (paid)
- **RPD:** 1,500 requests/day (free)
- **TPM:** Varies, but video counts as ~258 tokens/sec of video
- A 60-second video ≈ ~15,000 tokens input

### Rate Limit Strategy for 458 YouTube Videos
- At 15 RPM free tier: **30 videos/hour** (with safety margin)
- Full 458 videos: **~16 hours** at free tier
- At paid tier (150 RPM): **~1.5 hours**
- **Recommended:** Run as background job over 2-3 days at free tier
  - Batch 1: Most viewed 50 videos → immediate insights
  - Batch 2: Next 100 → within 24h
  - Batch 3: Remaining 308 → next 48h
  - Priority by view count (highest value videos first)

### Cost Estimate (Paid Tier)
- Input: ~15k tokens per video × 458 = ~6.87M tokens
- Output: ~500 tokens per analysis × 458 = ~229k tokens
- Flash pricing: $0.075/1M input, $0.30/1M output
- **Total: ~$0.58** for all 458 videos (negligible)

### What We'll Extract Per Video (Prompt Design)

```json
{
  "transcript": "Full spoken text with timestamps",
  "hook_analysis": {
    "first_3_seconds": "What happens visually + verbally",
    "hook_type": "Question/Statement/Visual/Pattern Interrupt/etc",
    "hook_strength": 1-10
  },
  "content_structure": {
    "segments": [
      { "timestamp": "0:00-0:15", "type": "hook", "description": "..." },
      { "timestamp": "0:15-1:30", "type": "main_content", "description": "..." },
      { "timestamp": "1:30-2:00", "type": "cta", "description": "..." }
    ]
  },
  "visual_analysis": {
    "style": "Talking Head / B-Roll / Screen Recording / etc",
    "text_overlays": true/false,
    "production_quality": "casual/polished/professional",
    "lighting": "natural/studio/mixed"
  },
  "language": {
    "primary": "English/Filipino/Taglish",
    "taglish_ratio": "80/20",
    "tone": "casual/professional/enthusiastic"
  },
  "retention_factors": {
    "pacing": "fast/medium/slow",
    "topic_changes": 3,
    "visual_variety": "high/medium/low",
    "dead_air_seconds": 0,
    "predicted_drop_off_points": ["0:08 - slow intro", "1:45 - repetitive"]
  },
  "cta": {
    "type": "subscribe/like/comment/link/shop/none",
    "timestamp": "1:52",
    "effectiveness": "natural/forced/missing"
  },
  "topics": ["paper crafting", "small business", "tutorial"],
  "overall_content_purpose": "educate/sell/story/inspire/prove/trend"
}
```

### Implementation Plan

#### Phase 1: Priority Videos (Top 50 by views)
1. Query content_ingest for top 50 YouTube videos by view count
2. For each: send YouTube URL to Gemini Flash with analysis prompt
3. Store result in new `video_deep_analysis` column or separate table
4. 3-second delay between calls (safe under 15 RPM)
5. Update classification with richer data from transcript

#### Phase 2: Full Library (Remaining ~408)
1. Cron job: process 25 videos per run, every 2 hours
2. Priority: descending by view count
3. Track progress in content_ingest (add `deep_analyzed_at` column)
4. ~16 hours total to process all

#### Phase 3: New Videos (Continuous)
1. When pipeline detects new video (ingest cron)
2. Immediately queue for Gemini analysis
3. Single video = single call = instant

### Important Notes
- YouTube URL must be PUBLIC for Gemini to access
- Some region-restricted videos may fail
- Gemini processes video at ~1 FPS by default (configurable)
- Can set custom frame rate for more detail: `videoMetadata.fps = 2`
- Shorts (<60s) are cheap; long-form (10min+) use more tokens
- `startOffset` / `endOffset` can clip to relevant sections

### Alternative: YouTube Captions API (Fallback)
- Endpoint: `GET https://www.googleapis.com/youtube/v3/captions`
- Then: `GET https://www.googleapis.com/youtube/v3/captions/{id}` to download
- Only works if auto-captions exist
- Text only — no visual analysis
- 50 units per list, 200 per download (expensive quota-wise)
- **Verdict: Gemini URL approach is superior in every way**

## Decision
**Use Gemini API with YouTube URLs.** It's cheaper, faster, richer (visual + audio), and doesn't require downloading videos. Process in priority order (most viewed first) with rate limiting.
