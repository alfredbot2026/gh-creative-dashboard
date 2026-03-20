'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Film, Image as ImageIcon, LayoutTemplate, PlaySquare, Video, CheckCircle2, Copy, Save, Sparkles, RefreshCcw } from 'lucide-react'
import styles from './create.module.css'

type Step = 'select' | 'loading' | 'results'
type Platform = 'reels' | 'tiktok' | 'facebook-post' | 'facebook-ad' | 'youtube' | 'carousel' | 'static-image'
type ContentType = 'educate' | 'story' | 'prove' | 'sell'

// Platforms that support image generation
const VISUAL_PLATFORMS: Platform[] = ['facebook-ad', 'static-image', 'carousel', 'facebook-post']

interface Product {
  id: string
  name: string
  price: number | null
}

interface Variant {
  id: string
  number: number
  hook: string
  content: any
  qualityScore: number
  imageUrl?: string
  imageStoragePath?: string
}

const PLATFORMS: { id: Platform; label: string; desc: string; icon: any }[] = [
  { id: 'reels', label: 'Reels / TikTok', desc: 'Short video script with scenes', icon: Video },
  { id: 'facebook-post', label: 'Facebook Post', desc: 'Caption and hashtags', icon: LayoutTemplate },
  { id: 'facebook-ad', label: 'Facebook Ad', desc: 'Headline, copy, and image prompt', icon: Sparkles },
  { id: 'youtube', label: 'YouTube Video', desc: 'Full script with sections', icon: PlaySquare },
  { id: 'carousel', label: 'Instagram Carousel', desc: 'Slide-by-slide content', icon: Film },
  { id: 'static-image', label: 'Static Image', desc: 'Single image prompt & copy', icon: ImageIcon },
]

const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: 'educate', label: 'Teach something' },
  { id: 'story', label: 'Tell a story' },
  { id: 'prove', label: 'Show proof' },
  { id: 'sell', label: 'Promote & sell' },
]

