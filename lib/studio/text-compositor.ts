/**
 * Text Compositor — overlays text onto images using sharp + SVG.
 * Used for text carousel slides (same background image, different text per slide).
 */
import sharp from 'sharp'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

// Register bundled fonts on first use (for Vercel/serverless where system fonts are limited)
let fontsRegistered = false
function ensureFonts() {
  if (fontsRegistered) return
  try {
    const fontDir = path.join(process.cwd(), 'public', 'fonts')
    if (fs.existsSync(fontDir)) {
      const homeDir = process.env.HOME || '/tmp'
      const targetDir = path.join(homeDir, '.fonts')
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
      
      for (const file of fs.readdirSync(fontDir)) {
        if (file.endsWith('.ttf') || file.endsWith('.otf')) {
          const src = path.join(fontDir, file)
          const dst = path.join(targetDir, file)
          if (!fs.existsSync(dst)) fs.copyFileSync(src, dst)
        }
      }
      
      try { execSync('fc-cache -f ' + targetDir, { timeout: 5000 }) } catch { /* best effort */ }
    }
  } catch { /* non-fatal */ }
  fontsRegistered = true
}

/**
 * Instagram-style text modes:
 * - classic: plain text with optional shadow (default)
 * - highlight: colored box behind each line (IG Stories style)
 * - outline: text stroke, no fill
 * - neon: glowing text effect
 * - typewriter: monospace with semi-transparent background
 * - strong: big bold italic serif
 */
export type TextStyle = 'classic' | 'highlight' | 'outline' | 'neon' | 'typewriter' | 'strong'

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
  /** Instagram-style text mode */
  textStyle?: TextStyle
  /** Highlight/background box color (for 'highlight' style) */
  highlightColor?: string
}

export interface CompositeResult {
  buffer: Buffer
  width: number
  height: number
}

const DEFAULT_OPTIONS: Required<TextOverlayOptions> = {
  text: '',
  fontFamily: 'Inter, DejaVu Sans, sans-serif',
  fontSize: 0, // auto
  textStyle: 'classic',
  highlightColor: '#000000',
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
  ensureFonts()
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

  // Style-specific overrides
  const style = opts.textStyle || 'classic'
  let effectiveFontFamily = opts.fontFamily
  let effectiveFontWeight: string = opts.fontWeight
  let effectiveFontStyle = 'normal'

  if (style === 'typewriter') {
    effectiveFontFamily = 'Courier New, Courier, monospace'
  } else if (style === 'strong') {
    effectiveFontFamily = 'Georgia, Times New Roman, serif'
    effectiveFontWeight = '900'
    effectiveFontStyle = 'italic'
  }

  // Build SVG filters
  let defs = ''

  if (style === 'classic' && opts.textShadow) {
    defs += `<filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.7"/></filter>`
  }
  if (style === 'neon') {
    defs += `<filter id="neon">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="glow"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur2"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="blur2"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
  }
  if (style === 'outline') {
    defs += `<filter id="outline">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="thick"/>
      <feFlood flood-color="${opts.textColor}" result="color"/>
      <feComposite in="color" in2="thick" operator="in" result="stroke"/>
      <feMerge><feMergeNode in="stroke"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
  }

  // Build text lines with style-specific rendering
  const textLines = lines
    .map((line, i) => {
      const y = Math.round(startY + i * lineHeight)
      const escaped = escapeXml(line)
      const lineWidth = line.length * fontSize * 0.48 // tighter char width estimate
      const boxPadX = fontSize * 0.25
      const boxPadY = fontSize * 0.1
      let lineXml = ''

      switch (style) {
        case 'highlight': {
          // Colored box behind each line (Instagram Stories style) — tight fit
          let boxX: number
          if (textAnchor === 'middle') boxX = xPos - lineWidth / 2 - boxPadX
          else if (textAnchor === 'end') boxX = xPos - lineWidth - boxPadX
          else boxX = xPos - boxPadX
          const boxY = y - fontSize * 0.78
          const boxW = lineWidth + boxPadX * 2
          const boxH = fontSize * 1.1
          const radius = fontSize * 0.12
          lineXml = `<rect x="${Math.round(boxX)}" y="${Math.round(boxY)}" width="${Math.round(boxW)}" height="${Math.round(boxH)}" rx="${Math.round(radius)}" fill="${opts.highlightColor}" opacity="0.85"/>
          <text x="${xPos}" y="${y}" font-family="${effectiveFontFamily}" font-size="${fontSize}" font-weight="${effectiveFontWeight}" font-style="${effectiveFontStyle}" fill="${opts.textColor}" text-anchor="${textAnchor}">${escaped}</text>`
          break
        }
        case 'outline': {
          // Stroke only, no fill
          lineXml = `<text x="${xPos}" y="${y}" font-family="${effectiveFontFamily}" font-size="${fontSize}" font-weight="${effectiveFontWeight}" fill="none" stroke="${opts.textColor}" stroke-width="2" text-anchor="${textAnchor}">${escaped}</text>`
          break
        }
        case 'neon': {
          // Glowing text
          lineXml = `<text x="${xPos}" y="${y}" font-family="${effectiveFontFamily}" font-size="${fontSize}" font-weight="${effectiveFontWeight}" fill="${opts.textColor}" text-anchor="${textAnchor}" filter="url(#neon)">${escaped}</text>`
          break
        }
        case 'typewriter': {
          // Monospace with semi-transparent background strip — tight fit
          let boxX: number
          if (textAnchor === 'middle') boxX = xPos - lineWidth / 2 - boxPadX
          else if (textAnchor === 'end') boxX = xPos - lineWidth - boxPadX
          else boxX = xPos - boxPadX
          const boxY = y - fontSize * 0.78
          const boxW = lineWidth + boxPadX * 2
          const boxH = fontSize * 1.1
          lineXml = `<rect x="${Math.round(boxX)}" y="${Math.round(boxY)}" width="${Math.round(boxW)}" height="${Math.round(boxH)}" fill="black" opacity="0.6"/>
          <text x="${xPos}" y="${y}" font-family="${effectiveFontFamily}" font-size="${fontSize}" font-weight="normal" fill="${opts.textColor}" text-anchor="${textAnchor}">${escaped}</text>`
          break
        }
        case 'strong': {
          // Big bold italic serif with heavy shadow
          lineXml = `<text x="${xPos}" y="${y}" font-family="${effectiveFontFamily}" font-size="${Math.round(fontSize * 1.1)}" font-weight="900" font-style="italic" fill="${opts.textColor}" text-anchor="${textAnchor}" filter="url(#shadow)">${escaped}</text>`
          // Add shadow filter if not already
          if (!defs.includes('id="shadow"')) {
            defs += `<filter id="shadow"><feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/></filter>`
          }
          break
        }
        case 'classic':
        default: {
          const filter = opts.textShadow ? ' filter="url(#shadow)"' : ''
          lineXml = `<text x="${xPos}" y="${y}" font-family="${effectiveFontFamily}" font-size="${fontSize}" font-weight="${effectiveFontWeight}" font-style="${effectiveFontStyle}" fill="${opts.textColor}" text-anchor="${textAnchor}"${filter}>${escaped}</text>`
          break
        }
      }
      return lineXml
    })
    .join('\n    ')

  // Dark overlay rect
  const overlayRect =
    opts.overlayOpacity > 0
      ? `<rect width="${width}" height="${height}" fill="black" opacity="${opts.overlayOpacity}"/>`
      : ''

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs}</defs>
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
