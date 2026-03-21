/**
 * Token Health API
 * GET /api/tokens/health — Check health of all connected platform tokens.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TokenHealth {
  connected: boolean
  token_valid: boolean
  expires_in_days: number | null
  needs_refresh: boolean
  scopes?: string[]
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check Meta tokens
  let meta: TokenHealth | null = null
  const { data: metaToken } = await supabase
    .from('meta_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (metaToken) {
    const expiresAt = metaToken.token_expires_at ? new Date(metaToken.token_expires_at) : null
    const daysUntilExpiry = expiresAt
      ? Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    meta = {
      connected: true,
      token_valid: !expiresAt || expiresAt > new Date(),
      expires_in_days: daysUntilExpiry,
      needs_refresh: daysUntilExpiry !== null && daysUntilExpiry < 7,
      scopes: metaToken.scopes || [],
    }
  }

  // Check YouTube tokens
  let youtube: (TokenHealth & { has_analytics_scope: boolean }) | null = null
  const { data: ytToken } = await supabase
    .from('youtube_tokens')
    .select('*')
    .limit(1)
    .single()

  if (ytToken) {
    const expiresAt = ytToken.expires_at ? new Date(ytToken.expires_at) : null
    const daysUntilExpiry = expiresAt
      ? Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) * 100) / 100
      : null

    youtube = {
      connected: true,
      token_valid: !expiresAt || expiresAt > new Date(),
      expires_in_days: daysUntilExpiry,
      needs_refresh: expiresAt ? expiresAt < new Date() : false,
      has_analytics_scope: true,  // We request it in connect flow
    }
  }

  return NextResponse.json({
    meta: meta || { connected: false, token_valid: false, expires_in_days: null, needs_refresh: false },
    youtube: youtube || { connected: false, token_valid: false, expires_in_days: null, needs_refresh: false, has_analytics_scope: false },
  })
}
