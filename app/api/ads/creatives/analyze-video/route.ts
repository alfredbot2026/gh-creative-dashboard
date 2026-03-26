/**
 * POST /api/ads/creatives/analyze-video
 * Analyze a single video ad and re-classify it.
 * Body: { adCreativeId: string } or { all: true } for all unanalyzed
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getMetaVideoUrl, analyzeAdVideo } from '@/lib/ads/video-analyzer'
import {
  classifyAdCreatives,
  getClassificationVersion,
  type AdCreativeInput,
} from '@/lib/ads/classifier'

export const maxDuration = 300 // Video analysis can be slow

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  let userId: string

  if (isCronAuth) {
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    userId = tokenRow?.user_id || ''
    if (!userId) return NextResponse.json({ error: 'No user' }, { status: 400 })
  } else {
    supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
  }

  const body = await request.json().catch(() => ({}))
  const { adCreativeId, all } = body as { adCreativeId?: string; all?: boolean }

  // Get access token
  let accessToken: string | null = null
  const { data: tokenData } = await supabase
    .from('meta_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single()
  accessToken = tokenData?.access_token || process.env.FB_ADS_TOKEN || null

  if (!accessToken) {
    return NextResponse.json({ error: 'No Meta token' }, { status: 400 })
  }

  try {
    let query = supabase
      .from('ad_creatives')
      .select('id, video_id, creative_format, headline, body_text, cta_text, link_description, image_url, video_thumbnail_url, adset_name, campaign_name')
      .eq('user_id', userId)
      .eq('creative_format', 'video')
      .not('video_id', 'is', null)

    if (adCreativeId) {
      query = query.eq('id', adCreativeId)
    } else if (all) {
      query = query.is('video_analyzed_at', null)
    } else {
      return NextResponse.json({ error: 'Provide adCreativeId or all:true' }, { status: 400 })
    }

    const { data: ads } = await query
    if (!ads?.length) {
      return NextResponse.json({ message: 'No video ads to analyze', analyzed: 0 })
    }

    let analyzed = 0
    let reclassified = 0
    const errors: string[] = []

    for (const ad of ads) {
      try {
        console.log(`[Video Analysis] Analyzing ${ad.id} (video: ${ad.video_id})...`)
        const videoUrl = await getMetaVideoUrl(ad.video_id, accessToken)
        if (!videoUrl) {
          errors.push(`${ad.id}: no video URL`)
          continue
        }

        const analysis = await analyzeAdVideo(videoUrl)

        await supabase.from('ad_creatives').update({
          video_url: videoUrl,
          video_transcription: analysis.transcription,
          frame_descriptions: analysis.frame_descriptions,
          video_analyzed_at: new Date().toISOString(),
          video_analysis_model: 'gemini-3-flash-preview',
        }).eq('id', ad.id)

        analyzed++
        console.log(`[Video Analysis] ✅ ${ad.id} — transcript: ${analysis.transcription.substring(0, 100)}...`)

        // Re-classify with video context
        const input: AdCreativeInput = {
          id: ad.id,
          headline: ad.headline,
          body_text: ad.body_text,
          cta_text: ad.cta_text,
          link_description: ad.link_description,
          image_url: ad.image_url,
          video_thumbnail_url: ad.video_thumbnail_url,
          adset_name: ad.adset_name,
          campaign_name: ad.campaign_name,
          creative_format: ad.creative_format,
          video_transcription: analysis.transcription,
          frame_descriptions: analysis.frame_descriptions,
        }

        const classifications = await classifyAdCreatives([input])
        const cls = classifications.get(ad.id)
        if (cls) {
          await supabase.from('ad_creatives').update({
            angle: cls.angle,
            persona: cls.persona,
            framework: cls.framework,
            hook_type: cls.hook_type,
            offer_type: cls.offer_type,
            emotional_tone: cls.emotional_tone,
            classification_version: getClassificationVersion() + '+video',
            classifier_model: 'gemini-3-flash-preview',
            classified_at: new Date().toISOString(),
            classification_confidence: cls.overall_confidence,
            classification_raw: cls as unknown as Record<string, unknown>,
          }).eq('id', ad.id)
          reclassified++
        }

        // Rate limit
        if (ads.indexOf(ad) < ads.length - 1) {
          await new Promise(r => setTimeout(r, 2000))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Video Analysis] Failed for ${ad.id}:`, msg)
        errors.push(`${ad.id}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      total_video_ads: ads.length,
      analyzed,
      reclassified,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Video analysis failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
