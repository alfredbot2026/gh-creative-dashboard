/**
 * Profile Generation API
 * POST /api/profile/generate — Calculate performance profile from classified data.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePerformanceProfile } from '@/lib/pipeline/correlation-engine'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await generatePerformanceProfile(user.id)
    return NextResponse.json({
      version: (profile as any).version,
      total_analyzed: profile.sample_size,
      confidence: profile.confidence_level,
      generated_at: profile.generated_at,
    })
  } catch (err: any) {
    console.error('[Profile] Generation failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
