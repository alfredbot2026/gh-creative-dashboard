/**
 * Meta Marketing API Client
 * Fetches campaign insights and ad creative data from Meta Graph API v25.0.
 * 
 * Two separate endpoints:
 * - /insights: metrics (spend, ROAS, CTR, conversions)
 * - /adcreatives: creative data (body copy, title, image_url, CTA type)
 */

const META_API_VERSION = 'v25.0'
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

/* -- Types -- */
export interface CampaignInsight {
    campaign_name: string
    adset_name?: string
    ad_name?: string
    spend: string
    impressions: string
    clicks: string
    ctr: string
    actions?: Array<{ action_type: string; value: string }>
    purchase_roas?: Array<{ action_type: string; value: string }>
}

export interface AdCreative {
    id: string
    name?: string
    body?: string        // primary ad copy text
    title?: string       // link ad headline
    image_url?: string   // temp URL of the image
    call_to_action_type?: string  // SHOP_NOW, LEARN_MORE, etc.
    video_id?: string
    object_story_spec?: Record<string, unknown>
}

export interface SyncResult {
    campaigns_synced: number
    creatives_synced: number
    errors: string[]
}

/**
 * Fetch campaign insights (metrics) from Meta Ads.
 * Returns spend, impressions, clicks, CTR, ROAS, and conversion actions.
 */
export async function fetchCampaignInsights(
    datePreset: string = 'last_7d'
): Promise<CampaignInsight[]> {
    const accessToken = process.env.FB_ADS_TOKEN
    const adAccountId = process.env.FB_AD_ACCOUNT_ID

    if (!accessToken || !adAccountId) {
        throw new Error('Missing FB_ADS_TOKEN or FB_AD_ACCOUNT_ID environment variables')
    }

    // Build the insights request URL
    const fields = [
        'campaign_name',
        'adset_name',
        'ad_name',
        'spend',
        'impressions',
        'clicks',
        'ctr',
        'actions',
        'purchase_roas',
    ].join(',')

    const url = `${BASE_URL}/act_${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&level=ad&limit=100&access_token=${accessToken}`

    const response = await fetch(url)
    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Meta Insights API error: ${JSON.stringify(error.error || error)}`)
    }

    const data = await response.json()
    return data.data || []
}

/**
 * Fetch ad creatives (what the ad looks like) from Meta Ads.
 * Returns body text, title, image URL, CTA type, and video ID.
 */
export async function fetchAdCreatives(): Promise<AdCreative[]> {
    const accessToken = process.env.FB_ADS_TOKEN
    const adAccountId = process.env.FB_AD_ACCOUNT_ID

    if (!accessToken || !adAccountId) {
        throw new Error('Missing FB_ADS_TOKEN or FB_AD_ACCOUNT_ID environment variables')
    }

    const fields = [
        'name',
        'body',
        'title',
        'image_url',
        'call_to_action_type',
        'video_id',
        'object_story_spec',
    ].join(',')

    const url = `${BASE_URL}/act_${adAccountId}/adcreatives?fields=${fields}&limit=100&access_token=${accessToken}`

    const response = await fetch(url)
    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Meta Creatives API error: ${JSON.stringify(error.error || error)}`)
    }

    const data = await response.json()
    return data.data || []
}

/**
 * Parse ROAS value from Meta's actions array format.
 * Meta returns ROAS as: [{ action_type: "omni_purchase", value: "3.85" }]
 */
export function parseROAS(purchaseRoas?: Array<{ action_type: string; value: string }>): number {
    if (!purchaseRoas || purchaseRoas.length === 0) return 0
    const roas = purchaseRoas.find(r => r.action_type === 'omni_purchase')
    return roas ? parseFloat(roas.value) : 0
}

/**
 * Parse conversions count from Meta's actions array.
 * Looks for purchase or lead actions.
 */
export function parseConversions(actions?: Array<{ action_type: string; value: string }>): number {
    if (!actions || actions.length === 0) return 0
    const purchase = actions.find(a =>
        a.action_type === 'omni_purchase' ||
        a.action_type === 'purchase' ||
        a.action_type === 'offsite_conversion.fb_pixel_purchase'
    )
    return purchase ? parseInt(purchase.value) : 0
}
