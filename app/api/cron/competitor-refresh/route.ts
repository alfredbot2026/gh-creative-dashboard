/**
 * GET /api/cron/competitor-refresh — Weekly competitor intelligence refresh (Vercel Cron)
 * 
 * Runs weekly (Mondays 7:00 AM PHT). Does:
 * 1. Refresh competitor ads from Meta Ad Library
 * 2. Refresh market sentiment via Brave Search
 * 
 * Auth: Vercel cron (CRON_SECRET header) only.
 */
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = { timestamp: new Date().toISOString() }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  try {
    // Step 1: Refresh competitor ads
    const compRes = await fetch(`${baseUrl}/api/ads/competitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ action: 'refresh' }),
    })
    const compData = await compRes.json().catch(() => ({ error: 'parse failed' }))
    results.competitors = compData.success !== false
      ? { refreshed: true, ...(compData.competitors_updated && { updated: compData.competitors_updated }) }
      : { error: compData.error }

    // Step 2: Refresh market sentiment
    const sentRes = await fetch(`${baseUrl}/api/ads/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ action: 'collect' }),
    })
    const sentData = await sentRes.json().catch(() => ({ error: 'parse failed' }))
    results.sentiment = sentData.success !== false
      ? { refreshed: true }
      : { error: sentData.error }

    console.log('[Cron] competitor-refresh complete:', JSON.stringify(results))
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Cron] competitor-refresh failed:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
