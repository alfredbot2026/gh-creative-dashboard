/**
 * YouTube Retention Curve API
 * GET /api/analyze/retention?videoId=xxx — Get retention curve for a single video
 * POST /api/analyze/retention — Batch fetch retention curves for top videos
 *   Body: { batchSize?: number } (default 25, max 50)
 * 
 * Stores retention data in content_ingest.metrics.retention_curve
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRetentionCurve, refreshYouTubeToken } from '@/lib/youtube/content-client'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const DELAY_MS = 500 // 500ms between calls — conservative

async function getYouTubeToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from('youtube_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!tokenData) return null

  // Refresh if expired
  if (new Date(tokenData.expires_at) < new Date()) {
    try {
      const refreshed = await refreshYouTubeToken(tokenData.refresh_token)
      await supabase
        .from('youtube_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('user_id', userId)
      return refreshed.access_token
    } catch {
      return null
    }
  }

  return tokenData.access_token
}

// GET: Single video retention
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const videoId = req.nextUrl.searchParams.get('videoId')
  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

  const accessToken = await getYouTubeToken(supabase, user.id)
  if (!accessToken) return NextResponse.json({ error: 'YouTube not connected' }, { status: 400 })

  // Get the video's platform_id and published_at
  const { data: video } = await supabase
    .from('content_ingest')
    .select('platform_id, published_at, metrics')
    .eq('id', videoId)
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .single()

  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  // Check if we already have retention data
  if (video.metrics?.retention_curve) {
    return NextResponse.json({ 
      cached: true, 
      retention_curve: video.metrics.retention_curve,
      video_id: video.platform_id
    })
  }

  try {
    const curve = await fetchRetentionCurve(accessToken, video.platform_id, video.published_at)
    if (!curve) return NextResponse.json({ error: 'Retention data not available' }, { status: 404 })

    // Store in metrics
    const updatedMetrics = { ...video.metrics, retention_curve: curve }
    await supabase
      .from('content_ingest')
      .update({ metrics: updatedMetrics })
      .eq('id', videoId)
      .eq('user_id', user.id)

    return NextResponse.json({ cached: false, retention_curve: curve, video_id: video.platform_id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Batch fetch retention for top videos
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { batchSize = 25 } = await req.json().catch(() => ({}))
  const limit = Math.min(batchSize, 50)

  const accessToken = await getYouTubeToken(supabase, user.id)
  if (!accessToken) return NextResponse.json({ error: 'YouTube not connected' }, { status: 400 })

  // Get YouTube videos that DON'T have retention data yet, ordered by views (most viewed first)
  const allVideos: any[] = []
  let offset = 0
  while (allVideos.length < limit) {
    const { data } = await supabase
      .from('content_ingest')
      .select('id, platform_id, published_at, metrics')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .order('published_at', { ascending: false })
      .range(offset, offset + 999)

    if (!data || data.length === 0) break

    for (const v of data) {
      if (!v.metrics?.retention_curve && allVideos.length < limit) {
        allVideos.push(v)
      }
    }
    if (data.length < 1000) break
    offset += 1000
  }

  // Sort by views descending (prioritize most-viewed)
  allVideos.sort((a, b) => {
    const va = a.metrics?.views || a.metrics?.viewCount || 0
    const vb = b.metrics?.views || b.metrics?.viewCount || 0
    return vb - va
  })

  const toProcess = allVideos.slice(0, limit)
  let fetched = 0
  let errors: string[] = []
  let quotaExhausted = false

  for (const video of toProcess) {
    try {
      await new Promise(r => setTimeout(r, DELAY_MS))
      const curve = await fetchRetentionCurve(accessToken, video.platform_id, video.published_at)

      if (curve) {
        const updatedMetrics = { ...video.metrics, retention_curve: curve }
        await supabase
          .from('content_ingest')
          .update({ metrics: updatedMetrics })
          .eq('id', video.id)
          .eq('user_id', video.user_id || user.id)
        fetched++
      }
    } catch (err: any) {
      if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
        errors.push(`Quota exhausted after ${fetched} videos`)
        quotaExhausted = true
        break
      }
      errors.push(`${video.platform_id}: ${err.message}`)
    }
  }

  // Count how many videos still need retention
  const { count: remaining } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('platform', 'youtube')

  return NextResponse.json({
    fetched,
    errors,
    quota_exhausted: quotaExhausted,
    remaining_total: remaining || 0,
    batch_size: toProcess.length,
  })
}
