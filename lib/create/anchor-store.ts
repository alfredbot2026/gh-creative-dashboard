/**
 * Anchor Store — manages the "golden anchor" image of Grace.
 * 
 * The anchor is generated once and reused across all sessions.
 * This ensures maximum consistency — every session starts from
 * the same visual reference point.
 */
import { promises as fs } from 'fs'
import { join } from 'path'

const ANCHOR_PATH = join(process.cwd(), 'public', 'grace-anchor.png')

/**
 * Get the anchor image as a Buffer, or null if none exists.
 */
export async function getAnchor(): Promise<Buffer | null> {
  try {
    return await fs.readFile(ANCHOR_PATH)
  } catch (error: any) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

/**
 * Save the anchor image to disk.
 */
export async function saveAnchor(buffer: Buffer): Promise<void> {
  await fs.writeFile(ANCHOR_PATH, buffer)
  console.log('[AnchorStore] Anchor image saved to', ANCHOR_PATH)
}

/**
 * Delete the anchor to force regeneration on next session init.
 */
export async function deleteAnchor(): Promise<boolean> {
  try {
    await fs.unlink(ANCHOR_PATH)
    console.log('[AnchorStore] Anchor deleted — will regenerate on next session')
    return true
  } catch (error: any) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

/**
 * Get anchor metadata.
 */
export async function getAnchorInfo(): Promise<{ exists: boolean; path: string; size?: number }> {
  try {
    const stat = await fs.stat(ANCHOR_PATH)
    return { exists: true, path: ANCHOR_PATH, size: stat.size }
  } catch {
    return { exists: false, path: ANCHOR_PATH }
  }
}
