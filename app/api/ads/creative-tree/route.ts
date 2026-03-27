/**
 * POST /api/ads/creative-tree — Generate a full creative tree
 * GET /api/ads/creative-tree — List saved concepts with hooks
 * PATCH /api/ads/creative-tree — Update hook/execution status (winner, loser, etc.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCreativeTree, generateConceptBrief } from '@/lib/ads/creative-engine'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

// GET: List saved concepts
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: concepts } = await supabase
    .from('creative_concepts')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // Get hooks + executions for each concept
  const result = []
  for (const concept of concepts || []) {
    const { data: hooks } = await supabase
      .from('creative_hooks')
      .select('*')
      .eq('concept_id', concept.id)
      .order('created_at')

    const hookIds = (hooks || []).map(h => h.id)
    const { data: executions } = hookIds.length > 0
      ? await supabase.from('creative_executions').select('*').in('hook_id', hookIds)
      : { data: [] }

    const hooksWithExec = (hooks || []).map(h => ({
      ...h,
      executions: (executions || []).filter(e => e.hook_id === h.id),
    }))

    result.push({ ...concept, hooks: hooksWithExec })
  }

  return NextResponse.json({ concepts: result })
}

// POST: Generate a new creative tree
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { angle, persona, mode, hookCount, formats } = body

  if (!angle || !persona) {
    return NextResponse.json({ error: 'angle and persona required' }, { status: 400 })
  }

  try {
    // Generate the full tree
    const tree = await generateCreativeTree(angle, persona, user.id, {
      mode: mode || 'explore',
      hookCount: hookCount || 3,
      formats: formats || ['static_image', 'carousel', 'video_ugc'],
    })

    // Save concept
    const { data: concept, error: conceptErr } = await supabase
      .from('creative_concepts')
      .upsert({
        user_id: user.id,
        angle,
        persona,
        core_message: tree.brief.core_message,
        concept_brief: tree.brief as unknown as Record<string, unknown>,
        mode: mode || 'explore',
        status: 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, angle, persona, core_message' })
      .select('id')
      .single()

    if (conceptErr || !concept) {
      throw new Error('Failed to save concept: ' + (conceptErr?.message || 'unknown'))
    }

    // Save hooks + executions
    const savedHooks = []
    for (const hook of tree.hooks) {
      const { data: savedHook } = await supabase
        .from('creative_hooks')
        .insert({
          concept_id: concept.id,
          user_id: user.id,
          hook_text: hook.hook_text,
          hook_type: hook.hook_type,
          proof_points_used: hook.proof_points_used,
          status: 'draft',
        })
        .select('id')
        .single()

      if (!savedHook) continue

      const execRows = hook.executions.map(exec => ({
        hook_id: savedHook.id,
        concept_id: concept.id,
        user_id: user.id,
        format: exec.format,
        content: exec.content,
        status: 'draft',
      }))

      const { data: savedExecs } = await supabase
        .from('creative_executions')
        .insert(execRows)
        .select('id, format, content, status')

      savedHooks.push({
        ...savedHook,
        hook_text: hook.hook_text,
        hook_type: hook.hook_type,
        proof_points_used: hook.proof_points_used,
        executions: savedExecs || [],
      })
    }

    return NextResponse.json({
      success: true,
      concept_id: concept.id,
      brief: tree.brief,
      hooks: savedHooks,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    console.error('[Creative Tree] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH: Update status (mark winner, loser, approved, etc.)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, id, status, notes } = body as {
    type: 'concept' | 'hook' | 'execution'
    id: string
    status: string
    notes?: string
  }

  if (!type || !id || !status) {
    return NextResponse.json({ error: 'type, id, and status required' }, { status: 400 })
  }

  const table = type === 'concept' ? 'creative_concepts'
    : type === 'hook' ? 'creative_hooks'
    : 'creative_executions'

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (notes && type === 'hook') update.meta_notes = notes

  const { error } = await supabase.from(table).update(update).eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
