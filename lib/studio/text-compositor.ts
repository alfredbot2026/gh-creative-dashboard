/**
 * Text Compositor — overlays text onto images using sharp + SVG.
 * Used for text carousel slides (same background image, different text per slide).
 */
import sharp from 'sharp'

export interface TextOverlayOptions {
  text: string
  /** Font family (must be system/web-safe or bundled) */
  fontFamily?: string
  /** Font size in px (auto-calculated if not provided) */
  fontSize?: number
  /** Font weight */
  fontWeight?: 'normal' | 'bold' | 'black'
  /** Text color (CSS color string) */
  textColor?: string
  /** Text position */
  position?: 'top' | 'center' | 'bottom'
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right'
  /** Background overlay darkness 0-1 (0 = none, 1 = fully black) */
  overlayOpacity?: number
  /** Padding from edges (percentage of width) */
  padding?: number
  /** Add text shadow for readability */
  textShadow?: boolean
  /** Max width for text area (percentage of image width, 0-1) */
  maxTextWidth?: number
}

export interface CompositeResult {
  buffer: Buffer
  width: number
  height: number
}

const DEFAULT_OPTIONS: Required<TextOverlayOptions> = {
  text: '',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  fontSize: 0, // auto
  fontWeight: 'bold',
  textColor: '#FFFFFF',
  position: 'center',
  textAlign: 'center',
  overlayOpacity: 0.4,
  padding: 0.08,
  textShadow: true,
  maxTextWidth: 0.85,
}

/**
 * Escape XML special characters for SVG
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Word-wrap text to fit within a max width.
 * Returns array of lines.
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine += (currentLine ? ' ' : '') + word
    }
  }
  if (currentLine) lines.push(currentLine.trim())
  return lines
}

/**
 * Calculate optimal font size based on image dimensions and text length.
 */
function calculateFontSize(width: number, height: number, text: string): number {
  // Base size relative to image width
  const baseSize = Math.round(width * 0.065)
  // Reduce for longer text
  if (text.length > 200) return Math.round(baseSize * 0.7)
  if (text.length > 100) return Math.round(baseSize * 0.85)
  return baseSize
}

/**
 * Estimate characters per line based on font size and max width.
 * Very approximate — SVG will handle final rendering.
 */
function estimateCharsPerLine(fontSize: number, maxWidth: number): number {
  const avgCharWidth = fontSize * 0.52
  return Math.floor(maxWidth / avgCharWidth)
}

/**
 * Composite text onto an image.
 */
export async function compositeTextOnImage(
  imageBuffer: Buffer,
  options: TextOverlayOptions
): Promise<CompositeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata()
  const width = metadata.width || 1080
  const height = metadata.height || 1080

  // Calculate dimensions
  const fontSize = opts.fontSize || calculateFontSize(width, height, opts.text)
  const paddingPx = Math.round(width * opts.padding)
  const maxTextWidthPx = Math.round(width * opts.maxTextWidth)
  const charsPerLine = estimateCharsPerLine(fontSize, maxTextWidthPx)
  const lineHeight = fontSize * 1.35

  // Word wrap
  const lines = wrapText(opts.text, charsPerLine)
  const textBlockHeight = lines.length * lineHeight

  // Calculate Y position
  let startY: number
  switch (opts.position) {
    case 'top':
      startY = paddingPx + fontSize
      break
    case 'bottom':
      startY = height - paddingPx - textBlockHeight
      break
    case 'center':
    default:
      startY = (height - textBlockHeight) / 2 + fontSize * 0.3
  }

  // Text anchor for alignment
  let textAnchor: string
  let xPos: number
  switch (opts.textAlign) {
    case 'left':
      textAnchor = 'start'
      xPos = paddingPx
      break
    case 'right':
      textAnchor = 'end'
      xPos = width - paddingPx
      break
    case 'center':
    default:
      textAnchor = 'middle'
      xPos = width / 2
  }

  // Build SVG text lines
  const shadowFilter = opts.textShadow
    ? `<filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.7"/></filter>`
    : ''
  const filterAttr = opts.textShadow ? ' filter="url(#shadow)"' : ''

  const textLines = lines
    .map((line, i) => {
      const y = Math.round(startY + i * lineHeight)
      return `<text x="${xPos}" y="${y}" font-family="${opts.fontFamily}" font-size="${fontSize}" font-weight="${opts.fontWeight}" fill="${opts.textColor}" text-anchor="${textAnchor}"${filterAttr}>${escapeXml(line)}</text>`
    })
    .join('\n    ')

  // Dark overlay rect
  const overlayRect =
    opts.overlayOpacity > 0
      ? `<rect width="${width}" height="${height}" fill="black" opacity="${opts.overlayOpacity}"/>`
      : ''

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${shadowFilter}</defs>
  ${overlayRect}
  ${textLines}
</svg>`

  // Composite
  const result = await sharp(imageBuffer)
    .resize(width, height, { fit: 'cover' })
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer()

  return { buffer: result, width, height }
}

/**
 * Generate all slides for a text carousel.
 * Same background image, different text per slide.
 */
export async function generateCarouselSlides(
  backgroundImage: Buffer,
  slideTexts: string[],
  styleOptions: Omit<TextOverlayOptions, 'text'>
): Promise<CompositeResult[]> {
  const results: CompositeResult[] = []

  for (const text of slideTexts) {
    const result = await compositeTextOnImage(backgroundImage, {
      ...styleOptions,
      text,
    })
    results.push(result)
  }

  return results
}
