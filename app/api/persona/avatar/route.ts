/**
 * POST /api/persona/avatar
 * Upload one or more reference photos for brand persona identity consistency.
 * Supports up to 6 reference images (Gemini optimal is 3-6 angles).
 * Returns storage paths for use as reference images in generation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'

    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]
    
    // Fallback: also check 'avatar' field for backward compat
    if (files.length === 0) {
      const single = formData.get('avatar') as File | null
      if (single) files.push(single)
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    if (files.length > 6) {
      return NextResponse.json({ error: 'Max 6 reference photos' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const uploadedPaths: string[] = []
    const signedUrls: string[] = []

    for (const file of files) {
      if (!allowed.includes(file.type)) {
        return NextResponse.json({ error: `Only JPEG, PNG, or WebP allowed (got ${file.type})` }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Each file max 10MB' }, { status: 400 })
      }

      const ext = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/webp' ? '.webp' : '.png'
      const filename = `persona-${randomUUID()}${ext}`
      const storagePath = `${userId}/persona/${filename}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabase.storage
        .from('ad-creatives')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }

      const fullPath = `ad-creatives/${storagePath}`
      uploadedPaths.push(fullPath)

      const { data: signedUrlData } = await supabase.storage
        .from('ad-creatives')
        .createSignedUrl(storagePath, 3600)
      if (signedUrlData?.signedUrl) signedUrls.push(signedUrlData.signedUrl)
    }

    // Update brand_persona with reference_images array (JSON) + keep avatar_url for backward compat
    const { data: existing } = await supabase.from('brand_persona').select('id, reference_images').limit(1).maybeSingle()
    const existingImages: string[] = (existing?.reference_images as string[]) || []
    const mergedImages = [...existingImages, ...uploadedPaths].slice(0, 6) // cap at 6

    if (existing?.id) {
      await supabase.from('brand_persona').update({
        avatar_url: mergedImages[0], // primary = first image
        reference_images: mergedImages,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    }

    return NextResponse.json({
      reference_images: mergedImages,
      signed_urls: signedUrls,
      count: mergedImages.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
