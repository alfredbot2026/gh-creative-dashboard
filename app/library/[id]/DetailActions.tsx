'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Download, Trash2 } from 'lucide-react'
import styles from './page.module.css'

export default function DetailActions({ item }: { item: any }) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const getFullText = () => {
    const sd = item.script_data || {}
    const scenes = sd.scenes || []
    if (scenes.length > 0) {
      return scenes.map((s: any) => {
        const label = s.block_label || `Scene ${s.sceneNumber || '?'}`
        const text = s.script_text || s.voiceover || ''
        const visual = s.visual_direction || s.visual || ''
        return `[${label}]\n${text}${visual ? `\nVisual: ${visual}` : ''}`
      }).join('\n\n')
    }
    if (sd.headline) return `${sd.headline}\n\n${sd.primaryText || sd.body || ''}`
    if (sd.caption) return sd.caption
    return JSON.stringify(sd, null, 2)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([getFullText()], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${item.title || 'content'}.txt`
    a.click()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this content?')) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('content_items').delete().eq('id', item.id)
    router.push('/library')
    router.refresh()
  }

  return (
    <div className={styles.actions}>
      <button className={styles.btnPrimary} onClick={handleCopy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copied' : 'Copy Text'}
      </button>
      <button className={styles.btnOutline} onClick={handleDownload}>
        <Download size={16} /> Download
      </button>
      <button className={styles.btnDanger} onClick={handleDelete}>
        <Trash2 size={16} /> Delete
      </button>
    </div>
  )
}
