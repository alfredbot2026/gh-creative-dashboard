/**
 * YouTube OAuth Connect Route
 * Redirects user to Google's consent screen to authorize YouTube access.
 * 
 * GET /api/youtube/connect → redirects to Google OAuth
 */
import { NextResponse } from 'next/server'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback'

/* Scopes needed for channel analytics + revenue data */
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
].join(' ')

export async function GET() {
    if (!CLIENT_ID) {
        return NextResponse.json({ error: 'YOUTUBE_CLIENT_ID not configured' }, { status: 500 })
    }

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('access_type', 'offline')   // gets refresh token
    authUrl.searchParams.set('prompt', 'consent')          // forces consent to get refresh token

    return NextResponse.redirect(authUrl.toString())
}
