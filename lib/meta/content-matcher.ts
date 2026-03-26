import { createClient } from '@/lib/supabase/server';

/**
 * Matches Meta ads to content_items in our DB.
 * 
 * Strategy (in order of confidence):
 * 1. Post ID match: Meta's effective_object_story_id contains the IG/FB post ID
 *    → match against content_ingest.platform_id → get content_item_id
 * 2. URL match: ad creative URL contains post URL
 *    → match against content_ingest.platform_url
 */
export async function matchAdsToContent(userId: string, supabaseClient?: any): Promise<{ matched: number, unmatched: number }> {
  const supabase = supabaseClient || await createClient();

  // 1. Get all unmatched ad_performance rows for this user
  const { data: ads, error: adsError } = await supabase
    .from('ad_performance')
    .select('id, meta_ad_id, source_post_id, source_post_url, ad_creative_url, ad_name')
    .eq('user_id', userId)
    .is('content_item_id', null);

  if (adsError || !ads) {
    console.error('[Content Matcher] Error fetching unmatched ads:', adsError?.message);
    return { matched: 0, unmatched: 0 };
  }

  if (ads.length === 0) {
    return { matched: 0, unmatched: 0 };
  }

  // 2. Get all content_ingest entries for this user to help matching
  const { data: ingested, error: ingestedError } = await supabase
    .from('content_ingest')
    .select('id, platform_id, platform_url, caption')
    .eq('user_id', userId);

  // 3. Get all content_items for this user (for title/text matching)
  const { data: items, error: itemsError } = await supabase
    .from('content_items')
    .select('id, title, script_data')
    .eq('user_id', userId);

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const ad of ads) {
    let matchedContentItemId: string | null = null;

    // A. Match by Post ID (effective_object_story_id)
    if (ad.source_post_id) {
        // source_post_id is often like "pageId_postId" or just "postId"
        const postId = ad.source_post_id.includes('_') ? ad.source_post_id.split('_')[1] : ad.source_post_id;
        const match = ingested?.find((ing: any) => ing.platform_id === postId || ing.platform_id === ad.source_post_id);
        if (match) {
            // Need to find if this ingested item is linked to a content_item
            // In some versions, content_ingest might have a content_item_id, 
            // but if not, we try to match by title or other metadata if we can't find a direct link.
            // For now, let's look for a content_item with a similar title/caption.
            const itemMatch = items?.find((it: any) => it.title === match.caption || (match.caption && it.title.includes(match.caption)));
            if (itemMatch) matchedContentItemId = itemMatch.id;
        }
    }

    // B. Match by URL
    if (!matchedContentItemId && (ad.source_post_url || ad.ad_creative_url)) {
        const urlToMatch = ad.source_post_url || ad.ad_creative_url;
        const match = ingested?.find((ing: any) => ing.platform_url && urlToMatch?.includes(ing.platform_url));
        if (match) {
            const itemMatch = items?.find((it: any) => it.title === match.caption);
            if (itemMatch) matchedContentItemId = itemMatch.id;
        }
    }

    // C. Match by Title similarity (simple)
    if (!matchedContentItemId && ad.ad_name) {
        const itemMatch = items?.find((it: any) => it.title === ad.ad_name || it.title.includes(ad.ad_name) || ad.ad_name.includes(it.title));
        if (itemMatch) matchedContentItemId = itemMatch.id;
    }

    if (matchedContentItemId) {
      const { error: updateError } = await supabase
        .from('ad_performance')
        .update({ content_item_id: matchedContentItemId })
        .eq('id', ad.id);

      if (!updateError) {
        matchedCount++;
      } else {
        console.error(`[Content Matcher] Failed to update ad ${ad.id}:`, updateError.message);
        unmatchedCount++;
      }
    } else {
      unmatchedCount++;
    }
  }

  return { matched: matchedCount, unmatched: unmatchedCount };
}
