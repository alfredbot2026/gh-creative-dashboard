import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const APP_ID = process.env.META_APP_ID
const APP_SECRET = process.env.META_APP_SECRET
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/meta/callback'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/settings?error=unauthorized', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const errorParam = request.nextUrl.searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(new URL('/settings?meta=denied', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=invalid_request', request.url))
  }

  // CSRF Check
  const cookieStore = await cookies()
  const savedState = cookieStore.get('meta_oauth_state')?.value
  
  if (!savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/settings?error=csrf_failed', request.url))
  }
  
  // Clear cookie
  cookieStore.delete('meta_oauth_state')

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.redirect(new URL('/settings?error=not_configured', request.url))
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APP_ID,
        client_secret: APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[Meta Callback] Short-lived token exchange failed:', err)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
    }

    const shortLivedTokens = await tokenRes.json()
    const shortLivedToken = shortLivedTokens.access_token

    // 2. Exchange for long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', APP_ID)
    longLivedUrl.searchParams.set('client_secret', APP_SECRET)
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const longLivedRes = await fetch(longLivedUrl.toString())
    if (!longLivedRes.ok) {
      console.error('[Meta Callback] Long-lived token exchange failed:', await longLivedRes.text())
      return NextResponse.redirect(new URL('/settings?error=long_lived_failed', request.url))
    }

    const longLivedTokens = await longLivedRes.json()
    const accessToken = longLivedTokens.access_token
    const expiresIn = longLivedTokens.expires_in || (60 * 60 * 24 * 60) // approx 60 days if not provided
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 3. Get Pages
    const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`)
    const accountsData = await accountsRes.json()
    const pages = accountsData.data || []

    if (pages.length === 0) {
      return NextResponse.redirect(new URL('/settings?error=no_pages', request.url))
    }

    // 4. Find the first page with an IG business account
    let pageId = null
    let pageName = null
    let igUserId = null
    let igUsername = null

    for (const page of pages) {
      const pageInfoRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account,name&access_token=${accessToken}`
      )
      const pageInfo = await pageInfoRes.json()
      
      if (pageInfo.instagram_business_account) {
        pageId = page.id
        pageName = pageInfo.name
        igUserId = pageInfo.instagram_business_account.id
        
        // Optionally fetch the IG username
        const igInfoRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}?fields=username&access_token=${accessToken}`
        )
        const igInfo = await igInfoRes.json()
        if (igInfo.username) {
          igUsername = igInfo.username
        }
        break
      }
    }

    if (!igUserId) {
      return NextResponse.redirect(new URL('/settings?error=no_ig_business_account', request.url))
    }

    // 5. Store in Supabase
    const { error: dbError } = await supabase
      .from('meta_tokens')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        token_expires_at: expiresAt,
        ig_user_id: igUserId,
        page_id: pageId,
        page_name: pageName,
        ig_username: igUsername,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('[Meta Callback] DB error:', dbError)
      return NextResponse.redirect(new URL('/settings?error=db_error', request.url))
    }

    return NextResponse.redirect(new URL('/settings?meta=connected', request.url))

  } catch (err) {
    console.error('[Meta Callback] Error:', err)
    return NextResponse.redirect(new URL('/settings?error=unknown', request.url))
  }
}
