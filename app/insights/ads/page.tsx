/**
 * Ad Performance Insights — Correlation between organic content and ad results.
 * Shows: overview cards, performance by structure/hook, ad candidates, content pipeline.
 * Grace-friendly: no jargon (ROAS → "return per ₱ spent", CPA → "cost per purchase").
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface CorrelationData {
  has_data: boolean
  overview: {
    total_spend: number
    total_purchases: number
    avg_roas: number
    total_ads: number
    best_ad: { name: string; roas: number; spend: number } | null
    worst_ad: { name: string; roas: number; spend: number } | null
    content_first_roas: number
    traditional_roas: number
    content_first_count: number
    traditional_count: number
  } | null
  by_structure: Array<{
    label: string; ad_count: number; total_spend: number
    avg_roas: number; avg_cpa: number | null; avg_ctr: number
  }>
  by_hook: Array<{
    label: string; ad_count: number; total_spend: number
    avg_roas: number; avg_cpa: number | null; avg_ctr: number
  }>
  by_topic: Array<{
    label: string; ad_count: number; total_spend: number
    avg_roas: number; avg_cpa: number | null; avg_ctr: number
  }>
  ad_candidates: Array<{
    id: string; caption: string; saves: number
    engagement_rate: number; platform_url: string | null
  }>
}

function formatCurrency(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatPeso(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function RoasBadge({ roas }: { roas: number }) {
  const color = roas >= 3 ? 'var(--accent-emerald, #10b981)'
    : roas >= 1.5 ? 'var(--accent-purple, #8b5cf6)'
    : roas > 0 ? 'var(--color-text-dim)'
    : 'var(--color-error, #ef4444)'
  return <span style={{ color, fontWeight: 600 }}>{roas.toFixed(1)}x</span>
}

export default function AdInsightsPage() {
  const [data, setData] = useState<CorrelationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ads/correlation')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/ads/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const result = await res.json()
      if (res.ok) {
        setSyncResult(`Synced ${result.synced} rows, matched ${result.matched} to content`)
        // Refresh data
        const refreshRes = await fetch('/api/ads/correlation')
        const refreshData = await refreshRes.json()
        setData(refreshData)
      } else {
        setSyncResult(result.error || 'Sync failed')
      }
    } catch {
      setSyncResult('Sync failed — check connection')
    }
    setSyncing(false)
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading ad insights...</div></div>

  const o = data?.overview

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Ad Performance</h1>
            <p className={styles.subtitle}>How your content performs as ads</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/insights" className={styles.backLink}>← Back to Insights</Link>
            <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : '🔄 Sync Ads'}
            </button>
          </div>
        </div>
        {syncResult && <div className={styles.syncMsg}>{syncResult}</div>}
      </header>

      {!data?.has_data ? (
        <div className={styles.emptyState}>
          <h2>No ad data yet</h2>
          <p>Connect your Meta account and sync your ads to see performance insights.</p>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {o && (
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <span className={styles.overviewValue}>{formatCurrency(o.total_spend)}</span>
                <span className={styles.overviewLabel}>Total Spent</span>
              </div>
              <div className={styles.overviewCard}>
                <span className={styles.overviewValue}>{o.total_purchases}</span>
                <span className={styles.overviewLabel}>Purchases</span>
              </div>
              <div className={styles.overviewCard}>
                <span className={styles.overviewValue}><RoasBadge roas={o.avg_roas} /></span>
                <span className={styles.overviewLabel}>Return per ₱ spent</span>
              </div>
              <div className={styles.overviewCard}>
                <span className={styles.overviewValue}>{o.total_ads}</span>
                <span className={styles.overviewLabel}>Total Ads</span>
              </div>
            </div>
          )}

          {/* Best/Worst Ads */}
          {o && (o.best_ad || o.worst_ad) && (
            <div className={styles.spotlightRow}>
              {o.best_ad && (
                <div className={styles.spotlightCard} data-type="best">
                  <span className={styles.spotlightEmoji}>✅</span>
                  <span className={styles.spotlightTitle}>Best Performer</span>
                  <span className={styles.spotlightName}>{o.best_ad.name}</span>
                  <span className={styles.spotlightStat}>
                    <RoasBadge roas={o.best_ad.roas} /> return · {formatPeso(o.best_ad.spend)} spent
                  </span>
                </div>
              )}
              {o.worst_ad && (
                <div className={styles.spotlightCard} data-type="worst">
                  <span className={styles.spotlightEmoji}>⚠️</span>
                  <span className={styles.spotlightTitle}>Needs Attention</span>
                  <span className={styles.spotlightName}>{o.worst_ad.name}</span>
                  <span className={styles.spotlightStat}>
                    <RoasBadge roas={o.worst_ad.roas} /> return · {formatPeso(o.worst_ad.spend)} spent
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content-First vs Traditional */}
          {o && (o.content_first_count > 0 || o.traditional_count > 0) && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>📊 Organic Content as Ads vs Direct Ads</h2>
              <div className={styles.comparisonRow}>
                <div className={styles.comparisonCard}>
                  <span className={styles.compLabel}>Content-first ads</span>
                  <span className={styles.compValue}><RoasBadge roas={o.content_first_roas} /> avg return</span>
                  <span className={styles.compCount}>{o.content_first_count} ads</span>
                </div>
                <div className={styles.comparisonCard}>
                  <span className={styles.compLabel}>Direct ads</span>
                  <span className={styles.compValue}><RoasBadge roas={o.traditional_roas} /> avg return</span>
                  <span className={styles.compCount}>{o.traditional_count} ads</span>
                </div>
              </div>
            </section>
          )}

          {/* Performance by Structure */}
          {data.by_structure.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>🏗️ Performance by Structure</h2>
              <p className={styles.sectionSub}>Which content structures convert best as ads</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Structure</th>
                      <th>Ads</th>
                      <th>Total Spent</th>
                      <th>Avg Return</th>
                      <th>Avg Cost/Purchase</th>
                      <th>Click Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_structure.map((row, i) => (
                      <tr key={row.label} className={i < 3 ? styles.topRow : ''}>
                        <td className={styles.labelCell}>
                          {i < 3 && <span className={styles.rankBadge}>#{i + 1}</span>}
                          {row.label}
                        </td>
                        <td>{row.ad_count}</td>
                        <td>{formatCurrency(row.total_spend)}</td>
                        <td><RoasBadge roas={row.avg_roas} /></td>
                        <td>{row.avg_cpa ? formatPeso(row.avg_cpa) : '—'}</td>
                        <td>{formatPct(row.avg_ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Performance by Hook */}
          {data.by_hook.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>🪝 Performance by Hook Type</h2>
              <p className={styles.sectionSub}>Which hooks drive the best ad results</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Hook Type</th>
                      <th>Ads</th>
                      <th>Total Spent</th>
                      <th>Avg Return</th>
                      <th>Avg Cost/Purchase</th>
                      <th>Click Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_hook.map((row, i) => (
                      <tr key={row.label} className={i < 3 ? styles.topRow : ''}>
                        <td className={styles.labelCell}>
                          {i < 3 && <span className={styles.rankBadge}>#{i + 1}</span>}
                          {row.label}
                        </td>
                        <td>{row.ad_count}</td>
                        <td>{formatCurrency(row.total_spend)}</td>
                        <td><RoasBadge roas={row.avg_roas} /></td>
                        <td>{row.avg_cpa ? formatPeso(row.avg_cpa) : '—'}</td>
                        <td>{formatPct(row.avg_ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Ad Candidates */}
          {data.ad_candidates.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>⚡ Best Organic → Ad Candidates</h2>
              <p className={styles.sectionSub}>High-save posts that haven&apos;t been run as ads yet</p>
              <div className={styles.candidateGrid}>
                {data.ad_candidates.map(c => (
                  <div key={c.id} className={styles.candidateCard}>
                    <p className={styles.candidateCaption}>{c.caption}</p>
                    <div className={styles.candidateStats}>
                      <span>🔖 {c.saves} saves</span>
                      <span>{formatPct(c.engagement_rate)} engagement</span>
                    </div>
                    {c.platform_url && (
                      <a
                        href={c.platform_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.candidateLink}
                        onClick={e => e.stopPropagation()}
                      >
                        View Post ↗
                      </a>
                    )}
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
