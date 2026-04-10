'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import styles from '../plans.module.css'

type PlanAsset = {
  id: string
  asset_type: string
  plan_section: string | null
  payload: Record<string, unknown> | null
  sort_order: number
}

type PlanDetail = {
  id: string
  plan_type: string
  priority: number
  objective: string
  hypothesis: string | null
  why_now: string | null
  target_angle: string | null
  target_persona: string | null
  target_formats: string[]
  status: string
  created_at: string
  completed_at: string | null
  evidence_summary: {
    winners: Array<Record<string, unknown>>
    losers: Array<Record<string, unknown>>
    fatigue: Array<Record<string, unknown>>
    gaps: Array<Record<string, unknown>>
  }
  assets: PlanAsset[]
  asset_groups: Record<string, PlanAsset[]>
}

function title(value?: string | null) {
  if (!value) return 'General'
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function renderPayload(asset: PlanAsset) {
  const payload = asset.payload || {}
  const text = typeof payload.text === 'string' ? payload.text : null
  const directions = typeof payload.take_directions === 'string' ? payload.take_directions : null
  const variants = typeof payload.take_variant_count === 'number' ? payload.take_variant_count : null
  const headline = typeof payload.headline === 'string' ? payload.headline : null
  const note = typeof payload.note === 'string' ? payload.note : null
  const visualNotes = typeof payload.visual_notes === 'string' ? payload.visual_notes : null

  if (asset.asset_type === 'video_body') {
    return (
      <>
        <p className={styles.assetText}>{text || 'No body text yet.'}</p>
        {directions ? <p className={styles.helperText}>Take directions: {directions}</p> : null}
      </>
    )
  }

  if (asset.asset_type === 'video_hook') {
    return (
      <>
        <p className={styles.assetText}>{text || 'No hook text yet.'}</p>
        {directions ? <p className={styles.helperText}>Take directions: {directions}</p> : null}
        {variants ? <p className={styles.helperText}>Take variants: {variants}</p> : null}
      </>
    )
  }

  if (asset.asset_type === 'static_headline') {
    return <p className={styles.assetText}>{headline || text || 'No headline text yet.'}</p>
  }

  if (asset.asset_type === 'editing_note') {
    return <p className={styles.assetText}>{note || text || 'No note yet.'}</p>
  }

  return <p className={styles.assetText}>{text || headline || note || visualNotes || JSON.stringify(payload)}</p>
}

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadPlan() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/ads/plans/${params.id}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to load plan')
      setPlan(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) void loadPlan()
  }, [params.id])

  async function updateStatus(status: string, announce?: string) {
    setUpdating(true)
    setNotice('')
    setError('')
    try {
      const response = await fetch(`/api/ads/plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to update plan')
      setPlan(json)
      setNotice(announce || 'Plan updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan')
    } finally {
      setUpdating(false)
    }
  }

  const groupedAssets = useMemo(() => Object.entries(plan?.asset_groups || {}), [plan])

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <div>
          <h1 className={styles.detailTitle}>Open Plan</h1>
          <p className={styles.subtitle}>Review the rationale, evidence, and production sections before execution.</p>
        </div>
        <Link href="/ads/plans" className={styles.linkButton}>Back to Plans</Link>
      </div>

      {error ? <div className={styles.emptyState}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {loading ? <div className={styles.loading}>Loading plan…</div> : null}

      {plan ? (
        <div className={styles.detailStack}>
          <section className={styles.panel}>
            <div className={styles.metaRow}>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${plan.plan_type === 'scale' ? styles.typeScale : plan.plan_type === 'refresh' ? styles.typeRefresh : plan.plan_type === 'explore' ? styles.typeExplore : styles.typeMixed}`}>{title(plan.plan_type)}</span>
                <span className={styles.priority}>Priority {plan.priority}</span>
                <span className={styles.statusBadge}>{title(plan.status)}</span>
              </div>
              <div className={styles.metaText}>Created {new Date(plan.created_at).toLocaleDateString('en-PH')}</div>
            </div>
            <h2 className={styles.cardTitle}>{plan.objective}</h2>
            <p className={styles.detailBody}>{plan.hypothesis || 'No hypothesis recorded yet.'}</p>
            <p className={styles.detailBody}>{plan.why_now || 'No why-now note recorded yet.'}</p>
            <div className={styles.chipRow}>
              <span className={styles.badge}>Angle: {title(plan.target_angle)}</span>
              <span className={styles.badge}>Persona: {title(plan.target_persona)}</span>
              {plan.target_formats.map(format => <span key={format} className={styles.formatBadge}>{title(format)}</span>)}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Evidence Summary</h2>
                <p className={styles.helperText}>The signals that led to this plan recommendation.</p>
              </div>
            </div>
            <div className={styles.evidenceGrid}>
              {(['winners', 'fatigue', 'gaps', 'losers'] as const).map(key => (
                <article key={key} className={styles.evidenceCard}>
                  <h3 className={styles.assetTitle}>{title(key)}</h3>
                  {(plan.evidence_summary[key] || []).length === 0 ? (
                    <p className={styles.evidenceText}>No {key} captured yet.</p>
                  ) : (
                    <ul className={styles.list}>
                      {plan.evidence_summary[key].map((item, index) => (
                        <li key={`${key}-${index}`} className={styles.listText}>{JSON.stringify(item)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Production Content</h2>
                <p className={styles.helperText}>Assets grouped by plan section.</p>
              </div>
            </div>

            {groupedAssets.length === 0 ? (
              <div className={styles.emptyState}>No generated assets yet. ADS-004 will populate this section.</div>
            ) : (
              groupedAssets.map(([section, assets]) => (
                <div key={section} className={styles.panel}>
                  <h3 className={styles.sectionTitle}>{title(section)}</h3>
                  <div className={styles.assetsGrid}>
                    {assets.map(asset => (
                      <article key={asset.id} className={styles.assetCard}>
                        <div className={styles.assetHeader}>
                          <span className={styles.assetBadge}>{title(asset.asset_type)}</span>
                          <span className={styles.metaText}>Order {asset.sort_order}</span>
                        </div>
                        {renderPayload(asset)}
                      </article>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.actionRow}>
              <button className={styles.primaryButton} disabled={updating} onClick={() => void updateStatus('accepted', 'Plan accepted. Asset generation is the next step in ADS-004.')}>Accept & Generate →</button>
              <button className={styles.secondaryButton} disabled={updating} onClick={() => void updateStatus('dismissed', 'Plan dismissed.')}>Dismiss</button>
              <button className={styles.linkButton} onClick={() => router.push('/ads/plans')}>Back to Plans</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
