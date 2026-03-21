import { createClient } from '@/lib/supabase/server'

/**
 * Checks if a Meta token is expiring within 7 days, and exchanges it for a new long-lived token.
 */
export async function refreshMetaToken(userId: string): Promise<string> {
    const supabase = await createClient()
    
    // 1. Get current token
    const { data: tokenData, error } = await supabase
        .from('meta_tokens')
        .select('access_token, token_expires_at')
        .eq('user_id', userId)
        .single()
        
    if (error || !tokenData) {
        throw new Error('No Meta token found for user')
    }

    const { access_token, token_expires_at } = tokenData

    // 2. Check if refresh is needed (expiring within 7 days)
    const expiresAtDate = new Date(token_expires_at)
    const expiresAt = expiresAtDate.getTime()
    const now = Date.now()
    
    if (now > expiresAt) {
        // Already expired
        await supabase.from('meta_tokens').update({ token_expires_at: new Date(0).toISOString() }).eq('user_id', userId)
        throw new Error('Token is already expired')
    }

    const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24)

    if (daysUntilExpiry > 7) {
        return access_token // Still valid for a while, no need to refresh
    }

    // 3. Refresh token
    const APP_ID = process.env.META_APP_ID
    const APP_SECRET = process.env.META_APP_SECRET
    
    if (!APP_ID || !APP_SECRET) {
        throw new Error('Meta App credentials not configured')
    }

    try {
        const refreshRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${access_token}`)
        
        if (!refreshRes.ok) {
            throw new Error(`Failed to refresh token: ${await refreshRes.text()}`)
        }
        
        const refreshData = await refreshRes.json()
        const newAccessToken = refreshData.access_token
        const expiresIn = refreshData.expires_in || (60 * 24 * 60 * 60)
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        // 4. Store new token
        const { error: updateError } = await supabase
            .from('meta_tokens')
            .update({
                access_token: newAccessToken,
                token_expires_at: newExpiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

        if (updateError) {
            throw new Error(`Failed to update refreshed token in DB: ${updateError.message}`)
        }

        return newAccessToken
    } catch (err) {
        console.error('[Meta Token Refresh] Error:', err)
        // Mark token as expired in DB
        await supabase.from('meta_tokens').update({ token_expires_at: new Date(0).toISOString() }).eq('user_id', userId)
        throw err
    }
}

/**
 * Gets a valid Meta token, auto-refreshing if needed.
 * Returns null if no token exists or refresh fails.
 */
export async function getValidMetaToken(userId: string): Promise<string | null> {
    try {
        return await refreshMetaToken(userId)
    } catch (err) {
        console.error(`[getValidMetaToken] Failed for user ${userId}:`, err)
        return null
    }
}
