'use client'

import { useState, useRef } from 'react'
import { Upload, Download, ChevronLeft, ChevronRight, Edit3, Check, X, Sparkles } from 'lucide-react'
import styles from './CarouselPreview.module.css'

type TextStyle = 'classic' | 'highlight' | 'outline' | 'neon' | 'typewriter' | 'strong'

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

const TEXT_STYLES: { id: TextStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'outline', label: 'Outline' },
  { id: 'strong', label: 'Strong' },
]

const COLORS = ['#FFFFFF', '#000000', '#F59E0B', '#EF4444', '#3B82F6', '#10B981']

export default function CarouselPreview({ slides, onSlidesChange }: CarouselPreviewProps) {
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [bgFile, setBgFile] = useState<File | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editH, setEditH] = useState('')
  const [editS, setEditS] = useState('')

  // Style
  const [textStyle, setTextStyle] = useState<TextStyle>('highlight')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [bgColor, setBgColor] = useState('#000000')
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>('center')
  const [overlayOpacity, setOverlayOpacity] = useState(0.35)

  // Download
  const [downloading, setDownloading] = useState(false)
  const bgImgRef = useRef<HTMLImageElement | null>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBgFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setBgImage(reader.result as string)
      // Pre-load for canvas rendering
      const img = new Image()
      img.onload = () => { bgImgRef.current = img }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

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

  // CSS text style classes
  const getTextCSS = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      color: textColor,
      fontFamily: "'Inter', system-ui, sans-serif",
      textAlign: 'center' as const,
      padding: '0 24px',
      maxWidth: '90%',
    }

    switch (textStyle) {
      case 'highlight':
        return { ...base }
      case 'outline':
        return { ...base, WebkitTextStroke: `1.5px ${textColor}`, color: 'transparent' }
      case 'strong':
        return { ...base, fontFamily: 'Georgia, serif', fontStyle: 'italic' }
      default:
        return { ...base, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }
    }
  }

  const getHighlightBg = () => {
    if (textStyle !== 'highlight') return undefined
    return `${bgColor}dd`
  }

  const getPositionCSS = (): React.CSSProperties => {
    switch (position) {
      case 'top': return { top: '12%' }
      case 'bottom': return { bottom: '12%' }
      default: return { top: '50%', transform: 'translateY(-50%)' }
    }
  }

  // Client-side canvas rendering — what you see = what you download
  const renderSlideToCanvas = (slide: SlideData): Promise<string> => {
    return new Promise((resolve) => {
      const W = 1080, H = 1350 // Instagram 4:5
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // Draw background
      if (bgImgRef.current) {
        const img = bgImgRef.current
        const scale = Math.max(W / img.width, H / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
      } else {
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, W, H)
      }

      // Dark overlay
      ctx.fillStyle = `rgba(0,0,0,${overlayOpacity})`
      ctx.fillRect(0, 0, W, H)

      // Text position
      let textY: number
      if (position === 'top') textY = H * 0.2
      else if (position === 'bottom') textY = H * 0.75
      else textY = H * 0.48

      const headlineSize = 64
      const sublineSize = 36
      const padding = 16
      const maxWidth = W * 0.85

      // Helper: word wrap
      const wrapText = (text: string, maxW: number, fontSize: number): string[] => {
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
        const words = text.split(' ')
        const lines: string[] = []
        let line = ''
        for (const word of words) {
          const test = line ? `${line} ${word}` : word
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line)
            line = word
          } else {
            line = test
          }
        }
        if (line) lines.push(line)
        return lines
      }

      // Render text
      const renderText = (text: string, y: number, fontSize: number, isBold: boolean) => {
        const weight = isBold ? 'bold' : 'normal'
        const family = textStyle === 'strong' ? 'Georgia, serif' : 'Inter, system-ui, sans-serif'
        ctx.font = `${weight} ${fontSize}px ${family}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const lines = wrapText(text, maxWidth, fontSize)
        const lineHeight = fontSize * 1.4
        let currentY = y

        for (const line of lines) {
          const metrics = ctx.measureText(line)

          if (textStyle === 'highlight') {
            // Highlight box behind text
            const boxW = metrics.width + padding * 2
            const boxH = fontSize * 1.2
            ctx.fillStyle = bgColor + 'dd'
            ctx.beginPath()
            ctx.roundRect(W / 2 - boxW / 2, currentY - boxH / 2, boxW, boxH, 6)
            ctx.fill()
          }

          if (textStyle === 'outline') {
            ctx.strokeStyle = textColor
            ctx.lineWidth = 3
            ctx.strokeText(line, W / 2, currentY)
          } else {
            if (textStyle === 'classic' || textStyle === 'strong') {
              ctx.shadowColor = 'rgba(0,0,0,0.7)'
              ctx.shadowBlur = 8
              ctx.shadowOffsetY = 3
            }
            ctx.fillStyle = textColor
            ctx.fillText(line, W / 2, currentY)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetY = 0
          }

          currentY += lineHeight
        }
        return currentY
      }

      const afterHeadline = renderText(slide.headline, textY, headlineSize, true)
      if (slide.subline) {
        renderText(slide.subline, afterHeadline + 12, sublineSize, false)
      }

      resolve(canvas.toDataURL('image/png'))
    })
  }

  const handleDownloadAll = async () => {
    setDownloading(true)
    try {
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlideToCanvas(slides[i])
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `slide-${i + 1}.png`
        a.click()
        await new Promise(r => setTimeout(r, 400))
      }
    } catch (err) {
      console.error('Download failed:', err)
    }
    setDownloading(false)
  }

  const handleDownloadCurrent = async () => {
    const dataUrl = await renderSlideToCanvas(slides[currentSlide])
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `slide-${currentSlide + 1}.png`
    a.click()
  }

  const slide = slides[currentSlide]

  return (
    <div className={styles.container}>
      {/* Upload */}
      {!bgImage ? (
        <label className={styles.uploadZone}>
          <input type="file" accept="image/*" onChange={handleUpload} hidden />
          <Upload size={24} />
          <span className={styles.uploadTitle}>Upload a background photo</span>
          <span className={styles.uploadHint}>Same image for all slides — text changes per slide</span>
        </label>
      ) : (
        <div className={styles.editorLayout}>
          {/* Live preview */}
          <div className={styles.previewSection}>
            <div className={styles.slideFrame}>
              <img src={bgImage} alt="Background" className={styles.bgImg} />
              <div className={styles.overlay} style={{ opacity: overlayOpacity }} />
              <div className={styles.textLayer} style={getPositionCSS()}>
                {editingIdx === currentSlide ? (
                  <div className={styles.inlineEdit}>
                    <input
                      className={styles.inlineInput}
                      value={editH}
                      onChange={e => setEditH(e.target.value)}
                      style={{ ...getTextCSS(), fontSize: '1.4rem', fontWeight: 700 }}
                      autoFocus
                    />
                    <input
                      className={styles.inlineInput}
                      value={editS}
                      onChange={e => setEditS(e.target.value)}
                      style={{ ...getTextCSS(), fontSize: '0.9rem', fontWeight: 400, opacity: 0.9 }}
                    />
                    <div className={styles.editBtns}>
                      <button onClick={saveEdit} className={styles.editOk}><Check size={14} /></button>
                      <button onClick={() => setEditingIdx(null)} className={styles.editCancel}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.slideText} onClick={() => startEdit(currentSlide)} title="Click to edit">
                    <h3
                      className={styles.headline}
                      style={{
                        ...getTextCSS(),
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        background: getHighlightBg(),
                        display: 'inline',
                        padding: getHighlightBg() ? '4px 12px' : undefined,
                        borderRadius: getHighlightBg() ? '4px' : undefined,
                        lineHeight: 1.8,
                        boxDecorationBreak: 'clone' as any,
                      }}
                    >
                      {slide?.headline}
                    </h3>
                    <p
                      className={styles.subline}
                      style={{
                        ...getTextCSS(),
                        fontSize: '0.9rem',
                        fontWeight: 400,
                        opacity: 0.9,
                        marginTop: '8px',
                        background: getHighlightBg(),
                        display: 'inline',
                        padding: getHighlightBg() ? '3px 10px' : undefined,
                        borderRadius: getHighlightBg() ? '4px' : undefined,
                        lineHeight: 1.8,
                        boxDecorationBreak: 'clone' as any,
                      }}
                    >
                      {slide?.subline}
                    </p>
                  </div>
                )}
              </div>
              <span className={styles.slideCounter}>{currentSlide + 1} / {slides.length}</span>
              {slide?.role === 'hook' && <span className={styles.roleTag}>🎯 Hook</span>}
              {slide?.role === 'cta' && <span className={styles.roleTag}>👆 CTA</span>}
            </div>

            {/* Navigation */}
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
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Background</span>
              <div className={styles.bgRow}>
                <img src={bgImage} alt="" className={styles.bgThumb} />
                <label className={styles.changeBtn}>
                  <input type="file" accept="image/*" onChange={handleUpload} hidden />
                  Change
                </label>
              </div>
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
                    <button key={c} className={`${styles.colorDot} ${bgColor === c ? styles.colorActive : ''}`} onClick={() => setBgColor(c)} style={{ background: c }} />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Position</span>
              <div className={styles.pills}>
                {['top', 'center', 'bottom'].map(p => (
                  <button key={p} className={`${styles.pill} ${position === p ? styles.pillActive : ''}`} onClick={() => setPosition(p as any)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Overlay {Math.round(overlayOpacity * 100)}%</span>
              <input type="range" min="0" max="0.8" step="0.05" value={overlayOpacity} onChange={e => setOverlayOpacity(parseFloat(e.target.value))} className={styles.slider} />
            </div>

            <button className={styles.downloadBtn} onClick={handleDownloadAll} disabled={downloading}>
              {downloading ? <><Sparkles size={16} className={styles.spin} /> Composing slides...</> : <><Download size={16} /> Download All {slides.length} Slides</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