function CreatePageInner() {
  const [step, setStep] = useState<Step>('select')
  const [platform, setPlatform] = useState<Platform>('reels')
  const [contentType, setContentType] = useState<ContentType>('educate')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [products, setProducts] = useState<Product[]>([])
  
  const [topic, setTopic] = useState('')
  const [showTopicInput, setShowTopicInput] = useState(false)
  const [generateImages, setGenerateImages] = useState(false)
  
  const [results, setResults] = useState<Variant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  
  const isVisualPlatform = VISUAL_PLATFORMS.includes(platform)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('product_catalog')
      .select('id, name, price')
      .then(({ data }) => {
        if (data) setProducts(data)
      })
  }, [])

  async function handleGenerate() {
    setStep('loading')
    setError(null)
    setSavedIds(new Set())
    
    try {
      const res = await fetch('/api/create/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          contentType,
          productId: selectedProduct || undefined,
          topic: topic.trim() || undefined,
          generateImages: isVisualPlatform && generateImages,
          variants: 3
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Generation failed (${res.status})`)
      }

      const data = await res.json()
      setResults(data.variants)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('select')
    }
  }

  function handleCopy(variant: Variant) {
    // Basic text extraction for clipboard
    let text = `Hook: ${variant.hook}\n\n`
    
    if (variant.content.scenes) {
      text += variant.content.scenes.map((s: any) => `Scene ${s.sceneNumber}:\nVisual: ${s.visual}\nAudio: ${s.voiceover}`).join('\n\n')
    } else if (variant.content.headline) {
      text += `Headline: ${variant.content.headline}\nCopy: ${variant.content.primaryText || variant.content.subtext}\nImage Idea: ${variant.content.imagePrompt}`
    } else if (variant.content.caption) {
      text += `Caption: ${variant.content.caption}\nHashtags: ${variant.content.hashtags?.join(' ')}`
    } else if (variant.content.sections) {
      text += variant.content.sections.map((s: any) => `[${s.timestamp}] ${s.content}`).join('\n\n')
    } else if (variant.content.slides) {
      text += variant.content.slides.map((s: any, i: number) => `Slide ${i+1}:\nText: ${s.text}\nVisual: ${s.imagePrompt}`).join('\n\n')
    }

    navigator.clipboard.writeText(text)
    setCopiedId(variant.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleSave(variant: Variant) {
    if (savedIds.has(variant.id)) return
    setSavingId(variant.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: saveError } = await supabase.from('content_items').insert({
        title: variant.hook.substring(0, 200),
        hook: variant.hook,
        content_type: contentType,
        platform,
        script_data: variant,
        ai_generated: true,
        status: 'draft',
        user_id: user?.id,
      })
      
      if (saveError) throw saveError
      setSavedIds(prev => new Set(prev).add(variant.id))
    } catch (err) {
      console.error('Save failed:', err)
      setError('Failed to save — are you logged in?')
    } finally {
      setSavingId(null)
    }
  }

  function renderVariantContent(content: any) {
    if (content.scenes) {
      return (
        <div className={styles.variantDetails}>
          {content.scenes.map((s: any, i: number) => (
            <div key={i} className={styles.sceneRow}>
              <div className={styles.sceneMeta}>Scene {s.sceneNumber}</div>
              <div className={styles.sceneVisual}>[{s.visual}]</div>
              <div className={styles.sceneAudio}>{s.voiceover}</div>
            </div>
          ))}
        </div>
      )
    }
    
    if (content.headline) {
      return (
        <div className={styles.variantDetails}>
          <div className={styles.contentBlock}><strong>Headline:</strong> {content.headline}</div>
          <div className={styles.contentBlock}><strong>Copy:</strong> {content.primaryText || content.subtext}</div>
          <div className={styles.contentBlock}><em>Image Idea: {content.imagePrompt}</em></div>
        </div>
      )
    }

    if (content.caption) {
      return (
        <div className={styles.variantDetails}>
          <div className={styles.contentBlock}>{content.caption}</div>
          <div className={styles.contentBlock}><em>{content.hashtags?.join(' ')}</em></div>
        </div>
      )
    }

    if (content.sections) {
      return (
        <div className={styles.variantDetails}>
          {content.sections.map((s: any, i: number) => (
            <div key={i} className={styles.sceneRow}>
              <div className={styles.sceneMeta}>{s.timestamp}</div>
              <div className={styles.sceneAudio}>{s.content}</div>
              <div className={styles.sceneVisual}>[{s.visual}]</div>
            </div>
          ))}
        </div>
      )
    }
    
    if (content.slides) {
      return (
        <div className={styles.variantDetails}>
          {content.slides.map((s: any, i: number) => (
            <div key={i} className={styles.sceneRow}>
              <div className={styles.sceneMeta}>Slide {i+1}</div>
              <div className={styles.sceneAudio}>{s.text}</div>
              <div className={styles.sceneVisual}>[{s.imagePrompt}]</div>
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  const showProductSelect = contentType === 'sell' && platform === 'facebook-ad'

  if (step === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} style={{ opacity: 0.7 }} />
          <div className={styles.skeletonCard} style={{ opacity: 0.4 }} />
          <h2 className={styles.loadingText}>Creating your content...</h2>
        </div>
      </div>
    )
  }

  if (step === 'results') {
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || 'Content'
    return (
      <div className={styles.page}>
        <div className={styles.resultsHeader}>
          <h1 className={styles.pageTitle}>Your {platformLabel} Scripts</h1>
          <span className={styles.resultsBadge}>3 variants · {CONTENT_TYPES.find(c => c.id === contentType)?.label}</span>
        </div>

        <div className={styles.resultsList}>
          {results.map((variant) => (
            <div key={variant.id} className={styles.resultCard}>
              <div className={styles.cardHeader}>
                <div className={styles.variantNumber}>{variant.number}</div>
                <div className={styles.scoreBadge}>
                  <Sparkles size={12} /> {variant.qualityScore}%
                </div>
              </div>
              
              <h2 className={styles.hookText}>{variant.hook}</h2>
              
              {variant.imageUrl && (
                <div className={styles.variantImage}>
                  <img src={variant.imageUrl} alt={`Variant ${variant.number}`} />
                </div>
              )}
              
              {renderVariantContent(variant.content)}

              <div className={styles.cardActions}>
                <button className={styles.btnOutline} onClick={() => handleCopy(variant)}>
                  {copiedId === variant.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedId === variant.id ? 'Copied' : 'Copy'}
                </button>
                <button 
                  className={styles.btnFilled} 
                  onClick={() => handleSave(variant)}
                  disabled={savedIds.has(variant.id) || savingId === variant.id}
                >
                  {savedIds.has(variant.id) ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {savedIds.has(variant.id) ? 'Saved ✓' : savingId === variant.id ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.bottomActions}>
          <button className={styles.btnSecondary} onClick={handleGenerate}>
            <RefreshCcw size={16} /> Create 3 More
          </button>
          <button className={styles.linkBtn} onClick={() => setStep('select')}>
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>What are you creating?</h1>
        <p className={styles.subtitle}>Select your medium and let us handle the rest.</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <label className={styles.sectionLabel}>Select Platform</label>
        <div className={styles.platformList}>
          {PLATFORMS.map((p) => {
            const isSelected = platform === p.id
            const Icon = p.icon
            return (
              <button
                key={p.id}
                className={`${styles.platformRow} ${isSelected ? styles.platformSelected : ''}`}
                onClick={() => setPlatform(p.id)}
              >
                <div className={styles.platformIconWrapper}>
                  <Icon size={20} className={isSelected ? styles.iconSelected : styles.iconMuted} />
                </div>
                <div className={styles.platformInfo}>
                  <span className={styles.platformName}>{p.label}</span>
                </div>
                {isSelected && <CheckCircle2 size={20} className={styles.checkIcon} />}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.sectionLabel}>What's the goal?</label>
        <div className={styles.chipsContainer}>
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.id}
              className={`${styles.chip} ${contentType === c.id ? styles.chipSelected : ''}`}
              onClick={() => setContentType(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {showProductSelect && (
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Which product?</label>
          <select
            className={styles.select}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">Choose a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.price ? `— ₱${p.price}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Optional topic/idea input */}
      <div className={styles.section}>
        {!showTopicInput ? (
          <button 
            className={styles.topicToggle} 
            onClick={() => setShowTopicInput(true)}
          >
            Got a specific idea? <span className={styles.topicToggleHint}>optional</span>
          </button>
        ) : (
          <>
            <label className={styles.sectionLabel}>Topic or Idea <span className={styles.optionalBadge}>optional</span></label>
            <textarea
              className={styles.topicInput}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. How to make stickers using Canva, or a story about your first Shopee sale..."
              rows={3}
            />
          </>
        )}
      </div>

      {/* Image generation toggle — only for visual platforms */}
      {isVisualPlatform && (
        <div className={styles.section}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Generate images</span>
              <span className={styles.toggleDesc}>AI images using Grace's reference photos</span>
            </div>
            <button
              className={`${styles.toggleSwitch} ${generateImages ? styles.toggleOn : ''}`}
              onClick={() => setGenerateImages(!generateImages)}
              role="switch"
              aria-checked={generateImages}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>
      )}

      <div className={styles.actionSection}>
        <button className={styles.generateBtn} onClick={handleGenerate}>
          Create 3 Variants{generateImages && isVisualPlatform ? ' + Images' : ''}
        </button>
      </div>
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  )
}
