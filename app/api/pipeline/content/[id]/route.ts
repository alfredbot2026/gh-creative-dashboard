/**
 * Single Content Detail API
 * GET /api/pipeline/content/[id] — Full detail for one ingested item + its analysis.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Get the ingested item
  const { data: item, error } = await supabase
    .from('content_ingest')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get its analysis
  const { data: analysis } = await supabase
    .from('content_analysis')
    .select('*')
    .eq('ingest_id', id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    ...item,
    analysis: analysis || null,
  })
}
