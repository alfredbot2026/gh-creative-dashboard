import { readFileSync } from 'fs'
import { join } from 'path'

export function getGraceReferenceImages(): Buffer[] {
  try {
    const cwd = process.cwd()
    const images = [
      readFileSync(join(cwd, 'public/grace-reference.jpg')),
      readFileSync(join(cwd, 'public/grace-ref-1.jpg')),
      readFileSync(join(cwd, 'public/grace-ref-3.jpg')),
    ]
    return images
  } catch (error) {
    console.error('Failed to load local reference images:', error)
    return []
  }
}
