/**
 * Batch Generate API
 * POST /api/ads/factory/batch
 * 
 * Generates a full week's creative testing plan based on recommendations.
 * Creates multiple batches (typically 3: new angle, new persona, refresh tired).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAdVariants } from '@/lib/ads/factory'
import { buildAdAccountMap, type AdCreativeRow } from '@/lib/ads/intelligence'

export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const variantsPerBatch = body.variants_per_batch || 3

  try {
    // 1. Get current ad account state
    const { data: creatives } = await supabase
      .from('ad_creatives')
      .select('id, angle, persona, framework, ad_name, ad_status, creative_format, total_spend, total_purchases, avg_roas, avg_cpa, avg_ctr, first_active_date, last_active_date, classified_at')
      .eq('user_id', user.id)

    if (!creatives || creatives.length === 0) {
      return NextResponse.json({ error: 'Sync your ads first' }, { status: 400 })
    }

    // 2. Build intelligence map to get recommendations
    const map = buildAdAccountMap(creatives as AdCreativeRow[])
    const recs = map.recommendations

    if (recs.length === 0) {
      return NextResponse.json({
        success: true,
        batches: [],
        message: 'No recommendations available — your ad account looks well-covered!',
      })
    }

    // 3. Pick top 3 recommendations for the week
    // Priority: 1 refresh (if tired ads exist), 1 new angle, 1 new persona
    const refreshRec = recs.find(r => r.type === 'refresh')
    const newRecs = recs.filter(r => r.type === 'create_new' || r.type === 'scale')
    const weekPlan = [
      refreshRec || newRecs[2],
      newRecs[0],
      newRecs[1],
    ].filter(Boolean).slice(0, 3)

    // 4. Generate batches
    const batches = []
    const DAYS = ['Tuesday', 'Thursday', 'Saturday']

    for (let i = 0; i < weekPlan.length; i++) {
      const rec = weekPlan[i]
      const day = DAYS[i] || 'Saturday'

      // Create batch
      const { data: batch } = await supabase
        .from('ad_factory_batches')
        .insert({
          user_id: user.id,
          angle: rec.angle,
          persona: rec.persona,
          framework: null,
          batch_type: 'weekly',
          status: 'generating',
          recommendation_index: rec.priority,
        })
        .select('id')
        .single()

      if (!batch) continue

      // Generate variants
      const result = await generateAdVariants({
        angle: rec.angle,
        persona: rec.persona,
        format: 'static_image',
        count: variantsPerBatch,
        userId: user.id,
      })

      // Store variants (format-aware)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantRows = result.variants.map((v: any) => ({
        user_id: user.id,
        batch_id: batch.id,
        headline: v.headline || '',
        body_text: v.body_text || v.body_script || '',
        cta_text: v.cta_text || v.cta_script || '',
        link_description: v.link_description || '',
        hook_type: v.hook_type,
        framework: v.framework,
        emotional_tone: v.emotional_tone,
        image_prompt: v.image_prompt || v.visual_directions || '',
        image_status: 'pending',
        compliance_flags: v.compliance_flags?.length > 0 ? v.compliance_flags : null,
        compliance_clean: v.compliance_clean,
        factory_batch_id: batch.id,
      }))

      await supabase.from('ad_factory_variants').insert(variantRows)
      await supabase.from('ad_factory_batches').update({
        status: 'ready',
        variant_count: result.variants.length,
      }).eq('id', batch.id)

      batches.push({
        batch_id: batch.id,
        day,
        angle: rec.angle,
        persona: rec.persona,
        type: rec.type,
        action: rec.action,
        variant_count: result.variants.length,
      })
    }

    return NextResponse.json({
      success: true,
      batches,
      plan: {
        week_label: `Week of ${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
        total_variants: batches.reduce((s, b) => s + b.variant_count, 0),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Batch generation failed'
    console.error('[Factory Batch] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
