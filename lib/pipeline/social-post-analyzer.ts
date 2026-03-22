/**
 * Social Post Deep Analyzer (Instagram + Facebook)
 * 
 * Uses Gemini to analyze IG/FB posts via caption text + image.
 * Platform-specific prompts based on KB evaluation frameworks.
 * 
 * Unlike video-analyzer.ts (YouTube URLs → Gemini), this works with:
 * - Caption text (always available)
 * - Image/thumbnail URL (when available and publicly accessible)
 * - Known metrics (for context, not for scoring — scoring is content quality)
 */
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-3-flash-preview'
const DELAY_BETWEEN_CALLS_MS = 4000  // 4s = safe under 15 RPM

export interface SocialPostAnalysis {
  hook_analysis: {
    first_line: string
    hook_type: string
    pattern_interrupt: boolean
    curiosity_gap: boolean
    hook_score: number
    why: string
  }
  content_structure: {
    format: string  // listicle, story, tutorial, testimonial, product-showcase, behind-the-scenes, meme, quote
    sections: string[]
    flow: string
  }
  caption_analysis: {
    length_assessment: string  // too-short, optimal, too-long
    readability: string  // easy, moderate, dense
    emoji_usage: string  // none, minimal, moderate, heavy
    hashtag_count: number
    hashtag_quality: string  // relevant, generic, spam, none
    line_breaks: boolean  // proper formatting for mobile
  }
  cta: {
    type: string
    effectiveness: string
    text: string | null
    cta_matches_purpose: boolean
  }
  topics: string[]
  content_purpose: string
  language: {
    primary: string
    taglish_ratio: string
    tone: string
  }
  summary: string
  tips: string[]
  // Platform-specific fields
  scorecard: Record<string, any>
  // IG-specific
  reel_caption_anatomy?: {
    has_hook: boolean
    has_value_proposition: boolean
    has_cta: boolean
    has_social_proof: boolean
  }
  shareability_factors?: {
    communal_language: boolean
    relatable_concept: boolean
    high_arousal_emotion: string
    would_send_to_friend: boolean
    save_worthy: boolean
  }
  // FB-specific
  engagement_drivers?: {
    conversation_starter: boolean
    shareable_insight: boolean
    emotional_trigger: string
    comment_bait: boolean
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getInstagramPrompt(isReel: boolean): string {
  const format = isReel ? 'Instagram Reel' : 'Instagram Post'
  
  return `You are evaluating an ${format} caption${isReel ? ' (for a short-form video)' : ''}. Use this INSTAGRAM evaluation framework:

SCORING WEIGHTS:
- Hook (30%): First line must stop the scroll. Pattern interrupt, curiosity gap, bold claim. No "Hi guys" or generic openers.
- Value/Shareability (25%): Would someone send this to a friend? Communal language ("me and the boys"), relatable concepts, save-worthy tips.
- Caption Structure (20%): Proper formatting for mobile. Line breaks, readability, optimal length. Hashtag strategy.
- CTA (15%): Right CTA for the purpose. Follow for story, Save for education, Comment for engagement, Share for community.
- Production Context (10%): Does the caption complement the visual? Does it add context the image/video can't?

INSTAGRAM-SPECIFIC CHECKS:
- Does the first line work as a standalone hook? (Most people see only line 1 before "...more")
- Is it optimized for saves? (Educational/valuable = saves = algorithm boost)
- Is it optimized for sends/shares? (#1 algorithm signal on IG)
- Hashtag strategy: Relevant niche tags > generic popular tags
- Caption length: Too short = missed value. Too long = lost readers. Sweet spot varies by format.
${isReel ? `
REEL-SPECIFIC:
- Does the caption add value beyond the video or just repeat it?
- Is there a reason to read the caption? (Expanded tips, links, context)
- Re-loop potential: Does caption create curiosity to rewatch?
` : `
POST-SPECIFIC:
- For carousel: Does caption guide through the slides?
- For single image: Does caption tell the story the image can't?
`}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "hook_analysis": {
    "first_line": "The exact first line of the caption",
    "hook_type": "Question/Bold Claim/Curiosity Gap/List Preview/Story Opener/Direct Address/None",
    "pattern_interrupt": true,
    "curiosity_gap": true,
    "hook_score": 7,
    "why": "Why this hook works or doesn't"
  },
  "content_structure": {
    "format": "listicle/story/tutorial/testimonial/product-showcase/behind-the-scenes/meme/quote",
    "sections": ["hook", "value points", "cta"],
    "flow": "How the caption flows — logical or disjointed?"
  },
  "caption_analysis": {
    "length_assessment": "too-short/optimal/too-long",
    "readability": "easy/moderate/dense",
    "emoji_usage": "none/minimal/moderate/heavy",
    "hashtag_count": 5,
    "hashtag_quality": "relevant/generic/spam/none",
    "line_breaks": true
  },
  "cta": {
    "type": "follow/save/comment/share/link/shop/none",
    "effectiveness": "natural/forced/missing/subtle",
    "text": "The actual CTA text or null",
    "cta_matches_purpose": true
  },
  "topics": ["topic1", "topic2"],
  "content_purpose": "educate/sell/story/inspire/prove/trend",
  "language": {
    "primary": "English/Filipino/Taglish",
    "taglish_ratio": "70% Filipino / 30% English",
    "tone": "enthusiastic/calm/professional/casual/educational"
  },
  "scorecard": {
    "hook": {"score": 7, "weight": 0.30, "notes": "specific assessment"},
    "shareability": {"score": 7, "weight": 0.25, "notes": "..."},
    "caption_structure": {"score": 7, "weight": 0.20, "notes": "..."},
    "cta": {"score": 7, "weight": 0.15, "notes": "..."},
    "production_context": {"score": 7, "weight": 0.10, "notes": "..."},
    "weighted_total": 7.0
  },
  "reel_caption_anatomy": {
    "has_hook": true,
    "has_value_proposition": true,
    "has_cta": true,
    "has_social_proof": false
  },
  "shareability_factors": {
    "communal_language": false,
    "relatable_concept": true,
    "high_arousal_emotion": "excitement/awe/none",
    "would_send_to_friend": true,
    "save_worthy": true
  },
  "summary": "Plain language explanation for a non-technical creator",
  "tips": ["Specific tip 1", "Specific tip 2"]
}

Be specific and honest. Score each component 1-10. The weighted_total must equal the sum of (score × weight).`
}

function getFacebookPrompt(isReel: boolean): string {
  return `You are evaluating a Facebook ${isReel ? 'Reel' : 'post'} caption. Use this FACEBOOK evaluation framework:

SCORING WEIGHTS:
- Hook (25%): First line visible in feed. Must stop the scroll in a noisy environment.
- Shareability (30%): Facebook's #1 viral signal is SHARES. Would someone share this to their timeline or a group?
- Engagement Design (20%): Does it spark conversation? Questions, opinions, relatable situations that drive comments.
- CTA (15%): Clear next step. Comment, share, click link, visit page.
- Caption Quality (10%): Readable, well-formatted, appropriate length for Facebook (longer captions work better than IG).

FACEBOOK-SPECIFIC CHECKS:
- Facebook rewards SHARES above all — is this share-worthy?
- Reaction diversity: Content that triggers Love/Wow/Haha > just Like
- Comment depth: Does it invite replies, not just single-word reactions?
- Facebook allows longer captions than IG — is the creator using that space?
- Group shareability: Would this get shared to Facebook groups?
${isReel ? `
REEL-SPECIFIC:
- Facebook Reels compete with TikTok reposts — does caption add unique value?
- Cross-platform: If this is cross-posted from IG, does the caption work for FB audience?
` : ''}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "hook_analysis": {
    "first_line": "The exact first line",
    "hook_type": "Question/Bold Claim/Curiosity Gap/List Preview/Story Opener/Direct Address/None",
    "pattern_interrupt": true,
    "curiosity_gap": true,
    "hook_score": 7,
    "why": "Why this hook works or doesn't"
  },
  "content_structure": {
    "format": "listicle/story/tutorial/testimonial/product-showcase/behind-the-scenes/meme/quote",
    "sections": ["hook", "body", "cta"],
    "flow": "Assessment of caption flow"
  },
  "caption_analysis": {
    "length_assessment": "too-short/optimal/too-long",
    "readability": "easy/moderate/dense",
    "emoji_usage": "none/minimal/moderate/heavy",
    "hashtag_count": 0,
    "hashtag_quality": "relevant/generic/spam/none",
    "line_breaks": true
  },
  "cta": {
    "type": "comment/share/link/shop/follow/none",
    "effectiveness": "natural/forced/missing/subtle",
    "text": "The actual CTA text or null",
    "cta_matches_purpose": true
  },
  "topics": ["topic1", "topic2"],
  "content_purpose": "educate/sell/story/inspire/prove/trend",
  "language": {
    "primary": "English/Filipino/Taglish",
    "taglish_ratio": "70% Filipino / 30% English",
    "tone": "enthusiastic/calm/professional/casual/educational"
  },
  "scorecard": {
    "hook": {"score": 7, "weight": 0.25, "notes": "specific assessment"},
    "shareability": {"score": 7, "weight": 0.30, "notes": "..."},
    "engagement_design": {"score": 7, "weight": 0.20, "notes": "..."},
    "cta": {"score": 7, "weight": 0.15, "notes": "..."},
    "caption_quality": {"score": 7, "weight": 0.10, "notes": "..."},
    "weighted_total": 7.0
  },
  "engagement_drivers": {
    "conversation_starter": true,
    "shareable_insight": true,
    "emotional_trigger": "inspiration/humor/outrage/nostalgia/none",
    "comment_bait": false
  },
  "summary": "Plain language explanation for a non-technical creator",
  "tips": ["Specific tip 1", "Specific tip 2"]
}

Be specific and honest. Score each component 1-10. The weighted_total must equal the sum of (score × weight).`
}

/**
 * Analyze a single social media post (IG or FB) using Gemini.
 */
export async function analyzeSocialPost(
  caption: string,
  platform: 'instagram' | 'facebook',
  mediaType: string,
  imageUrl?: string | null
): Promise<SocialPostAnalysis> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

  const isReel = ['VIDEO', 'REEL', 'reel', 'video'].includes(mediaType)
  const prompt = platform === 'instagram' 
    ? getInstagramPrompt(isReel) 
    : getFacebookPrompt(isReel)

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

  const parts: any[] = []
  
  // Add image if available and accessible
  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    try {
      parts.push({
        fileData: {
          fileUri: imageUrl,
          mimeType: 'image/*',
        },
      })
    } catch {
      // Image not accessible, continue with text only
    }
  }

