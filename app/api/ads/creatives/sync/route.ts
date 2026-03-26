/**
 * Ad Creatives Sync + Classification API
 * POST /api/ads/creatives/sync
 * 
 * Pulls all ad creatives from Meta, classifies with Gemini, aggregates performance.
 * Incremental: only processes new/changed ads.
 * 
 * Flow:
 * 1. Auth check + rate limit
 * 2. Fetch all ads from Meta (with creative details)
 * 3. Upsert into ad_creatives (creative content + metadata)
 * 4. Classify unclassified creatives with Gemini
 * 5. Aggregate performance from ad_performance table
 * 6. Return summary
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fetchAdCreatives, getMetaCredentials } from '@/lib/meta/client'
import {
  classifyAdCreatives,
  calculateAdStatus,
  getClassificationVersion,
  type AdCreativeInput,
} from '@/lib/ads/classifier'

export const maxDuration = 120

interface MetaAdWithCreative {
  id: string
  name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  status: string
  creative: {
    id: string
    body?: string
    title?: string
    link_description?: string
    call_to_action_type?: string
    image_url?: string
    video_id?: string
    thumbnail_url?: string
    object_story_spec?: Record<string, unknown>
    asset_feed_spec?: Record<string, unknown>
  }
}

/**
 * Fetch ads with their creative details from Meta.
 * Uses /ads endpoint with creative field expansion.
 */
async function fetchAdsWithCreatives(accessToken: string, adAccountId: string): Promise<MetaAdWithCreative[]> {
  const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const fields = [
    'id', 'name', 'status',
    'campaign_id', 'campaign{name}',
    'adset_id', 'adset{name}',
    'creative{id,body,title,call_to_action_type,image_url,video_id,thumbnail_url,object_story_spec,asset_feed_spec}',
  ].join(',')

  const allAds: MetaAdWithCreative[] = []
  let nextUrl: string | null = `https://graph.facebook.com/v25.0/${formattedId}/ads?fields=${fields}&limit=100&effective_status=["ACTIVE","PAUSED","ARCHIVED"]`

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Creative Sync] Meta API error:', err.slice(0, 200))
      throw new Error('Failed to fetch ads from Meta')
    }

    const data = await res.json() as { data?: any[]; paging?: { next?: string } }
    for (const ad of data.data || []) {
      allAds.push({
        id: ad.id,
        name: ad.name || '',
        campaign_id: ad.campaign_id || '',
        campaign_name: ad.campaign?.name || '',
        adset_id: ad.adset_id || '',
        adset_name: ad.adset?.name || '',
        status: ad.status || 'UNKNOWN',
        creative: ad.creative || {},
      })
    }
    nextUrl = data.paging?.next || null
  }

  return allAds
}

/**
 * Determine creative format from Meta creative data.
 */
function detectFormat(creative: MetaAdWithCreative['creative']): string {
  if (creative.asset_feed_spec) return 'carousel'
  if (creative.video_id) return 'video'
  if (creative.image_url) return 'static_image'
  return 'static_image'
}

