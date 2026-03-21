/**
 * Current Profile API
 * GET /api/profile/current — Get latest performance profile.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('performance_profile')
    .select('*')
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({
      exists: false,
      message: 'No performance profile yet. Ingest content, classify it, then generate a profile.',
    }, { status: 404 })
  }

  return NextResponse.json({
    exists: true,
    version: data.version,
    confidence: data.confidence_level,
    total_analyzed: data.total_posts_analyzed,
    generated_at: data.created_at,
    profile: data.profile,
  })
}
