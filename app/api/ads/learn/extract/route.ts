import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractLearningsFromCreative } from '@/lib/ads/learn-extractor'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { creative_ids?: string[]; force_refresh?: boolean }
  let query = supabase
    .from('ad_creatives')
    .select('id, angle, persona, creative_format, body_text, headline, hook_type, emotional_tone, cta_text, link_description, frame_descriptions')
    .eq('user_id', user.id)

  if (body.creative_ids?.length) query = query.in('id', body.creative_ids)
  if (!body.force_refresh && !body.creative_ids?.length) {
    const { data: existing } = await supabase.from('creative_learnings').select('ad_creative_id').eq('user_id', user.id)
    const analyzedIds = (existing || []).map(row => row.ad_creative_id).filter(Boolean)
    if (analyzedIds.length) query = query.not('id', 'in', `(${analyzedIds.join(',')})`)
  }

  const { data: creatives, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let extractedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (const creative of creatives || []) {
    const learning = extractLearningsFromCreative(creative)
    if (!learning) {
      skippedCount += 1
      continue
    }

    const { error: upsertError } = await supabase.from('creative_learnings').upsert({
      user_id: user.id,
      ad_creative_id: creative.id,
      ...learning,
    }, { onConflict: 'user_id,ad_creative_id' })

    if (upsertError) errors.push(`${creative.id}: ${upsertError.message}`)
    else extractedCount += 1
  }

  return NextResponse.json({ extracted_count: extractedCount, skipped_count: skippedCount, errors })
}
