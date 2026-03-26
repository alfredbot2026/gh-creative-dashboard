/**
 * Ad Dashboard — Grace-friendly ad overview.
 * Shows: Working/Tired/Kill counts, recommendations, quick actions.
 * No media buyer jargon. Translates data into decisions.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface MapData {
  has_data: boolean
  summary: {
    total_ads: number
    total_spend: number
    winning_count: number
    tired_count: number
    dead_count: number
    exploration_mode: boolean
  }
  recommendations: Array<{
    priority: number
    angle: string
    persona: string
    confidence: string
    action: string
    reason: string
    type: string
    estimated_variants: number
    suggested_frameworks: string[]
  }>
  saturating: Array<{
    ad_name: string
    angle: string
    recommendation: string
  }>
  coverage: { tested: number; total: number; percent: number }
}

const CONFIDENCE_LABELS: Record<string, { label: string; emoji: string }> = {
  high: { label: 'Strong signal', emoji: '💪' },
  medium: { label: 'Worth testing', emoji: '🧪' },
  low: { label: 'Hypothesis', emoji: '🔮' },
  gap: { label: 'Untested opportunity', emoji: '✨' },
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  refresh: { label: 'Refresh', color: 'var(--accent-purple, #8b5cf6)' },
  scale: { label: 'Scale', color: 'var(--accent-emerald, #10b981)' },
  create_new: { label: 'Explore', color: 'var(--color-primary)' },
  kill: { label: 'Kill', color: 'var(--color-error, #ef4444)' },
}

function formatPersona(p: string) { return p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
function formatAngle(a: string) { return a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }

export default function AdDashboard() {
  const [data, setData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ads/intelligence/map')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      // Sync ads performance first, then creatives
      await fetch('/api/ads/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const res = await fetch('/api/ads/creatives/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const result = await res.json()
      if (res.ok) {
        setSyncMsg(`Done! ${result.ads_fetched} ads synced, ${result.creatives_classified} classified`)
        // Refresh
        const refresh = await fetch('/api/ads/intelligence/map')
        setData(await refresh.json())
      } else {
        setSyncMsg(result.error || 'Sync failed')
      }
    } catch { setSyncMsg('Sync failed') }
    setSyncing(false)
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading your ads...</div></div>

  const s = data?.summary

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Ads</h1>
          <p className={styles.subtitle}>See what&apos;s working, what&apos;s tired, and what to create next</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads/strategy" className={styles.stratLink}>📊 Strategy Map</Link>
          <Link href="/insights/ads" className={styles.stratLink}>📈 Performance</Link>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : '🔄 Sync Ads'}
          </button>
        </div>
      </header>
      {syncMsg && <div className={styles.syncMsg}>{syncMsg}</div>}

      {!data?.has_data ? (
        <div className={styles.emptyState}>
          <h2>No ads synced yet</h2>
          <p>Connect your Meta account and sync to see your ad intelligence.</p>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      ) : (
        <>
          {/* Exploration mode banner */}
          {s?.exploration_mode && (
            <div className={styles.exploreBanner}>
              🧭 <strong>Exploration Mode</strong> — You&apos;re just getting started. These are experiments, not guarantees. More data = better recommendations.
            </div>
          )}

          {/* Status cards */}
          {s && (
            <div className={styles.statusRow}>
              <div className={styles.statusCard} data-type="winning">
                <span className={styles.statusEmoji}>✅</span>
                <span className={styles.statusCount}>{s.winning_count}</span>
                <span className={styles.statusLabel}>Working</span>
              </div>
              <div className={styles.statusCard} data-type="tired">
                <span className={styles.statusEmoji}>😴</span>
                <span className={styles.statusCount}>{s.tired_count}</span>
                <span className={styles.statusLabel}>Getting Tired</span>
              </div>
              <div className={styles.statusCard} data-type="dead">
                <span className={styles.statusEmoji}>❌</span>
                <span className={styles.statusCount}>{s.dead_count}</span>
                <span className={styles.statusLabel}>Turn Off</span>
              </div>
              <div className={styles.statusCard} data-type="coverage">
                <span className={styles.statusEmoji}>🗺️</span>
                <span className={styles.statusCount}>{data.coverage.percent}%</span>
                <span className={styles.statusLabel}>Explored</span>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                💡 {data.recommendations.length} idea{data.recommendations.length > 1 ? 's' : ''} for you
              </h2>
              <div className={styles.recGrid}>
                {data.recommendations.slice(0, 8).map((rec, i) => {
                  const conf = CONFIDENCE_LABELS[rec.confidence] || CONFIDENCE_LABELS.gap
                  const typeLabel = TYPE_LABELS[rec.type] || TYPE_LABELS.create_new
                  return (
                    <div key={i} className={styles.recCard}>
                      <div className={styles.recTop}>
                        <span className={styles.recType} style={{ color: typeLabel.color }}>
                          {typeLabel.label}
                        </span>
                        <span className={styles.recConf}>
                          {conf.emoji} {conf.label}
                        </span>
                      </div>
                      <p className={styles.recAction}>{rec.action}</p>
                      <p className={styles.recReason}>{rec.reason}</p>
                      {rec.estimated_variants > 0 && (
                        <div className={styles.recMeta}>
                          {rec.estimated_variants} variants · {rec.suggested_frameworks.join(', ')}
                        </div>
                      )}
                      {rec.type === 'create_new' && (
                        <Link href={`/ads/create?angle=${rec.angle}&persona=${rec.persona}`} className={styles.recCta}>
                          Create These Ads →
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Tired ads needing attention */}
          {data.saturating.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>😴 Needs Fresh Creative</h2>
              <div className={styles.tiredGrid}>
                {data.saturating.map((sat, i) => (
                  <div key={i} className={styles.tiredCard}>
                    <p className={styles.tiredName}>{sat.ad_name}</p>
                    <p className={styles.tiredRec}>{sat.recommendation}</p>
                    <Link href={`/ads/create?angle=${sat.angle}&refresh=true`} className={styles.recCta}>
                      Make New Version →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
