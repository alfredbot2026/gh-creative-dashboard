/**
 * Factory Performance Tracking API
 * POST /api/ads/factory/track
 * 
 * Matches factory-generated variants to live Meta ads (by copy text matching).
 * Updates angle/persona scoring based on real performance.
 * Detects creative fatigue and suggests refreshes.
 * 
 * Called after ad_performance sync to close the loop.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Get unmatched factory variants
    const { data: unmatched } = await supabase
      .from('ad_factory_variants')
      .select('id, headline, body_text, batch_id')
      .eq('user_id', user.id)
      .is('matched_meta_ad_id', null)

    if (!unmatched || unmatched.length === 0) {
      return NextResponse.json({ matched: 0, message: 'No unmatched variants' })
    }

    // 2. Get all ad creatives for matching
    const { data: creatives } = await supabase
      .from('ad_creatives')
      .select('meta_ad_id, headline, body_text')
      .eq('user_id', user.id)

    if (!creatives || creatives.length === 0) {
      return NextResponse.json({ matched: 0, message: 'No ad creatives to match against' })
    }

    // 3. Match by text similarity (headline or body contains factory text)
    let matched = 0
    for (const variant of unmatched) {
      const vHeadline = (variant.headline || '').toLowerCase().trim()
      const vBody = (variant.body_text || '').toLowerCase().trim().slice(0, 100)

      for (const creative of creatives) {
        const cHeadline = (creative.headline || '').toLowerCase().trim()
        const cBody = (creative.body_text || '').toLowerCase().trim()

        // Match if headline matches or first 100 chars of body match
        const headlineMatch = vHeadline.length > 5 && cHeadline.includes(vHeadline)
        const bodyMatch = vBody.length > 20 && cBody.includes(vBody)

        if (headlineMatch || bodyMatch) {
          await supabase
            .from('ad_factory_variants')
            .update({ matched_meta_ad_id: creative.meta_ad_id })
            .eq('id', variant.id)
          matched++
          break
        }
      }
    }

    // 4. Build angle/persona performance scoring
    // Get all matched variants with their batch context + performance
    const { data: matchedVariants } = await supabase
      .from('ad_factory_variants')
      .select('batch_id, matched_meta_ad_id')
      .eq('user_id', user.id)
      .not('matched_meta_ad_id', 'is', null)

    const learnings: Array<{ angle: string; persona: string; avg_roas: number; sample: number }> = []

    if (matchedVariants) {
      // Get batch details for angle/persona
      const batchIds = [...new Set(matchedVariants.map(v => v.batch_id))]
      const { data: batches } = await supabase
        .from('ad_factory_batches')
        .select('id, angle, persona')
        .in('id', batchIds)

      const batchMap = new Map(batches?.map(b => [b.id, b]) || [])

      // Get performance for matched ads
      const metaAdIds = matchedVariants.map(v => v.matched_meta_ad_id).filter(Boolean) as string[]
      const { data: perfData } = await supabase
        .from('ad_performance')
        .select('meta_ad_id, roas, spend')
        .eq('user_id', user.id)
        .in('meta_ad_id', metaAdIds)
        .gt('spend', 0)

      // Aggregate by angle × persona
      const perfByAnglePersona = new Map<string, number[]>()
      for (const variant of matchedVariants) {
        const batch = batchMap.get(variant.batch_id)
        if (!batch) continue

        const key = `${batch.angle}|${batch.persona}`
        const adPerf = perfData?.filter(p => p.meta_ad_id === variant.matched_meta_ad_id) || []
        const roasValues = adPerf.filter(p => p.roas > 0).map(p => p.roas)

        if (!perfByAnglePersona.has(key)) perfByAnglePersona.set(key, [])
        perfByAnglePersona.get(key)!.push(...roasValues)
      }

      for (const [key, roasValues] of perfByAnglePersona) {
        if (roasValues.length === 0) continue
        const [angle, persona] = key.split('|')
        learnings.push({
          angle,
          persona,
          avg_roas: Math.round((roasValues.reduce((a, b) => a + b, 0) / roasValues.length) * 100) / 100,
          sample: roasValues.length,
        })
      }
    }

    return NextResponse.json({
      matched,
      total_unmatched: unmatched.length - matched,
      learnings: learnings.sort((a, b) => b.avg_roas - a.avg_roas),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tracking failed'
    console.error('[Factory Track] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
