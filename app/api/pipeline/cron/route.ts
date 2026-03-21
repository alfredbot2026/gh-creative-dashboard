/**
 * Pipeline Cron Route
 * GET /api/pipeline/cron — Triggered by Vercel Cron (every 12 hours).
 * Protected by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipelineCycle } from '@/lib/pipeline/orchestrator'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Find all users with connected accounts
  const { data: metaUsers } = await supabase
    .from('meta_tokens')
    .select('user_id')

  const { data: ytUsers } = await supabase
    .from('youtube_tokens')
    .select('channel_id')

  // Deduplicate user IDs
  const userIds = new Set<string>()
  for (const row of metaUsers || []) userIds.add(row.user_id)
  // YouTube tokens don't have user_id directly, skip for now
  // In production, we'd need a user_id column on youtube_tokens

  if (userIds.size === 0) {
    return NextResponse.json({ message: 'No connected accounts', users_processed: 0 })
  }

  const results = []
  for (const userId of userIds) {
    try {
      const result = await runPipelineCycle(userId, ['classify', 'profile'])
      results.push({ user_id: userId, ...result })
    } catch (err: any) {
      results.push({ user_id: userId, error: err.message })
    }
  }

  return NextResponse.json({
    users_processed: userIds.size,
    results,
    timestamp: new Date().toISOString(),
  })
}
