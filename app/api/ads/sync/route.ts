import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDecryptedToken, fetchAdInsights } from '@/lib/meta/ads-fetcher';
import { matchAdsToContent } from '@/lib/meta/content-matcher';

/**
 * Validates date format YYYY-MM-DD
 */
function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    
    // Default to last 90 days if not provided
    const dateRange = body.dateRange || {
      since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0]
    };

    // 3. P1 — Validate dateRange input
    if (!isValidDate(dateRange.since) || !isValidDate(dateRange.until)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    const sinceDate = new Date(dateRange.since);
    const untilDate = new Date(dateRange.until);
    const now = new Date();
    
    if (sinceDate > untilDate) {
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
    }

    // Max 90-day lookback window
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    
    if (sinceDate < ninetyDaysAgo) {
      return NextResponse.json({ error: 'Maximum 90-day lookback window allowed' }, { status: 400 });
    }

    const diffTime = Math.abs(untilDate.getTime() - sinceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      return NextResponse.json({ error: 'Date range cannot exceed 90 days' }, { status: 400 });
    }

    // 1. P0 — Rate limiting (Single-flight lock & 1-hour cooldown)
    const { data: lockData, error: lockError } = await supabase
      .from('sync_locks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (lockError) {
      console.error('[Sync API] Failed to read lock:', lockError.message);
      return NextResponse.json(
        { error: 'Failed to check sync status. Please try again.' },
        { status: 500 }
      );
    }

    if (lockData) {
      // Check single-flight lock
      if (lockData.is_running) {
        // Simple expiry for stuck locks (e.g. 10 mins)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (new Date(lockData.last_sync_at) > tenMinsAgo) {
          return NextResponse.json({ error: 'Sync already in progress' }, { status: 429 });
        }
      }

      // Check 1-hour cooldown
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lockData.last_sync_at && new Date(lockData.last_sync_at) > oneHourAgo && !body.force) {
        return NextResponse.json({ error: 'Rate limit: Only 1 sync per hour allowed' }, { status: 429 });
      }
    }

    // Acquire lock — fail closed on error
    const { error: lockAcquireError } = await supabase
      .from('sync_locks')
      .upsert({
        user_id: user.id,
        is_running: true,
        last_sync_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (lockAcquireError) {
      console.error('[Sync API] Failed to acquire lock:', lockAcquireError.message);
      return NextResponse.json(
        { error: 'Failed to acquire sync lock. Please try again.' },
        { status: 500 }
      );
    }

    try {
      // 1. Get Meta token and Ad Account
      const { data: tokenData, error: tokenError } = await supabase
        .from('meta_tokens')
        .select('access_token, page_id')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData?.access_token) {
        throw new Error('Connect your Meta account first');
      }

      // 2. Fetch Ad Account ID
      const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=account_id`, {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const accountsData = await accountsRes.json();
      
      if (!accountsData.data || accountsData.data.length === 0) {
        throw new Error('No Meta Ad Accounts found');
      }

      const adAccountId = accountsData.data[0].id;
      
      // 2. Fetch insights
      const insights = await fetchAdInsights(tokenData.access_token, adAccountId, dateRange);

      // 3. Upsert into ad_performance
      let syncedCount = 0;
      let errorsCount = 0;

      for (const insight of insights) {
        const { error: upsertError } = await supabase
          .from('ad_performance')
          .upsert({
            user_id: user.id,
            meta_ad_id: insight.meta_ad_id,
            meta_campaign_id: insight.meta_campaign_id,
            meta_adset_id: insight.meta_adset_id,
            campaign_name: insight.campaign_name,
            adset_name: insight.adset_name,
            ad_name: insight.ad_name,
            source_post_id: insight.source_post_id,
            date_start: insight.date_start,
            date_stop: insight.date_stop,
            spend: insight.spend,
            impressions: insight.impressions,
            clicks: insight.clicks,
            ctr: insight.ctr,
            cpc: insight.cpc,
            cpm: insight.cpm,
            conversions: insight.conversions,
            conversion_value: insight.conversion_value,
            roas: insight.roas,
            cpa: insight.cpa,
            video_views_p25: insight.video_views_p25,
            video_views_p50: insight.video_views_p50,
            video_views_p75: insight.video_views_p75,
            video_views_p100: insight.video_views_p100,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id, meta_ad_id, date_start'
          });

        if (upsertError) {
          console.error('[Sync API] Upsert error:', upsertError.message);
          errorsCount++;
        } else {
          syncedCount++;
        }
      }

      // 4. Match ads to content items
      const matchingResult = await matchAdsToContent(user.id, supabase);

      return NextResponse.json({ 
          synced: syncedCount, 
          matched: matchingResult.matched,
          errors: errorsCount,
          ad_account: adAccountId,
          date_range: dateRange
      });
    } finally {
      // Release lock — log but don't fail on release error
      const { error: lockReleaseError } = await supabase
        .from('sync_locks')
        .update({ is_running: false })
        .eq('user_id', user.id);

      if (lockReleaseError) {
        console.error('[Sync API] Failed to release lock:', lockReleaseError.message);
      }
    }
  } catch (err: any) {
    console.error('[Sync API] Error:', err.message);
    const status = err.message === 'Connect your Meta account first' || err.message === 'No Meta Ad Accounts found' ? 400 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
