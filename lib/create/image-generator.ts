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
    throw new Error('Brand style guide not found. Please configure it in Settings before generating images.')
  }

  // 2. Build full prompt
  const brandPrefix = buildBrandPrefix(brand as BrandStyleGuide, request.style)
  const fullPrompt = `${brandPrefix} ${request.prompt}`

  // 3. Create temp directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gh-creative-'))
  const outputPath = path.join(tempDir, `output-${randomUUID()}.png`)

  let localRefPaths: string[] = []

  try {
    // 4. Download reference images if provided
    if (request.reference_images && request.reference_images.length > 0) {
      localRefPaths = await Promise.all(
        request.reference_images.map((refPath) =>
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
      timeout: 120_000, // 2 min timeout
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
