/**
 * YouTube Competitors CRUD API
 * Manage the competitor watchlist.
 * 
 * GET  /api/youtube/competitors — list all tracked competitors
 * POST /api/youtube/competitors — add a competitor to watchlist
 * DELETE /api/youtube/competitors?id=xxx — remove a competitor
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

/**
 * GET: List all tracked competitor channels
 */
export async function GET() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('youtube_competitors')
        .select('*')
        .order('added_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ competitors: data })
}

/**
 * POST: Add a competitor channel to the watchlist
 * Body: { channel_id, channel_title, handle?, subscriber_count?, thumbnail_url?, is_own_channel? }
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.channel_id || !body.channel_title) {
        return NextResponse.json({ error: 'channel_id and channel_title required' }, { status: 400 })
    }

    // Calculate avg_views from recent videos if we have API key
    let avgViews = 0
    if (YOUTUBE_API_KEY) {
        try {
            const url = new URL('https://www.googleapis.com/youtube/v3/search')
            url.searchParams.set('part', 'id')
            url.searchParams.set('channelId', body.channel_id)
            url.searchParams.set('type', 'video')
            url.searchParams.set('order', 'date')
            url.searchParams.set('maxResults', '10')
            url.searchParams.set('key', YOUTUBE_API_KEY)

            const searchRes = await fetch(url.toString())
            const searchData = await searchRes.json()
            const videoIds = searchData.items?.map(
                (item: { id: { videoId: string } }) => item.id.videoId
            ) || []

            if (videoIds.length > 0) {
                const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
                statsUrl.searchParams.set('part', 'statistics')
                statsUrl.searchParams.set('id', videoIds.join(','))
                statsUrl.searchParams.set('key', YOUTUBE_API_KEY)

                const statsRes = await fetch(statsUrl.toString())
                const statsData = await statsRes.json()
                const views = statsData.items?.map(
                    (v: { statistics: { viewCount: string } }) => parseInt(v.statistics.viewCount || '0')
                ) || []

                avgViews = views.length > 0
                    ? Math.round(views.reduce((a: number, b: number) => a + b, 0) / views.length)
                    : 0
            }
        } catch {
            // Not critical — avg_views will be 0
        }
    }

    const { data, error } = await supabase
        .from('youtube_competitors')
        .upsert({
            channel_id: body.channel_id,
            channel_title: body.channel_title,
            handle: body.handle || null,
            subscriber_count: body.subscriber_count || null,
            thumbnail_url: body.thumbnail_url || null,
            is_own_channel: body.is_own_channel || false,
            avg_views: avgViews,
        }, { onConflict: 'channel_id' })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ competitor: data, success: true })
}

/**
 * DELETE: Remove a competitor from the watchlist
 */
export async function DELETE(request: NextRequest) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
    }

    const { error } = await supabase
        .from('youtube_competitors')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
