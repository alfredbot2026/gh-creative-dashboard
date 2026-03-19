import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCarouselImages } from '@/lib/create/carousel-image-generator'
import type { CarouselSlide } from '@/lib/create/carousel-types'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

  try {
    const body: { slides: CarouselSlide[]; carousel_theme: string } = await request.json()

    // Validate
    if (!body.slides || !Array.isArray(body.slides) || body.slides.length === 0) {
      return NextResponse.json(
        { error: 'slides array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!body.carousel_theme) {
      return NextResponse.json(
        { error: 'carousel_theme is required' },
        { status: 400 }
      )
    }

    const results = await generateCarouselImages({
      slides: body.slides,
      carousel_theme: body.carousel_theme,
      userId,
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Carousel image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Carousel image generation failed' },
      { status: 500 }
    )
  }
}
