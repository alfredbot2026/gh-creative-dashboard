import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateCarouselSlides, type TextOverlayOptions } from '@/lib/studio/text-compositor'
import { generateJSON } from '@/lib/llm/client'
import { randomUUID } from 'crypto'

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const maxDuration = 120

interface CarouselRequest {
  topic?: string
  structureSlug?: string
  slideCount?: number
  style?: Omit<TextOverlayOptions, 'text'>
}

/**
 * Generate text content for carousel slides using AI.
 */
async function generateSlideTexts(
  topic: string,
  slideCount: number,
  structureSlug?: string
): Promise<string[]> {
  const structureHint = structureSlug
    ? `Follow the "${structureSlug}" content structure.`
    : 'Use a compelling narrative arc: Hook → Problem → Insight → Value → CTA.'

  const prompt = `Generate exactly ${slideCount} text slides for an Instagram carousel about: "${topic}"

${structureHint}

Rules:
- Slide 1: Strong hook that stops scrolling (question, bold claim, or curiosity gap)
- Middle slides: Deliver value, one idea per slide
- Last slide: Clear CTA (follow, save, share, link in bio)
- Each slide: 1-3 short sentences max (will be text overlay on an image)
- Keep it conversational, direct, no fluff
- No emojis
- Language: natural Taglish (Filipino-English mix) or pure English depending on topic

Return a JSON object with a "slides" array of strings.`

  const { data } = await generateJSON<{ slides: string[] }>(
    'You are a viral content writer. Output strict JSON only.',
    prompt
  )

  return data.slides.slice(0, slideCount)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const imageFile = formData.get('image') as File | null
  const topic = formData.get('topic') as string || ''
  const structureSlug = formData.get('structureSlug') as string | null
  const slideCount = parseInt(formData.get('slideCount') as string || '7', 10)
  const customSlides = formData.get('customSlides') as string | null // JSON array of pre-written texts
  const fontFamily = formData.get('fontFamily') as string || 'Inter, Helvetica, Arial, sans-serif'
  const textColor = formData.get('textColor') as string || '#FFFFFF'
  const overlayOpacity = parseFloat(formData.get('overlayOpacity') as string || '0.4')
  const position = (formData.get('position') as string || 'center') as 'top' | 'center' | 'bottom'
  const fontWeight = (formData.get('fontWeight') as string || 'bold') as 'normal' | 'bold' | 'black'
  const textStyle = (formData.get('textStyle') as string || 'classic') as 'classic' | 'highlight' | 'outline' | 'neon' | 'typewriter' | 'strong'
  const highlightColor = formData.get('highlightColor') as string || '#000000'

  if (!imageFile) {
    return NextResponse.json({ error: 'Background image is required' }, { status: 400 })
  }
  if (!topic && !customSlides) {
    return NextResponse.json({ error: 'Provide a topic or custom slide texts' }, { status: 400 })
  }

  try {
    // Get image buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

    // Get slide texts — either custom or AI-generated
    let texts: string[]
    if (customSlides) {
      texts = JSON.parse(customSlides)
    } else {
      texts = await generateSlideTexts(topic, slideCount, structureSlug || undefined)
    }

    // Generate all composited slides
    const styleOptions: Omit<TextOverlayOptions, 'text'> = {
      fontFamily,
      textColor,
      overlayOpacity,
      position,
      fontWeight,
      textShadow: true,
      textStyle,
      highlightColor,
    }

    const slides = await generateCarouselSlides(imageBuffer, texts, styleOptions)

    // Upload all slides to Supabase Storage (use service client for reliable storage access)
    const serviceClient = createServiceClient()
    const carouselId = randomUUID()
    const slideResults = await Promise.all(
      slides.map(async (slide, i) => {
        const storagePath = `${user.id}/carousel/${carouselId}/slide-${i + 1}.png`
        const { error: uploadErr } = await serviceClient.storage
          .from('ad-creatives')
          .upload(storagePath, slide.buffer, {
            contentType: 'image/png',
            upsert: true,
          })

        if (uploadErr) throw new Error(`Upload failed for slide ${i + 1}: ${uploadErr.message}`)

        const { data: urlData } = await serviceClient.storage
          .from('ad-creatives')
          .createSignedUrl(storagePath, 3600) // 1 hour

        return {
          slide_number: i + 1,
          text: texts[i],
          image_url: urlData?.signedUrl || '',
          storage_path: storagePath,
          width: slide.width,
          height: slide.height,
        }
      })
    )

    return NextResponse.json({
      carousel_id: carouselId,
      slides: slideResults,
      texts,
      style: styleOptions,
    })
  } catch (err: any) {
    console.error('[studio/carousel/text]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
