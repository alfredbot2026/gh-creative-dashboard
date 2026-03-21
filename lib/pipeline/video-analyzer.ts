/**
 * Video Deep Analyzer
 * 
 * Uses Gemini API to analyze YouTube videos directly via URL.
 * Extracts transcript, visual analysis, hook analysis, retention predictors.
 */
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-3-flash-preview'
const DELAY_BETWEEN_CALLS_MS = 4000  // 4s = safe under 15 RPM free tier

export interface VideoDeepAnalysis {
  transcript: string
  transcript_segments: TranscriptSegment[]
  hook_analysis: HookAnalysis
  content_structure: ContentSegment[]
  visual_analysis: VisualAnalysis
  language: LanguageAnalysis
  retention_factors: RetentionFactors
  cta: CTAAnalysis
  topics: string[]
  content_purpose: string
  overall_score: number  // 1-10 content quality assessment
  summary: string  // Plain language summary of why this video works/doesn't
  tips: string[]  // Actionable improvement tips
}

export interface TranscriptSegment {
  timestamp: string
  text: string
}

export interface HookAnalysis {
  first_3_seconds: string
  hook_type: string
  hook_strength: number  // 1-10
  why: string
}

export interface ContentSegment {
  timestamp: string
  type: 'hook' | 'intro' | 'main_content' | 'demonstration' | 'cta' | 'outro' | 'transition'
  description: string
  duration_seconds: number
}

export interface VisualAnalysis {
  style: string
  text_overlays: boolean
  text_overlay_content: string[]
  production_quality: 'casual' | 'polished' | 'professional'
  lighting: string
  framing: string
  b_roll: boolean
}

export interface LanguageAnalysis {
  primary: string
  taglish_ratio: string
  tone: string
  speaking_pace: 'slow' | 'medium' | 'fast'
}

export interface RetentionFactors {
  pacing: 'slow' | 'medium' | 'fast'
  topic_changes: number
  visual_variety: 'low' | 'medium' | 'high'
  dead_air_seconds: number
  predicted_drop_off_points: { timestamp: string; reason: string }[]
  engagement_hooks_count: number
}

export interface CTAAnalysis {
  type: string
  timestamp: string | null
  effectiveness: 'natural' | 'forced' | 'missing' | 'subtle'
  text: string | null
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const ANALYSIS_PROMPT = `Analyze this YouTube video in detail. Return ONLY valid JSON (no markdown, no code blocks) in this exact structure:

{
  "transcript": "Full spoken text (verbatim, include [music] or [silence] markers)",
  "transcript_segments": [
    {"timestamp": "0:00", "text": "First words spoken..."},
    {"timestamp": "0:05", "text": "Next segment..."}
  ],
  "hook_analysis": {
    "first_3_seconds": "Describe exactly what happens visually and verbally in the first 3 seconds",
    "hook_type": "Question/Bold Statement/Visual Pattern Interrupt/Curiosity Gap/Story Opener/Tutorial Preview/Before-After/Direct Address/None",
    "hook_strength": 7,
    "why": "Why this hook works or doesn't work"
  },
  "content_structure": [
    {"timestamp": "0:00-0:05", "type": "hook", "description": "...", "duration_seconds": 5},
    {"timestamp": "0:05-0:30", "type": "main_content", "description": "...", "duration_seconds": 25}
  ],
  "visual_analysis": {
    "style": "Talking Head/B-Roll/Screen Recording/Product Demo/Hands-on Tutorial/Slideshow/Mixed",
    "text_overlays": true,
    "text_overlay_content": ["text shown on screen"],
    "production_quality": "casual",
    "lighting": "natural/studio/ring light/mixed",
    "framing": "close-up/medium/wide/varies",
    "b_roll": false
  },
  "language": {
    "primary": "English/Filipino/Taglish",
    "taglish_ratio": "90% English / 10% Filipino",
    "tone": "enthusiastic/calm/professional/casual/educational",
    "speaking_pace": "medium"
  },
  "retention_factors": {
    "pacing": "fast",
    "topic_changes": 2,
    "visual_variety": "medium",
    "dead_air_seconds": 0,
    "predicted_drop_off_points": [
      {"timestamp": "0:08", "reason": "slow transition after hook"}
    ],
    "engagement_hooks_count": 3
  },
  "cta": {
    "type": "subscribe/like/comment/link/shop/follow/none",
    "timestamp": "1:52",
    "effectiveness": "natural",
    "text": "The actual CTA words spoken or shown"
  },
  "topics": ["topic1", "topic2", "topic3"],
  "content_purpose": "educate/sell/story/inspire/prove/trend",
  "overall_score": 7,
  "summary": "Plain language explanation of why this video performed the way it did. Write this for a non-technical creator — be specific about what they did well and what they could improve.",
  "tips": [
    "Specific, actionable tip 1",
    "Specific, actionable tip 2"
  ]
}

Be specific and honest. Reference actual moments from the video. The creator wants to learn what works and what doesn't.`

/**
 * Analyze a single YouTube video using Gemini.
 */
export async function analyzeVideo(videoId: string): Promise<VideoDeepAnalysis> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: youtubeUrl,
            mimeType: 'video/*',
          },
        },
        { text: ANALYSIS_PROMPT },
      ],
    }],
  })

  const text = response.text || ''
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonStr) as VideoDeepAnalysis
}

