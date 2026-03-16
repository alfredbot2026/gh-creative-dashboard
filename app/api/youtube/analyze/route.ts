/**
 * YouTube Video Analysis API
 * Analyze any YouTube video using Gemini's video understanding.
 * Gemini can directly process YouTube URLs — no download needed.
 * Returns clean markdown analysis (not JSON).
 * 
 * POST /api/youtube/analyze
 * Body: { videoUrl, analysisType?, videoId?, videoTitle? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, MediaResolution } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const { videoUrl, analysisType = 'full', videoId, videoTitle } = await request.json()
    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // Markdown-based prompts — Gemini naturally writes great markdown
    const prompts: Record<string, string> = {
      full: `Analyze this YouTube video comprehensively. Use this structure:

## 📌 Topic & Angle
What the video covers and the creator's unique approach.

## 🪝 Hook Analysis (First 5 Seconds)
What the viewer sees and hears. Why it works (or doesn't). Rate effectiveness 1-10.

## 🔥 Viral Factors
Bullet list of specific reasons this video could spread.

## 📐 Video Structure
A timeline breakdown of the video sections with timestamps.

## 💡 Key Takeaways
3-5 actionable lessons from this video.

## 🎯 How Grace Can Adapt This
Specific suggestions for how Grace could create her own version:
- **Her Angle:** How to make it relevant to her audience
- **Hook Suggestion:** A specific opening she could use
- **CTA:** How to tie it to her business/products
- **Format:** What format works best

## 🕳️ Gaps & Opportunities
What the creator missed or could do better — opportunities for Grace.`,

      hook: `Focus ONLY on the first 15 seconds of this YouTube video.

## 🪝 Hook Type
Classify: curiosity gap, pattern interrupt, bold claim, problem statement, or story opening.

## First 3 Seconds
- **Visual:** What the viewer sees
- **Audio:** What they hear
- **Text:** On-screen text/captions

## First 15 Seconds Breakdown
What happens moment by moment.

## Effectiveness Score: X/10
Explain why this score.

## How Grace Can Use This Hook Style
Give Grace a specific adaptation she can use for her next video.`,

      competitive: `Analyze this competitor video strategically for Grace.

## 📌 Topic & Angle
What topic and their unique angle/approach.

## 🎯 Target Audience
Who this video is made for.

## 🪝 Hook Strategy
How they grab attention in the first seconds.

## 🔥 Why This Video Works
Bullet list of viral/success factors.

## 📐 Content Structure
How the video is organized (timeline if possible).

## 🕳️ Gaps & Opportunities
What they missed. Where Grace can do better.

## 💡 How Grace Can Adapt This
- **Her Angle:** Grace's unique take on this topic
- **Hook Suggestion:** A specific hook Grace could open with
- **CTA Suggestion:** How to connect to her products/services
- **Format:** Best format for Grace (long-form, short, etc.)`,
    }

    const prompt = prompts[analysisType] || prompts.full

    // Use Gemini with YouTube URL as media input
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              fileData: {
                fileUri: videoUrl,
                mimeType: 'video/*',
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: `You are a YouTube content strategist analyzing videos for a creator named Grace ("Graceful Homeschooling") who runs a print-on-demand / creative business in the Philippines with 124K subscribers. She creates long-form (15+ min) and Shorts content. Her goal is to increase AdSense revenue and grow her business through YouTube. Write in clean markdown with clear section headers. Be specific and actionable. No code fences.`,
        // Low resolution reduces frame sampling so long videos stay within token limits
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
        maxOutputTokens: 8192,
      }
    })

    const analysisText = response.text || ''

    return NextResponse.json({
      success: true,
      analysis: analysisText,
      analysisType,
      videoUrl,
      videoId: videoId || null,
      videoTitle: videoTitle || null,
    })
  } catch (error) {
    console.error('[YouTube Analyze Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

/**
 * Save an analysis result to the youtube_videos table.
 * PUT /api/youtube/analyze
 * Body: { videoId, videoTitle, videoUrl, analysis }
 */
export async function PUT(request: NextRequest) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { videoId, videoTitle, videoUrl, analysis } = await request.json()
    if (!videoId || !analysis) {
      return NextResponse.json({ error: 'videoId and analysis required' }, { status: 400 })
    }

    // Upsert into youtube_videos
    const { error } = await supabase
      .from('youtube_videos')
      .upsert({
        video_id: videoId,
        title: videoTitle || '',
        url: videoUrl || '',
        ai_analysis: analysis,
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'video_id' })

    if (error) {
      console.error('[YouTube Save Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[YouTube Save Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save failed' },
      { status: 500 }
    )
  }
}
