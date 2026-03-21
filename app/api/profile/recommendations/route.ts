/**
 * Profile Recommendations API
 * GET /api/profile/recommendations?purpose=educate&platform=instagram
 * Returns targeted recommendations for a specific creation context.
 * Falls back to generic KB recommendations when no profile exists.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PerformanceProfile } from '@/lib/pipeline/profile-types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const purpose = req.nextUrl.searchParams.get('purpose') || 'educate'
  const platform = req.nextUrl.searchParams.get('platform') || 'instagram'

  // Try to get performance profile
  const { data: profileData } = await supabase
    .from('performance_profile')
    .select('profile')
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (profileData?.profile) {
    const profile = profileData.profile as PerformanceProfile

    // Filter by platform if we have platform-specific data
    const hooks = profile.hook_performance
      .filter(h => h.confidence !== 'low')
      .slice(0, 3)
      .map(h => ({
        name: h.label,
        reason: `${h.avg_engagement_rate.toFixed(4)} engagement rate (${h.sample_size} posts)`,
        confidence: h.confidence,
      }))

    const structures = profile.structure_performance
      .filter(s => s.confidence !== 'low')
      .slice(0, 3)
      .map(s => ({
        name: s.label,
        reason: `${s.avg_saves.toFixed(1)} avg saves (${s.sample_size} posts)`,
        confidence: s.confidence,
      }))

    const bestTime = profile.best_posting_times[0]
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Find stale topics relevant to this purpose
    const staleTopics = profile.topic_freshness
      .filter(t => t.platform === platform || !platform)
      .slice(0, 3)
      .map(t => {
        const daysSince = Math.round((Date.now() - new Date(t.last_posted).getTime()) / (1000 * 60 * 60 * 24))
        return {
          topic: t.topic,
          days_since_last: daysSince,
          reason: `Last covered ${daysSince} days ago (normally every ${t.frequency_days} days)`,
        }
      })

    return NextResponse.json({
      source: 'performance_profile',
      recommended_hooks: hooks,
      recommended_structures: structures,
      recommended_posting_time: bestTime ? {
        day: days[bestTime.day_of_week],
        hour: bestTime.hour,
        reason: `Your best engagement time (${bestTime.sample_size} posts analyzed)`,
      } : null,
      topic_suggestions: staleTopics,
      style_recommendation: profile.visual_style_performance[0] ? {
        visual_style: profile.visual_style_performance[0].label,
        reason: `Your top performing visual style`,
      } : null,
      content_mix: {
        current_purpose_ratio: profile.content_mix_actual[purpose] || 0,
        optimal_ratio: profile.content_mix_optimal[purpose] || 0,
      },
    })
  }

  // Fallback: generic KB-based recommendations
  return NextResponse.json({
    source: 'kb_generic',
    recommended_hooks: [
      { name: 'Comparison Hook', reason: 'High engagement across creators', confidence: 'low' },
      { name: 'Question Hook', reason: 'Universally effective opener', confidence: 'low' },
    ],
    recommended_structures: [
      { name: 'Step-by-Step Tutorial', reason: 'Best for educational content', confidence: 'low' },
    ],
    recommended_posting_time: null,
    topic_suggestions: [],
    style_recommendation: null,
    content_mix: { current_purpose_ratio: 0, optimal_ratio: 0 },
    message: 'No performance profile available. Connect your accounts and run the learning pipeline for personalized recommendations.',
  })
}
