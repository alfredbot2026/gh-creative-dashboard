/**
 * Video Analysis Status API
 * GET /api/analyze/status — Check deep analysis progress.
 * Auth: User session OR CRON_SECRET bearer token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCronOrUserAuth } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId, supabase } = await getCronOrUserAuth(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Count YouTube videos
  const { count: totalYT } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('platform', 'youtube')

  // Count deep-analyzed
  const { count: analyzed } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('platform', 'youtube')
    .not('deep_analysis', 'is', null)

  // Last analyzed
  const { data: latest } = await supabase
    .from('content_ingest')
    .select('deep_analyzed_at, caption')
    .eq('user_id', userId)
    .eq('platform', 'youtube')
    .not('deep_analyzed_at', 'is', null)
    .order('deep_analyzed_at', { ascending: false })
    .limit(1)
    .single()

  const total = totalYT || 0
  const done = analyzed || 0

  return NextResponse.json({
    total_youtube_videos: total,
    deep_analyzed: done,
    remaining: total - done,
    progress_percent: total > 0 ? Math.round((done / total) * 100) : 0,
    last_analyzed: latest?.deep_analyzed_at || null,
    last_analyzed_title: latest?.caption?.slice(0, 60) || null,
    estimated_hours_remaining: Math.ceil((total - done) * 4 / 3600),
  })
}
