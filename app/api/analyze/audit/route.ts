/**
 * Deep Analysis Audit API
 * GET /api/analyze/audit — Returns all deep-analyzed videos with key fields for review.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all deep-analyzed YouTube videos
  const allItems: any[] = []
  let offset = 0
  while (true) {
    const { data: page } = await supabase
      .from('content_ingest')
      .select('id, platform_id, caption, description, metrics, deep_analysis, deep_analyzed_at, media_url, platform_url')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .not('deep_analysis', 'is', null)
      .order('deep_analyzed_at', { ascending: false })
      .range(offset, offset + 999)

    if (!page || page.length === 0) break
    allItems.push(...page)
    if (page.length < 1000) break
    offset += 1000
  }

  // Filter out error entries and build audit summary
  const auditable = allItems
    .filter(item => item.deep_analysis && !item.deep_analysis.error)
    .map(item => {
      const da = item.deep_analysis
      const metrics = item.metrics || {}
      const views = metrics.views || metrics.viewCount || 0
      
      return {
        id: item.id,
        video_id: item.platform_id,
        youtube_url: `https://youtube.com/watch?v=${item.platform_id}`,
        title: item.caption,
        thumbnail: item.media_url,
        views,
        likes: metrics.likeCount || metrics.likes || 0,
        comments: metrics.commentCount || metrics.comments || 0,
        duration: metrics.duration,
        // Deep analysis fields
        score: da.overall_score,
        content_purpose: da.content_purpose,
        hook_type: da.hook_analysis?.hook_type,
        hook_strength: da.hook_analysis?.hook_strength,
        hook_why: da.hook_analysis?.why,
        visual_style: da.visual_analysis?.style,
        production_quality: da.visual_analysis?.production_quality,
        language: da.language?.primary,
        taglish: da.language?.taglish_ratio,
        pacing: da.retention_factors?.pacing,
        visual_variety: da.retention_factors?.visual_variety,
        drop_offs: da.retention_factors?.predicted_drop_off_points,
        cta_type: da.cta?.type,
        topics: da.topics,
        summary: da.summary,
        tips: da.tips,
        transcript_preview: da.transcript?.slice(0, 200),
        analyzed_at: item.deep_analyzed_at,
      }
    })
    .sort((a, b) => b.views - a.views)

  return NextResponse.json({
    total_analyzed: auditable.length,
    videos: auditable,
  })
}
