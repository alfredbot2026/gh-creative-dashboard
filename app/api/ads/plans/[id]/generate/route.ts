import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateVideoPlan, type VideoPlanInput } from '@/lib/ads/plan-video-generator'
import { generateStaticPlan } from '@/lib/ads/plan-static-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type PlanRow = {
  id: string
  user_id: string
  plan_type: 'scale' | 'refresh' | 'explore' | 'mixed'
  objective: string
  hypothesis: string | null
  evidence_summary: Record<string, unknown> | null
  target_angle: string | null
  target_persona: string | null
  target_formats: string[] | null
  status: string
}

function normalizeFormat(value: unknown): 'video' | 'static' | 'hybrid' {
  return value === 'video' || value === 'static' || value === 'hybrid' ? value : 'video'
}

function evidenceSummary(value: unknown): VideoPlanInput['evidence_summary'] {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as VideoPlanInput['evidence_summary']
    : {}
}

function toInput(plan: PlanRow): VideoPlanInput {
  return {
    plan_brief_id: plan.id,
    plan_type: plan.plan_type,
    objective: plan.objective,
    hypothesis: plan.hypothesis || 'Translate the plan into a clear production brief with strong message discipline.',
    evidence_summary: evidenceSummary(plan.evidence_summary),
    target_angle: plan.target_angle || 'general',
    target_persona: plan.target_persona || 'general',
    target_formats: plan.target_formats || [],
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const format = normalizeFormat(body?.format)

  const { data: plan, error: planError } = await supabase
    .from('plan_briefs')
    .select('id, user_id, plan_type, objective, hypothesis, evidence_summary, target_angle, target_persona, target_formats, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (planError || !plan) {
    return NextResponse.json({ error: planError?.message || 'Plan not found' }, { status: 404 })
  }

  if (plan.status !== 'pending' && plan.status !== 'accepted' && plan.status !== 'completed') {
    return NextResponse.json({ error: `Plan in unsupported status: ${plan.status}` }, { status: 400 })
  }

  const normalizedStatus = plan.status === 'pending' ? 'accepted' : plan.status
  if (normalizedStatus !== plan.status) {
    const { error } = await supabase.from('plan_briefs').update({ status: normalizedStatus }).eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: setGeneratingError } = await supabase
    .from('plan_briefs')
    .update({ status: 'generating', completed_at: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (setGeneratingError) {
    return NextResponse.json({ error: setGeneratingError.message }, { status: 500 })
  }

  try {
    const input = toInput(plan as PlanRow)
    const assetRows: Array<{ user_id: string; plan_brief_id: string; asset_type: string; plan_section: string; payload: Record<string, unknown>; sort_order: number }> = []

    const makeSort = (sectionIndex: number, itemIndex: number) => sectionIndex * 100 + itemIndex

    if (format === 'video' || format === 'hybrid') {
      const video = await generateVideoPlan(input)
      assetRows.push({
        user_id: user.id,
        plan_brief_id: id,
        asset_type: 'video_global_rules',
        plan_section: 'video_global_rules',
        payload: video.global_rules as unknown as Record<string, unknown>,
        sort_order: 1,
      })

      video.angles.forEach((angle, angleIndex) => {
        const sectionBase = angleIndex + 1
        const angleKey = `video_angle_${sectionBase}`
        assetRows.push({
          user_id: user.id,
          plan_brief_id: id,
          asset_type: 'video_body',
          plan_section: `${angleKey}_body`,
          payload: {
            text: angle.body_script,
            hypothesis: angle.hypothesis,
            angle_name: angle.angle_name,
            take_directions: angle.take_directions,
            take_count: angle.body_script_take_count,
            visual_notes: angle.visual_directions,
            cta_note: angle.cta_note,
            expected_raw_count: angle.expected_raw_count,
          },
          sort_order: makeSort(sectionBase, 1),
        })

        angle.hooks.forEach((hook, hookIndex) => {
          assetRows.push({
            user_id: user.id,
            plan_brief_id: id,
            asset_type: 'video_hook',
            plan_section: `${angleKey}_hooks`,
            payload: {
              text: hook.hook_text,
              hook_type: hook.hook_type,
              take_count: hook.take_count,
              take_directions: angle.take_directions,
              performance_note: hook.performance_note,
              angle_name: angle.angle_name,
            },
            sort_order: makeSort(sectionBase, 10 + hookIndex),
          })
        })

        assetRows.push({
          user_id: user.id,
          plan_brief_id: id,
          asset_type: 'video_angle_summary',
          plan_section: `${angleKey}_summary`,
          payload: {
            angle_name: angle.angle_name,
            hypothesis: angle.hypothesis,
            cta_note: angle.cta_note,
            visual_notes: angle.visual_directions,
            expected_raw_count: angle.expected_raw_count,
          },
          sort_order: makeSort(sectionBase, 90),
        })
      })

      assetRows.push({
        user_id: user.id,
        plan_brief_id: id,
        asset_type: 'editing_note',
        plan_section: 'video_editing_instructions',
        payload: video.editing_instructions as unknown as Record<string, unknown>,
        sort_order: 999,
      })

      assetRows.push({
        user_id: user.id,
        plan_brief_id: id,
        asset_type: 'generation_confidence',
        plan_section: 'video_confidence',
        payload: { confidence: video.confidence, note: video.confidence_note, expected_total_raw: video.expected_total_raw },
        sort_order: 1000,
      })
    }

    if (format === 'static' || format === 'hybrid') {
      const staticPlan = await generateStaticPlan(input)
      assetRows.push({
        user_id: user.id,
        plan_brief_id: id,
        asset_type: 'static_global_rules',
        plan_section: 'static_global_rules',
        payload: staticPlan.global_rules as unknown as Record<string, unknown>,
        sort_order: 2001,
      })

      staticPlan.angles.forEach((angle, angleIndex) => {
        const sectionBase = 30 + angleIndex + 1
        const angleKey = `static_angle_${angleIndex + 1}`

        assetRows.push({
          user_id: user.id,
          plan_brief_id: id,
          asset_type: 'static_angle_summary',
          plan_section: `${angleKey}_summary`,
          payload: {
            angle_name: angle.angle_name,
            hypothesis: angle.hypothesis,
            core_message: angle.core_message,
            text_overlay_guidance: angle.text_overlay_guidance,
            performance_note: angle.performance_note,
          },
          sort_order: makeSort(sectionBase, 1),
        })

        angle.headlines.forEach((headline, headlineIndex) => {
          assetRows.push({
            user_id: user.id,
            plan_brief_id: id,
            asset_type: 'static_headline',
            plan_section: `${angleKey}_headlines`,
            payload: {
              headline: headline.hook_text,
              hook_type: headline.hook_type,
              angle_name: angle.angle_name,
            },
            sort_order: makeSort(sectionBase, 10 + headlineIndex),
          })
        })

        angle.support_lines.forEach((line, lineIndex) => {
          assetRows.push({
            user_id: user.id,
            plan_brief_id: id,
            asset_type: 'static_support_line',
            plan_section: `${angleKey}_support_lines`,
            payload: { text: line, angle_name: angle.angle_name },
            sort_order: makeSort(sectionBase, 30 + lineIndex),
          })
        })

        angle.cta_variants.forEach((cta, ctaIndex) => {
          assetRows.push({
            user_id: user.id,
            plan_brief_id: id,
            asset_type: 'static_cta',
            plan_section: `${angleKey}_cta`,
            payload: { text: cta, angle_name: angle.angle_name },
            sort_order: makeSort(sectionBase, 50 + ctaIndex),
          })
        })

        angle.visual_concepts.forEach((visual, visualIndex) => {
          assetRows.push({
            user_id: user.id,
            plan_brief_id: id,
            asset_type: 'static_visual',
            plan_section: `${angleKey}_visuals`,
            payload: {
              concept_name: visual.concept_name,
              description: visual.description,
              image_prompt: visual.image_prompt,
              suggested_text_overlay: visual.suggested_text_overlay,
              angle_name: angle.angle_name,
            },
            sort_order: makeSort(sectionBase, 70 + visualIndex),
          })
        })
      })

      assetRows.push({
        user_id: user.id,
        plan_brief_id: id,
        asset_type: 'static_production_instructions',
        plan_section: 'static_production_instructions',
        payload: staticPlan.production_instructions as unknown as Record<string, unknown>,
        sort_order: 2999,
      })

      assetRows.push({
        user_id: user.id,
        plan_brief_id: id,
        asset_type: 'generation_confidence',
        plan_section: 'static_confidence',
        payload: { confidence: staticPlan.confidence, note: staticPlan.confidence_note, expected_designs: staticPlan.expected_designs },
        sort_order: 3000,
      })
    }

    const deletePrefixes = format === 'video'
      ? ['video_', 'generation_confidence']
      : format === 'static'
        ? ['static_', 'generation_confidence']
        : ['video_', 'static_', 'generation_confidence']

    const { data: existingAssets, error: existingError } = await supabase
      .from('plan_assets')
      .select('id, asset_type, plan_section')
      .eq('user_id', user.id)
      .eq('plan_brief_id', id)

    if (existingError) throw new Error(existingError.message)

    const existingIds = (existingAssets || [])
      .filter(asset => deletePrefixes.some(prefix => String(asset.asset_type).startsWith(prefix) || String(asset.plan_section || '').startsWith(prefix)))
      .map(asset => asset.id)

    if (existingIds.length > 0) {
      const { error: deleteError } = await supabase.from('plan_assets').delete().in('id', existingIds)
      if (deleteError) throw new Error(deleteError.message)
    }

    if (assetRows.length > 0) {
      const { error: insertError } = await supabase.from('plan_assets').insert(assetRows)
      if (insertError) throw new Error(insertError.message)
    }

    const confidenceRow = assetRows.find(item => item.asset_type === 'generation_confidence')
    const { error: completeError } = await supabase
      .from('plan_briefs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (completeError) throw new Error(completeError.message)

    return NextResponse.json({
      plan_id: id,
      asset_count: assetRows.length,
      confidence: confidenceRow?.payload?.confidence || null,
      confidence_note: confidenceRow?.payload?.note || null,
      format,
    })
  } catch (error) {
    await supabase.from('plan_briefs').update({ status: 'accepted' }).eq('id', id).eq('user_id', user.id)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate plan output' }, { status: 500 })
  }
}
