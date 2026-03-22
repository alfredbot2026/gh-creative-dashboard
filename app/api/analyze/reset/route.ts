/**
 * Reset deep analysis to re-analyze with new platform-specific prompts.
 * POST /api/analyze/reset — Clears deep_analysis for YouTube videos
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Count how many have analysis
  const { count: analyzed } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .not('deep_analysis', 'is', null)

  // Reset all deep_analysis to null
  // Process in batches to handle >1000 rows
  let resetCount = 0
  let offset = 0
  while (true) {
    const { data: batch } = await supabase
      .from('content_ingest')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .not('deep_analysis', 'is', null)
      .range(offset, offset + 499)

    if (!batch || batch.length === 0) break

    const ids = batch.map(r => r.id)
    const { error } = await supabase
      .from('content_ingest')
      .update({ deep_analysis: null })
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message, reset_so_far: resetCount }, { status: 500 })
    }
    resetCount += ids.length
    // Don't increment offset — the query re-fetches non-null rows
  }

  return NextResponse.json({
    reset: resetCount,
    previously_analyzed: analyzed,
    message: `Reset ${resetCount} videos for re-analysis with platform-specific prompts (v2)`
  })
}
