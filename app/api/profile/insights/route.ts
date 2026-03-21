/**
 * Profile Insights API
 * GET /api/profile/insights — Get human-readable insights from performance profile.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInsights } from '@/lib/pipeline/insights-generator'
import type { PerformanceProfile } from '@/lib/pipeline/profile-types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('performance_profile')
    .select('profile, version, created_at')
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'No performance profile yet' }, { status: 404 })
  }

  const insights = generateInsights(data.profile as PerformanceProfile)

  return NextResponse.json({
    insights,
    profile_version: data.version,
    generated_at: data.created_at,
  })
}
