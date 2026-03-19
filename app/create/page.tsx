'use client'

/**
 * Unified Create Page — One page for all content types.
 * 
 * Content type is a pill selector at the top.
 * Topic is OPTIONAL — AI suggests ideas from KB.
 * Minimal form: just pick type, optionally add idea, hit create.
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Wand2, ChevronDown, Package } from 'lucide-react'
import styles from './create.module.css'

type ContentType = 'script' | 'ad' | 'post' | 'youtube'
type ContentPurpose = 'educate' | 'story' | 'sell' | 'prove' | 'trend' | 'inspire'

interface Product {
  id: string
  name: string
  price: number | null
}

interface GeneratedResult {
  type: ContentType
  title: string
  content: string
  metadata?: Record<string, unknown>
  image_url?: string
  quality_score?: number
}

const CONTENT_TYPES: { id: ContentType; label: string; emoji: string }[] = [
  { id: 'script', label: 'Script', emoji: '📱' },
  { id: 'ad', label: 'Ad', emoji: '🎯' },
  { id: 'post', label: 'Post', emoji: '📸' },
  { id: 'youtube', label: 'YouTube', emoji: '🎬' },
]

const PURPOSES: { id: ContentPurpose; label: string; emoji: string }[] = [
  { id: 'educate', label: 'Teach something', emoji: '📚' },
  { id: 'story', label: 'Share a story', emoji: '💬' },
  { id: 'sell', label: 'Promote a product', emoji: '🛍️' },
  { id: 'prove', label: 'Show results', emoji: '⭐' },
  { id: 'trend', label: 'Join a trend', emoji: '🔥' },
  { id: 'inspire', label: 'Inspire others', emoji: '✨' },
]

function CreatePageInner() {
  const searchParams = useSearchParams()
  
  // Form state
  const [contentType, setContentType] = useState<ContentType>('script')
  const [purpose, setPurpose] = useState<ContentPurpose | null>(null)
  const [idea, setIdea] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [showProductSelect, setShowProductSelect] = useState(false)
  
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [suggestedIdeas, setSuggestedIdeas] = useState<string[]>([])
  
  // Generation state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from query params
  useEffect(() => {
    const topic = searchParams.get('topic')
    const purposeParam = searchParams.get('purpose') as ContentPurpose | null
    const type = searchParams.get('type') as ContentType | null
    if (topic) setIdea(topic)
    if (purposeParam) setPurpose(purposeParam)
    if (type) setContentType(type)
  }, [searchParams])

  // Load products
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('product_catalog')
      .select('id, name, price')
      .then(({ data }) => {
        if (data) setProducts(data)
      })
  }, [])

  // Show product select for ads
  useEffect(() => {
    setShowProductSelect(contentType === 'ad' || purpose === 'sell')
  }, [contentType, purpose])

  // Load suggested ideas when type/purpose changes
  useEffect(() => {
    loadSuggestions()
  }, [contentType, purpose])

  async function loadSuggestions() {
    try {
      const res = await fetch(`/api/calendar/suggest?lane=${contentType}&limit=3${purpose ? `&purpose=${purpose}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions) {
          setSuggestedIdeas(data.suggestions.map((s: { topic: string }) => s.topic))
        }
      }
    } catch {
      // Suggestions are non-critical
    }
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let endpoint: string
      let body: Record<string, unknown>

      switch (contentType) {
        case 'script':
          endpoint = '/api/create/short-form'
          body = {
            topic: idea || undefined,
            content_purpose: purpose || undefined,
            platform: 'instagram-reels',
            style: 'hook-first',
            target_duration: 45,
          }
          break
        case 'ad':
          endpoint = '/api/create/ad'
          body = {
            product_name: selectedProduct ? products.find(p => p.id === selectedProduct)?.name : idea,
            offer_details: idea || 'Special offer',
            content_purpose: purpose || undefined,
            platform: 'facebook',
            variants: 1,
            generate_image: false,
          }
          break
        case 'post':
          endpoint = '/api/create/social-post'
          body = {
            topic: idea || undefined,
            content_purpose: purpose || undefined,
            platform: 'instagram',
          }
          break
        case 'youtube':
          endpoint = '/api/create/youtube-script'
          body = {
            topic: idea || undefined,
            content_purpose: purpose || undefined,
            target_duration: 480,
          }
          break
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Generation failed (${res.status})`)
      }

      const data = await res.json()
      
      // Normalize response
      setResult(normalizeResult(contentType, data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function normalizeResult(type: ContentType, data: Record<string, unknown>): GeneratedResult {
    switch (type) {
      case 'script': {
        const scenes = (data.scenes as Array<{ scene_number: number; visual: string; voiceover: string }>) || []
        return {
          type,
          title: (data.hook as string) || 'Your Script',
          content: scenes.map((s) => `**Scene ${s.scene_number}:** ${s.voiceover}`).join('\n\n'),
          quality_score: data.quality_score as number,
          metadata: data as Record<string, unknown>,
        }
      }
      case 'ad': {
        const variants = (data.variants as Array<{ headline: string; primary_text: string }>) || []
        const v = variants[0]
        return {
          type,
          title: v?.headline || 'Your Ad',
          content: v?.primary_text || '',
          image_url: data.image_url as string,
          quality_score: data.quality_score as number,
          metadata: data as Record<string, unknown>,
        }
      }
      case 'post':
        return {
          type,
          title: 'Your Social Post',
          content: (data.caption as string) || '',
          metadata: data as Record<string, unknown>,
        }
      case 'youtube': {
        const script = data.script || data
        return {
          type,
          title: (script as Record<string, unknown>).title as string || 'Your YouTube Script',
          content: (script as Record<string, unknown>).hook as string || '',
          metadata: data as Record<string, unknown>,
        }
      }
    }
  }

  return (
    <div className={styles.page}>
      {/* Content Type Pills */}
      <div className={styles.typePills}>
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            className={`${styles.pill} ${contentType === t.id ? styles.pillActive : ''}`}
            onClick={() => setContentType(t.id)}
          >
            <span className={styles.pillEmoji}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Purpose chips */}
      <div className={styles.section}>
        <label className={styles.label}>What&apos;s the goal?</label>
        <div className={styles.purposeChips}>
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              className={`${styles.chip} ${purpose === p.id ? styles.chipActive : ''}`}
              onClick={() => setPurpose(purpose === p.id ? null : p.id)}
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Idea input — optional */}
      <div className={styles.section}>
        <label className={styles.label}>
          Got an idea? <span className={styles.optional}>(optional — we&apos;ll suggest one)</span>
        </label>
        <textarea
          className={styles.textarea}
          placeholder={contentType === 'ad' 
            ? "What are you promoting?" 
            : "Share your idea or leave blank for AI suggestions..."}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={2}
        />
        
        {/* Suggested ideas */}
        {suggestedIdeas.length > 0 && !idea && (
          <div className={styles.suggestions}>
            {suggestedIdeas.map((s, i) => (
              <button
                key={i}
                className={styles.suggestionChip}
                onClick={() => setIdea(s)}
              >
                <Sparkles size={12} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product select — only for ads / sell purpose */}
      {showProductSelect && products.length > 0 && (
        <div className={styles.section}>
          <label className={styles.label}>Which product?</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">Choose a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.price ? ` — ₱${p.price.toLocaleString()}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={styles.selectIcon} />
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        className={styles.generateBtn}
        onClick={handleGenerate}
        disabled={loading || (contentType === 'ad' && !idea && !selectedProduct)}
      >
        {loading ? (
          <>
            <div className={styles.spinner} />
            Creating...
          </>
        ) : (
          <>
            <Wand2 size={18} />
            Create {CONTENT_TYPES.find(t => t.id === contentType)?.label}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={styles.result}>
          <div className={styles.resultHeader}>
            <h2 className={styles.resultTitle}>{result.title}</h2>
            {result.quality_score && (
              <span className={styles.qualityBadge}>
                {Math.round(result.quality_score * 100)}%
              </span>
            )}
          </div>
          
          {result.image_url && (
            <img src={result.image_url} alt="" className={styles.resultImage} />
          )}
          
          <div className={styles.resultContent}>
            {result.content.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Quick actions */}
          <div className={styles.resultActions}>
            <button className={styles.actionBtn} onClick={() => {
              navigator.clipboard.writeText(result.content)
            }}>
              Copy
            </button>
            <button className={styles.actionBtn} onClick={() => {
              setResult(null)
              handleGenerate()
            }}>
              Regenerate
            </button>
          </div>
        </div>
      )}
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
