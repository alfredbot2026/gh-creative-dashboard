import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAdImage } from '@/lib/create/image-generator'
import type { ImageGenerationRequest } from '@/lib/create/image-types'

const VALID_STYLES = ['product_shot', 'lifestyle', 'promotional', 'faceless_quote', 'creator_featured'] as const
const VALID_ASPECT_RATIOS = ['1:1', '4:5', '16:9', '9:16'] as const

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ImageGenerationRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }
  if (!body.style || !(VALID_STYLES as readonly string[]).includes(body.style)) {
    return NextResponse.json(
      { error: `style must be one of: ${VALID_STYLES.join(', ')}` },
      { status: 400 }
    )
  }
  if (!body.aspect_ratio || !(VALID_ASPECT_RATIOS as readonly string[]).includes(body.aspect_ratio)) {
    return NextResponse.json(
      { error: `aspect_ratio must be one of: ${VALID_ASPECT_RATIOS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const result = await generateAdImage(body, user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    console.error('[POST /api/create/image]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
