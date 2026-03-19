import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCarousel } from '@/lib/create/carousel-generator'
import type { CarouselGenerationRequest } from '@/lib/create/carousel-types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

  try {
    const body: CarouselGenerationRequest = await request.json()

    // Validate required fields
    if (!body.product_name) {
      return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
    }
    
    // Default slide_count if missing or out of bounds
    if (!body.slide_count || body.slide_count < 3 || body.slide_count > 7) {
      body.slide_count = 5
    }

    if (!body.objective || !body.platform || !body.style) {
      return NextResponse.json(
        { error: 'objective, platform, and style are required' },
        { status: 400 }
      )
    }

    // Default offer_details if not provided
    if (!body.offer_details) {
      body.offer_details = ''
    }

    // Call carousel-generator
    const result = await generateCarousel(body)

    // Save to content_items
    const { error: dbError } = await supabase
      .from('content_items')
      .insert({
        tenant_id: userId,
        user_id: userId,
        title: `${body.product_name} — Carousel (${body.slide_count} slides)`,
        content_type: 'carousel',
        platform: body.platform,
        script_data: result as any,
        status: 'draft'
      })

    if (dbError) {
      console.error('Failed to save carousel to content_items:', dbError)
      // Return generated result anyway
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Carousel generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Carousel generation failed' },
      { status: 500 }
    )
  }
}
