'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Download, RotateCw, ChevronLeft, ChevronRight, Edit3, Sparkles, FileDown, Save, Check } from 'lucide-react'
import { downloadSlidesAsZip } from '@/lib/studio/download-utils'
import styles from './CarouselBuilder.module.css'

interface SlideData {
  slide_number: number
  text: string
  image_url: string
  storage_path: string
}

type TextStyle = 'classic' | 'highlight' | 'outline' | 'neon' | 'typewriter' | 'strong'

interface CarouselStyle {
  fontFamily: string
  textColor: string
  overlayOpacity: number
  position: 'top' | 'center' | 'bottom'
  fontWeight: 'normal' | 'bold' | 'black'
  textStyle: TextStyle
  highlightColor: string
}

const FONT_OPTIONS = [
  { id: 'Inter, Helvetica, Arial, sans-serif', label: 'Inter' },
  { id: 'Georgia, Times New Roman, serif', label: 'Georgia' },
  { id: 'Courier New, monospace', label: 'Courier' },
  { id: 'system-ui, sans-serif', label: 'System' },
]

const TEXT_STYLE_OPTIONS: { id: TextStyle; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Clean text with shadow' },
  { id: 'highlight', label: 'Highlight', desc: 'Colored box behind text' },
  { id: 'outline', label: 'Outline', desc: 'Text stroke, no fill' },
  { id: 'neon', label: 'Neon', desc: 'Glowing text effect' },
  { id: 'typewriter', label: 'Typewriter', desc: 'Monospace with dark strip' },
  { id: 'strong', label: 'Strong', desc: 'Big bold italic serif' },
]

const HIGHLIGHT_COLORS = [
  { id: '#000000', label: 'Black' },
  { id: '#FFFFFF', label: 'White' },
  { id: '#E11D48', label: 'Pink' },
  { id: '#2563EB', label: 'Blue' },
  { id: '#16A34A', label: 'Green' },
  { id: '#9333EA', label: 'Purple' },
  { id: '#EA580C', label: 'Orange' },
]

const COLOR_OPTIONS = [
  { id: '#FFFFFF', label: 'White' },
  { id: '#000000', label: 'Black' },
  { id: '#F59E0B', label: 'Gold' },
  { id: '#EF4444', label: 'Red' },
  { id: '#3B82F6', label: 'Blue' },
  { id: '#10B981', label: 'Green' },
]

interface CarouselBuilderProps {
  initialTexts?: string[]  // Pre-filled slide texts from Create wizard
  compact?: boolean        // Compact mode for inline embedding
}

