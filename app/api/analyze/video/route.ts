/**
 * Video Deep Analysis API
 * POST /api/analyze/video — Analyze a batch of YouTube videos via Gemini.
 * Body: { batchSize?: number }  (default 25)
 * 
 * POST /api/analyze/video?id=<ingest_id> — Analyze a single video.
 * 
 * Auth: User session OR CRON_SECRET bearer token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCronOrUserAuth } from '@/lib/cron-auth'
import { analyzeBatch, analyzeVideo } from '@/lib/pipeline/video-analyzer'

export const maxDuration = 300  // 5 min max for batch

export async function POST(req: NextRequest) {
  const { userId, supabase } = await getCronOrUserAuth(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Single video analysis
  const singleId = req.nextUrl.searchParams.get('id')
  if (singleId) {
    const { data: item } = await supabase
      .from('content_ingest')
      .select('platform_id, platform')
      .eq('id', singleId)
      .eq('user_id', userId)
      .single()

    if (!item || item.platform !== 'youtube') {
      return NextResponse.json({ error: 'YouTube video not found' }, { status: 404 })
    }

    try {
      const analysis = await analyzeVideo(item.platform_id)

      await supabase
        .from('content_ingest')
        .update({
          deep_analysis: analysis,
          deep_analyzed_at: new Date().toISOString(),
        })
        .eq('id', singleId)

      return NextResponse.json({ success: true, analysis })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // Batch analysis
  const { batchSize = 25 } = await req.json().catch(() => ({}))

  try {
    const result = await analyzeBatch(userId, Math.min(batchSize, 50), supabase)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
