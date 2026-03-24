/**
 * GET /api/competitive/channels — list tracked competitor channels
 * POST — manually add a channel by ID or URL
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('competitor_channels')
    .select('*, competitor_videos(count)')
    .eq('is_active', true)
    .order('subscriber_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ channels: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channelId, channelUrl } = await req.json()

  // Extract channel ID from URL if provided
  let id = channelId
  if (!id && channelUrl) {
    const match = channelUrl.match(/channel\/([A-Za-z0-9_-]+)/)
      || channelUrl.match(/@([A-Za-z0-9_.-]+)/)
    if (match) id = match[1]
  }

  if (!id) return NextResponse.json({ error: 'Missing channelId or channelUrl' }, { status: 400 })

  // Fetch channel info from YouTube API
  const API_KEY = process.env.YOUTUBE_API_KEY
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${id}&key=${API_KEY}`
  const res = await fetch(url)
  const data = await res.json()

  const ch = data.items?.[0]
  if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const { error: insertErr } = await supabase
    .from('competitor_channels')
    .upsert({
      channel_id: ch.id,
      channel_title: ch.snippet?.title || '',
      channel_description: (ch.snippet?.description || '').substring(0, 500),
      subscriber_count: parseInt(ch.statistics?.subscriberCount || '0'),
      video_count: parseInt(ch.statistics?.videoCount || '0'),
      discovery_source: 'manual',
      is_active: true,
    }, { onConflict: 'channel_id' })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ added: true, channelTitle: ch.snippet?.title })
}