export default function CarouselBuilder({ initialTexts, compact }: CarouselBuilderProps = {}) {
  // Image upload
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Content
  const [topic, setTopic] = useState(initialTexts?.length ? 'From script' : '')
  const [slideCount, setSlideCount] = useState(7)

  // Style
  const [carouselStyle, setCarouselStyle] = useState<CarouselStyle>({
    fontFamily: 'Inter, Helvetica, Arial, sans-serif',
    textColor: '#FFFFFF',
    overlayOpacity: 0.4,
    position: 'center',
    fontWeight: 'bold',
    textStyle: 'classic',
    highlightColor: '#000000',
  })

  // Results
  const [slides, setSlides] = useState<SlideData[]>([])
  const [slideTexts, setSlideTexts] = useState<string[]>(initialTexts || [])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [editingSlide, setEditingSlide] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  // State
  const [generating, setGenerating] = useState(false)
  const [recompositing, setRecompositing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBackgroundImage(file)
    const reader = new FileReader()
    reader.onload = () => setBackgroundPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    setBackgroundImage(file)
    const reader = new FileReader()
    reader.onload = () => setBackgroundPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleGenerate = async () => {
    if (!backgroundImage || !topic.trim()) return
    setGenerating(true)
    setError(null)
    setSlides([])

    try {
      const formData = new FormData()
      formData.append('image', backgroundImage)
      formData.append('topic', topic.trim())
      formData.append('slideCount', slideCount.toString())
      formData.append('fontFamily', carouselStyle.fontFamily)
      formData.append('textColor', carouselStyle.textColor)
      formData.append('overlayOpacity', carouselStyle.overlayOpacity.toString())
      formData.append('position', carouselStyle.position)
      formData.append('fontWeight', carouselStyle.fontWeight)
      formData.append('textStyle', carouselStyle.textStyle)
      formData.append('highlightColor', carouselStyle.highlightColor)

      const res = await fetch('/api/studio/carousel/text', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      setSlides(data.slides)
      setSlideTexts(data.texts)
      setCurrentSlide(0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleEditStart = (index: number) => {
    setEditingSlide(index)
    setEditText(slideTexts[index])
  }

  const handleEditSave = async () => {
    if (editingSlide === null || !backgroundImage) return
    setRecompositing(true)

    try {
      const formData = new FormData()
      formData.append('image', backgroundImage)
      formData.append('text', editText)
      formData.append('fontFamily', carouselStyle.fontFamily)
      formData.append('textColor', carouselStyle.textColor)
      formData.append('overlayOpacity', carouselStyle.overlayOpacity.toString())
      formData.append('position', carouselStyle.position)
      formData.append('fontWeight', carouselStyle.fontWeight)
      formData.append('textStyle', carouselStyle.textStyle)
      formData.append('highlightColor', carouselStyle.highlightColor)
      formData.append('outputPath', slides[editingSlide].storage_path)

      const res = await fetch('/api/studio/carousel/recomposite', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Recomposite failed')

      const data = await res.json()

      // Update slide
      const newSlides = [...slides]
      newSlides[editingSlide] = {
        ...newSlides[editingSlide],
        text: editText,
        image_url: data.image_url + '?t=' + Date.now(), // bust cache
      }
      setSlides(newSlides)

      const newTexts = [...slideTexts]
      newTexts[editingSlide] = editText
      setSlideTexts(newTexts)

      setEditingSlide(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRecompositing(false)
    }
  }

  const handleRecompositAll = async () => {
    if (!backgroundImage || slides.length === 0) return
    setGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', backgroundImage)
      formData.append('customSlides', JSON.stringify(slideTexts))
      formData.append('slideCount', slideTexts.length.toString())
      formData.append('fontFamily', carouselStyle.fontFamily)
      formData.append('textColor', carouselStyle.textColor)
      formData.append('overlayOpacity', carouselStyle.overlayOpacity.toString())
      formData.append('position', carouselStyle.position)
      formData.append('fontWeight', carouselStyle.fontWeight)
      formData.append('textStyle', carouselStyle.textStyle)
      formData.append('highlightColor', carouselStyle.highlightColor)

      const res = await fetch('/api/studio/carousel/text', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Recomposite failed')

      const data = await res.json()
      setSlides(data.slides)
      setCurrentSlide(0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [zipping, setZipping] = useState(false)

  const handleDownloadZip = async () => {
    setZipping(true)
    try {
      await downloadSlidesAsZip(slides.map(s => s.image_url), topic)
    } finally {
      setZipping(false)
    }
  }

  const handleDownloadSlide = async (slide: SlideData) => {
    const res = await fetch(slide.image_url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `carousel-slide-${slide.slide_number}.png`
    a.click()
  }

  const handleSaveToLibrary = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'carousel',
          title: topic ? `Carousel: ${topic}` : `Carousel ${new Date().toLocaleDateString()}`,
          platform: 'carousel',
          slideUrls: slides.map(s => s.image_url),
          scriptData: {
            slides: slides.map(s => ({ text: s.text, image_url: s.image_url })),
            style: carouselStyle,
          },
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.builder}>
      {slides.length === 0 ? (
        /* Setup phase */
        <div className={styles.setup}>
          {/* Upload */}
          <div className={styles.section}>
            <label className={styles.label}>Background Image</label>
            <p className={styles.hint}>This image stays the same on every slide. Text overlay changes.</p>
            {backgroundPreview ? (
              <div className={styles.uploadedPreview}>
                <img src={backgroundPreview} alt="Background" className={styles.previewImg} />
                <button className={styles.clearBtn} onClick={() => {
                  setBackgroundImage(null)
                  setBackgroundPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload size={20} />
                <span>Drop image or click to upload</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} hidden />
          </div>

          {/* Topic */}
          <div className={styles.section}>
            <label className={styles.label}>Topic</label>
            <textarea
              className={styles.input}
              placeholder="What is this carousel about? e.g. 5 tips for starting a paper craft business..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              rows={2}
            />
          </div>

          {/* Slide count */}
          <div className={styles.section}>
            <label className={styles.label}>Slides: {slideCount}</label>
            <input
              type="range"
              min={3}
              max={10}
              value={slideCount}
              onChange={e => setSlideCount(parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>

          {/* Text style (IG-style) */}
          <div className={styles.section}>
            <label className={styles.label}>Text Style</label>
            <div className={styles.pillRow}>
              {TEXT_STYLE_OPTIONS.map(ts => (
                <button
                  key={ts.id}
                  className={`${styles.pill} ${carouselStyle.textStyle === ts.id ? styles.pillActive : ''}`}
                  onClick={() => setCarouselStyle(s => ({ ...s, textStyle: ts.id }))}
                  title={ts.desc}
                >
                  {ts.label}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight color (only shown for highlight style) */}
          {carouselStyle.textStyle === 'highlight' && (
            <div className={styles.section}>
              <label className={styles.label}>Highlight Color</label>
              <div className={styles.pillRow}>
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.id}
                    className={`${styles.colorPill} ${carouselStyle.highlightColor === c.id ? styles.colorPillActive : ''}`}
                    onClick={() => setCarouselStyle(s => ({ ...s, highlightColor: c.id }))}
                  >
                    <span className={styles.colorDot} style={{ background: c.id, border: c.id === '#FFFFFF' ? '1px solid #ccc' : 'none' }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Style controls */}
          <div className={styles.section}>
            <label className={styles.label}>Font</label>
            <div className={styles.pillRow}>
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.id}
                  className={`${styles.pill} ${carouselStyle.fontFamily === f.id ? styles.pillActive : ''}`}
                  onClick={() => setCarouselStyle(s => ({ ...s, fontFamily: f.id }))}
                  style={{ fontFamily: f.id }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Text Color</label>
            <div className={styles.pillRow}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.id}
                  className={`${styles.colorPill} ${carouselStyle.textColor === c.id ? styles.colorPillActive : ''}`}
                  onClick={() => setCarouselStyle(s => ({ ...s, textColor: c.id }))}
                >
                  <span className={styles.colorDot} style={{ background: c.id, border: c.id === '#FFFFFF' ? '1px solid #ccc' : 'none' }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Overlay Darkness: {Math.round(carouselStyle.overlayOpacity * 100)}%</label>
            <input
              type="range"
              min={0}
              max={80}
              value={Math.round(carouselStyle.overlayOpacity * 100)}
              onChange={e => setCarouselStyle(s => ({ ...s, overlayOpacity: parseInt(e.target.value) / 100 }))}
              className={styles.slider}
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Text Position</label>
            <div className={styles.pillRow}>
              {(['top', 'center', 'bottom'] as const).map(p => (
                <button
                  key={p}
                  className={`${styles.pill} ${carouselStyle.position === p ? styles.pillActive : ''}`}
                  onClick={() => setCarouselStyle(s => ({ ...s, position: p }))}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Font Weight</label>
            <div className={styles.pillRow}>
              {(['normal', 'bold', 'black'] as const).map(w => (
                <button
                  key={w}
                  className={`${styles.pill} ${carouselStyle.fontWeight === w ? styles.pillActive : ''}`}
                  onClick={() => setCarouselStyle(s => ({ ...s, fontWeight: w }))}
                >
                  <span style={{ fontWeight: w === 'black' ? 900 : w }}>{w.charAt(0).toUpperCase() + w.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating || !backgroundImage || !topic.trim()}
          >
            {generating ? (
              <><div className={styles.spinnerSmall} /> Generating slides...</>
            ) : (
              <><Sparkles size={16} /> Generate Carousel</>
            )}
          </button>
        </div>
      ) : (
        /* Results phase */
        <div className={styles.results}>
          {/* Carousel preview */}
          <div className={styles.previewSection}>
            <div className={styles.slideViewer}>
              <button
                className={styles.navArrow}
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft size={20} />
              </button>

              <div className={styles.slideFrame}>
                <img src={slides[currentSlide]?.image_url} alt={`Slide ${currentSlide + 1}`} className={styles.slideImg} />
                <div className={styles.slideCounter}>{currentSlide + 1} / {slides.length}</div>
              </div>

              <button
                className={styles.navArrow}
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Slide thumbnails */}
            <div className={styles.thumbStrip}>
              {slides.map((slide, i) => (
                <button
                  key={i}
                  className={`${styles.thumb} ${currentSlide === i ? styles.thumbActive : ''}`}
                  onClick={() => setCurrentSlide(i)}
                >
                  <img src={slide.image_url} alt={`Slide ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Slide text editor */}
          <div className={styles.textEditor}>
            <label className={styles.label}>Slide {currentSlide + 1} Text</label>
            {editingSlide === currentSlide ? (
              <div className={styles.editArea}>
                <textarea
                  className={styles.editInput}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={4}
                  autoFocus
                />
                <div className={styles.editActions}>
                  <button className={styles.saveBtn} onClick={handleEditSave} disabled={recompositing}>
                    {recompositing ? 'Updating...' : 'Save & Recomposite'}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setEditingSlide(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className={styles.textPreview} onClick={() => handleEditStart(currentSlide)}>
                <p>{slideTexts[currentSlide]}</p>
                <Edit3 size={14} className={styles.editIcon} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.resultActions}>
            <button className={styles.actionBtn} onClick={handleRecompositAll} disabled={generating}>
              <RotateCw size={14} /> {generating ? 'Updating...' : 'Apply Style Changes'}
            </button>
            <button className={styles.actionBtn} onClick={() => handleDownloadSlide(slides[currentSlide])}>
              <Download size={14} /> Download Slide
            </button>
            <button className={styles.actionBtnPrimary} onClick={handleDownloadZip} disabled={zipping}>
              <FileDown size={14} /> {zipping ? 'Zipping...' : 'Download ZIP'}
            </button>
            <button className={styles.actionBtn} onClick={handleSaveToLibrary} disabled={saving || saved}>
              {saved ? <Check size={14} /> : <Save size={14} />} {saved ? 'Saved' : saving ? 'Saving...' : 'Save to Library'}
            </button>
            <button className={styles.actionBtn} onClick={() => { setSlides([]); setSlideTexts([]) }}>
              Start Over
            </button>
          </div>

          {/* Style controls (collapsed) */}
          <details className={styles.styleDetails}>
            <summary className={styles.styleSummary}>Style Controls</summary>
            <div className={styles.inlineStyles}>
              <div className={styles.section}>
                <label className={styles.label}>Font</label>
                <div className={styles.pillRow}>
                  {FONT_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      className={`${styles.pill} ${carouselStyle.fontFamily === f.id ? styles.pillActive : ''}`}
                      onClick={() => setCarouselStyle(s => ({ ...s, fontFamily: f.id }))}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.section}>
                <label className={styles.label}>Color</label>
                <div className={styles.pillRow}>
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      className={`${styles.colorPill} ${carouselStyle.textColor === c.id ? styles.colorPillActive : ''}`}
                      onClick={() => setCarouselStyle(s => ({ ...s, textColor: c.id }))}
                    >
                      <span className={styles.colorDot} style={{ background: c.id }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.section}>
                <label className={styles.label}>Overlay: {Math.round(carouselStyle.overlayOpacity * 100)}%</label>
                <input
                  type="range" min={0} max={80}
                  value={Math.round(carouselStyle.overlayOpacity * 100)}
                  onChange={e => setCarouselStyle(s => ({ ...s, overlayOpacity: parseInt(e.target.value) / 100 }))}
                  className={styles.slider}
                />
              </div>
              <p className={styles.hint}>Click "Apply Style Changes" after adjusting to update all slides.</p>
            </div>
          </details>

          {error && <div className={styles.errorMsg}>{error}</div>}
        </div>
      )}
    </div>
  )
}
