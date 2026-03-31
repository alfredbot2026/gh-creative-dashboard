import { createClient } from '@/lib/supabase/server';

/**
 * Retrieves the Meta access token for a given user.
 * Tokens are currently stored directly in the meta_tokens table.
 */
export async function getDecryptedToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meta_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (error || !data?.access_token) {
    console.error(`[Ads Fetcher] Failed to retrieve token for user ${userId}:`, error?.message);
    return null;
  }

  return data.access_token;
}

export interface AdInsight {
  meta_ad_id: string;
  meta_campaign_id: string;
  meta_adset_id: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  conversions: number;
  conversion_value: number;
  roas: number;
  cpa: number;
  messaging_conversations: number;
  leads: number;
  link_clicks: number;
  landing_page_views: number;
  post_engagement: number;
  video_views_p25: number;
  video_views_p50: number;
  video_views_p75: number;
  video_views_p100: number;
  date_start: string;
  date_stop: string;
  source_post_id?: string;
}

export async function fetchAdInsights(
  token: string,
  accountId: string,
  dateRange: { since: string; until: string }
): Promise<AdInsight[]> {
  // Meta requires 'act_' prefix for ad account IDs in most endpoints
  const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  
  const fields = [
    'ad_id', 'campaign_id', 'adset_id', 'campaign_name', 'adset_name', 'ad_name',
    'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
    'reach', 'frequency',
    'actions', 'action_values', 'cost_per_action_type',
    'video_p25_watched_actions', 'video_p50_watched_actions',
    'video_p75_watched_actions', 'video_p100_watched_actions',
    // Note: effective_object_story_id is NOT valid for /insights endpoint
    // We get it from the creatives sync instead
  ].join(',');

  const timeRangeStr = JSON.stringify({ since: dateRange.since, until: dateRange.until });
  
  // Notice: We do NOT append ?access_token= here, we use the Authorization header instead
  const url = `https://graph.facebook.com/v25.0/${formattedAccountId}/insights?level=ad&fields=${fields}&time_range=${encodeURIComponent(timeRangeStr)}&time_increment=1`;

  try {
    const insights: AdInsight[] = [];
    let nextUrl: string | null = url

    // Paginate through all pages (Meta returns 25 per page by default)
    while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      // Ensure we don't log the token here!
      console.error(`[Ads Fetcher] Meta API error for account ${formattedAccountId}:`, errorText);
      throw new Error('Meta API returned an error');
    }

    const data = await response.json();

    // Advance to next page (or stop)
    nextUrl = data.paging?.next || null

    for (const item of data.data || []) {
      // Parse conversions and values
      let conversions = 0;
      let conversion_value = 0;

      if (item.actions) {
        const purchaseAction = item.actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
        if (purchaseAction) conversions = parseInt(purchaseAction.value || '0', 10);
      }

      if (item.action_values) {
        const purchaseValue = item.action_values.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
        if (purchaseValue) conversion_value = parseFloat(purchaseValue.value || '0');
      }

      const spend = parseFloat(item.spend || '0');
      const roas = spend > 0 ? conversion_value / spend : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      // Action value helpers
      const getActionValue = (actionsArray: any[], type: string) => {
        if (!actionsArray) return 0;
        const action = actionsArray.find((a: any) => a.action_type === type);
        return action ? parseInt(action.value || '0', 10) : 0;
      };

      // Funnel metrics from actions
      const messaging_conversations = getActionValue(item.actions, 'onsite_conversion.messaging_conversation_started_7d')
        || getActionValue(item.actions, 'onsite_conversion.messaging_first_reply');
      const leads = getActionValue(item.actions, 'lead')
        || getActionValue(item.actions, 'onsite_conversion.lead');
      const link_clicks = getActionValue(item.actions, 'link_click');
      const landing_page_views = getActionValue(item.actions, 'landing_page_view');
      const post_engagement = getActionValue(item.actions, 'post_engagement');

      insights.push({
        meta_ad_id: item.ad_id,
        meta_campaign_id: item.campaign_id,
        meta_adset_id: item.adset_id,
        campaign_name: item.campaign_name || '',
        adset_name: item.adset_name || '',
        ad_name: item.ad_name || '',
        spend,
        impressions: parseInt(item.impressions || '0', 10),
        clicks: parseInt(item.clicks || '0', 10),
        ctr: parseFloat(item.ctr || '0'),
        cpc: parseFloat(item.cpc || '0'),
        cpm: parseFloat(item.cpm || '0'),
        reach: parseInt(item.reach || '0', 10),
        frequency: parseFloat(item.frequency || '0'),
        conversions,
        conversion_value,
        roas,
        cpa,
        messaging_conversations,
        leads,
        link_clicks,
        landing_page_views,
        post_engagement,
        video_views_p25: getActionValue(item.video_p25_watched_actions, 'video_view'),
        video_views_p50: getActionValue(item.video_p50_watched_actions, 'video_view'),
        video_views_p75: getActionValue(item.video_p75_watched_actions, 'video_view'),
        video_views_p100: getActionValue(item.video_p100_watched_actions, 'video_view'),
        date_start: item.date_start,
        date_stop: item.date_stop,
        source_post_id: item.effective_object_story_id || null
      });
    }
    } // end pagination while loop

    // Debug: log date range coverage
    const dates = insights.map(i => i.date_start).filter(Boolean).sort()
    const minDate = dates[0] || 'none'
    const maxDate = dates[dates.length - 1] || 'none'
    console.log(`[Ads Fetcher] Fetched ${insights.length} insight rows total | dates: ${minDate} to ${maxDate} | requested: ${dateRange.since} to ${dateRange.until}`)
    return insights;
  } catch (err: any) {
    console.error('[Ads Fetcher] Failed to fetch insights:', err.message);
    throw err;
  }
}
