/**
 * Creative Factory — Generate ad variants with full business context.
 * 
 * Supports: static image, carousel, video script.
 * Shows what context was used for generation.
 * Links from strategy map pre-fill angle + persona.
 */
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface Variant {
  id: string
  headline: string
  body_text: string
  cta_text: string
  link_description: string
  hook_type: string
  framework: string
  emotional_tone: string
  image_prompt: string
  image_url: string | null
  image_status: string
  compliance_flags: string[] | null
  compliance_clean: boolean
}

interface BusinessInfo {
  product_name: string
  product_price: number
  winning_cpa: number
  target_audience: string
}

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

const CTA_LABELS: Record<string, string> = {
  SHOP_NOW: 'Shop Now', LEARN_MORE: 'Learn More', SIGN_UP: 'Sign Up',
  SEND_MESSAGE: 'Send Message', GET_OFFER: 'Get Offer',
}

const ANGLES = [
  'pain_point', 'aspiration', 'fear', 'social_proof', 'comparison',
  'education', 'urgency', 'curiosity', 'transformation', 'authority',
]
const PERSONAS = [
  'new_mom_curious', 'returning_buyer', 'price_sensitive',
  'aspirational', 'skeptic', 'beginner', 'advanced',
  'gift_buyer', 'busy_professional',
]
const FORMATS = [
  { value: 'static_image', label: '🖼️ Static Image', desc: 'Single image + copy — deploy immediately' },
  { value: 'carousel', label: '🎠 Carousel', desc: 'Multi-slide story with per-slide copy' },
  { value: 'video_script', label: '🎬 Video Script', desc: 'Script for Grace to record' },
]

