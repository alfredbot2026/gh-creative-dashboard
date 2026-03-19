'use client'

/**
 * Unified Create Page — Purpose-first, format-second.
 * 
 * Grace doesn't think "I need a script vs an ad."
 * She thinks "I want to promote my course" or "I want to teach something."
 * 
 * Flow:
 * 1. What's the goal? (purpose chips)
 * 2. Any specific idea? (optional — AI suggests from KB)
 * 3. Where's it going? (platform — determines output format)
 * 4. Create → AI generates the right content for that platform
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './create.module.css'

type Platform = 'instagram-reels' | 'facebook-ad' | 'instagram-post' | 'youtube' | 'tiktok'
type ContentPurpose = 'educate' | 'story' | 'sell' | 'prove' | 'trend' | 'inspire'

interface Product {
  id: string
  name: string
  price: number | null
}

interface GeneratedResult {
  title: string
  content: string
  metadata?: Record<string, unknown>
  image_url?: string
  quality_score?: number
}

const PURPOSES: { id: ContentPurpose; label: string }[] = [
  { id: 'educate', label: 'Teach something' },
  { id: 'story', label: 'Share a story' },
  { id: 'sell', label: 'Promote a product' },
  { id: 'prove', label: 'Show results' },
  { id: 'trend', label: 'Ride a trend' },
  { id: 'inspire', label: 'Inspire someone' },
]

const PLATFORMS: { id: Platform; label: string; description: string }[] = [
  { id: 'instagram-reels', label: 'Reels / TikTok', description: 'Short video script with scenes' },
  { id: 'instagram-post', label: 'Instagram Post', description: 'Caption, hashtags, image idea' },
  { id: 'facebook-ad', label: 'Facebook Ad', description: 'Headline, copy, and image' },
  { id: 'youtube', label: 'YouTube', description: 'Full script with timestamps' },
]

function CreatePageInner() {
  const searchParams = useSearchParams()
  
  const [purpose, setPurpose] = useState<ContentPurpose | null>(null)
  const [platform, setPlatform] = useState<Platform>('instagram-reels')
  const [idea, setIdea] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  
  const [products, setProducts] = useState<Product[]>([])
  const [suggestedIdeas, setSuggestedIdeas] = useState<string[]>([])
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Pre-fill from query params
  useEffect(() => {
    const topic = searchParams.get('topic')
    const purposeParam = searchParams.get('purpose') as ContentPurpose | null
    if (topic) setIdea(topic)
    if (purposeParam) setPurpose(purposeParam)
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

  // Load suggestions when purpose changes
  useEffect(() => {
    loadSuggestions()
  }, [purpose])

  async function loadSuggestions() {
    try {
      const lane = platform === 'facebook-ad' ? 'ads' : platform === 'youtube' ? 'youtube' : 'short-form'
      const res = await fetch(`/api/calendar/suggest?lane=${lane}&limit=3${purpose ? `&purpose=${purpose}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions) {
          setSuggestedIdeas(data.suggestions.map((s: { topic: string }) => s.topic))
        }
      }
    } catch {
      // Non-critical
    }
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let endpoint: string
      let body: Record<string, unknown>
      const productName = selectedProduct ? products.find(p => p.id === selectedProduct)?.name : undefined

      if (platform === 'instagram-reels' || platform === 'tiktok') {
        endpoint = '/api/create/short-form'
        body = {
          topic: idea || productName || undefined,
          content_purpose: purpose || undefined,
          platform: platform === 'tiktok' ? 'tiktok' : 'instagram-reels',
          style: 'hook-first',
          target_duration: 45,
        }
      } else if (platform === 'facebook-ad') {
        endpoint = '/api/create/ad'
        body = {
          product_name: productName || idea || 'Featured product',
          offer_details: idea || 'Special offer',
          content_purpose: purpose || 'sell',
          platform: 'facebook',
          variants: 1,
          generate_image: false,
        }
      } else if (platform === 'instagram-post') {
        endpoint = '/api/create/social-post'
        body = {
          topic: idea || productName || undefined,
          content_purpose: purpose || undefined,
          platform: 'instagram',
        }
      } else {
        endpoint = '/api/create/youtube-script'
        body = {
          topic: idea || productName || undefined,
          content_purpose: purpose || undefined,
          target_duration: 480,
        }
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
      setResult(normalizeResult(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function normalizeResult(data: Record<string, unknown>): GeneratedResult {
    // Script
    if (data.scenes) {
      const scenes = data.scenes as Array<{ scene_number: number; visual: string; voiceover: string }>
      return {
        title: (data.hook as string) || 'Your content',
        content: scenes.map(s => `**Scene ${s.scene_number}:** ${s.voiceover}\n_Visual: ${s.visual}_`).join('\n\n'),
        quality_score: data.quality_score as number,
        metadata: data,
      }
    }
    // Ad
    if (data.variants) {
      const variants = data.variants as Array<{ headline: string; primary_text: string }>
      const v = variants[0]
      return {
        title: v?.headline || 'Your ad',
        content: v?.primary_text || '',
        image_url: data.image_url as string,
        quality_score: data.quality_score as number,
        metadata: data,
      }
    }
    // Social post
    if (data.caption) {
      return {
        title: 'Your post',
        content: data.caption as string,
        metadata: data,
      }
    }
    // YouTube
    if (data.script) {
      const script = data.script as Record<string, unknown>
      return {
        title: script.title as string || 'Your script',
        content: script.hook as string || '',
        metadata: data,
      }
    }
    return { title: 'Your content', content: JSON.stringify(data, null, 2) }
  }

  function handleCopy() {
    if (result) {
      navigator.clipboard.writeText(result.content.replace(/\*\*/g, '').replace(/_/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const showProductSelect = purpose === 'sell' || platform === 'facebook-ad'

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>What do you want to create?</h1>

      {/* Purpose */}
      <div className={styles.section}>
        <div className={styles.chips}>
          {PURPOSES.map((p) => (
            <button
              key={p.id}
              className={`${styles.chip} ${purpose === p.id ? styles.chipActive : ''}`}
              onClick={() => setPurpose(purpose === p.id ? null : p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div className={styles.section}>
        <label className={styles.label}>Where is this going?</label>
        <div className={styles.platforms}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              className={`${styles.platformBtn} ${platform === p.id ? styles.platformActive : ''}`}
              onClick={() => setPlatform(p.id)}
            >
              <span className={styles.platformLabel}>{p.label}</span>
              <span className={styles.platformDesc}>{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Idea — optional */}
      <div className={styles.section}>
        <label className={styles.label}>
          Any specific idea? <span className={styles.optional}>optional</span>
        </label>
        <textarea
          className={styles.textarea}
          placeholder="Leave blank and we'll suggest something based on what's worked before..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={2}
        />
        
        {suggestedIdeas.length > 0 && !idea && (
          <div className={styles.suggestions}>
            {suggestedIdeas.map((s, i) => (
              <button
                key={i}
                className={styles.suggestionBtn}
                onClick={() => setIdea(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product — only when selling */}
      {showProductSelect && products.length > 0 && (
        <div className={styles.section}>
          <label className={styles.label}>Which product?</label>
          <select
            className={styles.select}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">Choose a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.price ? ` — ₱${p.price.toLocaleString()}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Generate */}
      <button
        className={styles.generateBtn}
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create'}
      </button>

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Result */}
      {result && (
        <div className={styles.result}>
          <h2 className={styles.resultTitle}>{result.title}</h2>
          
          {result.image_url && (
            <img src={result.image_url} alt="" className={styles.resultImage} />
          )}
          
          <div className={styles.resultContent}>
            {result.content.split('\n\n').map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ 
                __html: p
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/_(.*?)_/g, '<em>$1</em>')
              }} />
            ))}
          </div>

          <div className={styles.resultActions}>
            <button className={styles.actionBtn} onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy text'}
            </button>
            <button className={styles.actionBtn} onClick={() => {
              setResult(null)
              handleGenerate()
            }}>
              Try again
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
