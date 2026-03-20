/**
 * Image Generator — Gemini REST API (serverless-compatible)
 * 
 * Replaces the Python shell-out approach with direct API calls.
 * Works on Vercel, Cloudflare Workers, etc.
 */
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getGraceReferenceImages } from './reference-images'
import type { ImageGenerationRequest, ImageGenerationResponse } from './image-types'
import type { BrandStyleGuide } from '@/lib/brand/types'

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'
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

  // Add reference images as inline data (supports both URLs and data: URIs)
  for (const url of referenceImageUrls) {
    try {
      if (url.startsWith('data:')) {
        // Data URL — extract base64 directly
        const match = url.match(/^data:([^;]+);base64,(.+)$/)
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            }
          })
        }
      } else {
        // Remote URL — fetch and convert
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
      }
    } catch (e) {
      console.warn(`Failed to load reference image: ${url.substring(0, 80)}`, e)
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
  request: ImageGenerationRequest,
  userId?: string
): Promise<ImageGenerationResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const supabase = await createClient()
  
  // Use provided userId (from API route that already authed) or fall back to auth check
  let resolvedUserId = userId
  if (!resolvedUserId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      resolvedUserId = user?.id || 'anonymous'
    } catch {
      resolvedUserId = 'anonymous'
    }
  }

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

  // 3. Build prompt — Google's recommended formula:
  // [Reference images] + [Relationship instruction] + [New scenario]
  // Positive framing only, no negative instructions
  let brandPrefix = ''
  if (brand) {
    brandPrefix = buildBrandPrefix(brand as any, request.style)
  }
  
  let fullPrompt = ''
  if (request.style !== 'faceless_quote' && persona) {
    // Creator-featured/lifestyle: include Grace identity (positive framing)
    fullPrompt = `This is Grace, a Filipina woman in her early-to-mid 30s with a round full face, soft cheeks, light-medium warm skin, black long hair, and transparent peach hexagonal glasses.

${brandPrefix}Generate Grace in this scene: ${request.prompt}

Keep her exact appearance from the reference photos. Lifestyle photography, warm natural lighting. No text overlays or UI elements.`
  } else {
    fullPrompt = brandPrefix + request.prompt
  }

  // 4. Get reference image URLs — try Supabase storage, fall back to local files
  const referenceImageUrls: string[] = []
  
  if (request.style !== 'faceless_quote') {
    // Try Supabase storage first
    if (persona) {
      const refImages = (persona.reference_images as string[]) || []
      if (persona.avatar_url) refImages.unshift(persona.avatar_url)
      
      for (const storagePath of refImages.slice(0, 2)) {
        const { data: signedData } = await supabase.storage
          .from('ad-creatives')
          .createSignedUrl(storagePath, 3600)
        if (signedData?.signedUrl) {
          referenceImageUrls.push(signedData.signedUrl)
        }
      }
    }
    
    // If no Supabase images resolved, use local reference files as data URLs
    if (referenceImageUrls.length === 0) {
      const localRefs = getGraceReferenceImages()
      for (const buf of localRefs.slice(0, 2)) {
        const base64 = buf.toString('base64')
        referenceImageUrls.push(`data:image/jpeg;base64,${base64}`)
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

  // 6. Return as base64 data URL for immediate display
  // Storage upload deferred to save action (needs proper auth context)
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64}`
  
  // Try to upload to storage (best effort — may fail without auth)
  let storagePath = ''
  try {
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `${randomUUID()}.png`
    storagePath = `ad-creatives/${resolvedUserId}/${dateStr}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('ad-creatives')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.warn(`[Image Gen] Storage upload failed (non-fatal): ${uploadError.message}`)
      storagePath = ''
    }
  } catch (e) {
    console.warn('[Image Gen] Storage upload error (non-fatal):', e)
    storagePath = ''
  }

  return {
    image_url: dataUrl,
    storage_path: storagePath,
    prompt_used: fullPrompt,
    model: GEMINI_MODEL,
  }
}
