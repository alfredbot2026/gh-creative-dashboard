import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse optional query param
  const url = new URL(request.url)
  const purge = url.searchParams.get('purge') === 'true'

  try {
    // 1. Delete the meta token
    const { error: dbError } = await supabase
      .from('meta_tokens')
      .delete()
      .eq('user_id', user.id)

    if (dbError) {
      console.error('[Meta Disconnect] Error deleting token:', dbError)
      return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 })
    }

    // 2. Optionally purge content_ingest
    if (purge) {
      const { error: purgeError } = await supabase
        .from('content_ingest')
        .delete()
        .in('platform', ['instagram', 'facebook'])
        .eq('user_id', user.id)
      
      if (purgeError) {
        console.error('[Meta Disconnect] Error purging content:', purgeError)
        // Non-fatal error, but we log it.
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Meta Disconnect] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
