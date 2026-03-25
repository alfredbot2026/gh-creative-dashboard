'use client'

import { useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Wand2, RotateCw, Upload, Download, Check, Edit3, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { downloadSlidesAsZip } from '@/lib/studio/download-utils'
import styles from './CarouselCreator.module.css'

type TextStyle = 'classic' | 'highlight' | 'outline' | 'neon' | 'typewriter' | 'strong'
type Step = 'topic' | 'edit' | 'design' | 'preview'

interface Slide {
  slideNumber: number
  role: 'hook' | 'point' | 'cta'
  headline: string
  subline: string
}

const SLIDE_COUNTS = [5, 7, 10]

const TEXT_STYLES: { id: TextStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'outline', label: 'Outline' },
  { id: 'neon', label: 'Neon' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'strong', label: 'Strong' },
]

const COLORS = [
  { id: '#FFFFFF', label: 'White' },
  { id: '#000000', label: 'Black' },
  { id: '#F59E0B', label: 'Gold' },
  { id: '#EF4444', label: 'Red' },
  { id: '#3B82F6', label: 'Blue' },
]

const POSITIONS = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Center' },
  { id: 'bottom', label: 'Bottom' },
]

interface CarouselCreatorProps {
  initialTopic?: string
  onBack?: () => void
}

