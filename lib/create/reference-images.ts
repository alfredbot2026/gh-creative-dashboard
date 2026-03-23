import { readFileSync } from 'fs'
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
  const files = [
    'public/grace-ref-front.jpg',   // Front-facing, big smile
    'public/grace-ref-right.jpg',   // 3/4 right profile
    'public/grace-ref-right2.jpg',  // 3/4 right, different angle
    'public/grace-ref-left.jpg',    // 3/4 left profile
    'public/grace-ref-desk.jpg',    // 3/4 right at desk, craft workspace
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
