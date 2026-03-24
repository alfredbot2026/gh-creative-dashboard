/**
 * Client-side download utilities for studio content.
 */
import JSZip from 'jszip'

/**
 * Download carousel slides as a ZIP file.
 */
export async function downloadSlidesAsZip(
  slideUrls: string[],
  topic?: string
): Promise<void> {
  const zip = new JSZip()

  // Fetch all slides
  const fetches = slideUrls.map(async (url, i) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const blob = await res.blob()
      zip.file(`slide-${i + 1}.png`, blob)
    } catch (e) {
      console.warn(`Failed to fetch slide ${i + 1}:`, e)
    }
  })

  await Promise.all(fetches)

  const blob = await zip.generateAsync({ type: 'blob' })
  const safeName = (topic || 'carousel').replace(/[^a-zA-Z0-9\-_ ]/g, '').substring(0, 50).trim()

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${safeName}-slides.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Download a single image by URL.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Generate a formatted script text for export.
 */
export function formatScriptForExport(variant: {
  hook: string
  content: { scenes?: any[]; caption?: string; headline?: string; primaryText?: string }
}): string {
  let text = `HOOK:\n${variant.hook}\n\n`
  const c = variant.content

  if (c.scenes) {
    for (const s of c.scenes) {
      const label = s.block_label || `Scene ${s.sceneNumber || '?'}`
      const timing = s.timing ? ` (${s.timing})` : ''
      text += `[${label}]${timing}\n`
      if (s.script_text || s.voiceover) {
        text += `Script: ${s.script_text || s.voiceover}\n`
      }
      if (s.visual_direction || s.visual) {
        text += `Visual: ${s.visual_direction || s.visual}\n`
      }
      if (s.on_screen_text) {
        text += `On-screen: ${s.on_screen_text}\n`
      }
      if (s.production_notes) {
        text += `Notes: ${s.production_notes}\n`
      }
      text += '\n'
    }
  } else if (c.headline) {
    text += `HEADLINE:\n${c.headline}\n\n`
    if (c.primaryText) text += `BODY:\n${c.primaryText}\n\n`
  } else if (c.caption) {
    text += `CAPTION:\n${c.caption}\n\n`
  }

  return text.trim()
}

/**
 * Download script as a text file.
 */
export function downloadScriptAsText(
  variant: Parameters<typeof formatScriptForExport>[0],
  filename?: string
): void {
  const text = formatScriptForExport(variant)
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename || `script-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}
