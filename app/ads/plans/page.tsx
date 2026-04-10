'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './plans.module.css'

type PlanStatus = 'pending' | 'accepted' | 'generating' | 'completed' | 'dismissed' | 'expired'

type PlanCard = {
  id: string
  plan_type: string
  priority: number
  objective: string
  why_now: string | null
  target_angle: string | null
  target_persona: string | null
  target_formats: string[]
  status: PlanStatus
  evidence_summary: Record<string, unknown>
  learning_confidence: 'high' | 'medium' | 'low' | 'experimental'
  created_at: string
  completed_at: string | null
  asset_count: number
  has_objective: boolean
  generated_concept_count: number
}

const tabs: Array<{ label: string, value: 'all' | PlanStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'accepted' },
  { label: 'Completed', value: 'completed' },
  { label: 'Dismissed', value: 'dismissed' },
]

function title(value?: string | null) {
  if (!value) return 'All'
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function typeClass(type: string) {
  if (type === 'scale') return styles.typeScale
  if (type === 'refresh') return styles.typeRefresh
  if (type === 'explore') return styles.typeExplore
  return styles.typeMixed
}

function confidenceLabel(confidence: PlanCard['learning_confidence'], evidence: Record<string, unknown>) {
  const winners = Array.isArray(evidence.winners) ? evidence.winners.length : 0
  const fatigue = Array.isArray(evidence.fatigue) ? evidence.fatigue.length : 0
  if (confidence === 'high') return `High confidence — based on ${winners} winning ads`
  if (confidence === 'medium') return `Medium confidence — ${winners} winner${winners === 1 ? '' : 's'}, ${fatigue} fatigue signal${fatigue === 1 ? '' : 's'}`
  if (confidence === 'low') return 'Low confidence — mostly cell-level evidence'
  return 'Experimental — untested hypothesis'
}

function confidenceClass(confidence: PlanCard['learning_confidence']) {
  if (confidence === 'high') return styles.confHigh
  if (confidence === 'medium') return styles.confMedium
  if (confidence === 'low') return styles.confLow
  return styles.confExperimental
}

export default function AdsPlansPage() {
  const [plans, setPlans] = useState<PlanCard[]>([])
  const [activeTab, setActiveTab] = useState<'all' | PlanStatus>('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadPlans(status?: 'all' | PlanStatus) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status && status !== 'all') params.set('status', status)
      const response = await fetch(`/api/ads/plans?${params.toString()}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to load plans')
      setPlans(json.plans || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlans(activeTab)
  }, [activeTab])

  async function generatePlans() {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/ads/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto', count: 3 }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to generate plans')
      await loadPlans(activeTab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plans')
    } finally {
      setSubmitting(false)
    }
  }

  const empty = useMemo(() => !loading && plans.length === 0, [loading, plans.length])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.pageEyebrow}>Plans queue</div>
          <h1 className={styles.title}>Your Plans</h1>
          <p className={styles.subtitle}>Review the strongest next moves, then open the brief that deserves production time now.</p>
        </div>
        <div className={styles.headerCtas}>
          <Link href="/ads" className={styles.linkButton}>Back to Command Center</Link>
          <button className={styles.primaryButton} onClick={() => void generatePlans()} disabled={submitting}>
            {submitting ? 'Generating…' : 'Generate New Plans'}
          </button>
        </div>
      </header>

      <section className={styles.summaryHero}>
        <div>
          <div className={styles.summaryLabel}>Focus now</div>
          <h2 className={styles.summaryTitle}>
            {plans[0]?.objective || 'Generate a fresh plan batch to surface the next best move.'}
          </h2>
          <p className={styles.summaryText}>
            {plans[0]?.why_now || 'Plans are ranked so Grace can scan status, confidence, and next action without digging into every card first.'}
          </p>
        </div>
        <div className={styles.summaryStats}>
          <div className={styles.summaryStat}><span>Open</span><strong>{plans.filter(plan => plan.status === 'pending' || plan.status === 'accepted').length}</strong></div>
          <div className={styles.summaryStat}><span>Completed</span><strong>{plans.filter(plan => plan.status === 'completed').length}</strong></div>
          <div className={styles.summaryStat}><span>Highest priority</span><strong>{plans[0] ? `P${plans[0].priority}` : '—'}</strong></div>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.value}
              className={`${styles.tabButton} ${activeTab === tab.value ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className={styles.emptyState}>{error}</div> : null}
      {loading ? <div className={styles.loading}>Loading plans…</div> : null}

      {empty ? (
        <div className={styles.emptyState}>No plans yet. Generate your first batch.</div>
      ) : (
        <div className={styles.grid}>
          {plans.map(plan => (
            <article key={plan.id} className={`${styles.card} ${plans[0]?.id === plan.id ? styles.cardFeatured : ''}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardIdentity}>
                  <span className={`${styles.badge} ${typeClass(plan.plan_type)}`}>{title(plan.plan_type)}</span>
                  <span className={styles.priority}>Priority {plan.priority}</span>
                </div>
                <span className={styles.cardKicker}>{plan.status === 'completed' ? 'Ready to hand off' : plan.status === 'accepted' ? 'In production prep' : 'Needs review'}</span>
              </div>

              <h2 className={styles.cardTitle}>{plan.objective}</h2>
              <p className={styles.cardText}>{plan.why_now || 'No rationale recorded yet.'}</p>

              <div className={styles.briefGrid}>
                <div className={styles.briefBlock}>
                  <span className={styles.briefLabel}>Why now</span>
                  <strong className={styles.briefValue}>{plan.has_objective ? 'Clear objective' : 'Needs refinement'}</strong>
                  <p className={styles.metaText}>{confidenceLabel(plan.learning_confidence, plan.evidence_summary)}</p>
                </div>
                <div className={styles.briefBlock}>
                  <span className={styles.briefLabel}>Next action</span>
                  <strong className={styles.briefValue}>{plan.status === 'completed' ? 'Open brief' : plan.status === 'accepted' ? 'Build ads' : 'Review plan'}</strong>
                  <p className={styles.metaText}>{plan.asset_count} assets · {plan.generated_concept_count} concept{plan.generated_concept_count === 1 ? '' : 's'}</p>
                </div>
              </div>

              <div className={styles.badgeRow}>
                <span className={styles.badge}>Angle: {title(plan.target_angle)}</span>
                <span className={styles.badge}>Persona: {title(plan.target_persona)}</span>
                <span className={styles.statusBadge}>{title(plan.status)}</span>
                <span className={`${styles.statusBadge} ${confidenceClass(plan.learning_confidence)}`}>{title(plan.learning_confidence)}</span>
              </div>

              <div className={styles.formatRow}>
                {plan.target_formats.length > 0 ? plan.target_formats.map(format => (
                  <span key={format} className={styles.formatBadge}>{title(format)}</span>
                )) : <span className={styles.formatBadge}>No formats yet</span>}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.metaText}>
                  Created {new Date(plan.created_at).toLocaleDateString('en-PH')}
                </div>
                <Link href={`/ads/plans/${plan.id}`} className={styles.primaryButton}>Open Plan</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
