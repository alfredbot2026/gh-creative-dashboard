/**
 * Meta Marketing API Client
 * Fetches campaign insights and ad creative data from Meta Graph API v25.0.
 * 
 * Two modes:
 * - ENV mode: uses FB_ADS_TOKEN + FB_AD_ACCOUNT_ID (backward compat)
 * - User mode: uses per-user tokens from meta_tokens table (SaaS)
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
    ad_id?: string
    campaign_id?: string
    adset_id?: string
    spend: string
    impressions: string
    clicks: string
    ctr: string
    cpc?: string
    cpm?: string
    actions?: Array<{ action_type: string; value: string }>
    action_values?: Array<{ action_type: string; value: string }>
    purchase_roas?: Array<{ action_type: string; value: string }>
    video_p25_watched_actions?: Array<{ action_type: string; value: string }>
    video_p50_watched_actions?: Array<{ action_type: string; value: string }>
    video_p75_watched_actions?: Array<{ action_type: string; value: string }>
    video_p100_watched_actions?: Array<{ action_type: string; value: string }>
    date_start?: string
    date_stop?: string
}

export interface AdCreative {
    id: string
    name?: string
    body?: string
    title?: string
    image_url?: string
    call_to_action_type?: string
    video_id?: string
    object_story_spec?: Record<string, unknown>
    effective_object_story_id?: string
}

export interface SyncResult {
    campaigns_synced: number
    creatives_synced: number
    errors: string[]
}

export interface MetaCredentials {
    accessToken: string
    adAccountId: string
}

/**
 * Get Meta credentials — prefers explicit params, falls back to env vars.
 */
export function getMetaCredentials(creds?: Partial<MetaCredentials>): MetaCredentials {
    const accessToken = creds?.accessToken || process.env.FB_ADS_TOKEN
    const adAccountId = creds?.adAccountId || process.env.FB_AD_ACCOUNT_ID

    if (!accessToken || !adAccountId) {
        throw new Error('Missing Meta credentials (FB_ADS_TOKEN/FB_AD_ACCOUNT_ID or explicit creds)')
    }

    return { accessToken, adAccountId }
}

/**
 * Fetch campaign insights (metrics) from Meta Ads.
 * 
 * Supports two modes:
 * - datePreset: 'last_7d', 'last_30d', etc. (backward compat)
 * - dateRange: { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD' } with daily breakdown
 */
export async function fetchCampaignInsights(
    datePresetOrRange: string | { since: string; until: string } = 'last_7d',
    creds?: Partial<MetaCredentials>,
): Promise<CampaignInsight[]> {
    const { accessToken, adAccountId } = getMetaCredentials(creds)

    const fields = [
        'campaign_name',
        'campaign_id',
        'adset_name',
        'adset_id',
        'ad_name',
        'ad_id',
        'spend',
        'impressions',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'actions',
        'action_values',
        'purchase_roas',
        'video_p25_watched_actions',
        'video_p50_watched_actions',
        'video_p75_watched_actions',
        'video_p100_watched_actions',
    ].join(',')

    let dateParams: string
    if (typeof datePresetOrRange === 'string') {
        dateParams = `date_preset=${datePresetOrRange}`
    } else {
        // Date range with daily breakdown (time_increment=1)
        const timeRange = JSON.stringify({
            since: datePresetOrRange.since,
            until: datePresetOrRange.until,
        })
        dateParams = `time_range=${encodeURIComponent(timeRange)}&time_increment=1`
    }

    const allResults: CampaignInsight[] = []
    let nextUrl: string | null = `${BASE_URL}/act_${adAccountId}/insights?fields=${fields}&${dateParams}&level=ad&limit=500&access_token=${accessToken}`

    // Paginate through all results
    while (nextUrl) {
        const res: Response = await fetch(nextUrl)
        if (!res.ok) {
            const errBody = await res.json() as Record<string, unknown>
            throw new Error(`Meta Insights API error: ${JSON.stringify(errBody.error || errBody)}`)
        }

        const body = await res.json() as { data?: CampaignInsight[]; paging?: { next?: string } }
        allResults.push(...(body.data || []))

        // Meta paginates with cursor-based pagination
        nextUrl = body.paging?.next || null
    }

    return allResults
}

/**
 * Fetch ad creatives from Meta Ads.
 * Returns body text, title, image URL, CTA type, effective_object_story_id (for content matching).
 */
export async function fetchAdCreatives(
    creds?: Partial<MetaCredentials>,
): Promise<AdCreative[]> {
    const { accessToken, adAccountId } = getMetaCredentials(creds)

    const fields = [
        'name',
        'body',
        'title',
        'image_url',
        'call_to_action_type',
        'video_id',
        'object_story_spec',
        'effective_object_story_id',
    ].join(',')

    const allResults: AdCreative[] = []
    let nextUrl: string | null = `${BASE_URL}/act_${adAccountId}/adcreatives?fields=${fields}&limit=100&access_token=${accessToken}`

    while (nextUrl) {
        const res: Response = await fetch(nextUrl)
        if (!res.ok) {
            const errBody = await res.json() as Record<string, unknown>
            throw new Error(`Meta Creatives API error: ${JSON.stringify(errBody.error || errBody)}`)
        }

        const body = await res.json() as { data?: AdCreative[]; paging?: { next?: string } }
        allResults.push(...(body.data || []))
        nextUrl = body.paging?.next || null
    }

    return allResults
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

/**
 * Parse conversion value (revenue) from Meta's action_values array.
 */
export function parseConversionValue(actionValues?: Array<{ action_type: string; value: string }>): number {
    if (!actionValues || actionValues.length === 0) return 0
    const purchase = actionValues.find(a =>
        a.action_type === 'omni_purchase' ||
        a.action_type === 'purchase' ||
        a.action_type === 'offsite_conversion.fb_pixel_purchase'
    )
    return purchase ? parseFloat(purchase.value) : 0
}

/**
 * Parse video view count from Meta's video watched actions array.
 */
export function parseVideoViews(
    actions?: Array<{ action_type: string; value: string }>
): number {
    if (!actions || actions.length === 0) return 0
    const view = actions.find(a => a.action_type === 'video_view')
    return view ? parseInt(view.value) : 0
}
