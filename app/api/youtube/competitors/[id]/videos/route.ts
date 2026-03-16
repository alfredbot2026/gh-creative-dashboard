/**
 * Competitor Videos API
 * Fetch recent videos from a tracked competitor's channel.
 * Flags viral videos (views > 2x channel average).
 * 
 * GET /api/youtube/competitors/[id]/videos
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!YOUTUBE_API_KEY) {
            return NextResponse.json({ error: 'YOUTUBE_API_KEY not configured' }, { status: 500 })
        }

        const supabase = await createClient()

        // Get the competitor record
        const { data: competitor, error: compError } = await supabase
            .from('youtube_competitors')
            .select('*')
            .eq('id', id)
            .single()

        if (compError || !competitor) {
            return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
        }

        // Fetch recent videos from this channel
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
        searchUrl.searchParams.set('part', 'id,snippet')
        searchUrl.searchParams.set('channelId', competitor.channel_id)
        searchUrl.searchParams.set('type', 'video')
        searchUrl.searchParams.set('order', 'date')
        searchUrl.searchParams.set('maxResults', '15')
        searchUrl.searchParams.set('key', YOUTUBE_API_KEY)

        const searchRes = await fetch(searchUrl.toString())
        const searchData = await searchRes.json()

        const videoItems = searchData.items || []
        const videoIds = videoItems.map(
            (item: { id: { videoId: string } }) => item.id.videoId
        )

        if (videoIds.length === 0) {
            return NextResponse.json({ videos: [], competitor })
        }

        // Fetch video statistics
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
        statsUrl.searchParams.set('part', 'statistics,contentDetails')
        statsUrl.searchParams.set('id', videoIds.join(','))
        statsUrl.searchParams.set('key', YOUTUBE_API_KEY)

        const statsRes = await fetch(statsUrl.toString())
        const statsData = await statsRes.json()

        // Build stats map
        const statsMap: Record<string, {
            viewCount: number; likeCount: number; commentCount: number; duration: string
        }> = {}

        for (const item of (statsData.items || [])) {
            statsMap[item.id] = {
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                likeCount: parseInt(item.statistics?.likeCount || '0'),
                commentCount: parseInt(item.statistics?.commentCount || '0'),
                duration: item.contentDetails?.duration || '',
            }
        }

        // Combine search results with stats
        const avgViews = competitor.avg_views || 1
        const videos = videoItems.map((item: {
            id: { videoId: string }
            snippet: {
                title: string
                publishedAt: string
                thumbnails: { medium: { url: string } }
            }
        }) => {
            const videoId = item.id.videoId
            const stats = statsMap[videoId] || { viewCount: 0, likeCount: 0, commentCount: 0, duration: '' }
            const isViral = stats.viewCount > avgViews * 2

            return {
                video_id: videoId,
                title: item.snippet.title,
                published_at: item.snippet.publishedAt,
                thumbnail_url: item.snippet.thumbnails?.medium?.url || '',
                view_count: stats.viewCount,
                like_count: stats.likeCount,
                comment_count: stats.commentCount,
                duration: stats.duration,
                is_viral: isViral,
                viral_multiplier: avgViews > 0 ? (stats.viewCount / avgViews).toFixed(1) : '0',
                url: `https://www.youtube.com/watch?v=${videoId}`,
            }
        })

        // Sort: viral first, then by views
        videos.sort((a: { is_viral: boolean; view_count: number }, b: { is_viral: boolean; view_count: number }) => {
            if (a.is_viral && !b.is_viral) return -1
            if (!a.is_viral && b.is_viral) return 1
            return b.view_count - a.view_count
        })

        return NextResponse.json({ videos, competitor })
    } catch (error) {
        console.error('[Competitor Videos Error]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch videos' },
            { status: 500 }
        )
    }
}
