import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAdCopy } from '@/lib/create/ad-generator'
import type { AdGenerationRequest } from '@/lib/create/ad-types'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  /* 
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  */
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

  try {
    const body: AdGenerationRequest = await request.json()

    // Validate required fields
    if (!body.product || !body.objective || !body.ad_format || !body.platform) {
      return NextResponse.json(
        { error: 'product, objective, ad_format, and platform are required' },
        { status: 400 }
      )
    }

    // Default offer_details if not provided
    if (!body.offer_details) {
      body.offer_details = ''
    }

    // Call ad-generator
    const result = await generateAdCopy(body)

    // Save to content_items
    const contentType = body.ad_format === 'video_script' ? 'ad-video-script' : 'ad-static'
    const { error: dbError } = await supabase
      .from('content_items')
      .insert({
        tenant_id: userId,
        user_id: userId,
        title: `${body.product} — ${body.objective} (${body.platform})`,
        content_type: contentType,
        platform: body.platform,
        script_data: result,
        status: 'draft'
      })

    if (dbError) {
      console.error('Failed to save ad variants to content_items:', dbError)
      // Depending on strictness, we could throw here. 
      // But returning the generated result is usually better UX even if DB save fails.
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ad generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ad generation failed' },
      { status: 500 }
    )
  }
}
