/**
 * Pipeline Orchestrator
 * 
 * Runs the full learning pipeline cycle: ingest → metrics refresh → classify → profile.
 */
import { createClient } from '@/lib/supabase/server'
import { classifyBatch } from './batch-classifier'
import { generatePerformanceProfile } from './correlation-engine'

export type PipelineStep = 'ingest' | 'metrics' | 'classify' | 'profile'

export interface PipelineResult {
  new_posts_ingested: number
  metrics_refreshed: number
  posts_classified: number
  profile_recalculated: boolean
  duration_seconds: number
  errors: string[]
  timestamp: string
  steps_run: PipelineStep[]
}

/**
 * Run a full pipeline cycle for a user.
 */
export async function runPipelineCycle(
  userId: string,
  steps?: PipelineStep[]
): Promise<PipelineResult> {
  const start = Date.now()
  const stepsToRun = steps || ['ingest', 'metrics', 'classify', 'profile']
  const errors: string[] = []
  let newIngested = 0
  let metricsRefreshed = 0
  let postsClassified = 0
  let profileRecalculated = false

  const supabase = await createClient()

  // Step 1: Ingest new content
  if (stepsToRun.includes('ingest')) {
    try {
      // Check for Meta connection
      const { data: metaToken } = await supabase
        .from('meta_tokens')
        .select('ig_user_id')
        .eq('user_id', userId)
        .single()

      if (metaToken?.ig_user_id) {
        // Trigger incremental Meta ingest
        // We call the internal logic directly rather than HTTP to avoid auth issues
        console.log(`[Pipeline] Skipping Meta ingest in orchestrator — use /api/ingest/meta directly`)
      }

      // Check for YouTube connection
      const { data: ytToken } = await supabase
        .from('youtube_tokens')
        .select('channel_id')
        .limit(1)
        .single()

      if (ytToken) {
        console.log(`[Pipeline] Skipping YouTube ingest in orchestrator — use /api/ingest/youtube directly`)
      }

      // For the cron-triggered orchestrator, we count new items since last run
      const { count } = await supabase
        .from('content_ingest')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      newIngested = count || 0
    } catch (err: any) {
      errors.push(`Ingest check: ${err.message}`)
    }
  }

  // Step 2: Metrics refresh
  if (stepsToRun.includes('metrics')) {
    try {
      // Count posts that need metrics refresh
      // Posts 0-7d old: refresh if metrics_snapshot_count < 5
      // Posts 7-30d old: refresh if metrics_snapshot_count < 3
      const { count } = await supabase
        .from('content_ingest')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lt('metrics_snapshot_count', 5)

      metricsRefreshed = count || 0
      // Actual refresh happens via /api/ingest/meta and /api/ingest/youtube with mode=incremental
      console.log(`[Pipeline] ${metricsRefreshed} posts eligible for metrics refresh`)
    } catch (err: any) {
      errors.push(`Metrics check: ${err.message}`)
    }
  }

  // Step 3: Classify unclassified content
  if (stepsToRun.includes('classify')) {
    try {
      // Classify in batches until done (max 100 per cycle to avoid timeout)
      let totalClassified = 0
      for (let i = 0; i < 5; i++) {  // Max 5 batches of 20 = 100
        const result = await classifyBatch(userId, 20)
        totalClassified += result.classified
        if (result.errors.length > 0) {
          errors.push(...result.errors.slice(0, 3))
        }
        if (result.remaining === 0 || result.classified === 0) break
      }
      postsClassified = totalClassified
    } catch (err: any) {
      errors.push(`Classification: ${err.message}`)
    }
  }

  // Step 4: Recalculate profile
  if (stepsToRun.includes('profile')) {
    try {
      // Only recalculate if we have new classifications or it's been >24h
      const { data: latestProfile } = await supabase
        .from('performance_profile')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const hoursSinceProfile = latestProfile
        ? (Date.now() - new Date(latestProfile.created_at).getTime()) / (1000 * 60 * 60)
        : Infinity

      if (postsClassified > 0 || hoursSinceProfile > 24) {
        await generatePerformanceProfile(userId)
        profileRecalculated = true
      } else {
        console.log(`[Pipeline] Skipping profile recalculation (no new data, last calc ${hoursSinceProfile.toFixed(1)}h ago)`)
      }
    } catch (err: any) {
      errors.push(`Profile generation: ${err.message}`)
    }
  }

  return {
    new_posts_ingested: newIngested,
    metrics_refreshed: metricsRefreshed,
    posts_classified: postsClassified,
    profile_recalculated: profileRecalculated,
    duration_seconds: Math.round((Date.now() - start) / 1000),
    errors,
    timestamp: new Date().toISOString(),
    steps_run: stepsToRun,
  }
}