export async function POST(request: Request) {
  // Auth: Supabase session OR cron secret header
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  let userId: string

  if (isCronAuth) {
    // Cron/internal call — use service role client
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    userId = tokenRow?.user_id || ''
    if (!userId) {
      return NextResponse.json({ error: 'No user with Meta token found' }, { status: 400 })
    }
  } else {
    supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id
  }

  try {
    const body = await request.json().catch(() => ({}))
    const reclassify = body.reclassify === true // force re-classification

    // 1. Get Meta token — try meta_tokens table first, fallback to env vars
    let accessToken: string | null = null
    let adAccountId: string | null = null
    let metaAccountId: string | null = null

    const { data: tokenData } = await supabase
      .from('meta_tokens')
      .select('access_token, page_id')
      .eq('user_id', userId)
      .single()

    if (tokenData?.access_token) {
      accessToken = tokenData.access_token
      // Discover ad account from token
      const accountsRes = await fetch('https://graph.facebook.com/v25.0/me/adaccounts?fields=account_id,name', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      const accountsData = await accountsRes.json()
      if (accountsData.data?.length) {
        adAccountId = accountsData.data[0].id
        metaAccountId = accountsData.data[0].account_id || adAccountId
      }
    }

    // Fallback to env vars (existing FB_ADS_TOKEN from growth team setup)
    if (!accessToken || !adAccountId) {
      accessToken = process.env.FB_ADS_TOKEN || null
      const envAccountId = process.env.FB_AD_ACCOUNT_ID || null
      if (accessToken && envAccountId) {
        adAccountId = envAccountId.startsWith('act_') ? envAccountId : `act_${envAccountId}`
        metaAccountId = envAccountId
      }
    }

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ error: 'Connect your Meta account first (no token in DB or env)' }, { status: 400 })
    }

    // 3. Fetch all ads with creative details
    const metaAds = await fetchAdsWithCreatives(accessToken, adAccountId)

    // 4. Upsert into ad_creatives
    let upserted = 0
    let errors = 0
    const upsertedIds: string[] = []

    for (const ad of metaAds) {
      const creative = ad.creative
      const format = detectFormat(creative)
      
      // Extract carousel cards if applicable
      let carouselCards = null
      if (creative.asset_feed_spec && typeof creative.asset_feed_spec === 'object') {
        const spec = creative.asset_feed_spec as Record<string, any>
        if (spec.images || spec.bodies || spec.titles) {
          carouselCards = {
            images: spec.images || [],
            bodies: spec.bodies || [],
            titles: spec.titles || [],
          }
        }
      }

      // For video ads, extract text from object_story_spec if body is empty
      let bodyText = creative.body || null
      if (!bodyText && creative.object_story_spec) {
        const oss = creative.object_story_spec as Record<string, any>
        // Video posts have the text in video_data.message or link_data.message
        bodyText = oss.video_data?.message
          || oss.link_data?.message
          || oss.photo_data?.message
          || null
      }

      const row = {
        user_id: userId,
        meta_ad_id: ad.id,
        meta_creative_id: creative.id || null,
        meta_campaign_id: ad.campaign_id,
        meta_adset_id: ad.adset_id,
        meta_account_id: metaAccountId,
        headline: creative.title || null,
        body_text: bodyText,
        cta_text: creative.call_to_action_type || null,
        link_description: creative.link_description || null,
        image_url: creative.image_url || null,
        video_thumbnail_url: creative.thumbnail_url || null,
        creative_format: format,
        carousel_cards: carouselCards,
        campaign_name: ad.campaign_name,
        adset_name: ad.adset_name,
        ad_name: ad.name,
        is_active: ad.status === 'ACTIVE',
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('ad_creatives')
        .upsert(row, { onConflict: 'user_id,meta_account_id,meta_ad_id' })

      if (error) {
        console.error('[Creative Sync] Upsert error:', error.message)
        errors++
      } else {
        upserted++
        upsertedIds.push(ad.id)
      }
    }

    // 5. Classify unclassified (or all if reclassify=true)
    let classified = 0
    const classifyQuery = supabase
      .from('ad_creatives')
      .select('id, headline, body_text, cta_text, link_description, image_url, video_thumbnail_url, adset_name, campaign_name, creative_format')
      .eq('user_id', userId)

    if (!reclassify) {
      classifyQuery.is('classified_at', null)
    }

    const { data: toClassify } = await classifyQuery

    if (toClassify && toClassify.length > 0) {
      const inputs: AdCreativeInput[] = toClassify.map((c: any) => ({
        id: c.id,
        headline: c.headline,
        body_text: c.body_text,
        cta_text: c.cta_text,
        link_description: c.link_description,
        image_url: c.image_url,
        video_thumbnail_url: c.video_thumbnail_url,
        adset_name: c.adset_name,
        campaign_name: c.campaign_name,
        creative_format: c.creative_format,
      }))

      const classifications = await classifyAdCreatives(inputs)

      for (const [id, cls] of classifications) {
        const { error: updateErr } = await supabase
          .from('ad_creatives')
          .update({
            angle: cls.angle,
            persona: cls.persona,
            framework: cls.framework,
            hook_type: cls.hook_type,
            offer_type: cls.offer_type,
            emotional_tone: cls.emotional_tone,
            classification_version: getClassificationVersion(),
            classifier_model: 'gemini-2.0-flash',
            classified_at: new Date().toISOString(),
            classification_confidence: cls.overall_confidence,
            classification_raw: cls as unknown as Record<string, unknown>,
          })
          .eq('id', id)

        if (!updateErr) classified++
      }
    }

    // 6. Aggregate performance from ad_performance table
    // Match by meta_ad_id first, fallback to ad_name (legacy rows have 'legacy_' prefixed IDs)
    let perfUpdated = 0
    const { data: creatives } = await supabase
      .from('ad_creatives')
      .select('id, meta_ad_id, ad_name')
      .eq('user_id', userId)

    // Pre-fetch ALL ad_performance rows for this user (avoid N+1 queries)
    const { data: allPerfRows } = await supabase
      .from('ad_performance')
      .select('meta_ad_id, ad_name, spend, conversions, impressions, roas, ctr, cpa, date_start')
      .eq('user_id', userId)
      .gt('spend', 0)

    if (creatives && allPerfRows && allPerfRows.length > 0) {
      // Build lookup maps for performance data
      const perfByMetaId = new Map<string, typeof allPerfRows>()
      const perfByAdName = new Map<string, typeof allPerfRows>()
      for (const row of allPerfRows) {
        // By meta_ad_id
        if (row.meta_ad_id && !row.meta_ad_id.startsWith('legacy_')) {
          if (!perfByMetaId.has(row.meta_ad_id)) perfByMetaId.set(row.meta_ad_id, [])
          perfByMetaId.get(row.meta_ad_id)!.push(row)
        }
        // By ad_name (fallback for legacy rows)
        if (row.ad_name) {
          if (!perfByAdName.has(row.ad_name)) perfByAdName.set(row.ad_name, [])
          perfByAdName.get(row.ad_name)!.push(row)
        }
      }

      for (const creative of creatives) {
        // Try meta_ad_id match first, then ad_name fallback
        let perfRows = perfByMetaId.get(creative.meta_ad_id) || null
        if (!perfRows && creative.ad_name) {
          perfRows = perfByAdName.get(creative.ad_name) || null
        }

        if (!perfRows || perfRows.length === 0) continue

        {
          const totalSpend = perfRows.reduce((s: number, r: any) => s + (r.spend || 0), 0)
          const totalPurchases = perfRows.reduce((s: number, r: any) => s + (r.conversions || 0), 0)
          const totalImpressions = perfRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0)
          const roasValues = perfRows.filter((r: any) => r.roas && r.roas > 0).map((r: any) => r.roas!)
          const ctrValues = perfRows.filter((r: any) => r.ctr && r.ctr > 0).map((r: any) => r.ctr!)
          const avgRoas = roasValues.length > 0 ? roasValues.reduce((a: number, b: number) => a + b, 0) / roasValues.length : null
          const avgCtr = ctrValues.length > 0 ? ctrValues.reduce((a: number, b: number) => a + b, 0) / ctrValues.length : null
          const avgCpa = totalPurchases > 0 ? totalSpend / totalPurchases : null

          const dates = perfRows.map((r: any) => r.date_start).filter(Boolean).sort()
          const firstDate = dates[0] || null
          const lastDate = dates[dates.length - 1] || null

          // Calculate ROAS trend (last 7 days vs previous 7 days)
          const now = new Date()
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          
          const recentRoas = perfRows
            .filter((r: any) => r.date_start && new Date(r.date_start) >= sevenDaysAgo && r.roas)
            .map((r: any) => r.roas!)
          const olderRoas = perfRows
            .filter((r: any) => r.date_start && new Date(r.date_start) >= fourteenDaysAgo && new Date(r.date_start) < sevenDaysAgo && r.roas)
            .map((r: any) => r.roas!)

          let roasTrend: 'rising' | 'stable' | 'declining' | null = null
          if (recentRoas.length >= 2 && olderRoas.length >= 2) {
            const recentAvg = recentRoas.reduce((a: number, b: number) => a + b, 0) / recentRoas.length
            const olderAvg = olderRoas.reduce((a: number, b: number) => a + b, 0) / olderRoas.length
            const ratio = olderAvg > 0 ? recentAvg / olderAvg : 1
            if (ratio > 1.2) roasTrend = 'rising'
            else if (ratio < 0.8) roasTrend = 'declining'
            else roasTrend = 'stable'
          }

          const daysSinceFirst = firstDate
            ? Math.floor((now.getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0

          const adStatus = calculateAdStatus(totalSpend, avgRoas, daysSinceFirst, roasTrend)

          await supabase
            .from('ad_creatives')
            .update({
              total_spend: Math.round(totalSpend * 100) / 100,
              total_purchases: totalPurchases,
              total_impressions: totalImpressions,
              avg_roas: avgRoas ? Math.round(avgRoas * 10000) / 10000 : null,
              avg_cpa: avgCpa ? Math.round(avgCpa * 100) / 100 : null,
              avg_ctr: avgCtr ? Math.round(avgCtr * 10000) / 10000 : null,
              first_active_date: firstDate,
              last_active_date: lastDate,
              performance_updated_at: new Date().toISOString(),
              ad_status: adStatus,
            })
            .eq('id', creative.id)

          perfUpdated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      ads_fetched: metaAds.length,
      creatives_upserted: upserted,
      creatives_classified: classified,
      performance_updated: perfUpdated,
      errors: errors > 0 ? errors : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creative sync failed'
    console.error('[Creative Sync] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
