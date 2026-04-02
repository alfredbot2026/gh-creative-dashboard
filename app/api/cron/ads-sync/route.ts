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
import { createClient } from '@supabase/supabase-js'

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

    // Step 3: Feedback loop — update hook_bank + knowledge_entries from ad performance
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Find deployed hook_bank entries that have linked ads
      const { data: deployedHooks } = await supabase
        .from('hook_bank')
        .select('id, deployed_ad_id, hook_text, ad_roas, ad_status')
        .eq('status', 'deployed')
        .not('deployed_ad_id', 'is', null)

      let bankUpdated = 0
      let kbUpdated = 0

      for (const hook of (deployedHooks || [])) {
        // Get current ROAS + status from the linked ad
        const { data: ad } = await supabase
          .from('ad_creatives')
          .select('avg_roas, ad_status')
          .eq('id', hook.deployed_ad_id)
          .single()

        if (!ad) continue

        const newRoas = ad.avg_roas
        const newStatus = ad.ad_status

        // Skip if nothing changed
        if (hook.ad_roas === newRoas && hook.ad_status === newStatus) continue

        // Update hook_bank
        await supabase
          .from('hook_bank')
          .update({ ad_roas: newRoas, ad_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', hook.id)
        bankUpdated++

        // Propagate to knowledge_entries — find matching hook by content
        const { data: kbMatch } = await supabase
          .from('knowledge_entries')
          .select('id, effectiveness_score, times_used, times_successful')
          .eq('category', 'hook_library')
          .eq('content', hook.hook_text)
          .limit(1)
          .single()

        if (kbMatch) {
          let scoreDelta = 0
          if (newStatus === 'winning') scoreDelta = 10
          else if (newStatus === 'tired') scoreDelta = -5
          else if (newStatus === 'dead') scoreDelta = -15

          const newScore = Math.max(0, Math.min(100, (kbMatch.effectiveness_score || 50) + scoreDelta))
          await supabase
            .from('knowledge_entries')
            .update({
              effectiveness_score: newScore,
              times_used: (kbMatch.times_used || 0) + 1,
              times_successful: (kbMatch.times_successful || 0) + (newStatus === 'winning' ? 1 : 0),
              last_used_at: new Date().toISOString(),
            })
            .eq('id', kbMatch.id)
          kbUpdated++
        }
      }

      results.feedback_loop = { bank_updated: bankUpdated, kb_updated: kbUpdated }
    } catch (feedbackErr) {
      results.feedback_loop = { error: feedbackErr instanceof Error ? feedbackErr.message : 'unknown' }
    }

    console.log('[Cron] ads-sync complete:', JSON.stringify(results))
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Cron] ads-sync failed:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
