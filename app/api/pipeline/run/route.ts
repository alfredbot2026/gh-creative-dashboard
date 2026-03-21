/**
 * Pipeline Run API
 * POST /api/pipeline/run — Trigger a pipeline cycle.
 * Body: { steps?: ('ingest' | 'metrics' | 'classify' | 'profile')[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipelineCycle, PipelineStep } from '@/lib/pipeline/orchestrator'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { steps } = await req.json().catch(() => ({}))
  const validSteps: PipelineStep[] = ['ingest', 'metrics', 'classify', 'profile']
  const stepsToRun = steps?.filter((s: string) => validSteps.includes(s as PipelineStep)) || undefined

  try {
    const result = await runPipelineCycle(user.id, stepsToRun)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Pipeline] Run failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
