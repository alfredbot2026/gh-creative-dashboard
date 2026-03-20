/**
 * Test Route: Image Consistency
 * 
 * GET /api/test/image-consistency
 *   Generates 3 images of Grace in different scenes using multi-turn session.
 *   Returns all 3 as base64 data URLs + anchor info.
 *   No auth required (dev/test only).
 * 
 * GET /api/test/image-consistency?scene=custom+scene+prompt
 *   Generate a single image with a custom scene.
 * 
 * GET /api/test/image-consistency?forceNew=true
 *   Force new session (ignores cache).
 * 
 * DELETE /api/test/image-consistency
 *   Deletes the anchor to force regeneration.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateSession, invalidateSession } from '@/lib/create/session-manager'
import { getAnchorInfo, deleteAnchor, getAnchor } from '@/lib/create/anchor-store'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const TEST_USER = 'test-consistency'

const TEST_SCENES = [
  'Grace is sitting at a wooden desk, journaling in a paper planner. She is wearing a casual cream blouse. Warm morning light from a window.',
  'Grace is in a bright kitchen, holding a freshly made cup of coffee, smiling at the camera. She is wearing a soft gray t-shirt. Natural daylight.',
  'Grace is outdoors in a park, sitting on a bench reading a book. She is wearing a light blue casual top. Golden hour, soft bokeh background.',
]

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  const forceNew = request.nextUrl.searchParams.get('forceNew') === 'true'
  const customScene = request.nextUrl.searchParams.get('scene')

  if (action === 'anchor') {
    const info = await getAnchorInfo()
    const anchor = await getAnchor()
    return NextResponse.json({
      ...info,
      image_url: anchor ? `data:image/png;base64,${anchor.toString('base64')}` : null,
    })
  }

  const scenes = customScene ? [customScene] : TEST_SCENES

  try {
    console.log('[Test] Starting image consistency test...')
    const startTime = Date.now()

    if (forceNew) {
      invalidateSession(TEST_USER)
    }

    const session = await getOrCreateSession(TEST_USER, forceNew)
    const anchorInfo = await getAnchorInfo()

    const results = []
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      console.log(`[Test] Generating scene ${i + 1}/${scenes.length}: ${scene.substring(0, 60)}...`)
      const sceneStart = Date.now()

      try {
        const imageBuffer = await session.generateScene(scene)
        const base64 = imageBuffer.toString('base64')

        results.push({
          scene,
          image_url: `data:image/png;base64,${base64}`,
          size_bytes: imageBuffer.length,
          generation_ms: Date.now() - sceneStart,
          success: true,
        })
      } catch (err: any) {
        results.push({
          scene,
          image_url: null,
          error: err.message,
          generation_ms: Date.now() - sceneStart,
          success: false,
        })
      }
    }

    return NextResponse.json({
      status: 'complete',
      total_ms: Date.now() - startTime,
      anchor: anchorInfo,
      images: results,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    })
  } catch (err: any) {
    console.error('[Test] Image consistency test failed:', err)
    const anchorInfo = await getAnchorInfo()
    return NextResponse.json(
      { error: err.message, anchor: anchorInfo },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  const deleted = await deleteAnchor()
  invalidateSession(TEST_USER)
  return NextResponse.json({
    deleted,
    message: deleted
      ? 'Anchor deleted — will regenerate on next test run'
      : 'No anchor found to delete',
  })
}
