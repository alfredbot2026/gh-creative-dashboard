import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateSession } from '@/lib/create/session-manager'
import { generateImage } from '@/lib/create/image-generator-api'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { thumbnail_concept, title, count = 3 } = await req.json()

  if (!thumbnail_concept) {
    return NextResponse.json({ error: 'thumbnail_concept is required' }, { status: 400 })
  }

  const variants = Math.min(count, 3)
  const results: Array<{ variant: number; image_url: string | null; error?: string }> = []

  // Framing variations for each thumbnail
  const framings = [
    'Close-up shot, face fills 60% of frame, bold expression',
    'Medium shot showing upper body, dynamic hand gesture or prop',
    'Slightly wider frame, environment visible, lifestyle feel',
  ]

  // Try multi-turn session first for Grace consistency
  let session = null
  try {
    session = await getOrCreateSession(user.id)
  } catch (err) {
    console.warn('[YouTube Thumbnail] Session init failed, using single-shot:', err)
  }

  // Generate sequentially within same session
  for (let i = 0; i < variants; i++) {
    const scenePrompt = `YouTube thumbnail for a video titled "${title || 'Paper Crafting Business'}". 

Concept: ${thumbnail_concept}

${framings[i] || framings[0]}. 

Style: Bold, eye-catching YouTube thumbnail. High contrast, vibrant colors, shallow depth of field. Shot on a Canon EOS R5 with a 35mm f/1.4 lens. The image should make someone want to click. No text overlays — text will be added separately.`

    try {
      if (session) {
        const imageBuffer = await session.generateScene(scenePrompt)
        const base64 = imageBuffer.toString('base64')
        results.push({
          variant: i + 1,
          image_url: `data:image/png;base64,${base64}`,
        })
      } else {
        // Fallback: single-shot
        const imageResult = await generateImage({
          prompt: scenePrompt,
          style: 'creator_featured',
          aspect_ratio: '16:9',
        }, user.id)
        results.push({
          variant: i + 1,
          image_url: imageResult.image_url,
        })
      }
    } catch (err: any) {
      console.error(`[YouTube Thumbnail] Variant ${i + 1} failed:`, err)
      results.push({
        variant: i + 1,
        image_url: null,
        error: err.message,
      })
    }
  }

  return NextResponse.json({
    thumbnails: results,
    summary: {
      total: results.length,
      success: results.filter(r => r.image_url).length,
    },
  })
}
