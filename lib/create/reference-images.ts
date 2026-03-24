import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Grace identity lock prompt — precise physical description from 4 reference photos.
 * Used as text anchor for every generation to maintain facial consistency.
 */
export const GRACE_IDENTITY_LOCK = `Southeast Asian (Filipina) woman, age mid-to-late 40s, soft oval face with full rounded cheeks and a small rounded chin. Dark brown-black almond-shaped eyes with low double eyelid crease, slightly wide-set. Thin natural dark eyebrows with soft low arch. Low-bridge medium-width nose with rounded tip. Thin-to-medium lips with subtle cupid's bow, natural dusty pink lip color. Warm golden-beige skin tone, small dark beauty mark on left cheek. Long jet-black straight hair loosely pulled back with face-framing strands. Oversized translucent pale pink/champagne square-geometric prescription glasses with rose-gold metal temple accents — dominant facial feature. Warm genuine slightly asymmetric smile with pronounced nasolabial folds. Medium-to-full soft body build. No makeup, natural appearance.`

/**
 * Load Grace's 4 reference photos (front + 3 angles) as Buffers.
 * Used as visual anchors in multi-turn image generation sessions.
 */
export function getGraceReferenceImages(): Buffer[] {
  const cwd = process.cwd()
  // Best 5 for generation (diverse angles, varied expressions)
  // Full set of 8 stored in references/grace-refs/ and Supabase
  const files = [
    'public/grace-ref-front.jpg',     // Front-facing, big smile
    'public/grace-ref-warm.jpg',      // Front, warm soft smile
    'public/grace-ref-laughing.jpg',  // Front, big laugh (expression range)
    'public/grace-ref-right.jpg',     // 3/4 right profile
    'public/grace-ref-left.jpg',      // 3/4 left profile
  ]

  const buffers: Buffer[] = []
  for (const file of files) {
    try {
      buffers.push(readFileSync(join(cwd, file)))
    } catch (error) {
      console.warn(`[ReferenceImages] Missing: ${file}`)
    }
  }

  if (buffers.length === 0) {
    console.error('[ReferenceImages] No reference images loaded — image consistency will be degraded')
  }

  return buffers
}

/**
 * Get absolute file paths to Grace's reference images.
 * Used by image-generator to pass to Nano Banana script directly.
 */
export function getGraceReferenceImagePaths(): string[] {
  const cwd = process.cwd()
  const files = [
    'public/grace-ref-front.jpg',
    'public/grace-ref-warm.jpg',
    'public/grace-ref-laughing.jpg',
    'public/grace-ref-right.jpg',
    'public/grace-ref-left.jpg',
  ]

  return files
    .map(f => join(cwd, f))
    .filter(p => existsSync(p))
}
