import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDecryptedToken, fetchAdInsights } from '@/lib/meta/ads-fetcher';
import { matchAdsToContent } from '@/lib/meta/content-matcher';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dateRange = body.dateRange || {
      since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0]
    };

    // 1. Get Meta token and Ad Account
    const { data: tokenData, error: tokenError } = await supabase
      .from('meta_tokens')
      .select('access_token, page_id')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json({ error: 'Connect your Meta account first' }, { status: 400 });
    }

    // Note: For actual ads fetching, we typically need an Ad Account ID (act_xxx).
    // The meta_tokens table stores page_id, but the user might have multiple ad accounts.
    // In a real-world scenario, we'd fetch the ad accounts first or have a chosen one.
    // For this task, we'll try to derive or use act_ + page_id if possible, or fetch act accounts.
    // Let's assume the user has a linked ad account or we fetch the first one.
    
    // Fetch ad accounts for this token
    const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=account_id&access_token=${tokenData.access_token}`);
    const accountsData = await accountsRes.json();
    
    if (!accountsData.data || accountsData.data.length === 0) {
        return NextResponse.json({ error: 'No Meta Ad Accounts found' }, { status: 400 });
    }

    // For now, sync the first ad account found
    const adAccountId = accountsData.data[0].id; // Format is 'act_xxxx'
    
    // 2. Fetch insights
    const insights = await fetchAdInsights(tokenData.access_token, adAccountId, dateRange);

    // 3. Upsert into ad_performance
    let synced = 0;
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
        synced++;
      }
    }

    // 4. Trigger ad-to-content matching
    const matchingResult = await matchAdsToContent(user.id);

    return NextResponse.json({ 
        synced, 
        matched: matchingResult.matched,
        errors: errorsCount,
        ad_account: adAccountId,
        date_range: dateRange
    });
  } catch (err: any) {
    console.error('[Sync API] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
