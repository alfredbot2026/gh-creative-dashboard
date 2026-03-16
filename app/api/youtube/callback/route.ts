/**
 * YouTube OAuth Callback Route
 * Exchanges auth code for tokens and stores them in Supabase.
 * Then redirects back to the YouTube page.
 * 
 * GET /api/youtube/callback?code=xxx
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback'

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    // Handle user denying access
    if (error) {
        return NextResponse.redirect(new URL('/youtube?error=denied', request.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL('/youtube?error=no_code', request.url))
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return NextResponse.redirect(new URL('/youtube?error=not_configured', request.url))
    }

    try {
        // Exchange authorization code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        })

        if (!tokenRes.ok) {
            const err = await tokenRes.text()
            console.error('[YouTube Callback] Token exchange failed:', err)
            return NextResponse.redirect(new URL('/youtube?error=token_failed', request.url))
        }

        const tokens = await tokenRes.json()
        const { access_token, refresh_token, expires_in } = tokens

        // Get the channel info to store alongside tokens
        const channelRes = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
            { headers: { Authorization: `Bearer ${access_token}` } }
        )
        const channelData = await channelRes.json()
        const channel = channelData.items?.[0]

        if (!channel) {
            return NextResponse.redirect(new URL('/youtube?error=no_channel', request.url))
        }

        // Calculate token expiry time
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

        // Store tokens in Supabase
        const supabase = await createClient()
        const { error: dbError } = await supabase
            .from('youtube_tokens')
            .upsert({
                channel_id: channel.id,
                channel_title: channel.snippet.title,
                access_token,
                refresh_token: refresh_token || '',
                expires_at: expiresAt,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'channel_id' })

        if (dbError) {
            console.error('[YouTube Callback] DB error:', dbError)
            return NextResponse.redirect(new URL('/youtube?error=db_error', request.url))
        }

        // Success → redirect to YouTube page
        return NextResponse.redirect(new URL('/youtube?connected=true', request.url))
    } catch (err) {
        console.error('[YouTube Callback] Error:', err)
        return NextResponse.redirect(new URL('/youtube?error=unknown', request.url))
    }
}
