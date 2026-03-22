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

/**
 * Platform-specific analysis prompts based on KB evaluation frameworks.
 * YouTube long-form uses HEIT structure + retention design.
 * YouTube Shorts uses short-form scorecard (hook 30%, shareability, completion).
 */

function getAnalysisPrompt(durationSeconds: number): string {
  const isShortForm = durationSeconds > 0 && durationSeconds <= 60

  const SHARED_JSON = `{
  "transcript": "Full spoken text (verbatim, include [music] or [silence] markers)",
  "transcript_segments": [
    {"timestamp": "0:00", "text": "First words spoken..."}
  ],
  "hook_analysis": {
    "first_3_seconds": "Describe exactly what happens visually and verbally in the first 3 seconds",
    "hook_type": "Question/Bold Statement/Visual Pattern Interrupt/Curiosity Gap/Story Opener/Tutorial Preview/Before-After/Direct Address/None",
    "pattern_interrupt": true,
    "curiosity_gap": true,
    "triple_hook": {"written": true, "verbal": true, "visual": true},
    "hook_score": 7,
    "why": "Why this hook works or doesn't, referencing specific elements"
  },
  "content_structure": [
    {"timestamp": "0:00-0:05", "type": "hook", "description": "...", "duration_seconds": 5}
  ],
  "visual_analysis": {
    "style": "Talking Head/B-Roll/Screen Recording/Product Demo/Hands-on Tutorial/Slideshow/Mixed",
    "text_overlays": true,
    "text_overlay_content": ["text shown on screen"],
    "production_quality": "casual/polished/professional",
    "captions_present": true,
    "visual_changes_per_minute": 8,
    "lighting": "natural/studio/ring light/mixed",
    "framing": "close-up/medium/wide/varies",
    "b_roll": false
  },
  "language": {
    "primary": "English/Filipino/Taglish",
    "taglish_ratio": "90% English / 10% Filipino",
    "tone": "enthusiastic/calm/professional/casual/educational",
    "speaking_pace": "slow/medium/fast"
  },
  "cta": {
    "type": "subscribe/like/comment/link/shop/follow/none",
    "timestamp": "1:52",
    "cta_matches_purpose": true,
    "effectiveness": "natural/forced/missing/subtle",
    "text": "The actual CTA words spoken or shown"
  },
  "topics": ["topic1", "topic2", "topic3"],
  "content_purpose": "educate/sell/story/inspire/prove/trend",
  "summary": "...",
  "tips": ["tip1", "tip2"]`

  if (isShortForm) {
    return `You are evaluating a YouTube Short (under 60 seconds). Use this SHORT-FORM evaluation framework:

SCORING WEIGHTS:
- Hook (30%): Pattern interrupt, curiosity gap, bold claim. Triple hook (written+verbal+visual). NO "Hi guys" or slow buildups.
- Value Compression (20%): Maximum actionable value in minimum time. Specific, not fluffy.
- Retention Design (20%): Visual changes every 2-4 seconds. Jump cuts, text overlays, B-roll. Curiosity stacking.
- Shareability (15%): Communal language, relatable concepts, high-arousal emotion (awe/excitement/anger).
- CTA (10%): Follow CTA for story, Freebie/Offer for educational, Comment for engagement.
- Production (5%): Captions mandatory (90% watch muted), clean audio, vertical, good lighting.

SHORT-FORM SPECIFIC CHECKS:
- Does it use the Reel Anatomy? Hook → Super Hook (credibility) → Curiosity Gap → Climax → Re-loop ("But...") → CTA
- Audio sweetened (slightly sped up)?
- Floating text stickers as visual hooks?
- Would a viewer send this to a friend? (shareability = #1 algorithm signal)

Return ONLY valid JSON (no markdown, no code blocks):
${SHARED_JSON},
  "scorecard": {
    "hook": {"score": 7, "weight": 0.30, "notes": "specific assessment"},
    "value_compression": {"score": 7, "weight": 0.20, "notes": "..."},
    "retention_design": {"score": 7, "weight": 0.20, "notes": "..."},
    "shareability": {"score": 7, "weight": 0.15, "notes": "..."},
    "cta": {"score": 7, "weight": 0.10, "notes": "..."},
    "production": {"score": 7, "weight": 0.05, "notes": "..."},
    "weighted_total": 7.0
  },
  "reel_anatomy": {
    "has_hook": true,
    "has_super_hook": false,
    "has_curiosity_gap": true,
    "has_climax": true,
    "has_reloop": false,
    "has_cta": true
  },
  "shareability_factors": {
    "communal_language": false,
    "relatable_concept": true,
    "high_arousal_emotion": "awe/excitement/anger/none",
    "would_send_to_friend": true,
    "save_worthy": true
  }
}

Be specific and honest. Reference actual moments. Score each component 1-10. The creator wants to learn what works and what doesn't.`
  }

  // LONG-FORM (>60 seconds)
  return `You are evaluating a YouTube long-form video (over 60 seconds). Use this LONG-FORM evaluation framework:

SCORING WEIGHTS:
- HEIT Structure (25%): Does it follow Hook → Explain problem → Illustrate with story/analogy → Teach actionable lesson?
- Hook (20%): First 10-15 seconds. Sets up video's promise. Clear context for new viewers.
- Value Density (20%): Specific, actionable, real numbers/examples. No filler, no jargon.
- Retention Design (15%): B-roll, screen recordings, visual variety. Curiosity stacking (resolve one gap, open another). Visual changes frequency.
- CTA (10%): Subscribe + specific action. Timed appropriately (not just at end). Type matches content purpose.
- Topic-Market Fit (10%): CCN — does it serve Core audience (buyers), Casual audience (watchers), AND New audience (never seen creator)?

LONG-FORM SPECIFIC CHECKS:
- Watch time is THE metric for YouTube. Would this hold attention for the full duration?
- Retention cliff analysis: Identify exact timestamps where viewers would likely leave and why.
- Does the video deliver on the promise made in the hook?
- Is the value dense and specific, or fluffy and vague?
- Evergreen potential: Would this video still be useful in 6 months?

Return ONLY valid JSON (no markdown, no code blocks):
${SHARED_JSON},
  "scorecard": {
    "heit_structure": {"score": 7, "weight": 0.25, "notes": "Does it follow Hook→Explain→Illustrate→Teach?"},
    "hook": {"score": 7, "weight": 0.20, "notes": "First 10-15s assessment"},
    "value_density": {"score": 7, "weight": 0.20, "notes": "Specific/actionable vs fluffy/vague"},
    "retention_design": {"score": 7, "weight": 0.15, "notes": "Visual variety, curiosity stacking, pacing"},
    "cta": {"score": 7, "weight": 0.10, "notes": "Type, timing, effectiveness"},
    "topic_market_fit": {"score": 7, "weight": 0.10, "notes": "CCN: Core + Casual + New audience coverage"},
    "weighted_total": 7.0
  },
  "heit_analysis": {
    "hook_present": true,
    "explain_present": true,
    "illustrate_present": true,
    "teach_present": true,
    "structure_notes": "How well the HEIT flow works"
  },
  "retention_analysis": {
    "predicted_drop_offs": [
      {"timestamp": "0:30", "reason": "slow transition", "severity": "minor/major/critical"}
    ],
    "curiosity_stacking": true,
    "visual_changes_per_minute": 8,
    "dead_air_seconds": 0,
    "evergreen_potential": true
  },
  "audience_fit": {
    "core_audience": "Who is the buyer this serves?",
    "casual_audience": "Who watches but doesn't buy?",
    "new_audience_accessible": true,
    "total_addressable_market": "large/medium/niche"
  }
}

Be specific and honest. Reference actual moments. Score each component 1-10. The weighted_total should be calculated from component scores × weights. The creator wants to learn what works and what doesn't.`
}

// Keep old prompt name for backward compat during transition
const ANALYSIS_PROMPT = getAnalysisPrompt(0) // default to long-form

/**
 * Parse ISO 8601 duration to seconds (e.g., "PT1M30S" → 90, "PT14S" → 14)
 */
function parseDuration(iso: string): number {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0')
}

/**
 * Analyze a single YouTube video using Gemini.
 * Uses platform-specific prompt based on duration (short-form vs long-form).
 */
export async function analyzeVideo(videoId: string, durationISO?: string): Promise<VideoDeepAnalysis> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

  const durationSeconds = parseDuration(durationISO || '')
  const prompt = getAnalysisPrompt(durationSeconds)

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
        { text: prompt },
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
      const duration = video.metrics?.duration || ''
      const isShort = parseDuration(duration) <= 60
      console.log(`[VideoAnalyzer] Analyzing ${videoId} (${isShort ? 'SHORT' : 'LONG'}: ${video.caption?.slice(0, 40)}...)`)

      const analysis = await analyzeVideo(videoId, duration)

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
