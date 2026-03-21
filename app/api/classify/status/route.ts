/**
 * Classification Status API
 * GET /api/classify/status — Check classification progress.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [ingestCount, classifiedCount, latestAnalysis] = await Promise.all([
    supabase
      .from('content_ingest')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('content_analysis')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('content_analysis')
      .select('created_at, classification_version')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const total = ingestCount.count || 0
  const classified = classifiedCount.count || 0

  return NextResponse.json({
    total_ingested: total,
    total_classified: classified,
    total_unclassified: total - classified,
    classification_version: latestAnalysis.data?.classification_version || 0,
    last_classified_at: latestAnalysis.data?.created_at || null,
    progress_percent: total > 0 ? Math.round((classified / total) * 100) : 0,
  })
}
