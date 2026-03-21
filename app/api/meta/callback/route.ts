/**
 * Meta OAuth Callback Route
 * Exchanges auth code for tokens, short-lived to long-lived, and stores in Supabase.
 * Then redirects back to Settings.
 * 
 * GET /api/meta/callback?code=xxx&state=xxx
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const APP_ID = process.env.META_APP_ID
const APP_SECRET = process.env.META_APP_SECRET
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/meta/callback'

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state') // could be userId
    const error = request.nextUrl.searchParams.get('error')

    // Handle user denying access
    if (error) {
        return NextResponse.redirect(new URL('/settings?error=meta_denied', request.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL('/settings?error=no_meta_code', request.url))
    }

    if (!APP_ID || !APP_SECRET) {
        return NextResponse.redirect(new URL('/settings?error=meta_not_configured', request.url))
    }

    try {
        // Exchange authorization code for short-lived token
        const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`)

        if (!tokenRes.ok) {
            const err = await tokenRes.text()
            console.error('[Meta Callback] Short-lived token exchange failed:', err)
            return NextResponse.redirect(new URL('/settings?error=meta_token_failed', request.url))
        }

        const tokens = await tokenRes.json()
        const shortLivedToken = tokens.access_token

        // Exchange short-lived for long-lived token
        const longTokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`)
        
        if (!longTokenRes.ok) {
            console.error('[Meta Callback] Long-lived token exchange failed:', await longTokenRes.text())
            return NextResponse.redirect(new URL('/settings?error=meta_long_token_failed', request.url))
        }
        
        const longTokens = await longTokenRes.json()
        const longLivedToken = longTokens.access_token
        const expiresIn = longTokens.expires_in || (60 * 24 * 60 * 60) // default 60 days

        // Calculate token expiry time
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        // Get the IG Business Account info
        const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`)
        const accountsData = await accountsRes.json()
        
        let pageId = null
        let pageName = null
        let igUserId = null
        let igUsername = null

        if (accountsData.data && accountsData.data.length > 0) {
            // Find a page with an IG business account
            for (const page of accountsData.data) {
                const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${longLivedToken}`)
                const igData = await igRes.json()
                if (igData.instagram_business_account) {
                    pageId = page.id
                    pageName = page.name
                    igUserId = igData.instagram_business_account.id
                    
                    // Get IG username
                    const igUserRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${longLivedToken}`)
                    const igUserData = await igUserRes.json()
                    igUsername = igUserData.username
                    
                    break
                }
            }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        // If state holds the userId, we could verify it against the current authenticated user,
        // but let's just use the currently authenticated user session.
        if (!user) {
            return NextResponse.redirect(new URL('/settings?error=meta_no_session', request.url))
        }

        // Store tokens in Supabase
        const { error: dbError } = await supabase
            .from('meta_tokens')
            .upsert({
                user_id: user.id,
                access_token: longLivedToken,
                token_expires_at: expiresAt,
                ig_user_id: igUserId,
                page_id: pageId,
                page_name: pageName,
                ig_username: igUsername,
                scopes: ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'],
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (dbError) {
            console.error('[Meta Callback] DB error:', dbError)
            return NextResponse.redirect(new URL('/settings?error=meta_db_error', request.url))
        }

        // Success → redirect to Settings page
        return NextResponse.redirect(new URL('/settings?meta=connected', request.url))
    } catch (err) {
        console.error('[Meta Callback] Error:', err)
        return NextResponse.redirect(new URL('/settings?error=meta_unknown', request.url))
    }
}
