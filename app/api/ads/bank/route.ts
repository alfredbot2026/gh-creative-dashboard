/**
 * Hook & Script Bank API
 * 
 * GET  /api/ads/bank?angle=X&persona=Y&count=3  — serve fresh hooks
 * POST /api/ads/bank  — mark hooks as shown/selected/deployed/retired
 * 
 * Serving logic:
 * 1. Pull 'fresh' hooks first (never shown)
 * 2. If not enough, pull 'shown' hooks (seen but not recently)
 * 3. Ensure hook_type variety (no duplicates)
 * 4. Boost hooks similar to deployed winners
 * 5. If bank is depleted (<3 fresh), flag for regeneration
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const angle = searchParams.get('angle')
  const persona = searchParams.get('persona')
  const count = parseInt(searchParams.get('count') || '3')
  const format = searchParams.get('format') // for scripts
  const type = searchParams.get('type') || 'hooks' // hooks or scripts

  if (!angle || !persona) {
    return NextResponse.json({ error: 'angle and persona required' }, { status: 400 })
  }

  if (type === 'scripts') {
    return serveScripts(supabase, user.id, angle, persona, format || 'video_ugc', count)
  }

  return serveHooks(supabase, user.id, angle, persona, count)
}

async function serveHooks(supabase: any, userId: string, angle: string, persona: string, count: number) {
  // 1. Get fresh hooks first
  const { data: fresh } = await supabase
    .from('hook_bank')
    .select('*')
    .eq('user_id', userId)
    .eq('angle', angle)
    .eq('persona', persona)
    .eq('status', 'fresh')
    .order('quality_score', { ascending: false, nullsFirst: false })
    .limit(count * 2) // fetch extra for variety filtering

  // 2. Get shown-but-not-recently hooks as fallback
  const { data: shown } = await supabase
    .from('hook_bank')
    .select('*')
    .eq('user_id', userId)
    .eq('angle', angle)
    .eq('persona', persona)
    .eq('status', 'shown')
    .lt('times_shown', 3) // retire after 3 shows
    .order('last_shown_at', { ascending: true }) // least recently shown first
    .limit(count * 2)

  // 3. Get winning hook types for this angle (boost similar patterns)
  const { data: winners } = await supabase
    .from('hook_bank')
    .select('hook_type, ad_roas')
    .eq('user_id', userId)
    .eq('angle', angle)
    .not('ad_roas', 'is', null)
    .gt('ad_roas', 1.5)
    .order('ad_roas', { ascending: false })
    .limit(5)

  const winningTypes = new Set((winners || []).map((w: any) => w.hook_type))

  // 4. Select with variety + winner boost
  const pool = [...(fresh || []), ...(shown || [])]
  const selected: any[] = []
  const usedTypes = new Set<string>()

  // Pass 1: pick from winning types first (if any)
  for (const hook of pool) {
    if (selected.length >= count) break
    if (usedTypes.has(hook.hook_type)) continue
    if (winningTypes.has(hook.hook_type)) {
      selected.push(hook)
      usedTypes.add(hook.hook_type)
    }
  }

  // Pass 2: fill remaining with variety
  for (const hook of pool) {
    if (selected.length >= count) break
    if (usedTypes.has(hook.hook_type)) continue
    if (selected.some(s => s.id === hook.id)) continue
    selected.push(hook)
    usedTypes.add(hook.hook_type)
  }

  // Pass 3: if still short, relax variety constraint
  for (const hook of pool) {
    if (selected.length >= count) break
    if (selected.some(s => s.id === hook.id)) continue
    selected.push(hook)
  }

  // 5. Check if bank needs refill
  const freshCount = (fresh || []).length
  const needsRefill = freshCount < count

  // 6. Mark served hooks as 'shown'
  if (selected.length > 0) {
    const ids = selected.map(h => h.id)
    await supabase
      .from('hook_bank')
      .update({
        status: 'shown',
        times_shown: supabase.rpc ? undefined : selected[0].times_shown + 1, // fallback
        last_shown_at: new Date().toISOString(),
      })
      .in('id', ids)

    // Increment times_shown individually
    for (const hook of selected) {
      await supabase
        .from('hook_bank')
        .update({ times_shown: (hook.times_shown || 0) + 1, status: 'shown', last_shown_at: new Date().toISOString() })
        .eq('id', hook.id)
    }
  }

  return NextResponse.json({
    hooks: selected,
    bank_status: {
      fresh: freshCount,
      total: pool.length,
      needs_refill: needsRefill,
    },
  })
}

async function serveScripts(supabase: any, userId: string, angle: string, persona: string, format: string, count: number) {
  const { data: scripts } = await supabase
    .from('script_bank')
    .select('*')
    .eq('user_id', userId)
    .eq('angle', angle)
    .eq('persona', persona)
    .eq('format', format)
    .in('status', ['fresh', 'shown'])
    .order('quality_score', { ascending: false, nullsFirst: false })
    .limit(count)

  if (scripts && scripts.length > 0) {
    for (const s of scripts) {
      await supabase
        .from('script_bank')
        .update({ times_shown: (s.times_shown || 0) + 1, status: 'shown', last_shown_at: new Date().toISOString() })
        .eq('id', s.id)
    }
  }

  return NextResponse.json({
    scripts: scripts || [],
    bank_status: {
      total: (scripts || []).length,
      needs_refill: (scripts || []).length < count,
    },
  })
}

// POST: Update hook/script status
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, ids, hook_id, script_id, deployed_ad_id, concept_id } = await request.json()

  if (action === 'select') {
    // Mark hook as selected (Grace picked it for generation)
    const id = hook_id || ids?.[0]
    if (!id) return NextResponse.json({ error: 'hook_id required' }, { status: 400 })

    await supabase
      .from('hook_bank')
      .update({
        status: 'selected',
        updated_at: new Date().toISOString(),
        ...(concept_id ? { deployed_concept_id: concept_id } : {}),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  }

  if (action === 'deploy') {
    // Link hook to a deployed ad
    const id = hook_id || ids?.[0]
    if (!id || !deployed_ad_id) return NextResponse.json({ error: 'hook_id and deployed_ad_id required' }, { status: 400 })

    await supabase
      .from('hook_bank')
      .update({ status: 'deployed', deployed_ad_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  }

  if (action === 'retire') {
    // Mark hooks as retired (stale, shown too many times, etc.)
    const retireIds = ids || [hook_id]
    if (!retireIds.length) return NextResponse.json({ error: 'ids required' }, { status: 400 })

    await supabase
      .from('hook_bank')
      .update({ status: 'retired', updated_at: new Date().toISOString() })
      .in('id', retireIds)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, retired: retireIds.length })
  }

  if (action === 'refresh') {
    // Mark all shown hooks for this angle as retired, forcing fresh ones next time
    const { angle, persona } = await request.json().catch(() => ({}))
    if (!angle || !persona) return NextResponse.json({ error: 'angle and persona required' }, { status: 400 })

    const { count } = await supabase
      .from('hook_bank')
      .update({ status: 'retired', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('angle', angle)
      .eq('persona', persona)
      .eq('status', 'shown')

    return NextResponse.json({ success: true, retired: count })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
