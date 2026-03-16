/**
 * YouTube Channel Analytics API
 * Fetches Grace's channel stats, recent videos with analytics, and revenue data.
 * Uses stored OAuth tokens with auto-refresh.
 * 
 * GET /api/youtube/channel — returns channel overview + recent videos + revenue
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET

/**
 * Refresh an expired access token using the stored refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_at: string
} | null> {
    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID || '',
                client_secret: CLIENT_SECRET || '',
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })

        if (!res.ok) return null
        const data = await res.json()
        return {
            access_token: data.access_token,
            expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        }
    } catch {
        return null
    }
}

export async function GET() {
    const supabase = await createClient()

    // Get stored tokens
    const { data: tokenRow, error: tokenErr } = await supabase
        .from('youtube_tokens')
        .select('*')
        .limit(1)
        .single()

    if (tokenErr || !tokenRow) {
        return NextResponse.json({
            connected: false,
            error: 'Not connected. Please connect your YouTube account.',
        })
    }

    let accessToken = tokenRow.access_token

    // Refresh token if expired
    const isExpired = new Date(tokenRow.expires_at) <= new Date()
    if (isExpired) {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token)
        if (!refreshed) {
            return NextResponse.json({
                connected: false,
                error: 'Token expired. Please reconnect your YouTube account.',
            })
        }

        // Update stored token
        accessToken = refreshed.access_token
        await supabase
            .from('youtube_tokens')
            .update({
                access_token: refreshed.access_token,
                expires_at: refreshed.expires_at,
                updated_at: new Date().toISOString(),
            })
            .eq('id', tokenRow.id)
    }

    const headers = { Authorization: `Bearer ${accessToken}` }

    try {
        // 1. Get channel stats
        const channelRes = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
            { headers }
        )
        const channelData = await channelRes.json()
        const channel = channelData.items?.[0]

        if (!channel) {
            return NextResponse.json({ connected: true, error: 'Channel not found' })
        }

        // 2. Get recent videos (last 3 months)
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channel.id}&type=video&order=date&maxResults=30&publishedAfter=${threeMonthsAgo.toISOString()}`,
            { headers }
        )
        const searchData = await searchRes.json()
        const videoIds = (searchData.items || []).map(
            (item: { id: { videoId: string } }) => item.id.videoId
        )

        // 3. Get video stats
        let videoStats: {
            id: string
            snippet: { title: string; publishedAt: string; thumbnails: { medium: { url: string } } }
            statistics: { viewCount: string; likeCount: string; commentCount: string }
            contentDetails: { duration: string }
        }[] = []

        if (videoIds.length > 0) {
            const statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}`,
                { headers }
            )
            const statsData = await statsRes.json()
            videoStats = statsData.items || []
        }

        // 4. Get YouTube Analytics (last 90 days) — watch time, revenue, CTR
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = threeMonthsAgo.toISOString().split('T')[0]

        let analyticsData = null
        let analyticsError = null
        try {
            const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?` +
                `ids=channel==MINE&` +
                `startDate=${startDate}&endDate=${endDate}&` +
                `metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,estimatedRevenue,estimatedAdRevenue,cpm&` +
                `dimensions=day&` +
                `sort=-day`

            console.log('[YouTube Analytics] Fetching:', analyticsUrl.split('?')[0])
            const analyticsRes = await fetch(analyticsUrl, { headers })

            if (analyticsRes.ok) {
                analyticsData = await analyticsRes.json()
                console.log('[YouTube Analytics] Got', analyticsData?.rows?.length || 0, 'rows')
            } else {
                const errBody = await analyticsRes.text()
                analyticsError = `Analytics API ${analyticsRes.status}: ${errBody}`
                console.error('[YouTube Analytics Error]', analyticsError)
            }
        } catch (err) {
            analyticsError = err instanceof Error ? err.message : 'Unknown analytics error'
            console.error('[YouTube Analytics Exception]', analyticsError)
        }

        // 5. Get per-video analytics for top videos
        let videoAnalytics = null
        try {
            const videoAnalyticsRes = await fetch(
                `https://youtubeanalytics.googleapis.com/v2/reports?` +
                `ids=channel==MINE&` +
                `startDate=${startDate}&endDate=${endDate}&` +
                `metrics=views,estimatedMinutesWatched,averageViewDuration,estimatedRevenue,subscribersGained&` +
                `dimensions=video&` +
                `sort=-estimatedMinutesWatched&` +
                `maxResults=15`,
                { headers }
            )
            if (videoAnalyticsRes.ok) {
                videoAnalytics = await videoAnalyticsRes.json()
            } else {
                const errBody = await videoAnalyticsRes.text()
                console.error('[YouTube Video Analytics Error]', errBody)
            }
        } catch (err) {
            console.error('[YouTube Video Analytics Exception]', err)
        }

        // Process analytics into summary
        let analyticsSummary = null
        if (analyticsData?.rows) {
            const rows = analyticsData.rows
            // Sum up all metrics across the period
            const totals = rows.reduce(
                (acc: number[], row: number[]) => {
                    // row: [date, views, watchTime, avgDuration, subsGained, subsLost, revenue, adRevenue, cpm]
                    for (let i = 1; i < row.length; i++) {
                        acc[i] = (acc[i] || 0) + (row[i] || 0)
                    }
                    return acc
                },
                new Array(9).fill(0)
            )

            const totalDays = rows.length || 1
            analyticsSummary = {
                period: `${startDate} to ${endDate}`,
                views: Math.round(totals[1]),
                watchTimeMinutes: Math.round(totals[2]),
                watchTimeHours: Math.round(totals[2] / 60),
                avgViewDurationSeconds: Math.round(totals[3] / totalDays),
                subscribersGained: Math.round(totals[4]),
                subscribersLost: Math.round(totals[5]),
                netSubscribers: Math.round(totals[4] - totals[5]),
                estimatedRevenue: parseFloat(totals[6].toFixed(2)),
                estimatedAdRevenue: parseFloat(totals[7].toFixed(2)),
                avgCpm: parseFloat((totals[8] / totalDays).toFixed(2)),
                // Daily breakdown for charts (last 30 days)
                dailyData: rows.slice(0, 30).map((row: (string | number)[]) => ({
                    date: row[0],
                    views: row[1],
                    watchTime: row[2],
                    revenue: row[6],
                })),
            }
        }

        // Process per-video analytics
        let topVideos = null
        if (videoAnalytics?.rows) {
            // Build a map of video IDs to titles from the stats we already fetched
            const titleMap: Record<string, string> = {}
            const thumbMap: Record<string, string> = {}
            for (const v of videoStats) {
                titleMap[v.id] = v.snippet.title
                thumbMap[v.id] = v.snippet.thumbnails?.medium?.url || ''
            }

            topVideos = videoAnalytics.rows.map((row: (string | number)[]) => ({
                videoId: row[0],
                title: titleMap[row[0] as string] || row[0],
                thumbnail: thumbMap[row[0] as string] || '',
                views: row[1],
                watchTimeMinutes: Math.round(row[2] as number),
                avgViewDuration: Math.round(row[3] as number),
                revenue: parseFloat((row[4] as number).toFixed(2)),
                subscribersGained: row[5],
            }))
        }

        // Build clean video list from Data API
        const videos = videoStats.map(v => ({
            video_id: v.id,
            title: v.snippet.title,
            published_at: v.snippet.publishedAt,
            thumbnail_url: v.snippet.thumbnails?.medium?.url || '',
            view_count: parseInt(v.statistics.viewCount || '0'),
            like_count: parseInt(v.statistics.likeCount || '0'),
            comment_count: parseInt(v.statistics.commentCount || '0'),
            duration: v.contentDetails.duration,
        }))

        return NextResponse.json({
            connected: true,
            channel: {
                id: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                thumbnail: channel.snippet.thumbnails?.medium?.url,
                subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
                videoCount: parseInt(channel.statistics.videoCount || '0'),
                viewCount: parseInt(channel.statistics.viewCount || '0'),
            },
            analytics: analyticsSummary,
            analyticsError, // Surface error to frontend for debugging
            topVideos,
            recentVideos: videos,
        })
    } catch (error) {
        console.error('[YouTube Channel Error]', error)
        return NextResponse.json(
            { connected: true, error: error instanceof Error ? error.message : 'Failed to fetch channel data' },
            { status: 500 }
        )
    }
}
