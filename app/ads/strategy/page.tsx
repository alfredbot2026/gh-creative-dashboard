/**
 * Ad Strategy Map — Interactive angle × persona matrix.
 * The "aha moment" — shows coverage, gaps, performance at a glance.
 * Click any cell to see ads or create new ones.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface CellData {
  angle: string
  persona: string
  ad_count: number
  total_spend: number
  avg_roas: number | null
  avg_cpa: number | null
  confidence: string
  status: string
  trend: string | null
  ads: Array<{ id: string; ad_name: string; ad_status: string; total_spend: number; avg_roas: number | null }>
}

interface MapData {
  has_data: boolean
  matrix: Record<string, Record<string, CellData>>
  coverage: { tested: number; total: number; percent: number }
  recommendations: Array<{ angle: string; persona: string; action: string; type: string; confidence: string }>
  summary: { total_ads: number; total_spend: number; exploration_mode: boolean }
}

const ANGLES = [
  'pain_point', 'aspiration', 'social_proof', 'comparison',
  'education', 'urgency', 'curiosity', 'transformation',
]

const PERSONAS = [
  'new_mom_curious', 'returning_buyer', 'price_sensitive',
  'aspirational', 'skeptic', 'beginner',
]

const STATUS_CONFIG: Record<string, { emoji: string; bg: string; border: string }> = {
  winning: { emoji: '✅', bg: 'color-mix(in srgb, var(--accent-emerald, #10b981) 15%, transparent)', border: 'var(--accent-emerald, #10b981)' },
  weak: { emoji: '🟡', bg: 'color-mix(in srgb, var(--accent-purple, #8b5cf6) 10%, transparent)', border: 'var(--accent-purple, #8b5cf6)' },
  tired: { emoji: '😴', bg: 'color-mix(in srgb, var(--accent-purple, #8b5cf6) 15%, transparent)', border: 'var(--accent-purple, #8b5cf6)' },
  dead: { emoji: '❌', bg: 'color-mix(in srgb, var(--color-error, #ef4444) 10%, transparent)', border: 'var(--color-error, #ef4444)' },
  new: { emoji: '🆕', bg: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', border: 'var(--color-primary)' },
  gap: { emoji: '❌', bg: 'transparent', border: 'var(--color-border, var(--border))' },
}

function formatAngle(a: string) { return a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
function formatPersona(p: string) {
  const labels: Record<string, string> = {
    new_mom_curious: 'New Mom',
    returning_buyer: 'Returning',
    price_sensitive: 'Price Sensitive',
    aspirational: 'Aspirational',
    skeptic: 'Skeptic',
    beginner: 'Beginner',
  }
  return labels[p] || p.replace(/_/g, ' ')
}

export default function StrategyMapPage() {
  const [data, setData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CellData | null>(null)

  useEffect(() => {
    fetch('/api/ads/intelligence/map')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading strategy map...</div></div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ad Strategy Map</h1>
          <p className={styles.subtitle}>
            Each cell = an angle × audience combo.
            {data?.has_data && ` ${data.coverage.tested}/${data.coverage.total} tested (${data.coverage.percent}%).`}
          </p>
        </div>
        <Link href="/ads" className={styles.backLink}>← Back to Ads</Link>
      </header>

      {!data?.has_data ? (
        <div className={styles.emptyState}>
          <p>Sync your ads first to see the strategy map.</p>
          <Link href="/ads" className={styles.backLink}>Go to Ads →</Link>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>✅ Winning</span>
            <span className={styles.legendItem}>🟡 Weak</span>
            <span className={styles.legendItem}>😴 Tired</span>
            <span className={styles.legendItem}>❌ Gap/Dead</span>
            <span className={styles.legendItem}>🆕 New</span>
          </div>

          {/* Matrix */}
          <div className={styles.matrixWrap}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th className={styles.cornerCell}></th>
                  {PERSONAS.map(p => (
                    <th key={p} className={styles.colHeader}>{formatPersona(p)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ANGLES.map(angle => (
                  <tr key={angle}>
                    <th className={styles.rowHeader}>{formatAngle(angle)}</th>
                    {PERSONAS.map(persona => {
                      const cell = data.matrix?.[angle]?.[persona]
                      const cfg = STATUS_CONFIG[cell?.status || 'gap'] || STATUS_CONFIG.gap
                      const isSelected = selected?.angle === angle && selected?.persona === persona
                      return (
                        <td
                          key={persona}
                          className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
                          style={{ background: cfg.bg, borderColor: cfg.border }}
                          onClick={() => setSelected(cell || null)}
                        >
                          <span className={styles.cellEmoji}>{cfg.emoji}</span>
                          {cell && cell.ad_count > 0 && (
                            <span className={styles.cellCount}>{cell.ad_count}</span>
                          )}
                          {cell?.avg_roas && cell.avg_roas > 0 && (
                            <span className={styles.cellRoas}>{cell.avg_roas.toFixed(1)}x</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected cell detail */}
          {selected && (
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <h3>{formatAngle(selected.angle)} × {formatPersona(selected.persona)}</h3>
                <button className={styles.closeBtn} onClick={() => setSelected(null)}>×</button>
              </div>
              {selected.ad_count === 0 ? (
                <div className={styles.detailEmpty}>
                  <p>No ads tested for this combo yet.</p>
                  <Link href={`/ads/create?angle=${selected.angle}&persona=${selected.persona}`} className={styles.createLink}>
                    Create Ads for This →
                  </Link>
                </div>
              ) : (
                <>
                  <div className={styles.detailStats}>
                    <span>{selected.ad_count} ad{selected.ad_count > 1 ? 's' : ''}</span>
                    <span>₱{selected.total_spend.toLocaleString()}</span>
                    {selected.avg_roas && <span>{selected.avg_roas.toFixed(1)}x return</span>}
                    {selected.avg_cpa && <span>₱{selected.avg_cpa.toFixed(0)}/purchase</span>}
                  </div>
                  <div className={styles.detailAds}>
                    {selected.ads.map(ad => (
                      <div key={ad.id} className={styles.detailAdRow}>
                        <span className={styles.detailAdName}>{ad.ad_name}</span>
                        <span className={styles.detailAdStatus}>
                          {STATUS_CONFIG[ad.ad_status]?.emoji || '❓'} {ad.ad_status}
                        </span>
                        <span>₱{ad.total_spend.toLocaleString()}</span>
                        {ad.avg_roas && <span>{ad.avg_roas.toFixed(1)}x</span>}
                      </div>
                    ))}
                  </div>
                  <Link href={`/ads/create?angle=${selected.angle}&persona=${selected.persona}`} className={styles.createLink}>
                    Create More Ads →
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Coverage message */}
          <div className={styles.coverageMsg}>
            {data.coverage.percent < 30
              ? "🌱 You've barely scratched the surface — so many angles to explore!"
              : data.coverage.percent < 60
              ? "📈 Good start! Keep testing new combos to find more winners."
              : "🎯 Great coverage! Focus on scaling winners and refreshing tired ads."}
          </div>
        </>
      )}
    </div>
  )
}
