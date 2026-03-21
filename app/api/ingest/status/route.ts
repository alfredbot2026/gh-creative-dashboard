/**
 * Ingest Status API
 * GET /api/ingest/status — Check ingestion progress across platforms.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check connected platforms
  const [metaTokens, youtubeTokens] = await Promise.all([
    supabase.from('meta_tokens').select('ig_username, page_name, updated_at').eq('user_id', user.id).single(),
    supabase.from('youtube_tokens').select('channel_title, updated_at').limit(1).single(),
  ])

  // Count ingested content by platform
  const { data: counts } = await supabase
    .from('content_ingest')
    .select('platform')
    .eq('user_id', user.id)

  const platformCounts: Record<string, number> = {}
  for (const row of counts || []) {
    platformCounts[row.platform] = (platformCounts[row.platform] || 0) + 1
  }

  // Get last ingest time per platform
  const { data: latestIngest } = await supabase
    .from('content_ingest')
    .select('platform, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  return NextResponse.json({
    meta: {
      connected: !!metaTokens.data,
      ig_username: metaTokens.data?.ig_username || null,
      page_name: metaTokens.data?.page_name || null,
      total_instagram: platformCounts['instagram'] || 0,
      total_facebook: platformCounts['facebook'] || 0,
      last_connected: metaTokens.data?.updated_at || null,
    },
    youtube: {
      connected: !!youtubeTokens.data,
      channel_title: youtubeTokens.data?.channel_title || null,
      total_videos: platformCounts['youtube'] || 0,
      last_connected: youtubeTokens.data?.updated_at || null,
    },
    total_ingested: Object.values(platformCounts).reduce((a, b) => a + b, 0),
    last_ingest: latestIngest?.[0]?.created_at || null,
  })
}
