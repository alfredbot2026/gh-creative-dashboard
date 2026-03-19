import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { ImageGenerationRequest, ImageGenerationResponse } from './image-types'
import type { BrandStyleGuide } from '@/lib/brand/types'

const execFileAsync = promisify(execFile)

const NANO_BANANA_SCRIPT =
  '/home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py'

/**
 * Build a brand-prefix prompt from the style guide.
 */
function buildBrandPrefix(brand: BrandStyleGuide, style: ImageGenerationRequest['style']): string {
  const paletteStr = brand.color_palette
    .map((c) => `${c.name} (${c.hex}, ${c.usage})`)
    .join(', ')

  let prefix = `BRAND GUIDE: Use these brand colors: ${paletteStr}. Photography style: ${brand.photography_style}. Product styling: ${brand.product_styling_rules}.`

  if (style === 'creator_featured') {
    prefix += ` Creator: ${brand.creator_description}.`
    if (brand.wardrobe_notes) {
      prefix += ` Wardrobe: ${brand.wardrobe_notes}.`
    }
  }

  if (style === 'faceless_quote') {
    prefix += ` Use brand colors with clean typography. No human faces.`
    if (brand.typography && Object.keys(brand.typography).length > 0) {
      const typographyStr = Object.entries(brand.typography)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      prefix += ` Typography: ${typographyStr}.`
    }
  }

  return prefix
}

/**
 * Download a file from Supabase Storage to a local temp path.
 * Returns the local temp file path.
 */
async function downloadFromStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
  tempDir: string
): Promise<string> {
  const [bucket, ...rest] = storagePath.split('/')
  const objectPath = rest.join('/')

  const { data, error } = await supabase.storage.from(bucket).download(objectPath)
  if (error || !data) {
    throw new Error(`Failed to download reference image ${storagePath}: ${error?.message}`)
  }

  const ext = path.extname(storagePath) || '.png'
  const localPath = path.join(tempDir, `${randomUUID()}${ext}`)
  const buffer = Buffer.from(await data.arrayBuffer())
  await fs.writeFile(localPath, buffer)
  return localPath
}

/**
 * Main image generation function.
 */
export async function generateAdImage(
  request: ImageGenerationRequest,
  userId: string
): Promise<ImageGenerationResponse> {
  const supabase = await createClient()

  // 1. Load brand style guide — mandatory
  const { data: brand, error: brandError } = await supabase
    .from('brand_style_guide')
    .select('*')
    .limit(1)
    .single()

  if (brandError || !brand) {
    console.warn('[image-generator] Brand style guide not found — using defaults')
  }

  // 1b. Load brand persona for identity-consistent reference images
  // Auto-inject for ANY style that features a person (not just creator_featured)
  let personaRefImages: string[] = []
  let identityLockPrompt = ''
  if (request.style !== 'faceless_quote') {
    const { data: persona } = await supabase
      .from('brand_persona')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (persona) {
      // Use reference_images array (up to 6 photos) for identity consistency
      const refs = (persona.reference_images as string[] | null) || []
      if (refs.length > 0) {
        personaRefImages = refs
      } else if (persona.avatar_url) {
        // Fallback: single avatar
        personaRefImages = [persona.avatar_url]
      }
      if (personaRefImages.length > 0) {
        // Identity lock prompt — tells Gemini to preserve exact facial features
        identityLockPrompt = `CRITICAL IDENTITY REQUIREMENT: The person in this image must have the EXACT same facial features as the person shown in the reference photos. Maintain identical: eye shape, eye size, eye spacing, nose shape, nose bridge, lip shape, jawline contour, cheekbone structure, skin tone, skin texture, face proportions, and hair style. Do NOT generate a new face — reproduce the reference person's face exactly. All facial features must remain identical to the reference, including eyelid thickness, iris proportion, and expression style.`
      }
    }
  }

  // 2. Build full prompt with identity lock
  const brandPrefix = brand ? buildBrandPrefix(brand as BrandStyleGuide, request.style) : ''
  const fullPrompt = identityLockPrompt
    ? `${identityLockPrompt}\n\n${brandPrefix} ${request.prompt}`
    : `${brandPrefix} ${request.prompt}`

  // 3. Create temp directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gh-creative-'))
  const outputPath = path.join(tempDir, `output-${randomUUID()}.png`)

  let localRefPaths: string[] = []

  try {
    // 4. Download reference images if provided
    const allRefImages = [...(request.reference_images || [])]
    // Inject ALL persona reference photos for identity consistency
    if (personaRefImages.length > 0) {
      allRefImages.unshift(...personaRefImages)
    }
    if (allRefImages.length > 0) {
      localRefPaths = await Promise.all(
        allRefImages.map((refPath) =>
          downloadFromStorage(supabase, refPath, tempDir)
        )
      )
    }

    // 5. Build args for nano-banana-pro script
    const args: string[] = [
      'run',
      NANO_BANANA_SCRIPT,
      '--prompt', fullPrompt,
      '--filename', outputPath,
      '--resolution', '2K',
      '--aspect-ratio', request.aspect_ratio,
    ]

    for (const refPath of localRefPaths) {
      args.push('-i', refPath)
    }

    // 6. Execute via uv (no shell — execFile)
    const { stdout, stderr } = await execFileAsync('uv', args, {
      env: { ...process.env },
      timeout: 180_000, // 3 min timeout (extra time for multi-reference identity lock)
    })

    if (stderr && stderr.trim()) {
      console.warn('[image-generator] stderr:', stderr.trim())
    }
    if (stdout) {
      console.log('[image-generator] stdout:', stdout.trim())
    }

    // 7. Verify output file exists
    await fs.access(outputPath)

    // 8. Upload to Supabase Storage: ad-creatives/{user_id}/{YYYY-MM-DD}/{uuid}.png
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `${randomUUID()}.png`
    const storagePath = `${userId}/${dateStr}/${filename}`

    const fileBuffer = await fs.readFile(outputPath)
    const { error: uploadError } = await supabase.storage
      .from('ad-creatives')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Failed to upload image to storage: ${uploadError.message}`)
    }

    // 9. Get signed URL (bucket is private — signed URL valid for 1 hour)
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
      model: 'gemini-3-pro-image-preview',
    }
  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup
    }
  }
}
