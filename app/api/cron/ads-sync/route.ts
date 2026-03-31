/**
 * GET /api/cron/ads-sync — Daily ads sync (Vercel Cron)
 * 
 * Runs at 6:00 AM PHT daily. Does:
 * 1. Sync ad creatives + daily performance from Meta
 * 2. Recalculate ad_status for all active ads (fatigue detection)
 * 3. Log summary
 * 
 * Auth: Vercel cron (CRON_SECRET header) only.
 */
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = { timestamp: new Date().toISOString() }

  try {
    // Step 1: Sync creatives + performance from Meta
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const syncRes = await fetch(`${baseUrl}/api/ads/creatives/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ reclassify: false }),
    })
    const syncData = await syncRes.json()
    results.sync = syncData.success
      ? { ads_fetched: syncData.ads_fetched, performance_updated: syncData.performance_updated }
      : { error: syncData.error }

    // Step 2: Refresh metrics (triggers ad_status recalculation via aggregation)
    // The sync endpoint already recalculates status. Log a summary of status changes.
    if (syncData.success && syncData.status_changes) {
      results.status_changes = syncData.status_changes
    }

    console.log('[Cron] ads-sync complete:', JSON.stringify(results))
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Cron] ads-sync failed:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