function CreatePageInner() {
  const searchParams = useSearchParams()
  const angleParam = searchParams.get('angle') || ''
  const personaParam = searchParams.get('persona') || ''
  const formatParam = searchParams.get('format') || ''

  const [angle, setAngle] = useState(angleParam)
  const [persona, setPersona] = useState(personaParam)
  const [format, setFormat] = useState(formatParam || 'static_image')
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [contextUsed, setContextUsed] = useState<string[]>([])
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [genImage, setGenImage] = useState<Record<string, boolean>>({})

  const handleGenerate = async () => {
    if (!angle || !persona) return
    setGenerating(true)
    setError(null)
    setVariants([])
    setContextUsed([])

    try {
      const res = await fetch('/api/ads/factory/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle, persona, format, count }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setVariants(data.variants || [])
      setBatchId(data.batch_id)
      setContextUsed(data.context_used || [])
      setBusinessInfo(data.business || null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
    setGenerating(false)
  }

  const handleGenerateImage = async (variantId: string, prompt: string) => {
    setGenImage(prev => ({ ...prev, [variantId]: true }))
    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('aspectRatio', '1:1')
      const res = await fetch('/api/studio/generate', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.imageUrl) {
        setVariants(prev => prev.map(v =>
          v.id === variantId ? { ...v, image_url: data.imageUrl, image_status: 'ready' } : v
        ))
      }
    } catch { /* retry manually */ }
    setGenImage(prev => ({ ...prev, [variantId]: false }))
  }

  useEffect(() => {
    if (angleParam && personaParam && !variants.length && !generating) {
      handleGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const CONTEXT_LABELS: Record<string, { emoji: string; label: string }> = {
    product_catalog: { emoji: '📦', label: 'Product catalog' },
    brand_voice: { emoji: '🎙️', label: 'Brand voice' },
    ad_performance_data: { emoji: '📊', label: 'Winning ad patterns' },
    competitor_intelligence: { emoji: '🏢', label: 'Competitor intel' },
    market_sentiment: { emoji: '📡', label: 'Market sentiment' },
    persona_context: { emoji: '👤', label: 'Persona targeting' },
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Create New Ads</h1>
          {angle && persona && (
            <p className={styles.subtitle}>
              {fmt(angle)} × {fmt(persona)}{format !== 'static_image' ? ` → ${FORMATS.find(f => f.value === format)?.label}` : ''}
            </p>
          )}
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads" className={styles.backLink}>← Ads</Link>
          <Link href="/ads/strategy" className={styles.backLink}>Strategy Map</Link>
          <Link href="/ads/competitors" className={styles.backLink}>🏢 Intel</Link>
        </div>
      </header>

      {/* Config */}
      {!variants.length && !generating && (
        <div className={styles.configPanel}>
          <div className={styles.configRow}>
            <label className={styles.label}>
              Angle
              <select className={styles.select} value={angle} onChange={e => setAngle(e.target.value)}>
                <option value="">Select angle...</option>
                {ANGLES.map(a => <option key={a} value={a}>{fmt(a)}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              Target Audience
              <select className={styles.select} value={persona} onChange={e => setPersona(e.target.value)}>
                <option value="">Select audience...</option>
                {PERSONAS.map(p => <option key={p} value={p}>{fmt(p)}</option>)}
              </select>
            </label>
          </div>

          {/* Format selector */}
          <div className={styles.formatRow}>
            {FORMATS.map(f => (
              <button
                key={f.value}
                className={`${styles.formatCard} ${format === f.value ? styles.formatActive : ''}`}
                onClick={() => setFormat(f.value)}
              >
                <span className={styles.formatLabel}>{f.label}</span>
                <span className={styles.formatDesc}>{f.desc}</span>
              </button>
            ))}
          </div>

          <div className={styles.configBottom}>
            <label className={styles.label}>
              Variants
              <select className={styles.select} value={count} onChange={e => setCount(Number(e.target.value))}>
                <option value={3}>3 variants</option>
                <option value={5}>5 variants</option>
              </select>
            </label>
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={!angle || !persona || generating}
            >
              ✨ Generate {fmt(format)} Ads
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {generating && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Creating {count} {fmt(format).toLowerCase()} variants...</p>
          <p className={styles.loadingSub}>Loading product info, winning patterns, competitor data, market sentiment, and brand voice</p>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {/* Results */}
      {variants.length > 0 && (
        <>
          {/* Context attribution */}
          {contextUsed.length > 0 && (
            <div className={styles.contextBar}>
              <span className={styles.contextLabel}>Generated with:</span>
              {contextUsed.map(c => {
                const info = CONTEXT_LABELS[c]
                return info ? (
                  <span key={c} className={styles.contextChip}>{info.emoji} {info.label}</span>
                ) : null
              })}
              {businessInfo && (
                <span className={styles.contextChip}>💰 {businessInfo.product_name} ₱{businessInfo.product_price.toLocaleString()}</span>
              )}
            </div>
          )}

          <div className={styles.resultsHeader}>
            <h2>{variants.length} Variants Ready</h2>
            <div className={styles.resultsActions}>
              <button className={styles.btnOutline} onClick={() => { setVariants([]); setBatchId(null); setContextUsed([]) }}>
                ← New Strategy
              </button>
              <button className={styles.btnOutline} onClick={handleGenerate} disabled={generating}>
                🔄 Regenerate
              </button>
            </div>
          </div>

          <div className={styles.variantGrid}>
            {variants.map((v, i) => (
              <div key={v.id || i} className={styles.variantCard}>
                {!v.compliance_clean && (
                  <div className={styles.complianceWarn}>
                    ⚠️ {v.compliance_flags?.join(', ')}
                  </div>
                )}

                {format === 'static_image' && (
                  <div className={styles.imageArea}>
                    {v.image_url ? (
                      <img src={v.image_url} alt="" className={styles.variantImg} />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <button
                          className={styles.imgGenBtn}
                          onClick={() => handleGenerateImage(v.id, v.image_prompt)}
                          disabled={genImage[v.id]}
                        >
                          {genImage[v.id] ? '🎨 Generating...' : '🎨 Generate Image'}
                        </button>
                        <span className={styles.promptPreview}>{v.image_prompt?.slice(0, 80)}...</span>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.copySection}>
                  <span className={styles.variantLabel}>Variant {i + 1}</span>
                  <h3 className={styles.variantHeadline}>{v.headline}</h3>
                  <p className={styles.variantBody}>{v.body_text}</p>
                  {v.link_description && (
                    <p className={styles.variantLink}>{v.link_description}</p>
                  )}
                  <div className={styles.variantCta}>
                    {CTA_LABELS[v.cta_text] || v.cta_text}
                  </div>
                </div>

                <div className={styles.variantMeta}>
                  <span className={styles.metaTag}>{v.hook_type?.replace(/_/g, ' ')}</span>
                  <span className={styles.metaTag}>{v.framework}</span>
                  <span className={styles.metaTag}>{v.emotional_tone}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <CreatePageInner />
    </Suspense>
  )
}