  // Caption text
  const captionText = caption || '(no caption)'
  parts.push({ text: `CAPTION:\n${captionText}\n\nMEDIA TYPE: ${mediaType}\nPLATFORM: ${platform}\n\n${prompt}` })

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
  })

  const text = response.text || ''
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonStr) as SocialPostAnalysis
}

export interface SocialBatchResult {
  analyzed: number
  errors: string[]
  skipped: number
  remaining: number
  quota_used: number
}

/**
 * Batch analyze IG/FB posts with rate limiting.
 * Prioritizes posts with highest engagement.
 */
export async function analyzeSocialBatch(
  userId: string,
  platform: 'instagram' | 'facebook',
  batchSize: number = 20,
  externalSupabase?: any
): Promise<SocialBatchResult> {
  let supabase = externalSupabase
  if (!supabase) {
    const { createClient } = await import('@/lib/supabase/server')
    supabase = await createClient()
  }

  // Get posts that haven't been deep-analyzed yet
  const allPosts: any[] = []
  let offset = 0
  const needed = batchSize * 2 // fetch extra to filter
  
  while (allPosts.length < needed) {
    const { data: page } = await supabase
      .from('content_ingest')
      .select('id, platform_id, caption, content_type, platform_url, metrics')
      .eq('user_id', userId)
      .eq('platform', platform)
      .is('deep_analysis', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + 999)

    if (!page || page.length === 0) break
    allPosts.push(...page)
    if (page.length < 1000) break
    offset += 1000
  }

  // Skip posts with empty/null captions (nothing to analyze)
  const withCaptions = allPosts.filter(p => p.caption && p.caption.trim().length > 5)
  const noCaptions = allPosts.length - withCaptions.length

  // Sort by engagement (highest first)
  const sorted = withCaptions.sort((a, b) => {
    const aEng = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0)
    const bEng = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0)
    return bEng - aEng
  }).slice(0, batchSize)

  if (sorted.length === 0) {
    return { analyzed: 0, errors: [], skipped: noCaptions, remaining: 0, quota_used: 0 }
  }

  let analyzedCount = 0
  let skipped = noCaptions
  const errors: string[] = []

  for (const post of sorted) {
    try {
      const imageUrl: string | null = null  // IG/FB media URLs are auth-gated, can't send to Gemini
      const mediaType = post.content_type || 'unknown'

      console.log(`[SocialAnalyzer] Analyzing ${platform} ${post.platform_id} (${post.caption?.slice(0, 40)}...)`)

      const analysis = await analyzeSocialPost(
        post.caption,
        platform as 'instagram' | 'facebook',
        mediaType,
        imageUrl
      )

      const score = analysis.scorecard?.weighted_total ?? '?'
      
      await supabase
        .from('content_ingest')
        .update({
          deep_analysis: analysis,
          deep_analyzed_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      analyzedCount++
      console.log(`[SocialAnalyzer] ✅ ${post.platform_id} — score: ${score}/10`)

      // Rate limit delay
      if (analyzedCount < sorted.length) {
        await delay(DELAY_BETWEEN_CALLS_MS)
      }
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('RATE_LIMIT')) {
        console.warn(`[SocialAnalyzer] Rate limited. Stopping batch.`)
        errors.push(`Rate limited after ${analyzedCount} posts`)
        break
      }
      console.warn(`[SocialAnalyzer] Error on ${post.platform_id}:`, err.message)
      errors.push(`${post.platform_id}: ${err.message?.slice(0, 100)}`)
      skipped++
    }
  }

  // Count remaining
  const { count: remainingCount } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('platform', platform)
    .is('deep_analysis', null)

  return {
    analyzed: analyzedCount,
    errors,
    skipped,
    remaining: remainingCount || 0,
    quota_used: analyzedCount,
  }
}
