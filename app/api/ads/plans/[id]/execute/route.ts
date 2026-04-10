import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateConceptBrief, generateHookVariations, expandToFormats } from '@/lib/ads/creative-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type PlanRow = {
  id: string
  user_id: string
  plan_type: 'scale' | 'refresh' | 'explore' | 'mixed'
  target_angle: string | null
  target_persona: string | null
  target_formats: string[] | null
  objective: string
  status: string
  generated_concept_ids: string[] | null
}

function normalizeMode(planType: PlanRow['plan_type']): 'explore' | 'scale' {
  if (planType === 'scale' || planType === 'mixed') return 'scale'
  return 'explore'
}

function normalizeFormats(formats: unknown) {
  if (!Array.isArray(formats)) return [] as string[]
  return formats.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { hook_count?: number; formats?: string[] }

  const { data: plan, error: planError } = await supabase
    .from('plan_briefs')
    .select('id, user_id, plan_type, target_angle, target_persona, target_formats, objective, status, generated_concept_ids')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<PlanRow>()

  if (planError || !plan) {
    return NextResponse.json({ error: planError?.message || 'Plan not found' }, { status: 404 })
  }

  if (!plan.target_angle || !plan.target_persona) {
    return NextResponse.json({ error: 'Plan is missing target angle or persona' }, { status: 400 })
  }

  const hookCount = Math.min(Math.max(Number(body.hook_count || 3), 1), 6)
  const formats = normalizeFormats(body.formats).length > 0
    ? normalizeFormats(body.formats)
    : normalizeFormats(plan.target_formats).length > 0
      ? normalizeFormats(plan.target_formats)
      : ['static_image', 'carousel']

  await supabase
    .from('plan_briefs')
    .update({ status: 'generating' })
    .eq('id', id)
    .eq('user_id', user.id)

  try {
    const mode = normalizeMode(plan.plan_type)
    const brief = await generateConceptBrief(plan.target_angle, plan.target_persona, user.id, mode)

    const { data: concept, error: conceptError } = await supabase
      .from('creative_concepts')
      .insert({
        user_id: user.id,
        angle: plan.target_angle,
        persona: plan.target_persona,
        core_message: brief.core_message,
        concept_brief: brief as unknown as Record<string, unknown>,
        mode,
        status: 'draft',
        plan_brief_id: plan.id,
      })
      .select('id')
      .single<{ id: string }>()

    if (conceptError || !concept) throw new Error(conceptError?.message || 'Failed to create concept')

    const hooks = await generateHookVariations(brief, hookCount)
    const hookRows = hooks.map(hook => ({
      concept_id: concept.id,
      user_id: user.id,
      hook_text: hook.hook_text,
      hook_type: hook.hook_type,
      proof_points_used: hook.proof_points_used,
      status: 'draft',
      llm_provider: hook.llm_provider || null,
      llm_model: hook.llm_model || null,
    }))

    const { data: savedHooks, error: hookError } = await supabase
      .from('creative_hooks')
      .insert(hookRows)
      .select('id, hook_text, hook_type, proof_points_used')

    if (hookError) throw new Error(hookError.message)

    let executionCount = 0
    const executionResultAssets: Array<Record<string, unknown>> = []

    for (const savedHook of savedHooks || []) {
      const executions = await expandToFormats(brief, {
        hook_text: savedHook.hook_text,
        hook_type: savedHook.hook_type,
        proof_points_used: Array.isArray(savedHook.proof_points_used) ? savedHook.proof_points_used : [],
      }, formats)

      if (executions.length === 0) continue

      const executionRows = executions.map(execution => ({
        hook_id: savedHook.id,
        concept_id: concept.id,
        user_id: user.id,
        format: execution.format,
        content: execution.content,
        status: 'draft',
        llm_provider: execution.llm_provider || null,
        llm_model: execution.llm_model || null,
      }))

      const { data: savedExecutions, error: executionError } = await supabase
        .from('creative_executions')
        .insert(executionRows)
        .select('id, format, status')

      if (executionError) throw new Error(executionError.message)

      executionCount += savedExecutions?.length || 0
      executionResultAssets.push({
        hook_id: savedHook.id,
        hook_text: savedHook.hook_text,
        execution_ids: (savedExecutions || []).map(item => item.id),
        formats: (savedExecutions || []).map(item => item.format),
      })
    }

    const generatedConceptIds = Array.from(new Set([...(plan.generated_concept_ids || []), concept.id]))

    const { error: planUpdateError } = await supabase
      .from('plan_briefs')
      .update({
        status: 'completed',
        generated_concept_ids: generatedConceptIds,
        completed_at: new Date().toISOString(),
      })
      .eq('id', plan.id)
      .eq('user_id', user.id)

    if (planUpdateError) throw new Error(planUpdateError.message)

    await supabase.from('plan_assets').insert({
      user_id: user.id,
      plan_brief_id: plan.id,
      asset_type: 'execution_result',
      plan_section: 'execution_results',
      payload: {
        concept_id: concept.id,
        objective: plan.objective,
        hook_count: savedHooks?.length || 0,
        execution_count: executionCount,
        results: executionResultAssets,
      },
      sort_order: 999,
    })

    return NextResponse.json({
      concept_id: concept.id,
      hook_count: savedHooks?.length || 0,
      execution_count: executionCount,
    })
  } catch (error) {
    await supabase
      .from('plan_briefs')
      .update({ status: 'accepted' })
      .eq('id', plan.id)
      .eq('user_id', user.id)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to execute plan' }, { status: 500 })
  }
}
