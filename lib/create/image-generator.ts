/**
 * Image Generator — uses Gemini API directly (no Python dependency).
 * Works on both local dev and Vercel.
 */
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { ImageGenerationRequest, ImageGenerationResponse } from './image-types'
import type { BrandStyleGuide } from '@/lib/brand/types'

const { GoogleGenAI, Modality } = require('@google/genai')

/**
 * Build brand-aware prompt prefix from style guide.
 */
function buildBrandPrefix(brand: BrandStyleGuide, style: string): string {
  const parts: string[] = []

  if (brand.photography_style) {
    parts.push(`Photography style: ${brand.photography_style}.`)
  }
  if (brand.color_palette?.length) {
    const colors = brand.color_palette.map((c: any) => typeof c === 'string' ? c : c.hex || c.name).filter(Boolean)
    if (colors.length) parts.push(`Brand colors: ${colors.join(', ')}.`)
  }
  // Visual mood not in type — skip

  const styleContext: Record<string, string> = {
    product_shot: 'Professional product photography. Clean background, even lighting. Product is the hero.',
    lifestyle: 'Lifestyle photography. Product naturally in a real-life Filipino home setting. Warm, inviting.',
    promotional: 'Promotional social media graphic. Bold, eye-catching. Clean layout with space for text overlay.',
    faceless_quote: 'Beautiful background image with no people. Soft focus, warm tones. Space for text overlay.',
    creator_featured: 'The creator/founder is featured prominently. Warm, approachable, in her home workspace.',
  }

  if (styleContext[style]) {
    parts.push(styleContext[style])
  }

  return parts.join(' ')
}

/**
 * Generate an image using Gemini's native image generation.
 */
export async function generateAdImage(
  request: ImageGenerationRequest,
  userId: string
): Promise<ImageGenerationResponse> {
  const supabase = await createClient()

  // 1. Load brand style guide
  const { data: brand } = await supabase
    .from('brand_style_guide')
    .select('*')
    .limit(1)
    .single()

  // 2. Load brand persona for identity consistency
  let identityPrompt = ''
  if (request.style !== 'faceless_quote') {
    const { data: persona } = await supabase
      .from('brand_persona')
      .select('appearance')
      .limit(1)
      .maybeSingle()

    if (persona?.appearance) {
      identityPrompt = `IMPORTANT: The person in this image is a Filipino woman with these exact features: ${persona.appearance}. `
    }
  }

  // 3. Build full prompt
  const brandPrefix = brand ? buildBrandPrefix(brand as BrandStyleGuide, request.style) : ''
  const fullPrompt = `${identityPrompt}${brandPrefix} ${request.prompt}`.trim()

  // 4. Generate via Gemini API
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const ai = new GoogleGenAI({ apiKey })

  const RETRY_DELAYS = [0, 5_000, 15_000]
  let lastError: Error | null = null
  let imageBuffer: Buffer | null = null

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      console.log(`[image-generator] Retry ${attempt}/${RETRY_DELAYS.length - 1}...`)
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: `Generate an image: ${fullPrompt}`,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      })

      const parts = response.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64')
          break
        }
      }

      if (imageBuffer) {
        lastError = null
        break
      } else {
        lastError = new Error('Gemini returned no image data')
      }
    } catch (err: any) {
      const msg = err.message || String(err)
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
        lastError = new Error(`Gemini unavailable: ${msg.substring(0, 200)}`)
        continue
      }
      throw err
    }
  }

  if (!imageBuffer || lastError) {
    throw new Error(lastError?.message || 'Image generation failed — no image returned')
  }

  // 5. Upload to Supabase Storage
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${randomUUID()}.png`
  const storagePath = `${userId}/${dateStr}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('ad-creatives')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`)
  }

  // 6. Get signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('ad-creatives')
    .createSignedUrl(storagePath, 3600)

  if (signedUrlError || !signedUrlData) {
    throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
  }

  return {
    image_url: signedUrlData.signedUrl,
    storage_path: `ad-creatives/${storagePath}`,
    prompt_used: fullPrompt,
    model: 'gemini-3.1-flash-image-preview',
  }
}
