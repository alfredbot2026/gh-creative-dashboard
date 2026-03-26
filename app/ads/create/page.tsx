/**
 * Creative Factory — Generate ad variants for a specific angle + persona.
 * Shows: strategy context → generated variants with copy + image prompts.
 * User can edit, regenerate, generate images, approve, download.
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

function formatAngle(a: string) { return a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
function formatPersona(p: string) { return p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }

const CTA_LABELS: Record<string, string> = {
  SHOP_NOW: 'Shop Now',
  LEARN_MORE: 'Learn More',
  SIGN_UP: 'Sign Up',
  SEND_MESSAGE: 'Send Message',
  GET_OFFER: 'Get Offer',
}

function CreatePageInner() {
  const searchParams = useSearchParams()
  const angleParam = searchParams.get('angle') || ''
  const personaParam = searchParams.get('persona') || ''

  const [angle, setAngle] = useState(angleParam)
  const [persona, setPersona] = useState(personaParam)
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [genImage, setGenImage] = useState<Record<string, boolean>>({})

  const ANGLES = [
    'pain_point', 'aspiration', 'fear', 'social_proof', 'comparison',
    'education', 'urgency', 'curiosity', 'transformation', 'authority',
  ]
  const PERSONAS = [
    'new_mom_curious', 'returning_buyer', 'price_sensitive',
    'aspirational', 'skeptic', 'beginner', 'advanced',
    'gift_buyer', 'busy_professional',
  ]

  const handleGenerate = async () => {
    if (!angle || !persona) return
    setGenerating(true)
    setError(null)
    setVariants([])

    try {
      const res = await fetch('/api/ads/factory/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle, persona, count }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setVariants(data.variants || [])
      setBatchId(data.batch_id)
    } catch (err: any) {
      setError(err.message)
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
    } catch {
      // silently fail — user can retry
    }
    setGenImage(prev => ({ ...prev, [variantId]: false }))
  }

  // Auto-generate if params provided
  useEffect(() => {
    if (angleParam && personaParam && !variants.length && !generating) {
      handleGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Create New Ads</h1>
          {angle && persona && (
            <p className={styles.subtitle}>
              {formatAngle(angle)} ads for {formatPersona(persona)}
            </p>
          )}
        </div>
        <Link href="/ads" className={styles.backLink}>← Back to Ads</Link>
      </header>

      {/* Config */}
      {!variants.length && !generating && (
        <div className={styles.configPanel}>
          <div className={styles.configRow}>
            <label className={styles.label}>
              Angle
              <select className={styles.select} value={angle} onChange={e => setAngle(e.target.value)}>
                <option value="">Select angle...</option>
                {ANGLES.map(a => <option key={a} value={a}>{formatAngle(a)}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              Target Audience
              <select className={styles.select} value={persona} onChange={e => setPersona(e.target.value)}>
                <option value="">Select audience...</option>
                {PERSONAS.map(p => <option key={p} value={p}>{formatPersona(p)}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              Variants
              <select className={styles.select} value={count} onChange={e => setCount(Number(e.target.value))}>
                <option value={3}>3 variants</option>
                <option value={5}>5 variants</option>
              </select>
            </label>
          </div>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={!angle || !persona || generating}
          >
            {generating ? 'Generating...' : '✨ Generate Ad Variants'}
          </button>
        </div>
      )}

      {/* Loading */}
      {generating && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Creating {count} ad variants...</p>
          <p className={styles.loadingSub}>Analyzing your best-performing patterns + brand voice</p>
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Results */}
      {variants.length > 0 && (
        <>
          <div className={styles.resultsHeader}>
            <h2>{variants.length} Variants Ready</h2>
            <div className={styles.resultsActions}>
              <button className={styles.btnOutline} onClick={() => { setVariants([]); setBatchId(null) }}>
                ← New Strategy
              </button>
              <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
                🔄 Regenerate All
              </button>
            </div>
          </div>

          <div className={styles.variantGrid}>
            {variants.map((v, i) => (
              <div key={v.id || i} className={styles.variantCard}>
                {/* Compliance warning */}
                {!v.compliance_clean && (
                  <div className={styles.complianceWarn}>
                    ⚠️ Flagged: {v.compliance_flags?.join(', ')}
                  </div>
                )}

                {/* Image area */}
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
                    </div>
                  )}
                </div>

                {/* Copy */}
                <div className={styles.copySection}>
                  <h3 className={styles.variantHeadline}>{v.headline}</h3>
                  <p className={styles.variantBody}>{v.body_text}</p>
                  <div className={styles.variantCta}>
                    {CTA_LABELS[v.cta_text] || v.cta_text}
                  </div>
                </div>

                {/* Meta */}
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
