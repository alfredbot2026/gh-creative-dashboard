/**
 * Social Post Analysis API (Instagram + Facebook)
 * POST /api/analyze/social — Batch analyze IG or FB posts
 *   Body: { platform: "instagram"|"facebook", batchSize?: number }
 * 
 * GET /api/analyze/social — Status of social post analysis
 * 
 * Auth: User session OR CRON_SECRET bearer token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCronOrUserAuth } from '@/lib/cron-auth'
import { analyzeSocialBatch } from '@/lib/pipeline/social-post-analyzer'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId, supabase } = await getCronOrUserAuth(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats: Record<string, any> = {}

  for (const platform of ['instagram', 'facebook']) {
    const { count: total } = await supabase
      .from('content_ingest')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', platform)

    const { count: analyzed } = await supabase
      .from('content_ingest')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', platform)
      .not('deep_analysis', 'is', null)

    const { data: latest } = await supabase
      .from('content_ingest')
      .select('deep_analyzed_at, caption')
      .eq('user_id', userId)
      .eq('platform', platform)
      .not('deep_analyzed_at', 'is', null)
      .order('deep_analyzed_at', { ascending: false })
      .limit(1)
      .single()

    const t = total || 0
    const a = analyzed || 0
    stats[platform] = {
      total: t,
      analyzed: a,
      remaining: t - a,
      progress_percent: t > 0 ? Math.round((a / t) * 100) : 0,
      last_analyzed: latest?.deep_analyzed_at || null,
      last_caption: latest?.caption?.slice(0, 60) || null,
    }
  }

  return NextResponse.json(stats)
}

export async function POST(req: NextRequest) {
  const { userId, supabase } = await getCronOrUserAuth(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform = 'instagram', batchSize = 20 } = await req.json().catch(() => ({}))

  if (!['instagram', 'facebook'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be "instagram" or "facebook"' }, { status: 400 })
  }

  try {
    const result = await analyzeSocialBatch(
      userId,
      platform as 'instagram' | 'facebook',
      Math.min(batchSize, 50),
      supabase
    )
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
