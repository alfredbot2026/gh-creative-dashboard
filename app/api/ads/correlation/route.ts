/**
 * Ad Correlation API
 * GET /api/ads/correlation — Returns ad performance correlated with content classifications.
 * Aggregates by structure, hook, topic. Surfaces best organic→ad candidates.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Get all ad performance data for this user
  const { data: ads, error: adsError } = await supabase
    .from('ad_performance')
    .select('*')
    .eq('user_id', user.id)
    .gt('spend', 0)

  if (adsError) {
    return NextResponse.json({ error: adsError.message }, { status: 500 })
  }

  if (!ads || ads.length === 0) {
    return NextResponse.json({
      overview: null,
      by_structure: [],
      by_hook: [],
      by_topic: [],
      ad_candidates: [],
      has_data: false,
    })
  }

  // 2. Get content_ingest + content_analysis for matching
  const { data: ingestData } = await supabase
    .from('content_ingest')
    .select('id, platform_id, platform_url, metrics')
    .eq('user_id', user.id)
    .in('platform', ['instagram', 'facebook'])

  const { data: analysisData } = await supabase
    .from('content_analysis')
    .select('ingest_id, classification')
    .eq('user_id', user.id)

  // Build classification lookup by platform_id
  const classificationByPlatformId = new Map<string, Record<string, any>>()
  const ingestByPlatformId = new Map<string, any>()
  if (ingestData && analysisData) {
    const analysisByIngestId = new Map<string, Record<string, any>>()
    for (const a of analysisData) {
      analysisByIngestId.set(a.ingest_id, a.classification as Record<string, any>)
    }
    for (const ingest of ingestData) {
      ingestByPlatformId.set(ingest.platform_id, ingest)
      const cls = analysisByIngestId.get(ingest.id)
      if (cls) {
        classificationByPlatformId.set(ingest.platform_id, cls)
      }
    }
  }

  // 3. Enrich ads with classification data
  interface EnrichedAd {
    ad_name: string
    spend: number
    roas: number
    cpa: number | null
    ctr: number
    conversions: number
    hook_type: string | null
    structure: string | null
    topic: string | null
    has_content_match: boolean
  }

  const enrichedAds: EnrichedAd[] = ads.map(ad => {
    // Try to get classification from matched content
    const cls = ad.source_post_id
      ? classificationByPlatformId.get(ad.source_post_id)
      : null

    return {
      ad_name: ad.ad_name || 'Unknown',
      spend: ad.spend || 0,
      roas: ad.roas || 0,
      cpa: ad.cpa || null,
      ctr: ad.ctr || 0,
      conversions: ad.conversions || 0,
      hook_type: ad.hook_type || cls?.hook_type || null,
      structure: ad.structure_slug || cls?.structure || null,
      topic: ad.topic || cls?.topic_category || null,
      has_content_match: !!ad.source_post_id,
    }
  })

  // 4. Aggregate overview
  const totalSpend = enrichedAds.reduce((s, a) => s + a.spend, 0)
  const totalConversions = enrichedAds.reduce((s, a) => s + a.conversions, 0)
  const totalRevenue = ads.reduce((s, a) => s + (a.conversion_value || 0), 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  // Find best and worst ads by ROAS (min spend threshold)
  const significantAds = enrichedAds.filter(a => a.spend >= 100)
  const bestAd = significantAds.length > 0
    ? significantAds.reduce((best, a) => a.roas > best.roas ? a : best)
    : null
  const worstAd = significantAds.length > 0
    ? significantAds.reduce((worst, a) => a.roas < worst.roas ? a : worst)
    : null

  // Content-first vs traditional
  const contentFirst = enrichedAds.filter(a => a.has_content_match)
  const traditional = enrichedAds.filter(a => !a.has_content_match)
  const cfRoas = contentFirst.length > 0
    ? contentFirst.reduce((s, a) => s + a.roas, 0) / contentFirst.length
    : 0
  const tradRoas = traditional.length > 0
    ? traditional.reduce((s, a) => s + a.roas, 0) / traditional.length
    : 0

  // 5. Aggregate by dimension
  function aggregateByDimension(
    items: EnrichedAd[],
    getDimension: (a: EnrichedAd) => string | null,
  ) {
    const groups = new Map<string, { spend: number; roas: number[]; cpa: number[]; ctr: number[]; count: number }>()

    for (const item of items) {
      const dim = getDimension(item)
      if (!dim) continue

      if (!groups.has(dim)) {
        groups.set(dim, { spend: 0, roas: [], cpa: [], ctr: [], count: 0 })
      }
      const g = groups.get(dim)!
      g.spend += item.spend
      g.roas.push(item.roas)
      if (item.cpa) g.cpa.push(item.cpa)
      g.ctr.push(item.ctr)
      g.count++
    }

    return Array.from(groups.entries())
      .map(([label, g]) => ({
        label,
        ad_count: g.count,
        total_spend: Math.round(g.spend * 100) / 100,
        avg_roas: g.roas.length > 0
          ? Math.round((g.roas.reduce((a, b) => a + b, 0) / g.roas.length) * 100) / 100
          : 0,
        avg_cpa: g.cpa.length > 0
          ? Math.round((g.cpa.reduce((a, b) => a + b, 0) / g.cpa.length) * 100) / 100
          : null,
        avg_ctr: g.ctr.length > 0
          ? Math.round((g.ctr.reduce((a, b) => a + b, 0) / g.ctr.length) * 10000) / 10000
          : 0,
      }))
      .sort((a, b) => b.avg_roas - a.avg_roas)
  }

  const byStructure = aggregateByDimension(enrichedAds, a => a.structure)
  const byHook = aggregateByDimension(enrichedAds, a => a.hook_type)
  const byTopic = aggregateByDimension(enrichedAds, a => a.topic)

  // 6. Ad candidates — high-save organic posts NOT yet run as ads
  const adPlatformIds = new Set(ads.map(a => a.source_post_id).filter(Boolean))
  const candidates: Array<{
    id: string
    caption: string
    saves: number
    engagement_rate: number
    platform_url: string | null
  }> = []

  if (ingestData) {
    for (const ingest of ingestData) {
      if (adPlatformIds.has(ingest.platform_id)) continue // already an ad

      const metrics = ingest.metrics as Record<string, any>
      const saves = metrics?.saves || metrics?.saved || 0
      const views = metrics?.reach || metrics?.impressions || metrics?.plays || 0
      const engagement = (metrics?.likes || 0) + (metrics?.comments || 0) + saves + (metrics?.shares || 0)
      const engRate = views > 0 ? engagement / views : 0

      if (saves > 0 && engRate > 0.02) {
        candidates.push({
          id: ingest.id,
          caption: (ingest as any).caption?.slice(0, 100) || 'Untitled',
          saves,
          engagement_rate: Math.round(engRate * 10000) / 10000,
          platform_url: ingest.platform_url,
        })
      }
    }
  }

  candidates.sort((a, b) => b.saves - a.saves)

  return NextResponse.json({
    has_data: true,
    overview: {
      total_spend: Math.round(totalSpend * 100) / 100,
      total_purchases: totalConversions,
      avg_roas: Math.round(avgRoas * 100) / 100,
      total_ads: enrichedAds.length,
      best_ad: bestAd ? { name: bestAd.ad_name, roas: bestAd.roas, spend: bestAd.spend } : null,
      worst_ad: worstAd ? { name: worstAd.ad_name, roas: worstAd.roas, spend: worstAd.spend } : null,
      content_first_roas: Math.round(cfRoas * 100) / 100,
      traditional_roas: Math.round(tradRoas * 100) / 100,
      content_first_count: contentFirst.length,
      traditional_count: traditional.length,
    },
    by_structure: byStructure,
    by_hook: byHook,
    by_topic: byTopic,
    ad_candidates: candidates.slice(0, 20),
  })
}
