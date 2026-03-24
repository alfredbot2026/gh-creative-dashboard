/**
 * POST /api/competitive/analyze
 * Pulls top videos for unanalyzed competitor channels, classifies each video.
 * Runs as a cron — batch 5 videos per run to respect Gemini rate limits.
 */
import { NextResponse } from 'next/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

function createServiceRoleClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
import { getTopVideosForChannel } from '@/lib/competitive/discovery'
import { analyzeCompetitorVideo } from '@/lib/competitive/analyzer'

export const dynamic = 'force-dynamic'

const BATCH_SIZE = 5 // videos per cron run
const VIDEOS_PER_CHANNEL = 20 // top N videos to track per channel

export async function POST(req: Request) {
  // Allow cron or authenticated user
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Step 1: Find active channels that need video ingestion
  const { data: channels } = await supabase
    .from('competitor_channels')
    .select('channel_id, channel_title, last_analyzed_at')
    .eq('is_active', true)
    .order('last_analyzed_at', { ascending: true, nullsFirst: true })
    .limit(5) // Process 5 channels per run

  if (!channels?.length) {
    return NextResponse.json({ message: 'No channels to process' })
  }

  let totalFetched = 0
  let totalAnalyzed = 0
  const processed: string[] = []

  for (const channel of channels) {
    try {
      // Check how many videos we already have
      const { count: existingCount } = await supabase
        .from('competitor_videos')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channel.channel_id)

      // Fetch top videos if we don't have enough
      if ((existingCount || 0) < VIDEOS_PER_CHANNEL) {
        console.log(`[Competitive Analyze] Fetching videos for ${channel.channel_title}`)
        const videos = await getTopVideosForChannel(channel.channel_id, VIDEOS_PER_CHANNEL)

        for (const video of videos) {
          // Skip if already stored
          const { data: existing } = await supabase
            .from('competitor_videos')
            .select('id')
            .eq('video_id', video.videoId)
            .single()

          if (!existing) {
            await supabase.from('competitor_videos').insert({
              channel_id: channel.channel_id,
              video_id: video.videoId,
              title: video.title,
              description: video.description,
              published_at: video.publishedAt,
              view_count: video.viewCount,
              like_count: video.likeCount,
              comment_count: video.commentCount,
              duration_seconds: video.durationSeconds,
              thumbnail_url: video.thumbnailUrl,
              tags: video.tags,
            })
            totalFetched++
          }
        }

        // Update last_analyzed_at
        await supabase
          .from('competitor_channels')
          .update({ last_analyzed_at: new Date().toISOString() })
          .eq('channel_id', channel.channel_id)
      }

      processed.push(channel.channel_title)
    } catch (e) {
      console.error(`[Competitive Analyze] Error processing ${channel.channel_title}:`, e)
    }
  }

  // Step 2: Classify unanalyzed videos (batch across all channels)
  const { data: unanalyzed } = await supabase
    .from('competitor_videos')
    .select('id, video_id, title, description, tags, view_count, like_count, duration_seconds')
    .is('analyzed_at', null)
    .order('view_count', { ascending: false })
    .limit(BATCH_SIZE)

  if (unanalyzed?.length) {
    for (const video of unanalyzed) {
      try {
        const analysis = await analyzeCompetitorVideo({
          videoId: video.video_id,
          title: video.title,
          description: video.description || '',
          tags: video.tags || [],
          viewCount: video.view_count,
          likeCount: video.like_count,
          durationSeconds: video.duration_seconds,
        })

        await supabase
          .from('competitor_videos')
          .update({
            analysis,
            analyzed_at: new Date().toISOString(),
          })
          .eq('id', video.id)

        totalAnalyzed++
        await new Promise(r => setTimeout(r, 1500)) // Gemini rate limit
      } catch (e) {
        console.warn(`[Competitive Analyze] Analysis failed for ${video.video_id}:`, e)
      }
    }
  }

  return NextResponse.json({
    fetched: totalFetched,
    analyzed: totalAnalyzed,
    channels_processed: processed,
  })
}