export default function CarouselCreator({ initialTopic, onBack }: CarouselCreatorProps) {
  // Step
  const [step, setStep] = useState<Step>('topic')

  // Step 1: Topic
  const [topic, setTopic] = useState(initialTopic || '')
  const [slideCount, setSlideCount] = useState(7)
  const [generating, setGenerating] = useState(false)

  // Step 2: Slides
  const [slides, setSlides] = useState<Slide[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editHeadline, setEditHeadline] = useState('')
  const [editSubline, setEditSubline] = useState('')

  // Step 3: Design
  const [bgImage, setBgImage] = useState<File | null>(null)
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [textStyle, setTextStyle] = useState<TextStyle>('highlight')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [highlightColor, setHighlightColor] = useState('#000000')
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>('center')
  const [overlayOpacity, setOverlayOpacity] = useState(0.35)
  const [composing, setComposing] = useState(false)
  const [composedSlides, setComposedSlides] = useState<string[]>([])

  // Step 4: Preview
  const [previewIdx, setPreviewIdx] = useState(0)

  // --- Step 1: Generate slide text ---
  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/create/carousel-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideCount }),
      })
      const data = await res.json()
      if (data.slides?.length) {
        setSlides(data.slides)
        setStep('edit')
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  // --- Step 2: Edit slides ---
  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditHeadline(slides[idx].headline)
    setEditSubline(slides[idx].subline)
  }

  const saveEdit = () => {
    if (editingIdx === null) return
    const updated = [...slides]
    updated[editingIdx] = { ...updated[editingIdx], headline: editHeadline, subline: editSubline }
    setSlides(updated)
    setEditingIdx(null)
  }

  const regenerateSlide = async (idx: number) => {
    // Single slide regeneration — just re-ask the LLM for one slide
    try {
      const res = await fetch('/api/create/carousel-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slideCount: 1 }),
      })
      const data = await res.json()
      if (data.slides?.[0]) {
        const updated = [...slides]
        updated[idx] = { ...data.slides[0], slideNumber: idx + 1, role: slides[idx].role }
        setSlides(updated)
      }
    } catch { /* ignore */ }
  }

  // --- Step 3: Design ---
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBgImage(file)
    const reader = new FileReader()
    reader.onload = () => setBgPreview(reader.result as string)
    reader.readAsDataURL(file)
    setComposedSlides([]) // reset composed
  }

  const handleCompose = async () => {
    if (!bgImage) return
    setComposing(true)
    setComposedSlides([])
    try {
      const results: string[] = []
      for (const slide of slides) {
        const text = `${slide.headline}\n${slide.subline}`
        const fd = new FormData()
        fd.append('image', bgImage)
        fd.append('text', text)
        fd.append('textStyle', textStyle)
        fd.append('textColor', textColor)
        fd.append('highlightColor', highlightColor)
        fd.append('position', position)
        fd.append('fontWeight', 'bold')
        fd.append('overlayOpacity', String(overlayOpacity))

        const res = await fetch('/api/studio/carousel/recomposite', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.image_base64) {
          results.push(`data:image/png;base64,${data.image_base64}`)
        } else if (data.image_url) {
          results.push(data.image_url)
        }
      }
      setComposedSlides(results)
      if (results.length) {
        setPreviewIdx(0)
        setStep('preview')
      }
    } catch (err) {
      console.error('Compose failed:', err)
    }
    setComposing(false)
  }

  // --- Step 4: Download ---
  const handleDownloadAll = async () => {
    if (composedSlides.length === 0) return
    // Convert data URLs to blobs for ZIP
    const blobs = await Promise.all(
      composedSlides.map(async (src, i) => {
        const res = await fetch(src)
        const blob = await res.blob()
        return { blob, name: `slide-${i + 1}.png` }
      })
    )
    // Simple ZIP using the existing utility or manual download
    for (const { blob, name } of blobs) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return (
    <div className={styles.creator}>

      {/* === STEP 1: TOPIC + SLIDE COUNT === */}
      {step === 'topic' && (
        <div className={styles.stepContainer}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h2 className={styles.stepTitle}>Create Carousel</h2>
          <p className={styles.stepHint}>Each slide = one headline + one subline. Short and punchy.</p>

          <label className={styles.label}>Topic</label>
          <textarea
            className={styles.textarea}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. 5 mistakes beginners make in paper crafting"
            rows={2}
          />

          <label className={styles.label}>How many slides?</label>
          <div className={styles.countPicker}>
            {SLIDE_COUNTS.map(n => (
              <button
                key={n}
                className={`${styles.countBtn} ${slideCount === n ? styles.countActive : ''}`}
                onClick={() => setSlideCount(n)}
              >
                {n} slides
              </button>
            ))}
          </div>

          <button className={styles.primaryBtn} onClick={handleGenerate} disabled={generating || !topic.trim()}>
            {generating ? <><Sparkles size={16} className={styles.spin} /> Generating...</> : <>Generate Slide Text →</>}
          </button>
        </div>
      )}

      {/* === STEP 2: EDIT SLIDES === */}
      {step === 'edit' && (
        <div className={styles.stepContainer}>
          <button className={styles.backBtn} onClick={() => setStep('topic')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className={styles.stepTitle}>Edit Slides</h2>
          <p className={styles.stepHint}>Tap any slide to edit. Each slide = one headline + subline.</p>

          <div className={styles.slideCards}>
            {slides.map((slide, i) => (
              <div key={i} className={`${styles.slideCard} ${slide.role === 'hook' ? styles.slideHook : slide.role === 'cta' ? styles.slideCta : ''}`}>
                {editingIdx === i ? (
                  <div className={styles.editForm}>
                    <input
                      className={styles.editInput}
                      value={editHeadline}
                      onChange={e => setEditHeadline(e.target.value)}
                      placeholder="Headline"
                    />
                    <input
                      className={styles.editInput}
                      value={editSubline}
                      onChange={e => setEditSubline(e.target.value)}
                      placeholder="Subline"
                    />
                    <div className={styles.editActions}>
                      <button className={styles.smallBtn} onClick={saveEdit}><Check size={14} /> Save</button>
                      <button className={styles.smallBtnGhost} onClick={() => setEditingIdx(null)}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.slideHeader}>
                      <span className={styles.slideNum}>{slide.role === 'hook' ? '🎯 Hook' : slide.role === 'cta' ? '👆 CTA' : `Slide ${slide.slideNumber}`}</span>
                      <div className={styles.slideActions}>
                        <button className={styles.iconBtn} onClick={() => startEdit(i)} title="Edit"><Edit3 size={14} /></button>
                        <button className={styles.iconBtn} onClick={() => regenerateSlide(i)} title="Regenerate"><RotateCw size={14} /></button>
                      </div>
                    </div>
                    <p className={styles.slideHeadline}>{slide.headline}</p>
                    <p className={styles.slideSubline}>{slide.subline}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          <button className={styles.primaryBtn} onClick={() => setStep('design')}>
            Continue to Design →
          </button>
        </div>
      )}

      {/* === STEP 3: DESIGN === */}
      {step === 'design' && (
        <div className={styles.stepContainer}>
          <button className={styles.backBtn} onClick={() => setStep('edit')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className={styles.stepTitle}>Design Your Slides</h2>

          {/* Upload background */}
          {!bgPreview ? (
            <label className={styles.uploadZone}>
              <input type="file" accept="image/*" onChange={handleUpload} hidden />
              <Upload size={24} />
              <span>Upload a background photo</span>
              <span className={styles.uploadHint}>This image will be used for ALL slides</span>
            </label>
          ) : (
            <div className={styles.bgPreviewRow}>
              <img src={bgPreview} alt="Background" className={styles.bgThumb} />
              <div>
                <p className={styles.bgLabel}>Background uploaded</p>
                <button className={styles.smallBtnGhost} onClick={() => { setBgImage(null); setBgPreview(null); setComposedSlides([]) }}>Change</button>
              </div>
            </div>
          )}

          {/* Style controls */}
          {bgPreview && (
            <div className={styles.styleControls}>
              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Text Style</label>
                <div className={styles.pills}>
                  {TEXT_STYLES.map(s => (
                    <button key={s.id} className={`${styles.pill} ${textStyle === s.id ? styles.pillActive : ''}`} onClick={() => setTextStyle(s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Text Color</label>
                <div className={styles.pills}>
                  {COLORS.map(c => (
                    <button key={c.id} className={`${styles.colorDot} ${textColor === c.id ? styles.colorActive : ''}`} onClick={() => setTextColor(c.id)} style={{ background: c.id }} title={c.label} />
                  ))}
                </div>
              </div>

              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Position</label>
                <div className={styles.pills}>
                  {POSITIONS.map(p => (
                    <button key={p.id} className={`${styles.pill} ${position === p.id ? styles.pillActive : ''}`} onClick={() => setPosition(p.id as any)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Overlay Darkness</label>
                <input type="range" min="0" max="0.8" step="0.05" value={overlayOpacity} onChange={e => setOverlayOpacity(parseFloat(e.target.value))} className={styles.slider} />
                <span className={styles.sliderValue}>{Math.round(overlayOpacity * 100)}%</span>
              </div>

              <button className={styles.primaryBtn} onClick={handleCompose} disabled={composing}>
                {composing ? <><Sparkles size={16} className={styles.spin} /> Creating {slides.length} slides...</> : <>Create Slides →</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* === STEP 4: PREVIEW + DOWNLOAD === */}
      {step === 'preview' && (
        <div className={styles.stepContainer}>
          <button className={styles.backBtn} onClick={() => setStep('design')}>
            <ArrowLeft size={16} /> Back to Design
          </button>
          <h2 className={styles.stepTitle}>Your Carousel</h2>

          {/* Big preview */}
          <div className={styles.previewMain}>
            <button className={styles.navBtn} onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))} disabled={previewIdx === 0}>
              <ChevronLeft size={20} />
            </button>
            <div className={styles.previewFrame}>
              <img src={composedSlides[previewIdx]} alt={`Slide ${previewIdx + 1}`} className={styles.previewImg} />
              <span className={styles.previewCounter}>{previewIdx + 1} / {composedSlides.length}</span>
            </div>
            <button className={styles.navBtn} onClick={() => setPreviewIdx(Math.min(composedSlides.length - 1, previewIdx + 1))} disabled={previewIdx === composedSlides.length - 1}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Thumbnails */}
          <div className={styles.thumbStrip}>
            {composedSlides.map((src, i) => (
              <button key={i} className={`${styles.thumb} ${i === previewIdx ? styles.thumbActive : ''}`} onClick={() => setPreviewIdx(i)}>
                <img src={src} alt={`Slide ${i + 1}`} />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className={styles.downloadActions}>
            <button className={styles.primaryBtn} onClick={handleDownloadAll}>
              <Download size={16} /> Download All Slides
            </button>
            <a href={composedSlides[previewIdx]} download={`slide-${previewIdx + 1}.png`} className={styles.secondaryBtn}>
              <Download size={16} /> Download This Slide
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
