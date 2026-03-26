import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaVideoUrl, analyzeAdVideo } from '@/lib/ads/video-analyzer'
import {
  classifyAdCreatives,
  getClassificationVersion,
  type AdCreativeInput,
} from '@/lib/ads/classifier'

export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { adCreativeId } = await request.json()
    if (!adCreativeId) {
      return NextResponse.json({ error: 'Missing adCreativeId' }, { status: 400 })
    }

    // 1. Fetch ad creative
    const { data: ad, error: adErr } = await supabase
      .from('ad_creatives')
      .select('*')
      .eq('id', adCreativeId)
      .eq('user_id', user.id)
      .single()

    if (adErr || !ad) {
      return NextResponse.json({ error: 'Ad creative not found' }, { status: 404 })
    }

    if (ad.creative_format !== 'video' || !ad.video_id) {
      return NextResponse.json({ error: 'Ad is not a video or missing video_id' }, { status: 400 })
    }

    // 2. Get Meta token
    const { data: tokenData } = await supabase
      .from('meta_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single()

    const accessToken = tokenData?.access_token || process.env.FB_ADS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Connect your Meta account first' }, { status: 400 })
    }

    // 3. Analyze video
    const videoUrl = await getMetaVideoUrl(ad.video_id, accessToken)
    if (!videoUrl) {
      return NextResponse.json({ error: 'Failed to get video source URL from Meta' }, { status: 500 })
    }

    const analysis = await analyzeAdVideo(videoUrl)

    // 4. Update ad creative with video analysis
    const { error: updateErr } = await supabase
      .from('ad_creatives')
      .update({
        video_url: videoUrl,
        video_transcription: analysis.transcription,
        frame_descriptions: analysis.frame_descriptions,
        video_analyzed_at: new Date().toISOString(),
        video_analysis_model: 'gemini-3-flash-preview',
      })
      .eq('id', ad.id)

    if (updateErr) {
      throw new Error(`Failed to update ad with video analysis: ${updateErr.message}`)
    }

    // 5. Re-classify with new context
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
      await supabase
        .from('ad_creatives')
        .update({
          angle: cls.angle,
          persona: cls.persona,
          framework: cls.framework,
          hook_type: cls.hook_type,
          offer_type: cls.offer_type,
          emotional_tone: cls.emotional_tone,
          classification_version: getClassificationVersion(),
          classifier_model: 'gemini-2.0-flash',
          classified_at: new Date().toISOString(),
          classification_confidence: cls.overall_confidence,
          classification_raw: cls as unknown as Record<string, unknown>,
        })
        .eq('id', ad.id)
    }

    return NextResponse.json({ 
      success: true, 
      transcription: analysis.transcription,
      summary: analysis.summary,
      reclassified: !!cls
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Video analysis failed'
    console.error('[Video Analysis API] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
