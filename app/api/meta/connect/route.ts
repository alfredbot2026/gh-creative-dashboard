/**
 * Meta OAuth Connect Route
 * Redirects user to Meta's consent screen to authorize Facebook/Instagram access.
 * 
 * GET /api/meta/connect → redirects to Meta OAuth
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_ID = process.env.META_APP_ID
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/meta/callback'
const SCOPES = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement'

export async function GET(request: NextRequest) {
    if (!APP_ID) {
        return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const state = `${user.id}:${crypto.randomUUID()}`

    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
    authUrl.searchParams.set('client_id', APP_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('state', state)

    const response = NextResponse.redirect(authUrl.toString())
    response.cookies.set('meta_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10,
    })

    return response
}
