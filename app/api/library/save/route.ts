/**
 * Save generated content to library (content_items table).
 * Handles both scripts (from /create) and visuals (from /studio).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface SaveRequest {
  type: 'script' | 'carousel' | 'image'
  title: string
  platform: string
  hook?: string
  cta?: string
  /** Full script data (scenes, structure slug, etc.) */
  scriptData?: any
  /** For carousel: array of slide URLs */
  slideUrls?: string[]
  /** For image: single image URL */
  imageUrl?: string
  /** Structure used */
  structureSlug?: string
  /** Goal/content type */
  contentType?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: SaveRequest = await req.json()
  const { type, title, platform, hook, cta, scriptData, slideUrls, imageUrl, structureSlug, contentType } = body

  if (!title || !platform) {
    return NextResponse.json({ error: 'Missing title or platform' }, { status: 400 })
  }

  // Map platform names to content_items format
  const contentTypeMap: Record<string, string> = {
    reels: 'reel',
    tiktok: 'reel',
    youtube: 'youtube',
    'facebook-post': 'story',
    'facebook-ad': 'ad',
    carousel: 'carousel',
    'static-image': 'ad',
  }

  // Build script_data JSONB
  const fullScriptData: any = {
    source: type, // 'script' | 'carousel' | 'image'
    ...(scriptData || {}),
    ...(structureSlug && { structure_slug: structureSlug }),
    ...(contentType && { goal: contentType }),
    ...(slideUrls && { slides: slideUrls }),
    ...(imageUrl && { image_url: imageUrl }),
  }

  const { data, error } = await supabase
    .from('content_items')
    .insert({
      user_id: user.id,
      title: title.substring(0, 200),
      content_type: contentTypeMap[platform] || platform,
      platform: platform.includes('facebook') ? 'facebook'
        : platform === 'reels' || platform === 'carousel' || platform === 'static-image' ? 'instagram'
        : platform,
      status: 'created',
      hook: hook?.substring(0, 500),
      cta: cta?.substring(0, 500),
      ai_generated: true,
      script_data: fullScriptData,
      scheduled_date: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Library Save]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, saved: true })
}
