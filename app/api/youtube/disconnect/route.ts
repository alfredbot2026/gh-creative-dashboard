/**
 * YouTube Disconnect API
 * POST /api/youtube/disconnect — Remove YouTube connection + optionally purge data.
 * Body: { purge?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { purge = false } = await req.json().catch(() => ({}))

  // Delete YouTube tokens
  const { error: tokenError } = await supabase
    .from('youtube_tokens')
    .delete()
    .not('channel_id', 'is', null)  // Delete all rows (workaround for no user_id column)

  if (tokenError) {
    console.error('[YouTube] Token deletion failed:', tokenError)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  let purged = false
  if (purge) {
    // First get ingest IDs to purge analysis
    const { data: ingestRows } = await supabase
      .from('content_ingest')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')

    if (ingestRows && ingestRows.length > 0) {
      const ingestIds = ingestRows.map(r => r.id)

      // Delete analysis rows
      await supabase
        .from('content_analysis')
        .delete()
        .in('ingest_id', ingestIds)

      // Delete ingest rows
      await supabase
        .from('content_ingest')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'youtube')
    }

    purged = true
  }

  return NextResponse.json({ success: true, purged })
}
