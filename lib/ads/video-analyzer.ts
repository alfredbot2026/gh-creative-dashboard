/**
 * Video Ad Analyzer
 * 
 * Uses Gemini's multimodal capabilities to:
 * 1. Transcribe spoken words from video ads
 * 2. Describe key visual frames
 * 3. Summarize the ad's message
 * 
 * This gives the classifier FULL context — not just the caption text.
 */
import { GoogleGenAI } from '@google/genai'

export interface VideoAnalysis {
  transcription: string
  frame_descriptions: Array<{
    timestamp_s: number
    description: string
  }>
  summary: string
}

/**
 * Get a page access token from the user's access token.
 * Video source URLs require page-level permissions.
 */
async function getPageToken(userAccessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=access_token&limit=1`,
      { headers: { Authorization: `Bearer ${userAccessToken}` } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0]?.access_token || null
  } catch {
    return null
  }
}

/**
 * Get the source URL for a Meta video.
 * Requires page token — user token doesn't have source access.
 */
export async function getMetaVideoUrl(
  videoId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    // First try with the given token
    let res = await fetch(
      `https://graph.facebook.com/v25.0/${videoId}?fields=source`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    let data = await res.json()
    if (data.source) return data.source

    // Fall back to page token
    const pageToken = await getPageToken(accessToken)
    if (!pageToken) {
      console.error(`[Video] No page token available for video ${videoId}`)
      return null
    }
    res = await fetch(
      `https://graph.facebook.com/v25.0/${videoId}?fields=source`,
      { headers: { Authorization: `Bearer ${pageToken}` } },
    )
    data = await res.json()
    return data.source || null
  } catch (err) {
    console.error(`[Video] Error fetching video URL:`, err)
    return null
  }
}

/**
 * Analyze a video ad using Gemini multimodal.
 * Downloads the video, uploads to Gemini Files API, then analyzes.
 */
export async function analyzeAdVideo(videoUrl: string): Promise<VideoAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const ai = new GoogleGenAI({ apiKey })

  // Download video
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`)
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())

  // Upload to Gemini Files API
  const blob = new Blob([videoBuffer], { type: 'video/mp4' })
  const uploadResult = await ai.files.upload({
    file: blob,
    config: { mimeType: 'video/mp4' },
  })

  // Wait for processing
  let file = uploadResult
  let attempts = 0
  while (file.state === 'PROCESSING' && attempts < 30) {
    await new Promise(r => setTimeout(r, 2000))
    file = await ai.files.get({ name: file.name! })
    attempts++
  }
  if (file.state !== 'ACTIVE') {
    throw new Error(`Video processing failed after ${attempts} attempts: ${file.state}`)
  }

  // Analyze with Gemini
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: file.uri!, mimeType: 'video/mp4' } },
          {
            text: `Analyze this ad video. Return ONLY valid JSON (no markdown fences):

{
  "transcription": "Full verbatim transcription of ALL spoken words. Include everything said, in the original language. If Taglish (Tagalog+English mix), keep as-is.",
  "frame_descriptions": [
    {"timestamp_s": 0, "description": "What's visually shown at this moment"},
    {"timestamp_s": 3, "description": "Next key moment"}
  ],
  "summary": "1-2 sentence summary of the ad's message and what it's selling"
}

For frame_descriptions, capture key visual moments every 3-5 seconds:
- Products, people, scenes shown
- Text overlays or graphics
- Before/after shots
- The opening hook (first 1-3 seconds)
- The CTA/ending

For transcription: capture EVERY word spoken. This is critical for ad classification.
If no speech, set transcription to "".`,
          },
        ],
      },
    ],
    config: { temperature: 0.1 },
  })

  const text = response.text || ''
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const parsed = JSON.parse(cleaned) as VideoAnalysis
    return {
      transcription: parsed.transcription || '',
      frame_descriptions: Array.isArray(parsed.frame_descriptions)
        ? parsed.frame_descriptions
        : [],
      summary: parsed.summary || '',
    }
  } catch {
    // Fallback: return raw text as summary
    console.error('[Video] Failed to parse Gemini response as JSON')
    return {
      transcription: '',
      frame_descriptions: [],
      summary: cleaned.slice(0, 500),
    }
  }
}
