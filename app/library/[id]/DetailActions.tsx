'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Download, Trash2, FileText, FileImage, Video, MoreHorizontal, Loader2 } from 'lucide-react'
import styles from './page.module.css'

interface ExportMenuProps {
  item: any
  onExport: (format: 'txt' | 'pdf' | 'youtube' | 'gdoc') => void
  loading: boolean
}

function ExportMenu({ item, onExport, loading }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const contentType = item.content_type
  const isYouTube = contentType?.includes('youtube')
  const isVideo = contentType?.includes('reel') || contentType?.includes('video') || contentType?.includes('short')

  return (
    <div className={styles.exportMenu}>
      <button 
        className={styles.btnOutline}
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        {loading ? <Loader2 size={16} className={styles.spinning} /> : <Download size={16} />}
        {loading ? 'Exporting...' : 'Export'}
      </button>
      
      {open && (
        <div className={styles.exportDropdown}>
          <button 
            className={styles.exportOption}
            onClick={() => { onExport('txt'); setOpen(false) }}
          >
            <FileText size={14} />
            <div>
              <div className={styles.exportLabel}>Plain Text (.txt)</div>
              <div className={styles.exportDesc}>Simple text format</div>
            </div>
          </button>
          
          <button 
            className={styles.exportOption}
            onClick={() => { onExport('pdf'); setOpen(false) }}
          >
            <FileImage size={14} />
            <div>
              <div className={styles.exportLabel}>PDF Document</div>
              <div className={styles.exportDesc}>Formatted for printing</div>
            </div>
          </button>
          
          {isYouTube && (
            <button 
              className={styles.exportOption}
              onClick={() => { onExport('youtube'); setOpen(false) }}
            >
              <Video size={14} />
              <div>
                <div className={styles.exportLabel}>YouTube Creator Format</div>
                <div className={styles.exportDesc}>Script + SEO metadata</div>
              </div>
            </button>
          )}
          
          <button 
            className={styles.exportOption}
            onClick={() => { onExport('gdoc'); setOpen(false) }}
          >
            <FileText size={14} style={{ color: '#4285f4' }} />
            <div>
              <div className={styles.exportLabel}>Copy for Google Docs</div>
              <div className={styles.exportDesc}>HTML format ready to paste</div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export default function DetailActions({ item }: { item: any }) {
  const [copied, setCopied] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
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

  const handleExport = async (format: 'txt' | 'pdf' | 'youtube' | 'gdoc') => {
    setExportLoading(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, format }),
      })
      
      if (!res.ok) throw new Error('Export failed')
      
      const data = await res.json()
      
      if (format === 'gdoc') {
        // For Google Docs, copy HTML to clipboard
        await navigator.clipboard.writeText(data.content)
        alert('Content copied! Open Google Docs and paste (Ctrl/Cmd+V)')
        return
      }
      
      // Download file
      let blob: Blob
      if (data.base64) {
        const binary = atob(data.content)
        const array = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i)
        }
        blob = new Blob([array], { type: data.mimeType })
      } else {
        blob = new Blob([data.content], { type: data.mimeType })
      }
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (err) {
      alert('Export failed. Please try again.')
      console.error('Export error:', err)
    } finally {
      setExportLoading(false)
    }
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
      
      <ExportMenu 
        item={item} 
        onExport={handleExport} 
        loading={exportLoading}
      />
      
      <button className={styles.btnDanger} onClick={handleDelete}>
        <Trash2 size={16} /> Delete
      </button>
    </div>
  )
}
