/**
 * Pipeline Status API
 * GET /api/pipeline/status — Check pipeline health.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllQuotaStatus } from '@/lib/pipeline/quota-tracker'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check connected platforms
  const [metaTokens, youtubeTokens] = await Promise.all([
    supabase.from('meta_tokens').select('updated_at').eq('user_id', user.id).single(),
    supabase.from('youtube_tokens').select('updated_at').limit(1).single(),
  ])

  const connected: string[] = []
  if (metaTokens.data) connected.push('meta')
  if (youtubeTokens.data) connected.push('youtube')

  // Get counts
  const [ingestCount, classifiedCount, profileData] = await Promise.all([
    supabase.from('content_ingest').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('content_analysis').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('performance_profile').select('created_at, version').eq('user_id', user.id).order('version', { ascending: false }).limit(1).single(),
  ])

  // Determine health
  const lastProfileAt = profileData.data?.created_at ? new Date(profileData.data.created_at) : null
  const hoursSinceProfile = lastProfileAt ? (Date.now() - lastProfileAt.getTime()) / (1000 * 60 * 60) : Infinity

  let health: 'healthy' | 'stale' | 'not_started' = 'not_started'
  if (lastProfileAt) {
    health = hoursSinceProfile > 48 ? 'stale' : 'healthy'
  }

  return NextResponse.json({
    connected_platforms: connected,
    total_ingested: ingestCount.count || 0,
    total_classified: classifiedCount.count || 0,
    total_unclassified: (ingestCount.count || 0) - (classifiedCount.count || 0),
    profile: profileData.data ? {
      version: profileData.data.version,
      generated_at: profileData.data.created_at,
      hours_ago: Math.round(hoursSinceProfile * 10) / 10,
    } : null,
    health,
    quotas: getAllQuotaStatus(),
  })
}
