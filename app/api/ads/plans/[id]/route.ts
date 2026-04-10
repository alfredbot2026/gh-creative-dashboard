import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanDetail } from '@/lib/ads/plans'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['pending', 'accepted', 'generating', 'completed', 'dismissed', 'expired'])

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const plan = await getPlanDetail(supabase, user.id, id)
    return NextResponse.json(plan)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load plan'
    const status = /no rows/i.test(message) ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (body?.status) {
      if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
      updates.completed_at = body.status === 'completed' ? new Date().toISOString() : null
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, 'expires_at')) {
      updates.expires_at = body.expires_at || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates supplied' }, { status: 400 })
    }

    const { error } = await supabase
      .from('plan_briefs')
      .update(updates)
      .eq('user_id', user.id)
      .eq('id', id)

    if (error) throw new Error(error.message)

    const plan = await getPlanDetail(supabase, user.id, id)
    return NextResponse.json(plan)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update plan'
    const status = /no rows/i.test(message) ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
