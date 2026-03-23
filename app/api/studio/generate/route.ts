import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAdImage } from '@/lib/create/image-generator'
import type { ImageStyle, AspectRatio } from '@/lib/create/image-types'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const prompt = formData.get('prompt') as string || ''
  const aspectRatio = (formData.get('aspectRatio') as string) || '1:1'
  const includeGrace = formData.get('includeGrace') === 'true'
  const stylePreset = formData.get('stylePreset') as string | null
  const imageFile = formData.get('image') as File | null

  if (!prompt.trim() && !imageFile) {
    return NextResponse.json({ error: 'Provide a prompt or upload an image' }, { status: 400 })
  }

  // Build the full prompt
  let fullPrompt = prompt.trim()

  // Add style context
  const styleContext: Record<string, string> = {
    product: 'Professional product photography. Clean, styled background. Even lighting. The product is the hero.',
    lifestyle: 'Lifestyle photography. Product naturally integrated into a real-life setting. Warm, inviting atmosphere.',
    promo: 'Promotional graphic. Bold, eye-catching. Designed for social media ads. Clean layout with space for text overlay.',
    bts: 'Behind-the-scenes candid shot. Workspace, craft tools, work-in-progress. Authentic, unposed feel.',
  }
  if (stylePreset && styleContext[stylePreset]) {
    fullPrompt = `${styleContext[stylePreset]} ${fullPrompt}`
  }

  // Upload product image to temp storage if provided
  let referenceImages: string[] = []
  if (imageFile) {
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const ext = imageFile.name.split('.').pop() || 'jpg'
    const tempPath = `${user.id}/temp/studio-${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('ad-creatives')
      .upload(tempPath, buffer, { contentType: imageFile.type, upsert: true })

    if (!uploadErr) {
      referenceImages.push(`ad-creatives/${tempPath}`)
    }
  }

  try {
    const result = await generateAdImage(
      {
        prompt: fullPrompt,
        style: (includeGrace ? 'creator_featured' : 'product_shot') as ImageStyle,
        aspect_ratio: aspectRatio as AspectRatio,
        reference_images: referenceImages,
      },
      user.id
    )

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[studio/generate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
