'use client'

import { useState, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Download, RotateCw, User, Sparkles, Image as ImageIcon } from 'lucide-react'
import styles from './studio.module.css'

type AspectRatio = '1:1' | '9:16' | '4:5' | '16:9'
type StylePreset = 'product' | 'lifestyle' | 'promo' | 'bts'

const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: '1:1', label: '1:1 Feed' },
  { id: '9:16', label: '9:16 Story' },
  { id: '4:5', label: '4:5 Carousel' },
  { id: '16:9', label: '16:9 YouTube' },
]

const STYLE_PRESETS: { id: StylePreset; label: string; desc: string }[] = [
  { id: 'product', label: 'Product Shot', desc: 'Clean product on styled background' },
  { id: 'lifestyle', label: 'Lifestyle', desc: 'Product in real-life setting' },
  { id: 'promo', label: 'Promotional', desc: 'Sale or offer graphic' },
  { id: 'bts', label: 'Behind the Scenes', desc: 'Workspace, process, making-of' },
]

const LOADING_MESSAGES = [
  'Preparing your image...',
  'Analyzing reference photos...',
  'Generating with AI...',
  'Adding final touches...',
]

interface GeneratedImage {
  url: string
  storagePath: string
  prompt: string
}

function StudioPage() {
  // Upload state
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Options
  const [prompt, setPrompt] = useState('')
  const [includeGrace, setIncludeGrace] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [stylePreset, setStylePreset] = useState<StylePreset | null>(null)

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [result, setResult] = useState<GeneratedImage | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Gallery
  const [gallery, setGallery] = useState<GeneratedImage[]>([])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedImage(file)
    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    setUploadedImage(file)
    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const clearUpload = () => {
    setUploadedImage(null)
    setUploadPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) return
    setGenerating(true)
    setError(null)
    setResult(null)
    setLoadingPhase(0)

    const phaseInterval = setInterval(() => {
      setLoadingPhase(p => (p + 1) % LOADING_MESSAGES.length)
    }, 3000)

    try {
      const formData = new FormData()
      formData.append('prompt', prompt.trim())
      formData.append('aspectRatio', aspectRatio)
      formData.append('includeGrace', includeGrace.toString())
      if (stylePreset) formData.append('stylePreset', stylePreset)
      if (uploadedImage) formData.append('image', uploadedImage)

      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      const img: GeneratedImage = {
        url: data.image_url,
        storagePath: data.storage_path,
        prompt: data.prompt_used || prompt,
      }
      setResult(img)
      setGallery(prev => [img, ...prev])
    } catch (err: any) {
      setError(err.message)
    } finally {
      clearInterval(phaseInterval)
      setGenerating(false)
    }
  }

  const handleDownload = async (url: string) => {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `studio-${Date.now()}.png`
    a.click()
  }

  return (
    <div className={styles.studio}>
      <h1 className={styles.title}>Studio</h1>
      <p className={styles.subtitle}>Create images, composites, and carousels</p>

      <div className={styles.workspace}>
        {/* Left: Controls */}
        <div className={styles.controls}>
          {/* Upload zone */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Product Image</label>
            {uploadPreview ? (
              <div className={styles.uploadedPreview}>
                <img src={uploadPreview} alt="Uploaded" className={styles.previewImg} />
                <button className={styles.clearBtn} onClick={clearUpload}>
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
                <Upload size={20} className={styles.dropIcon} />
                <span>Drop image or click to upload</span>
                <span className={styles.dropHint}>Optional — for product shots</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              hidden
            />
          </div>

          {/* Prompt */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Describe what you want</label>
            <textarea
              className={styles.promptInput}
              placeholder="e.g. Grace holding a handmade journal in a cozy workspace, warm lighting..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Character toggle */}
          <div className={styles.section}>
            <button
              className={`${styles.toggleCard} ${includeGrace ? styles.toggleActive : ''}`}
              onClick={() => setIncludeGrace(!includeGrace)}
            >
              <User size={16} />
              <div>
                <span className={styles.toggleLabel}>Include Grace</span>
                <span className={styles.toggleDesc}>Use character reference photos for consistency</span>
              </div>
            </button>
          </div>

          {/* Style preset */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Style</label>
            <div className={styles.pillRow}>
              {STYLE_PRESETS.map(s => (
                <button
                  key={s.id}
                  className={`${styles.pill} ${stylePreset === s.id ? styles.pillActive : ''}`}
                  onClick={() => setStylePreset(stylePreset === s.id ? null : s.id)}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Aspect Ratio</label>
            <div className={styles.pillRow}>
              {ASPECT_RATIOS.map(ar => (
                <button
                  key={ar.id}
                  className={`${styles.pill} ${aspectRatio === ar.id ? styles.pillActive : ''}`}
                  onClick={() => setAspectRatio(ar.id)}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating || (!prompt.trim() && !uploadedImage)}
          >
            {generating ? (
              <>
                <div className={styles.spinnerSmall} />
                {LOADING_MESSAGES[loadingPhase]}
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate
              </>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div className={styles.resultPanel}>
          {result ? (
            <div className={styles.resultCard}>
              <img src={result.url} alt="Generated" className={styles.resultImg} />
              <div className={styles.resultActions}>
                <button className={styles.actionBtn} onClick={() => handleDownload(result.url)}>
                  <Download size={16} /> Download
                </button>
                <button className={styles.actionBtn} onClick={handleGenerate}>
                  <RotateCw size={16} /> Regenerate
                </button>
              </div>
            </div>
          ) : generating ? (
            <div className={styles.placeholder}>
              <div className={styles.spinner} />
              <p className={styles.placeholderText} key={loadingPhase}>{LOADING_MESSAGES[loadingPhase]}</p>
            </div>
          ) : (
            <div className={styles.placeholder}>
              <ImageIcon size={32} className={styles.placeholderIcon} />
              <p className={styles.placeholderText}>Your generated image will appear here</p>
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 1 && (
            <div className={styles.gallery}>
              <label className={styles.sectionLabel}>Recent</label>
              <div className={styles.galleryGrid}>
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    className={`${styles.galleryThumb} ${result?.url === img.url ? styles.galleryActive : ''}`}
                    onClick={() => setResult(img)}
                  >
                    <img src={img.url} alt={`Generated ${i + 1}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudioWrapper() {
  return (
    <Suspense>
      <StudioPage />
    </Suspense>
  )
}
