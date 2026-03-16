/**
 * Meta Ads Sync API Route
 * Pulls campaign insights + creative data from Meta Marketing API.
 * Upserts into ad_performance table with creative context.
 */
import { createClient } from '@/lib/supabase/server'
import {
    fetchCampaignInsights,
    fetchAdCreatives,
    parseROAS,
    parseConversions,
} from '@/lib/meta/client'
import { NextResponse } from 'next/server'

/**
 * POST /api/meta/sync
 * Triggers a full sync of Meta Ads data.
 * Accepts optional: { datePreset: 'last_7d' | 'last_30d' | 'this_month' }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}))
        const datePreset = body.datePreset || 'last_7d'

        // Fetch both insights and creatives in parallel
        const [insights, creatives] = await Promise.all([
            fetchCampaignInsights(datePreset),
            fetchAdCreatives(),
        ])

        // Build a map of creative name → creative details
        const creativeMap = new Map(
            creatives.map(c => [c.name || '', c])
        )

        const supabase = await createClient()
        const errors: string[] = []
        let synced = 0

        // Process each insight row
        for (const insight of insights) {
            const roas = parseROAS(insight.purchase_roas)
            const conversions = parseConversions(insight.actions)

            // Try to match creative by ad name
            const creative = creativeMap.get(insight.ad_name || '')

            // Determine status based on ROAS
            let status = 'active'
            if (roas >= 3) status = 'scaling'
            else if (roas >= 1.5) status = 'active'
            else if (roas > 0) status = 'monitoring'
            else status = 'paused'

            // Upsert into ad_performance
            const { error } = await supabase
                .from('ad_performance')
                .upsert({
                    campaign_name: insight.campaign_name,
                    ad_name: insight.ad_name || insight.adset_name || 'Unknown',
                    spend: parseFloat(insight.spend),
                    roas,
                    ctr: parseFloat(insight.ctr),
                    conversions,
                    impressions: parseInt(insight.impressions),
                    clicks: parseInt(insight.clicks),
                    status,
                    // Creative context (if matched)
                    creative_type: creative?.video_id ? 'video' : creative?.image_url ? 'image' : null,
                    ad_copy: creative?.body || null,
                    headline: creative?.title || null,
                    cta_type: creative?.call_to_action_type || null,
                    image_url: creative?.image_url || null,
                    video_id: creative?.video_id || null,
                }, {
                    onConflict: 'campaign_name,ad_name',
                    ignoreDuplicates: false,
                })

            if (error) {
                errors.push(`${insight.campaign_name}: ${error.message}`)
            } else {
                synced++
            }
        }

        return NextResponse.json({
            success: true,
            campaigns_synced: synced,
            creatives_fetched: creatives.length,
            errors,
            date_preset: datePreset,
        })
    } catch (error) {
        console.error('[Meta Sync Error]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        )
    }
}
