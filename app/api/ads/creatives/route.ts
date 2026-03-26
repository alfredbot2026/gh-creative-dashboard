/**
 * Ad Creatives API
 * GET /api/ads/creatives — Returns all classified ad creatives for the current user.
 * PATCH /api/ads/creatives — Inline correction of classification fields.
 * Supports filters: angle, persona, framework, status, format.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_DIMENSIONS: Record<string, string[]> = {
  angle: ['pain_point', 'aspiration', 'fear', 'social_proof', 'comparison', 'education', 'urgency', 'curiosity', 'transformation', 'authority'],
  persona: ['new_mom_curious', 'returning_buyer', 'price_sensitive', 'aspirational', 'skeptic', 'beginner', 'advanced', 'gift_buyer', 'busy_professional'],
  framework: ['PAS', 'AIDA', 'before_after', 'testimonial', 'urgency', 'FAB', 'comparison', 'storytelling', 'listicle', 'direct_offer'],
  hook_type: ['question', 'bold_claim', 'statistic', 'story_opening', 'curiosity_gap', 'pain_call', 'social_proof_lead', 'direct_benefit', 'controversy', 'how_to'],
  offer_type: ['discount', 'free_trial', 'value_stack', 'limited_time', 'social_proof', 'educational', 'no_offer', 'bundle', 'guarantee', 'sample'],
  emotional_tone: ['warm', 'urgent', 'educational', 'aspirational', 'fear', 'empowering', 'playful', 'authoritative', 'nostalgic', 'relieved'],
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const angle = params.get('angle')
  const persona = params.get('persona')
  const framework = params.get('framework')
  const status = params.get('status')
  const format = params.get('format')

  let query = supabase
    .from('ad_creatives')
    .select('*')
    .eq('user_id', user.id)
    .order('total_spend', { ascending: false })

  if (angle) query = query.eq('angle', angle)
  if (persona) query = query.eq('persona', persona)
  if (framework) query = query.eq('framework', framework)
  if (status) query = query.eq('ad_status', status)
  if (format) query = query.eq('creative_format', format)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Summary stats
  const creatives = data || []
  const totalSpend = creatives.reduce((s, c) => s + (c.total_spend || 0), 0)
  const totalPurchases = creatives.reduce((s, c) => s + (c.total_purchases || 0), 0)
  const classified = creatives.filter(c => c.classified_at).length

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const c of creatives) {
    const s = c.ad_status || 'unknown'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  return NextResponse.json({
    creatives,
    summary: {
      total: creatives.length,
      classified,
      unclassified: creatives.length - classified,
      total_spend: Math.round(totalSpend * 100) / 100,
      total_purchases: totalPurchases,
      status_breakdown: statusCounts,
    },
  })
}

/**
 * PATCH /api/ads/creatives
 * Inline correction of ad classification.
 * Body: { id: string, corrections: { angle?, persona?, framework?, hook_type?, offer_type?, emotional_tone? } }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, corrections } = body as { id?: string; corrections?: Record<string, string> }

  if (!id || !corrections || typeof corrections !== 'object') {
    return NextResponse.json({ error: 'Missing id or corrections' }, { status: 400 })
  }

  // Validate corrections against allowed dimensions and values
  const updateFields: Record<string, string> = {}
  for (const [dim, value] of Object.entries(corrections)) {
    if (!VALID_DIMENSIONS[dim]) {
      return NextResponse.json({ error: `Invalid dimension: ${dim}` }, { status: 400 })
    }
    if (!VALID_DIMENSIONS[dim].includes(value)) {
      return NextResponse.json({
        error: `Invalid value "${value}" for ${dim}. Valid: ${VALID_DIMENSIONS[dim].join(', ')}`,
      }, { status: 400 })
    }
    updateFields[dim] = value
  }

  const { error } = await supabase
    .from('ad_creatives')
    .update({
      ...updateFields,
      classification_version: 'manual',
      classified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: updateFields })
}
