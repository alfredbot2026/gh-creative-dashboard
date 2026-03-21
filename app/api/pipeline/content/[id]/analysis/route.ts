/**
 * Post Analysis API
 * GET /api/pipeline/content/[id]/analysis — Per-post "why it worked/didn't" analysis.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzePost } from '@/lib/pipeline/post-analyzer'
import type { PerformanceProfile } from '@/lib/pipeline/profile-types'

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
  const { data: item } = await supabase
    .from('content_ingest')
    .select('platform, content_type, caption, description, published_at, metrics')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Get classification
  const { data: analysis } = await supabase
    .from('content_analysis')
    .select('classification')
    .eq('ingest_id', id)
    .eq('user_id', user.id)
    .single()

  // Get performance profile
  const { data: profileData } = await supabase
    .from('performance_profile')
    .select('profile')
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!profileData?.profile) {
    return NextResponse.json({ error: 'No performance profile. Run the pipeline first.' }, { status: 400 })
  }

  const result = analyzePost(
    { ...item, classification: analysis?.classification || null },
    profileData.profile as PerformanceProfile
  )

  return NextResponse.json(result)
}
