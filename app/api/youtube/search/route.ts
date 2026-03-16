/**
 * YouTube Competitor Search API
 * Search for channels by keyword/niche using YouTube Data API v3.
 * No OAuth needed — uses API key for public data.
 * 
 * POST /api/youtube/search
 * Body: { query: "Philippines print on demand" }
 */
import { NextRequest, NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function POST(request: NextRequest) {
    try {
        if (!YOUTUBE_API_KEY) {
            return NextResponse.json(
                { error: 'YOUTUBE_API_KEY not configured. Add it to .env.local' },
                { status: 500 }
            )
        }

        const { query, maxResults = 10 } = await request.json()
        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 })
        }

        // Search for channels matching the query
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
        searchUrl.searchParams.set('part', 'snippet')
        searchUrl.searchParams.set('type', 'channel')
        searchUrl.searchParams.set('q', query)
        searchUrl.searchParams.set('maxResults', String(maxResults))
        searchUrl.searchParams.set('key', YOUTUBE_API_KEY)

        const searchRes = await fetch(searchUrl.toString())
        if (!searchRes.ok) {
            const err = await searchRes.text()
            throw new Error(`YouTube search failed: ${err}`)
        }

        const searchData = await searchRes.json()
        const channelIds = searchData.items?.map(
            (item: { snippet: { channelId: string } }) => item.snippet.channelId
        ) || []

        if (channelIds.length === 0) {
            return NextResponse.json({ channels: [], query })
        }

        // Fetch detailed channel stats for each result
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
        statsUrl.searchParams.set('part', 'snippet,statistics')
        statsUrl.searchParams.set('id', channelIds.join(','))
        statsUrl.searchParams.set('key', YOUTUBE_API_KEY)

        const statsRes = await fetch(statsUrl.toString())
        const statsData = await statsRes.json()

        // Map to clean channel objects
        const channels = (statsData.items || []).map((ch: {
            id: string
            snippet: {
                title: string
                customUrl?: string
                thumbnails: { default: { url: string } }
                description: string
            }
            statistics: {
                subscriberCount: string
                viewCount: string
                videoCount: string
            }
        }) => ({
            channel_id: ch.id,
            title: ch.snippet.title,
            handle: ch.snippet.customUrl || '',
            thumbnail_url: ch.snippet.thumbnails.default.url,
            description: ch.snippet.description?.slice(0, 200),
            subscriber_count: parseInt(ch.statistics.subscriberCount || '0'),
            view_count: parseInt(ch.statistics.viewCount || '0'),
            video_count: parseInt(ch.statistics.videoCount || '0'),
        }))

        return NextResponse.json({ channels, query })
    } catch (error) {
        console.error('[YouTube Search Error]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Search failed' },
            { status: 500 }
        )
    }
}
