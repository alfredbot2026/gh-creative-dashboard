import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPlanCandidates, listPlans, type PlanCandidate } from '@/lib/ads/plans'

export const dynamic = 'force-dynamic'

function normalizeFormats(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeMode(value: unknown): 'auto' | 'scale' | 'refresh' | 'explore' {
  return value === 'scale' || value === 'refresh' || value === 'explore' ? value : 'auto'
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const limitRaw = Number(searchParams.get('limit') || '20')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20

  try {
    const plans = await listPlans(supabase, user.id, { status, type, limit })
    return NextResponse.json({ plans })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const mode = normalizeMode(body?.mode)
    const angle = typeof body?.angle === 'string' ? body.angle : undefined
    const persona = typeof body?.persona === 'string' ? body.persona : undefined
    const formats = normalizeFormats(body?.format)
    const countRaw = Number(body?.count || 3)
    const count = Number.isFinite(countRaw) ? Math.min(Math.max(countRaw, 1), 6) : 3

    const candidates = await buildPlanCandidates(supabase, user.id, {
      mode,
      angle,
      persona,
      formats,
      count,
    })

    if (candidates.length === 0) {
      return NextResponse.json({ plans_created: 0, plans: [] })
    }

    const created: PlanCandidate[] = []

    for (const candidate of candidates) {
      let duplicateQuery = supabase
        .from('plan_briefs')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', candidate.plan_type)
        .eq('status', 'pending')

      if (candidate.target_angle) duplicateQuery = duplicateQuery.eq('target_angle', candidate.target_angle)
      else duplicateQuery = duplicateQuery.is('target_angle', null)

      if (candidate.target_persona) duplicateQuery = duplicateQuery.eq('target_persona', candidate.target_persona)
      else duplicateQuery = duplicateQuery.is('target_persona', null)

      const { data: existing, error: duplicateError } = await duplicateQuery.limit(1)
      if (duplicateError) throw new Error(duplicateError.message)
      if (existing && existing.length > 0) continue

      const { error: insertError } = await supabase.from('plan_briefs').insert({
        user_id: user.id,
        plan_type: candidate.plan_type,
        priority: candidate.priority,
        target_angle: candidate.target_angle,
        target_persona: candidate.target_persona,
        target_formats: candidate.target_formats,
        objective: candidate.objective,
        hypothesis: candidate.hypothesis,
        evidence_summary: candidate.evidence_summary,
        why_now: candidate.why_now,
        status: 'pending',
        source_experiment_cell_id: candidate.source_experiment_cell_id,
      })

      if (insertError) throw new Error(insertError.message)
      created.push(candidate)
    }

    const plans = await listPlans(supabase, user.id, { limit: 20 })
    const matchingPlans = plans.filter(plan => created.some(candidate => plan.plan_type === candidate.plan_type && plan.target_angle === candidate.target_angle && plan.target_persona === candidate.target_persona)).slice(0, created.length)

    return NextResponse.json({
      plans_created: created.length,
      plans: matchingPlans,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate plans' }, { status: 500 })
  }
}
