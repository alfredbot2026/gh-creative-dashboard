/**
 * Video Analysis Status API
 * GET /api/analyze/status — Check deep analysis progress.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Count YouTube videos
  const { count: totalYT } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('platform', 'youtube')

  // Count deep-analyzed
  const { count: analyzed } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .not('deep_analysis', 'is', null)

  // Last analyzed
  const { data: latest } = await supabase
    .from('content_ingest')
    .select('deep_analyzed_at, caption')
    .eq('user_id', user.id)
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
    estimated_hours_remaining: Math.ceil((total - done) * 4 / 3600),  // 4s per video
  })
}