export interface BatchAnalysisResult {
  analyzed: number
  errors: string[]
  skipped: number
  remaining: number
  quota_used: number
}

/**
 * Analyze a batch of YouTube videos with rate limiting.
 * Processes in order of view count (highest first).
 */
export async function analyzeBatch(
  userId: string,
  batchSize: number = 25
): Promise<BatchAnalysisResult> {
  // Dynamic import to avoid issues in non-server contexts
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Get YouTube videos that haven't been deep-analyzed yet
  // Paginate to handle >1000 rows
  const { data: analyzed } = await supabase
    .from('content_ingest')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', 'youtube')
    .not('deep_analysis', 'is', null)
    .limit(1000)

  const analyzedIds = new Set((analyzed || []).map(r => r.id))

  // Get all YouTube videos, sorted by views (highest first)
  const allVideos: any[] = []
  let offset = 0
  while (allVideos.length < batchSize + analyzedIds.size) {
    const { data: page } = await supabase
      .from('content_ingest')
      .select('id, platform_id, platform_url, caption, metrics')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .order('created_at', { ascending: false })
      .range(offset, offset + 999)

    if (!page || page.length === 0) break
    allVideos.push(...page)
    if (page.length < 1000) break
    offset += 1000
  }

  // Filter out already analyzed, sort by views
  const pending = allVideos
    .filter(v => !analyzedIds.has(v.id))
    .sort((a, b) => {
      const aViews = a.metrics?.views || a.metrics?.viewCount || 0
      const bViews = b.metrics?.views || b.metrics?.viewCount || 0
      return bViews - aViews
    })
    .slice(0, batchSize)

  if (pending.length === 0) {
    return { analyzed: 0, errors: [], skipped: 0, remaining: 0, quota_used: 0 }
  }

  let analyzedCount = 0
  let skipped = 0
  const errors: string[] = []

  for (const video of pending) {
    const videoId = video.platform_id

    try {
      console.log(`[VideoAnalyzer] Analyzing ${videoId} (${video.caption?.slice(0, 40)}...)`)

      const analysis = await analyzeVideo(videoId)

      // Store the deep analysis
      const { error: updateError } = await supabase
        .from('content_ingest')
        .update({
          deep_analysis: analysis,
          deep_analyzed_at: new Date().toISOString(),
        })
        .eq('id', video.id)

      if (updateError) {
        errors.push(`${videoId}: DB update failed — ${updateError.message}`)
      } else {
        analyzedCount++
        console.log(`[VideoAnalyzer] ✅ ${videoId} — score: ${analysis.overall_score}/10`)
      }
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('RATE_LIMIT')) {
        console.warn(`[VideoAnalyzer] Rate limited. Stopping batch.`)
        errors.push(`Rate limited after ${analyzedCount} videos`)
        break
      }
      if (err.message?.includes('not found') || err.message?.includes('unavailable') || err.message?.includes('private')) {
        console.warn(`[VideoAnalyzer] Video ${videoId} unavailable, skipping`)
        skipped++

        // Mark as analyzed with null to skip in future
        await supabase
          .from('content_ingest')
          .update({
            deep_analysis: { error: 'video_unavailable', message: err.message },
            deep_analyzed_at: new Date().toISOString(),
          })
          .eq('id', video.id)

        continue
      }
      errors.push(`${videoId}: ${err.message?.slice(0, 200)}`)
    }

    // Rate limit: wait between calls
    await delay(DELAY_BETWEEN_CALLS_MS)
  }

  const totalPending = allVideos.filter(v => !analyzedIds.has(v.id)).length - analyzedCount - skipped

  return {
    analyzed: analyzedCount,
    errors,
    skipped,
    remaining: Math.max(0, totalPending),
    quota_used: analyzedCount + skipped,
  }
}
