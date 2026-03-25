'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Download, ChevronLeft, ChevronRight, Check, X, Sparkles, Type, Move } from 'lucide-react'
import styles from './CarouselPreview.module.css'

type TextStyle = 'classic' | 'highlight' | 'outline' | 'strong'

interface SlideData {
  slideNumber: number
  role: string
  headline: string
  subline: string
}

interface CarouselPreviewProps {
  slides: SlideData[]
  onSlidesChange: (slides: SlideData[]) => void
}

const W = 1080, H = 1350 // Instagram 4:5

const TEXT_STYLES: { id: TextStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'outline', label: 'Outline' },
  { id: 'strong', label: 'Bold Serif' },
]

const COLORS = ['#FFFFFF', '#000000', '#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#9333EA']

const FONTS = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Georgia', label: 'Georgia' },
  { id: 'Arial Black', label: 'Impact' },
  { id: 'Courier New', label: 'Mono' },
]

export default function CarouselPreview({ slides, onSlidesChange }: CarouselPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)

  const [bgImage, setBgImage] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editH, setEditH] = useState('')
  const [editS, setEditS] = useState('')

  // Style state
  const [textStyle, setTextStyle] = useState<TextStyle>('highlight')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [highlightColor, setHighlightColor] = useState('#000000')
  const [fontFamily, setFontFamily] = useState('Inter')
  const [headlineSize, setHeadlineSize] = useState(64)
  const [sublineSize, setSublineSize] = useState(36)
  const [overlayOpacity, setOverlayOpacity] = useState(0.35)
  const [textY, setTextY] = useState(0.48) // 0-1 percentage

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartTextY = useRef(0)

  // Download
  const [downloading, setDownloading] = useState(false)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setBgImage(reader.result as string)
      const img = new Image()
      img.onload = () => { bgImgRef.current = img }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  // --- Canvas rendering (shared between preview and download) ---
  const renderSlide = useCallback((ctx: CanvasRenderingContext2D, slide: SlideData, width: number, height: number) => {
    // Background
    ctx.clearRect(0, 0, width, height)
    if (bgImgRef.current) {
      const img = bgImgRef.current
      const scale = Math.max(width / img.width, height / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
    } else {
      // Placeholder gradient when no image uploaded
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, '#2a2a2a')
      grad.addColorStop(1, '#1a1a1a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      // Subtle grid pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      const step = Math.round(width / 12)
      for (let x = step; x < width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = step; y < height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
    }

    // Overlay
    ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`
    ctx.fillRect(0, 0, width, height)

    // Scale font sizes relative to canvas size
    const scale = width / W
    const hSize = Math.round(headlineSize * scale)
    const sSize = Math.round(sublineSize * scale)
    const padding = Math.round(16 * scale)
    const maxWidth = width * 0.85
    const centerX = width / 2
    const startY = height * textY

    // Word wrap helper
    const wrapText = (text: string, fontSize: number, bold: boolean): string[] => {
      const style = textStyle === 'strong' ? 'italic ' : ''
      const weight = bold ? 'bold ' : ''
      const family = textStyle === 'strong' ? 'Georgia, serif' : `${fontFamily}, system-ui, sans-serif`
      ctx.font = `${style}${weight}${fontSize}px ${family}`
      const words = text.split(' ')
      const lines: string[] = []
      let line = ''
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line)
          line = word
        } else {
          line = test
        }
      }
      if (line) lines.push(line)
      return lines
    }

    // Render text lines
    const renderLines = (text: string, y: number, fontSize: number, bold: boolean): number => {
      const style = textStyle === 'strong' ? 'italic ' : ''
      const weight = bold ? 'bold ' : ''
      const family = textStyle === 'strong' ? 'Georgia, serif' : `${fontFamily}, system-ui, sans-serif`
      ctx.font = `${style}${weight}${fontSize}px ${family}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const lines = wrapText(text, fontSize, bold)
      const lineHeight = fontSize * 1.5
      let currentY = y

      for (const line of lines) {
        const metrics = ctx.measureText(line)

        if (textStyle === 'highlight') {
          const boxW = metrics.width + padding * 2
          const boxH = fontSize * 1.3
          ctx.fillStyle = highlightColor + 'dd'
          ctx.beginPath()
          if (ctx.roundRect) {
            ctx.roundRect(centerX - boxW / 2, currentY - boxH / 2, boxW, boxH, 6 * scale)
          } else {
            ctx.rect(centerX - boxW / 2, currentY - boxH / 2, boxW, boxH)
          }
          ctx.fill()
        }

        if (textStyle === 'outline') {
          ctx.strokeStyle = textColor
          ctx.lineWidth = 3 * scale
          ctx.strokeText(line, centerX, currentY)
        } else {
          if (textStyle === 'classic' || textStyle === 'strong') {
            ctx.shadowColor = 'rgba(0,0,0,0.7)'
            ctx.shadowBlur = 8 * scale
            ctx.shadowOffsetY = 3 * scale
          }
          ctx.fillStyle = textColor
          ctx.fillText(line, centerX, currentY)
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetY = 0
        }

        currentY += lineHeight
      }
      return currentY
    }

    const afterH = renderLines(slide.headline, startY, hSize, true)
    if (slide.subline) {
      renderLines(slide.subline, afterH + 8 * scale, sSize, false)
    }

    // Role tag was here, removed from canvas render to avoid artifacts in output
  }, [bgImage, textStyle, textColor, highlightColor, fontFamily, headlineSize, sublineSize, overlayOpacity, textY])

  // --- Live preview rendering ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render at display size (CSS scales the canvas)
    const displayW = canvas.clientWidth
    const displayH = canvas.clientHeight
    canvas.width = displayW * 2  // 2x for retina
    canvas.height = displayH * 2
    ctx.scale(2, 2)

    const slide = slides[currentSlide]
    if (slide) renderSlide(ctx, slide, displayW, displayH)
  }, [currentSlide, slides, bgImage, renderSlide])

  // --- Drag to reposition ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    dragStartY.current = e.clientY
    dragStartTextY.current = textY
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const deltaY = (e.clientY - dragStartY.current) / rect.height
    const newY = Math.max(0.1, Math.min(0.9, dragStartTextY.current + deltaY))
    setTextY(newY)
  }

  const handleMouseUp = () => setIsDragging(false)

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    dragStartY.current = e.touches[0].clientY
    dragStartTextY.current = textY
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const deltaY = (e.touches[0].clientY - dragStartY.current) / rect.height
    const newY = Math.max(0.1, Math.min(0.9, dragStartTextY.current + deltaY))
    setTextY(newY)
  }

  // --- Edit slide text ---
  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditH(slides[idx].headline)
    setEditS(slides[idx].subline)
  }

  const saveEdit = () => {
    if (editingIdx === null) return
    const updated = [...slides]
    updated[editingIdx] = { ...updated[editingIdx], headline: editH, subline: editS }
    onSlidesChange(updated)
    setEditingIdx(null)
  }

  // --- Download ---
  const renderFullRes = (slide: SlideData): string => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    renderSlide(ctx, slide, W, H)
    return canvas.toDataURL('image/png')
  }

  const handleDownloadAll = async () => {
    setDownloading(true)
    try {
      for (let i = 0; i < slides.length; i++) {
        const url = renderFullRes(slides[i])
        const a = document.createElement('a')
        a.href = url
        a.download = `slide-${i + 1}.png`
        a.click()
        await new Promise(r => setTimeout(r, 400))
      }
    } catch (err) {
      console.error('Download failed:', err)
    }
    setDownloading(false)
  }

  const handleDownloadCurrent = () => {
    const url = renderFullRes(slides[currentSlide])
    const a = document.createElement('a')
    a.href = url
    a.download = `slide-${currentSlide + 1}.png`
    a.click()
  }

  const slide = slides[currentSlide]

  return (
    <div className={styles.editorLayout}>
      {/* Live canvas preview */}
      <div className={styles.previewSection}>
        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ cursor: bgImage ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={bgImage ? handleMouseDown : undefined}
            onMouseMove={bgImage ? handleMouseMove : undefined}
            onMouseUp={bgImage ? handleMouseUp : undefined}
            onMouseLeave={bgImage ? handleMouseUp : undefined}
            onTouchStart={bgImage ? handleTouchStart : undefined}
            onTouchMove={bgImage ? handleTouchMove : undefined}
            onTouchEnd={bgImage ? handleMouseUp : undefined}
          />
          {!bgImage && (
            <label className={styles.canvasUploadOverlay}>
              <input type="file" accept="image/*" onChange={handleUpload} hidden />
              <Upload size={28} />
              <span>Upload background photo</span>
              <span className={styles.uploadSubtext}>Tap to choose — same image for all slides</span>
            </label>
          )}
          {bgImage && <span className={styles.dragHint}><Move size={12} /> Drag to reposition text</span>}
        </div>

        {/* Slide navigation */}
        <div className={styles.nav}>
          <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className={styles.navBtn}>
            <ChevronLeft size={18} />
          </button>
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <button key={i} className={`${styles.dot} ${i === currentSlide ? styles.dotActive : ''}`} onClick={() => setCurrentSlide(i)} />
            ))}
          </div>
          <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1} className={styles.navBtn}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Inline text editing */}
        <div className={styles.textEdit}>
          {editingIdx === currentSlide ? (
            <div className={styles.editForm}>
              <input className={styles.editInput} value={editH} onChange={e => setEditH(e.target.value)} placeholder="Headline" autoFocus />
              <input className={styles.editInput} value={editS} onChange={e => setEditS(e.target.value)} placeholder="Subline" />
              <div className={styles.editBtns}>
                <button onClick={saveEdit} className={styles.saveBtn}><Check size={14} /> Save</button>
                <button onClick={() => setEditingIdx(null)} className={styles.cancelBtn}><X size={14} /></button>
              </div>
            </div>
          ) : (
            <button className={styles.editTextBtn} onClick={() => startEdit(currentSlide)}>
              <Type size={14} /> Edit slide {currentSlide + 1} text
            </button>
          )}
        </div>
      </div>

      {/* Controls sidebar */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Background</span>
          {bgImage ? (
            <div className={styles.bgRow}>
              <img src={bgImage} alt="" className={styles.bgThumb} />
              <label className={styles.changeBtn}>
                <input type="file" accept="image/*" onChange={handleUpload} hidden />
                Change
              </label>
            </div>
          ) : (
            <label className={styles.uploadSmall}>
              <input type="file" accept="image/*" onChange={handleUpload} hidden />
              <Upload size={14} /> Upload photo
            </label>
          )}
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Text Style</span>
          <div className={styles.pills}>
            {TEXT_STYLES.map(s => (
              <button key={s.id} className={`${styles.pill} ${textStyle === s.id ? styles.pillActive : ''}`} onClick={() => setTextStyle(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Font</span>
          <div className={styles.pills}>
            {FONTS.map(f => (
              <button key={f.id} className={`${styles.pill} ${fontFamily === f.id ? styles.pillActive : ''}`} onClick={() => setFontFamily(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Headline Size: {headlineSize}px</span>
          <input type="range" min="32" max="96" step="2" value={headlineSize} onChange={e => setHeadlineSize(parseInt(e.target.value))} className={styles.slider} />
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Subline Size: {sublineSize}px</span>
          <input type="range" min="20" max="56" step="2" value={sublineSize} onChange={e => setSublineSize(parseInt(e.target.value))} className={styles.slider} />
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Text Color</span>
          <div className={styles.colorRow}>
            {COLORS.map(c => (
              <button key={c} className={`${styles.colorDot} ${textColor === c ? styles.colorActive : ''}`} onClick={() => setTextColor(c)} style={{ background: c }} />
            ))}
          </div>
        </div>

        {textStyle === 'highlight' && (
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>Highlight Color</span>
            <div className={styles.colorRow}>
              {['#000000', '#FFFFFF', '#E11D48', '#2563EB', '#16A34A', '#9333EA'].map(c => (
                <button key={c} className={`${styles.colorDot} ${highlightColor === c ? styles.colorActive : ''}`} onClick={() => setHighlightColor(c)} style={{ background: c }} />
              ))}
            </div>
          </div>
        )}

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Overlay: {Math.round(overlayOpacity * 100)}%</span>
          <input type="range" min="0" max="0.8" step="0.05" value={overlayOpacity} onChange={e => setOverlayOpacity(parseFloat(e.target.value))} className={styles.slider} />
        </div>

        <div className={styles.downloadSection}>
          <button className={styles.downloadBtn} onClick={handleDownloadAll} disabled={downloading}>
            {downloading ? <><Sparkles size={16} className={styles.spin} /> Downloading...</> : <><Download size={16} /> Download All {slides.length} Slides</>}
          </button>
          <button className={styles.downloadCurrentBtn} onClick={handleDownloadCurrent}>
            <Download size={14} /> Download Slide {currentSlide + 1}
          </button>
        </div>
      </div>
    </div>
  )
}
