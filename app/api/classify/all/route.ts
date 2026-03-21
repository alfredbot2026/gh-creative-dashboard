/**
 * Classify All API
 * POST /api/classify/all — Classify all unclassified content for the user.
 * Streams progress as NDJSON lines.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyAll } from '@/lib/pipeline/batch-classifier'

export const maxDuration = 300

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await classifyAll(user.id, 50)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
