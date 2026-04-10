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
  created_at: string
  completed_at: string | null
  asset_count: number
  has_objective: boolean
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
          <h1 className={styles.title}>Your Plans</h1>
          <p className={styles.subtitle}>Browse, compare, and act on multi-plan recommendations.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => void generatePlans()} disabled={submitting}>
          {submitting ? 'Generating…' : 'Generate New Plans +'}
        </button>
      </header>

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
            <article key={plan.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={`${styles.badge} ${typeClass(plan.plan_type)}`}>{title(plan.plan_type)}</span>
                <span className={styles.priority}>Priority {plan.priority}</span>
              </div>

              <h2 className={styles.cardTitle}>{plan.objective}</h2>
              <p className={styles.cardText}>{plan.why_now || 'No rationale recorded yet.'}</p>

              <div className={styles.badgeRow}>
                <span className={styles.badge}>Angle: {title(plan.target_angle)}</span>
                <span className={styles.badge}>Persona: {title(plan.target_persona)}</span>
                <span className={styles.statusBadge}>{title(plan.status)}</span>
              </div>

              <div className={styles.formatRow}>
                {plan.target_formats.length > 0 ? plan.target_formats.map(format => (
                  <span key={format} className={styles.formatBadge}>{title(format)}</span>
                )) : <span className={styles.formatBadge}>No formats yet</span>}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.metaText}>
                  Created {new Date(plan.created_at).toLocaleDateString('en-PH')}
                  <br />
                  {plan.asset_count} assets
                </div>
                <Link href={`/ads/plans/${plan.id}`} className={styles.linkButton}>Open Plan →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
