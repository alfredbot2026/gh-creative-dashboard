import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { compositeTextOnImage, type TextOverlayOptions } from '@/lib/studio/text-compositor'

export const maxDuration = 30

/**
 * Re-composite a single slide with updated text or style.
 * Accepts either an uploaded image or a storage_path to the original background.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const imageFile = formData.get('image') as File | null
  const storagePath = formData.get('storagePath') as string | null
  const text = formData.get('text') as string || ''
  const fontFamily = formData.get('fontFamily') as string || 'Inter, Helvetica, Arial, sans-serif'
  const textColor = formData.get('textColor') as string || '#FFFFFF'
  const overlayOpacity = parseFloat(formData.get('overlayOpacity') as string || '0.4')
  const position = (formData.get('position') as string || 'center') as 'top' | 'center' | 'bottom'
  const fontWeight = (formData.get('fontWeight') as string || 'bold') as 'normal' | 'bold' | 'black'
  const outputPath = formData.get('outputPath') as string | null

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  try {
    // Get the background image
    let imageBuffer: Buffer

    if (imageFile) {
      imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    } else if (storagePath) {
      // Download from Supabase Storage
      // storagePath might include the bucket prefix, strip it
      const cleanPath = storagePath.replace(/^ad-creatives\//, '')
      const { data, error } = await supabase.storage.from('ad-creatives').download(cleanPath)
      if (error || !data) {
        return NextResponse.json({ error: 'Failed to load background image' }, { status: 400 })
      }
      imageBuffer = Buffer.from(await data.arrayBuffer())
    } else {
      return NextResponse.json({ error: 'Provide an image or storagePath' }, { status: 400 })
    }

    const options: TextOverlayOptions = {
      text,
      fontFamily,
      textColor,
      overlayOpacity,
      position,
      fontWeight,
      textShadow: true,
    }

    const result = await compositeTextOnImage(imageBuffer, options)

    // Upload if outputPath provided
    if (outputPath) {
      const { error: uploadErr } = await supabase.storage
        .from('ad-creatives')
        .upload(outputPath, result.buffer, {
          contentType: 'image/png',
          upsert: true,
        })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      const { data: urlData } = await supabase.storage.from('ad-creatives').createSignedUrl(outputPath, 3600)

      return NextResponse.json({
        image_url: urlData?.signedUrl || '',
        storage_path: outputPath,
        width: result.width,
        height: result.height,
      })
    }

    // Return as base64 if no output path
    return NextResponse.json({
      image_base64: result.buffer.toString('base64'),
      width: result.width,
      height: result.height,
    })
  } catch (err: any) {
    console.error('[studio/carousel/recomposite]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
