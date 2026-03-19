/**
 * POST /api/persona/avatar
 * Upload a brand persona avatar/reference photo to Supabase storage.
 * Returns the storage path for use as a reference image in generation.
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
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, or WebP allowed' }, { status: 400 })
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/webp' ? '.webp' : '.png'
    const filename = `persona-${randomUUID()}${ext}`
    const storagePath = `${userId}/persona/${filename}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('ad-creatives')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get signed URL for preview
    const { data: signedUrlData } = await supabase.storage
      .from('ad-creatives')
      .createSignedUrl(storagePath, 3600)

    // Update brand_persona with avatar path
    const fullStoragePath = `ad-creatives/${storagePath}`
    const { data: existing } = await supabase.from('brand_persona').select('id').limit(1).maybeSingle()
    if (existing?.id) {
      await supabase.from('brand_persona').update({ avatar_url: fullStoragePath, updated_at: new Date().toISOString() }).eq('id', existing.id)
    }

    return NextResponse.json({
      avatar_url: fullStoragePath,
      signed_url: signedUrlData?.signedUrl || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
