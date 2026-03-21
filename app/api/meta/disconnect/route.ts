import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const url = new URL(request.url)
        const purge = url.searchParams.get('purge') === 'true'

        // Delete meta tokens
        const { error: dbError } = await supabase
            .from('meta_tokens')
            .delete()
            .eq('user_id', user.id)

        if (dbError) {
            console.error('[Meta Disconnect] DB error:', dbError)
            return NextResponse.json({ error: 'Failed to disconnect Meta account' }, { status: 500 })
        }

        if (purge) {
            // Optional: purge content_ingest rows for 'instagram' or 'facebook'
            await supabase
                .from('content_ingest')
                .delete()
                .eq('user_id', user.id)
                .in('platform', ['instagram', 'facebook'])
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Meta Disconnect] Error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
