/**
 * Batch Classification API
 * POST /api/classify/batch — Classify a batch of unclassified content.
 * POST /api/classify/all — Classify ALL unclassified content (may take minutes).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyBatch, classifyAll } from '@/lib/pipeline/batch-classifier'

export const maxDuration = 300  // 5 minute timeout for large batches

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { batchSize = 20, all = false } = await req.json().catch(() => ({}))

  try {
    if (all) {
      console.log(`[Classify] Starting full classification for user ${user.id}`)
      const result = await classifyAll(user.id, Math.min(batchSize, 50))
      return NextResponse.json(result)
    } else {
      const result = await classifyBatch(user.id, Math.min(batchSize, 50))
      return NextResponse.json(result)
    }
  } catch (err: any) {
    console.error('[Classify] Classification failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
