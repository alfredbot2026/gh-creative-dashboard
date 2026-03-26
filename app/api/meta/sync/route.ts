/**
 * Meta Ads Sync API Route
 * Pulls ad-level insights + creative data from Meta Marketing API.
 * Upserts into ad_performance table with daily granularity.
 * 
 * Supports:
 * - datePreset: 'last_7d', 'last_30d' (backward compat)
 * - dateRange: { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD' } (daily breakdown)
 * - Default: last 90 days with daily breakdown
 */
import { createClient } from '@/lib/supabase/server'
import {
    fetchCampaignInsights,
    fetchAdCreatives,
    parseROAS,
    parseConversions,
    parseConversionValue,
    parseVideoViews,
} from '@/lib/meta/client'
import { matchAdsToContent } from '@/lib/meta/content-matcher'
import { NextResponse } from 'next/server'

export const maxDuration = 120

/**
 * POST /api/meta/sync
 * Triggers a full sync of Meta Ads data.
 * Body (all optional):
 *   { datePreset?: string, dateRange?: { since, until }, matchContent?: boolean }
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const matchContent = body.matchContent !== false // default true

        // Determine date range — default to last 90 days with daily breakdown
        let dateParam: string | { since: string; until: string }
        if (body.dateRange?.since && body.dateRange?.until) {
            dateParam = { since: body.dateRange.since, until: body.dateRange.until }
        } else if (body.datePreset) {
            dateParam = body.datePreset
        } else {
            // Default: last 90 days with daily breakdown
            const until = new Date()
            const since = new Date()
            since.setDate(since.getDate() - 90)
            dateParam = {
                since: since.toISOString().split('T')[0],
                until: until.toISOString().split('T')[0],
            }
        }

        // Fetch insights + creatives in parallel
        const [insights, creatives] = await Promise.all([
            fetchCampaignInsights(dateParam),
            fetchAdCreatives(),
        ])

        // Build creative map by ad name for matching
        const creativeMap = new Map(
            creatives.map(c => [c.name || '', c])
        )

        const errors: string[] = []
        let synced = 0

        // Process each insight row (daily granularity per ad)
        for (const insight of insights) {
            const roas = parseROAS(insight.purchase_roas)
            const conversions = parseConversions(insight.actions)
            const conversionValue = parseConversionValue(insight.action_values)
            const videoViews = parseVideoViews(insight.video_p25_watched_actions)

            // Match creative by ad name
            const creative = creativeMap.get(insight.ad_name || '')

            // Extract effective_object_story_id for content matching
            const storyId = creative?.effective_object_story_id || null
            // Format: "page_id_post_id" — extract post_id part
            const sourcePostId = storyId ? storyId.split('_').slice(1).join('_') : null

            const spend = parseFloat(insight.spend || '0')
            const cpa = conversions > 0 ? spend / conversions : null

            const row = {
                user_id: user.id,
                meta_ad_id: insight.ad_id || `${insight.campaign_name}_${insight.ad_name}`,
                meta_campaign_id: insight.campaign_id || null,
                meta_adset_id: insight.adset_id || null,
                campaign_name: insight.campaign_name,
                adset_name: insight.adset_name || null,
                ad_name: insight.ad_name || insight.adset_name || 'Unknown',
                date_start: insight.date_start || new Date().toISOString().split('T')[0],
                date_stop: insight.date_stop || insight.date_start || new Date().toISOString().split('T')[0],
                spend,
                impressions: parseInt(insight.impressions || '0'),
                clicks: parseInt(insight.clicks || '0'),
                ctr: parseFloat(insight.ctr || '0'),
                cpc: insight.cpc ? parseFloat(insight.cpc) : null,
                cpm: insight.cpm ? parseFloat(insight.cpm) : null,
                conversions,
                conversion_value: conversionValue,
                roas,
                cpa,
                video_views: videoViews,
                video_views_p25: parseVideoViews(insight.video_p25_watched_actions),
                video_views_p50: parseVideoViews(insight.video_p50_watched_actions),
                video_views_p75: parseVideoViews(insight.video_p75_watched_actions),
                video_views_p100: parseVideoViews(insight.video_p100_watched_actions),
                source_post_id: sourcePostId,
                ad_creative_url: creative?.image_url || null,
                updated_at: new Date().toISOString(),
            }

            const { error } = await supabase
                .from('ad_performance')
                .upsert(row, {
                    onConflict: 'user_id,meta_ad_id,date_start',
                    ignoreDuplicates: false,
                })

            if (error) {
                errors.push(`${insight.ad_name} (${insight.date_start}): ${error.message}`)
            } else {
                synced++
            }
        }

        // Content matching pass
        let matched = 0
        if (matchContent) {
            try {
                const result = await matchAdsToContent(user.id, supabase)
                matched = result.matched
            } catch (err) {
                errors.push(`Content matching: ${err instanceof Error ? err.message : 'failed'}`)
            }
        }

        return NextResponse.json({
            success: true,
            rows_synced: synced,
            creatives_fetched: creatives.length,
            content_matched: matched,
            date_range: typeof dateParam === 'string' ? dateParam : dateParam,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        // Redact token from error messages
        const message = error instanceof Error ? error.message : 'Sync failed'
        console.error('[Meta Sync Error]', message.replace(/access_token=[^&]+/, 'access_token=REDACTED'))
        return NextResponse.json(
            { error: message.replace(/access_token=[^&]+/, 'access_token=REDACTED') },
            { status: 500 }
        )
    }
}
