/**
 * YouTube Content Ingest API
 * POST /api/ingest/youtube — Pull all videos + analytics into content_ingest table.
 * Body: { mode: 'full' | 'incremental', includeAnalytics: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAllChannelVideos, refreshYouTubeToken } from '@/lib/youtube/content-client'

export const maxDuration = 300  // 5 minute timeout

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mode = 'full', includeAnalytics = true } = await req.json().catch(() => ({}))

  // Get YouTube tokens
  const { data: tokenData } = await supabase
    .from('youtube_tokens')
    .select('*')
    .limit(1)
    .single()

  if (!tokenData) {
    return NextResponse.json({ error: 'YouTube account not connected. Go to Settings to connect.' }, { status: 400 })
  }

  // Check if token needs refresh
  let accessToken = tokenData.access_token
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    if (!tokenData.refresh_token) {
      return NextResponse.json({ error: 'YouTube token expired and no refresh token available. Please reconnect.' }, { status: 400 })
    }
    
    try {
      const refreshed = await refreshYouTubeToken(tokenData.refresh_token)
      accessToken = refreshed.access_token
      
      // Update stored token
      await supabase
        .from('youtube_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('channel_id', tokenData.channel_id)
    } catch (err: any) {
      return NextResponse.json({ error: `Token refresh failed: ${err.message}. Please reconnect YouTube.` }, { status: 400 })
    }
  }

  let ingested = 0
  let errors = 0
  const errorMessages: string[] = []

  try {
    console.log(`[Ingest] Starting YouTube ingest for user ${user.id} (mode: ${mode}, analytics: ${includeAnalytics})`)
    
    const { videos, quotaUsed } = await fetchAllChannelVideos(accessToken, {
      includeAnalytics,
      analyticsQuotaLimit: 180,
    })
    
    console.log(`[Ingest] Fetched ${videos.length} YouTube videos. Quota: Data=${quotaUsed.dataApi}, Analytics=${quotaUsed.analyticsApi}`)

    for (const video of videos) {
      try {
        const metrics: Record<string, any> = {
          views: video.stats.viewCount,
          likes: video.stats.likeCount,
          comments: video.stats.commentCount,
          duration: video.stats.duration,
        }

        // Merge analytics if available
        if (video.analytics) {
          metrics.watch_time_minutes = video.analytics.estimatedMinutesWatched
          metrics.avg_view_duration = video.analytics.averageViewDuration
          metrics.avg_view_percentage = video.analytics.averageViewPercentage
          metrics.subscribers_gained = video.analytics.subscribersGained
          metrics.shares = video.analytics.shares
          metrics.impressions = video.analytics.impressions
          metrics.ctr = video.analytics.impressionClickThroughRate
        }

        const record = {
          user_id: user.id,
          platform: 'youtube' as const,
          platform_id: video.id,
          platform_url: `https://www.youtube.com/watch?v=${video.id}`,
          content_type: 'youtube_video',
          caption: video.title,
          description: video.description,
          media_url: video.thumbnailUrl,
          tags: video.tags,
          published_at: video.publishedAt,
          metrics,
          metrics_updated_at: new Date().toISOString(),
          metrics_snapshot_count: 1,
        }

        const { error: upsertError } = await supabase
          .from('content_ingest')
          .upsert(record, { onConflict: 'user_id,platform,platform_id' })

        if (upsertError) {
          errors++
          errorMessages.push(`YT ${video.id}: ${upsertError.message}`)
        } else {
          ingested++
        }
      } catch (err: any) {
        errors++
        errorMessages.push(`YT ${video.id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      ingested,
      errors,
      total: videos.length,
      analytics_fetched: videos.filter(v => v.analytics).length,
      analytics_available: includeAnalytics,
      quota_used: quotaUsed,
      error_details: errorMessages.slice(0, 10),
    })
  } catch (err: any) {
    console.error('[Ingest] YouTube ingest failed:', err)
    return NextResponse.json({
      error: err.message,
      ingested,
      errors,
      error_details: errorMessages.slice(0, 10),
    }, { status: 500 })
  }
}
