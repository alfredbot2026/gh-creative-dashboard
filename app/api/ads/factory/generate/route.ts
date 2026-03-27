/**
 * Creative Factory Generate API
 * POST /api/ads/factory/generate
 * 
 * Takes an angle + persona → generates ad copy variants.
 * Stores as batch + variants in DB. Images generated on demand.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAdVariants, type FactoryRequest } from '@/lib/ads/factory'

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { angle, persona, framework, offer, count, format } = body

  if (!angle || !persona) {
    return NextResponse.json({ error: 'angle and persona are required' }, { status: 400 })
  }

  const adFormat = format || 'static_image'

  try {
    // 1. Create batch record
    const { data: batch, error: batchErr } = await supabase
      .from('ad_factory_batches')
      .insert({
        user_id: user.id,
        angle,
        persona,
        framework: framework || null,
        offer_type: offer || null,
        batch_type: 'single',
        status: 'generating',
      })
      .select('id')
      .single()

    if (batchErr || !batch) {
      throw new Error('Failed to create batch: ' + (batchErr?.message || 'unknown'))
    }

    // 2. Generate variants
    const factoryReq: FactoryRequest = {
      angle,
      persona,
      format: adFormat,
      framework,
      count: count || 3,
      userId: user.id,
    }

    const result = await generateAdVariants(factoryReq)

    // 3. Store variants (format-aware)
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

    const { data: variants, error: varErr } = await supabase
      .from('ad_factory_variants')
      .insert(variantRows)
      .select('id, headline, body_text, cta_text, link_description, hook_type, framework, emotional_tone, image_prompt, image_status, compliance_flags, compliance_clean')

    if (varErr) {
      throw new Error('Failed to store variants: ' + varErr.message)
    }

    // 4. Update batch status
    await supabase
      .from('ad_factory_batches')
      .update({
        status: 'ready',
        variant_count: variants?.length || 0,
      })
      .eq('id', batch.id)

    return NextResponse.json({
      success: true,
      batch_id: batch.id,
      variants: variants || [],
      model: result.model,
      context_used: result.context_used,
      compliance_issues: result.variants.filter(v => !v.compliance_clean).length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    console.error('[Factory] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
