/**
 * Classify All API
 * POST /api/classify/all — Classify all unclassified content for the user.
 * Streams progress as NDJSON lines.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyAll } from '@/lib/pipeline/batch-classifier'
import { getCronOrUserAuth } from '@/lib/cron-auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId, supabase, isCron } = await getCronOrUserAuth(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Pass service role client when called from cron (bypasses RLS)
    const result = await classifyAll(userId, 50, undefined, isCron ? supabase : undefined)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
