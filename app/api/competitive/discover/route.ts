/**
 * POST /api/competitive/discover
 * Runs competitor channel discovery via YouTube API.
 * Searches niche keywords, ranks channels, stores in DB.
 * Expensive — call monthly only (100 units per keyword).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { discoverTopCreators, GRACE_CHANNEL_ID } from '@/lib/competitive/discovery'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  console.log('[Competitive Discover] Starting discovery...')

  const { discovered, channels, skipped, errors } = await discoverTopCreators()

  if (!channels.length) {
    return NextResponse.json({ error: 'No channels found', errors }, { status: 500 })
  }

  // Upsert channels (exclude Grace's own channel)
  const toInsert = channels
    .filter(ch => ch.channelId !== GRACE_CHANNEL_ID)
    .map(ch => ({
      channel_id: ch.channelId,
      channel_title: ch.channelTitle,
      channel_description: ch.channelDescription.substring(0, 500),
      subscriber_count: ch.subscriberCount,
      video_count: ch.videoCount,
      niche_tags: [ch.nicheTag],
      language: detectLanguage(ch.channelTitle + ' ' + ch.channelDescription),
      discovery_source: 'auto',
      is_active: true,
    }))

  const { error: upsertErr } = await supabase
    .from('competitor_channels')
    .upsert(toInsert, { onConflict: 'channel_id', ignoreDuplicates: false })

  if (upsertErr) {
    console.error('[Competitive Discover] Upsert error:', upsertErr)
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    discovered,
    saved: toInsert.length,
    skipped,
    errors: errors.length ? errors : undefined,
  })
}

function detectLanguage(text: string): 'en' | 'tl' | 'mixed' {
  const filipinoWords = /\b(ng|sa|ang|na|at|ay|mga|ko|mo|ito|yan|yun|para|kung|pero|naman|lang|din|rin|po|ho|kaya|talaga|sobra|grabe)\b/gi
  const matches = text.match(filipinoWords) || []
  if (matches.length >= 3) return 'mixed'
  return 'en'
}
