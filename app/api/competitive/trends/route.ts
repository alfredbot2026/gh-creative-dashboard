/**
 * GET /api/competitive/trends
 * Returns aggregated niche trends from competitor video analysis.
 * Computes on-the-fly (latest snapshot) or returns cached niche_trends row.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateNicheTrends } from '@/lib/competitive/analyzer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all analyzed competitor videos
  const { data: videos, error } = await supabase
    .from('competitor_videos')
    .select('analysis, view_count, channel_id')
    .not('analyzed_at', 'is', null)
    .order('view_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!videos?.length) {
    return NextResponse.json({
      status: 'no_data',
      message: 'No competitor videos analyzed yet. Run the discovery + analysis first.',
      topHooks: [],
      topStructures: [],
      topTopics: [],
      topPurposes: [],
      sampleSize: 0,
    })
  }

  const trends = aggregateNicheTrends(
    videos.map(v => ({ analysis: v.analysis, viewCount: v.view_count }))
  )

  // Get channel count
  const { count: channelCount } = await supabase
    .from('competitor_channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  return NextResponse.json({
    ...trends,
    sampleSize: videos.length,
    channelCount: channelCount || 0,
    computedAt: new Date().toISOString(),
  })
}
