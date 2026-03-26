/**
 * Weekly Creative Planner — Generate this week's test creatives in one click.
 * Shows: proposed plan → generate all → review batches → download.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface BatchInfo {
  batch_id: string
  day: string
  angle: string
  persona: string
  type: string
  action: string
  variant_count: number
}

interface WeeklyPlan {
  success: boolean
  batches: BatchInfo[]
  plan?: { week_label: string; total_variants: number }
  message?: string
}

interface Variant {
  id: string; headline: string; body_text: string; cta_text: string; hook_type: string; framework: string
}

function formatAngle(a: string) { return a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
function formatPersona(p: string) { return p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }

const TYPE_EMOJI: Record<string, string> = {
  refresh: '🔄', scale: '📈', create_new: '✨', kill: '🛑',
}

export default function WeeklyPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [batchVariants, setBatchVariants] = useState<Record<string, Variant[]>>({})

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ads/factory/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants_per_batch: 3 }),
      })
      const data = await res.json()
      setPlan(data)
    } catch {
      setPlan({ success: false, batches: [], message: 'Failed to generate plan' })
    }
    setGenerating(false)
  }

  const loadBatchVariants = async (batchId: string) => {
    if (batchVariants[batchId]) {
      setExpanded(expanded === batchId ? null : batchId)
      return
    }
    const res = await fetch(`/api/ads/creatives?batch_id=${batchId}`)
    // Use factory variants endpoint instead
    const varRes = await fetch(`/api/ads/factory/variants?batch_id=${batchId}`)
    const data = await varRes.json()
    if (data.variants) {
      setBatchVariants(prev => ({ ...prev, [batchId]: data.variants }))
    }
    setExpanded(batchId)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>This Week&apos;s Creative Plan</h1>
          <p className={styles.subtitle}>
            Based on your ad performance + gaps — 3 batches for the week
          </p>
        </div>
        <Link href="/ads" className={styles.backLink}>← Back to Ads</Link>
      </header>

      {/* Testing framework explainer */}
      <div className={styles.frameworkBox}>
        <h3>📋 3-Phase Testing Framework</h3>
        <div className={styles.phases}>
          <div className={styles.phase}>
            <strong>Tue</strong> — Batch 1: New angle test
          </div>
          <div className={styles.phase}>
            <strong>Thu</strong> — Batch 2: New persona test
          </div>
          <div className={styles.phase}>
            <strong>Sat</strong> — Batch 3: Refresh tired ads
          </div>
        </div>
        <p className={styles.frameworkNote}>Test new vs new first. Winners go against your current best. Then scale.</p>
      </div>

      {/* Generate */}
      {!plan && (
        <div className={styles.generatePanel}>
          <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
            {generating ? '🔄 Generating plan...' : '✨ Generate This Week\'s Ads'}
          </button>
          {generating && <p className={styles.genNote}>Creating 3 batches × 3 variants = 9 ads...</p>}
        </div>
      )}

      {/* Plan results */}
      {plan?.success && plan.batches.length > 0 && (
        <>
          <div className={styles.planHeader}>
            <h2>{plan.plan?.week_label}</h2>
            <span className={styles.planTotal}>{plan.plan?.total_variants} variants total</span>
          </div>

          <div className={styles.batchList}>
            {plan.batches.map((batch, i) => (
              <div key={batch.batch_id} className={styles.batchCard}>
                <div className={styles.batchTop}>
                  <span className={styles.batchDay}>{batch.day}</span>
                  <span className={styles.batchType}>
                    {TYPE_EMOJI[batch.type] || '✨'} {batch.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className={styles.batchAction}>{batch.action}</h3>
                <div className={styles.batchMeta}>
                  <span>{formatAngle(batch.angle)} × {formatPersona(batch.persona)}</span>
                  <span>{batch.variant_count} variants</span>
                </div>
                <div className={styles.batchActions}>
                  <Link href={`/ads/create?angle=${batch.angle}&persona=${batch.persona}`} className={styles.previewLink}>
                    Preview & Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <button className={styles.btnOutline} onClick={() => setPlan(null)} style={{ marginTop: 'var(--space-lg)' }}>
            🔄 Regenerate Plan
          </button>
        </>
      )}

      {plan?.success && plan.batches.length === 0 && (
        <div className={styles.emptyMsg}>{plan.message || 'No recommendations — your ads look great!'}</div>
      )}

      {plan && !plan.success && (
        <div className={styles.error}>{plan.message || 'Generation failed'}</div>
      )}
    </div>
  )
}
