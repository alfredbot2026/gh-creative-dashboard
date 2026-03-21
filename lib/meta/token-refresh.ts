import { createClient } from '@/lib/supabase/server'

/**
 * Utility to refresh and get a valid Meta access token.
 */

const APP_ID = process.env.META_APP_ID
const APP_SECRET = process.env.META_APP_SECRET

export async function refreshMetaToken(userId: string, currentToken: string): Promise<string> {
  if (!APP_ID || !APP_SECRET) {
    throw new Error('META_APP_ID or META_APP_SECRET not configured')
  }

  // Get new long-lived token
  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', APP_ID)
  url.searchParams.set('client_secret', APP_SECRET)
  url.searchParams.set('fb_exchange_token', currentToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('Failed to refresh Meta token: ' + await res.text())
  }

  const data = await res.json()
  const newAccessToken = data.access_token
  const expiresIn = data.expires_in || (60 * 60 * 24 * 60) // Fallback to 60 days
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  // Update in DB
  const supabase = await createClient()
  const { error } = await supabase
    .from('meta_tokens')
    .update({ 
      access_token: newAccessToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error('Failed to update refreshed token in DB: ' + error.message)
  }

  return newAccessToken
}

export async function getValidMetaToken(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: tokenRecord, error } = await supabase
    .from('meta_tokens')
    .select('access_token, token_expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !tokenRecord || !tokenRecord.access_token) {
    return null
  }

  const { access_token, token_expires_at } = tokenRecord

  if (!token_expires_at) {
    return access_token
  }

  const expiresAtDate = new Date(token_expires_at)
  const now = new Date()
  
  // If expired, clear it out or mark expired
  if (now > expiresAtDate) {
    await supabase.from('meta_tokens').update({ token_expires_at: new Date(0).toISOString() }).eq('user_id', userId)
    return null
  }

  // If expiring in less than 7 days, refresh it
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (expiresAtDate < sevenDaysFromNow) {
    try {
      return await refreshMetaToken(userId, access_token)
    } catch (refreshErr) {
      console.error('[Meta Token] Auto-refresh failed:', refreshErr)
      // Mark as expired on failure so we don't keep attempting
      await supabase.from('meta_tokens').update({ token_expires_at: new Date(0).toISOString() }).eq('user_id', userId)
      return null
    }
  }

  return access_token
}
