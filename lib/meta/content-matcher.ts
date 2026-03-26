/**
 * Content Matcher
 * Matches Meta ads to ingested organic content (content_ingest table).
 * 
 * Purpose: When an organic post is boosted as an ad, link the ad_performance
 * row back to the content_ingest record so we can correlate ad ROAS with
 * content classifications (hook_type, structure, topic from content_analysis).
 * 
 * Strategy (in confidence order):
 * 1. Post ID match: source_post_id from effective_object_story_id → content_ingest.platform_id
 * 2. URL match: ad_creative_url contains content_ingest.platform_url (or vice versa)
 */
import { SupabaseClient } from '@supabase/supabase-js'

export interface MatchResult {
    matched: number
    unmatched: number
    errors: string[]
}

/**
 * Match unmatched ad_performance rows to content_ingest records.
 * Updates source_post_id on ad_performance with the matching platform_id.
 * 
 * To get classifications for matched ads, join:
 *   ad_performance.source_post_id = content_ingest.platform_id
 *   content_ingest.id = content_analysis.ingest_id
 */
export async function matchAdsToContent(
    userId: string,
    supabase: SupabaseClient,
): Promise<MatchResult> {
    const errors: string[] = []
    let matched = 0

    // Get all ad rows that don't have a source_post_id yet
    const { data: unmatchedAds, error: fetchError } = await supabase
        .from('ad_performance')
        .select('id, source_post_id, ad_creative_url, ad_name')
        .eq('user_id', userId)
        .is('source_post_id', null)

    if (fetchError) {
        return { matched: 0, unmatched: 0, errors: [fetchError.message] }
    }

    if (!unmatchedAds || unmatchedAds.length === 0) {
        return { matched: 0, unmatched: 0, errors: [] }
    }

    // Get all IG/FB content_ingest records for matching
    const { data: contentRecords } = await supabase
        .from('content_ingest')
        .select('id, platform_id, platform_url')
        .eq('user_id', userId)
        .in('platform', ['instagram', 'facebook'])

    if (!contentRecords || contentRecords.length === 0) {
        return { matched: 0, unmatched: unmatchedAds.length, errors: [] }
    }

    // Build lookup maps
    const byPlatformId = new Map<string, string>()
    const byPlatformUrl = new Map<string, string>()

    for (const record of contentRecords) {
        if (record.platform_id) {
            byPlatformId.set(record.platform_id, record.platform_id)
        }
        if (record.platform_url) {
            byPlatformUrl.set(record.platform_url, record.platform_id)
        }
    }

    // Try to match each unmatched ad
    for (const ad of unmatchedAds) {
        let matchedPlatformId: string | null = null

        // Strategy 1: Direct platform_id match from effective_object_story_id
        // The sync route extracts post_id from "page_id_post_id" format
        if (ad.source_post_id && byPlatformId.has(ad.source_post_id)) {
            matchedPlatformId = ad.source_post_id
        }

        // Strategy 2: URL match
        if (!matchedPlatformId && ad.ad_creative_url) {
            for (const [url, platformId] of byPlatformUrl) {
                if (ad.ad_creative_url.includes(url) || url.includes(ad.ad_creative_url)) {
                    matchedPlatformId = platformId
                    break
                }
            }
        }

        if (matchedPlatformId) {
            const { error: updateError } = await supabase
                .from('ad_performance')
                .update({ source_post_id: matchedPlatformId })
                .eq('id', ad.id)

            if (updateError) {
                errors.push(`Match ${ad.ad_name}: ${updateError.message}`)
            } else {
                matched++
            }
        }
    }

    return {
        matched,
        unmatched: unmatchedAds.length - matched,
        errors,
    }
}
