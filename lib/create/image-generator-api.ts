/**
 * Image Generator — Gemini REST API (serverless-compatible)
 * 
 * Replaces the Python shell-out approach with direct API calls.
 * Works on Vercel, Cloudflare Workers, etc.
 */
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { ImageGenerationRequest, ImageGenerationResponse } from './image-types'
import type { BrandStyleGuide } from '@/lib/brand/types'

const GEMINI_MODEL = 'gemini-3-pro-image-preview'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const MAX_RETRIES = 4
const RETRY_DELAYS = [0, 5000, 15000, 30000]

function buildBrandPrefix(brand: BrandStyleGuide, style: ImageGenerationRequest['style']): string {
  const paletteStr = brand.color_palette
    ?.map((c: any) => `${c.name} (${c.hex})`).join(', ') || ''
  const photoStyle = brand.photography_style || ''

  let prefix = ''
  if (paletteStr) prefix += `Brand colors: ${paletteStr}. `
  if (photoStyle) prefix += `Photography style: ${photoStyle}. `

  if (style === 'creator_featured' || style === 'lifestyle') {
    prefix += 'Feature the brand creator/founder prominently. '
  }

  return prefix
}

async function callGeminiImageAPI(
  prompt: string,
  referenceImageUrls: string[],
  apiKey: string,
  aspectRatio: string = '1:1',
): Promise<Buffer> {
  // Build the content parts
  const parts: any[] = []

  // Add reference images as inline data
  for (const url of referenceImageUrls) {
    try {
      const imgResponse = await fetch(url)
      if (imgResponse.ok) {
        const buffer = await imgResponse.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg'
        parts.push({
          inlineData: {
            mimeType,
            data: base64,
          }
        })
      }
    } catch (e) {
      console.warn(`Failed to fetch reference image: ${url}`, e)
    }
  }

  // Add text prompt
  parts.push({ text: prompt })

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`Gemini image gen retry ${attempt}/${MAX_RETRIES - 1}, waiting ${RETRY_DELAYS[attempt]}ms...`)
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.status === 503 || response.status === 429) {
        const errText = await response.text()
        console.warn(`Gemini ${response.status} on attempt ${attempt + 1}: ${errText.slice(0, 200)}`)
        lastError = new Error(`Gemini ${response.status}: Service unavailable`)
        continue
      }

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 500)}`)
      }

      const data = await response.json()

      // Extract image from response
      const candidates = data.candidates || []
      for (const candidate of candidates) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            return Buffer.from(part.inlineData.data, 'base64')
          }
        }
      }

      throw new Error('Gemini returned no image in response')
    } catch (err: any) {
      if (err.message?.includes('503') || err.message?.includes('429')) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError || new Error('Gemini image generation failed after retries')
}

export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Get brand style guide
  const { data: brand } = await supabase
    .from('brand_style_guide')
    .select('*')
    .limit(1)
    .single()

  // 2. Get persona reference images
  const { data: persona } = await supabase
    .from('brand_persona')
    .select('reference_images, avatar_url')
    .limit(1)
    .single()

  // 3. Build prompt
  let fullPrompt = ''
  if (brand) {
    fullPrompt += buildBrandPrefix(brand as any, request.style)
  }
  fullPrompt += request.prompt

  // 4. Get reference image URLs (signed)
  const referenceImageUrls: string[] = []
  
  if (request.style !== 'faceless_quote' && persona) {
    const refImages = (persona.reference_images as string[]) || []
    if (persona.avatar_url) refImages.unshift(persona.avatar_url)
    
    for (const storagePath of refImages.slice(0, 3)) {
      const { data: signedData } = await supabase.storage
        .from('ad-creatives')
        .createSignedUrl(storagePath, 3600)
      if (signedData?.signedUrl) {
        referenceImageUrls.push(signedData.signedUrl)
      }
    }
  }

  // 5. Generate image via Gemini API
  const imageBuffer = await callGeminiImageAPI(
    fullPrompt,
    referenceImageUrls,
    apiKey,
    request.aspect_ratio,
  )

  // 6. Upload to Supabase Storage
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `${randomUUID()}.png`
  const storagePath = `ad-creatives/${user.id}/${dateStr}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('ad-creatives')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  // 7. Get signed URL for display
  const { data: signedUrl } = await supabase.storage
    .from('ad-creatives')
    .createSignedUrl(storagePath, 3600)

  return {
    image_url: signedUrl?.signedUrl || '',
    storage_path: storagePath,
    prompt_used: fullPrompt,
    model: GEMINI_MODEL,
  }
}
