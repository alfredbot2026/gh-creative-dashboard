/**
 * /ads — Command Center
 * 
 * Tabbed interface: Overview | Campaigns | Strategy | Competitors
 * Single entry point for all ad intelligence.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuditContent from './audit/AuditContent'
import styles from './ads.module.css'

// ─── Types ───

interface Action {
  type: 'explore' | 'scale' | 'refresh' | 'kill'
  priority: number
  angle: string
  persona: string
  title: string
  reason: string
  metrics?: { spend?: number; roas?: number }
  ad_ids?: string[]
  urgency: 'high' | 'medium' | 'low'
}

interface Health {
  active_ads: number; winning: number; tired: number; dead_active: number
  untested_angles: number; total_angles: number; coverage_pct: number
}

interface MoneyPeriod { spend: number; revenue: number; conversations: number }
interface Money { week: MoneyPeriod; month: MoneyPeriod }

interface MatrixCell {
  angle: string; persona: string; ad_count: number; avg_roas: number | null
  status: string; confidence: string
}

interface CompSignal {
  angle: string; count: number; we_have: boolean; our_roas: number | null
}

interface CompAd {
  page_name: string; ad_body: string; angle: string | null; hook_type: string | null
  ad_started_at: string | null; is_active: boolean
}

type Tab = 'overview' | 'campaigns' | 'strategy' | 'competitors'

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
const formatPeso = (n: number) => '₱' + Math.round(n).toLocaleString()

const ACTION_ICONS: Record<string, string> = { explore: '🔍', scale: '📈', refresh: '🔄', kill: '❌' }
const ACTION_COLORS: Record<string, string> = { explore: '#2563eb', scale: '#16a34a', refresh: '#f59e0b', kill: '#dc2626' }
const URGENCY_LABELS: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }

const STATUS_COLORS: Record<string, string> = {
  winning: '#16a34a', weak: '#f59e0b', tired: '#f97316', dead: '#dc2626', gap: '#93c5fd', new: '#8b5cf6',
}

// ─── Overview Tab ───
function OverviewTab({ actions, health, money }: { actions: Action[]; health: Health | null; money: Money | null }) {
  if (!health) return <div className={styles.tabLoading}>Loading...</div>

  const w = money?.week
  const m = money?.month
  const weekProfit = w ? w.revenue - w.spend : 0
  const weekRoas = w && w.spend > 0 ? w.revenue / w.spend : 0

  return (
    <div className={styles.overviewTab}>
      {/* Money Headline */}
      {w && w.spend > 0 && (
        <div className={styles.moneyHeadline}>
          <div className={styles.moneyMain}>
            <div className={styles.moneyItem}>
              <span className={styles.moneyLabel}>Spent (7d)</span>
              <span className={styles.moneyValue}>{formatPeso(w.spend)}</span>
            </div>
            {w.revenue > 0 && (
              <div className={styles.moneyItem}>
                <span className={styles.moneyLabel}>Revenue</span>
                <span className={styles.moneyValue} style={{color: '#16a34a'}}>{formatPeso(w.revenue)}</span>
              </div>
            )}
            {w.revenue > 0 && (
              <div className={styles.moneyItem}>
                <span className={styles.moneyLabel}>Profit</span>
                <span className={styles.moneyValue} style={{color: weekProfit >= 0 ? '#16a34a' : '#dc2626'}}>
                  {weekProfit >= 0 ? '+' : ''}{formatPeso(weekProfit)}
                </span>
              </div>
            )}
            {weekRoas > 0 && (
              <div className={styles.moneyItem}>
                <span className={styles.moneyLabel}>ROAS</span>
                <span className={styles.moneyValue}>{weekRoas.toFixed(1)}x</span>
              </div>
            )}
            {w.conversations > 0 && (
              <div className={styles.moneyItem}>
                <span className={styles.moneyLabel}>Conversations</span>
                <span className={styles.moneyValue}>{w.conversations.toLocaleString()}</span>
              </div>
            )}
          </div>
          {m && m.spend > 0 && (
            <div className={styles.moneySecondary}>
              30d: {formatPeso(m.spend)} spent
              {m.revenue > 0 && ` → ${formatPeso(m.revenue)} revenue (${(m.revenue / m.spend).toFixed(1)}x)`}
              {m.conversations > 0 && ` · ${m.conversations.toLocaleString()} convos`}
            </div>
          )}
        </div>
      )}

      {/* Health Bar */}
      <div className={styles.healthBar}>
        <div className={styles.healthItem}>
          <span className={styles.healthValue}>{health.active_ads}</span>
          <span className={styles.healthLabel}>Active Ads</span>
        </div>
        <div className={styles.healthItem}>
          <span className={styles.healthValue} style={{color: '#16a34a'}}>{health.winning}</span>
          <span className={styles.healthLabel}>Working</span>
        </div>
        <div className={styles.healthItem}>
          <span className={styles.healthValue} style={{color: '#f59e0b'}}>{health.tired}</span>
          <span className={styles.healthLabel}>Fatiguing</span>
        </div>
        <div className={styles.healthItem}>
          <span className={styles.healthValue} style={{color: '#dc2626'}}>{health.dead_active}</span>
          <span className={styles.healthLabel}>Losing $</span>
        </div>
        <div className={styles.healthItem}>
          <span className={styles.healthValue}>{health.coverage_pct}%</span>
          <span className={styles.healthLabel}>Angles Tested</span>
        </div>
      </div>

      {/* Action Cards */}
      {actions.length > 0 ? (
        <div className={styles.actionsSection}>
          <h2 className={styles.sectionTitle}>📋 Recommended Actions</h2>
          <div className={styles.actionCards}>
            {actions.map((action, i) => (
              <div key={i} className={styles.actionCard} style={{borderLeftColor: ACTION_COLORS[action.type]}}>
                <div className={styles.actionHeader}>
                  <span className={styles.actionIcon}>{ACTION_ICONS[action.type]}</span>
                  <span className={styles.actionTitle}>{action.title}</span>
                  <span className={styles.actionUrgency}>{URGENCY_LABELS[action.urgency]}</span>
                </div>
                <p className={styles.actionReason}>{action.reason}</p>
                {action.type !== 'kill' && (
                  <Link
                    href={`/ads/create?angle=${action.angle}&persona=${action.persona}&mode=${action.type === 'explore' ? 'explore' : action.type === 'refresh' ? 'refresh' : 'scale'}${action.ad_ids?.length ? `&ref=${action.ad_ids[0]}` : ''}`}
                    className={styles.actionCta}
                  >
                    {action.type === 'explore' ? 'Create Ad →' : action.type === 'scale' ? 'Create Variations →' : 'Create Fresh Version →'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyActions}>
          <p>No urgent recommendations right now. Your ads are running well.</p>
          <Link href="/ads/create" className={styles.actionCta}>Create New Ads →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Strategy Tab ───
function StrategyTab({ matrix }: { matrix: Record<string, Record<string, MatrixCell>> | null }) {
  if (!matrix) return <div className={styles.tabLoading}>Loading strategy map...</div>

  const angles = Object.keys(matrix)
  if (angles.length === 0) return <div className={styles.tabLoading}>No data yet. Sync your ads first.</div>

  // Only show personas that have at least one ad (collapse empty columns)
  const allPersonas = angles.length > 0 ? Object.keys(matrix[angles[0]]) : []
  const activePersonas = allPersonas.filter(p =>
    angles.some(a => matrix[a]?.[p]?.ad_count > 0)
  )
  // Also show up to 2 gap personas so Grace sees opportunities
  const gapPersonas = allPersonas.filter(p => !activePersonas.includes(p)).slice(0, 2)
  const personas = [...activePersonas, ...gapPersonas]

  // Sort angles: ones with ads first, then gaps
  const sortedAngles = [...angles].sort((a, b) => {
    const aHas = personas.some(p => matrix[a]?.[p]?.ad_count > 0)
    const bHas = personas.some(p => matrix[b]?.[p]?.ad_count > 0)
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    return 0
  })

  const personaLabels: Record<string, string> = {
    new_mom_curious: 'New Mom', returning_buyer: 'Returning', price_sensitive: 'Price $',
    aspirational: 'Aspiring', skeptic: 'Skeptic', beginner: 'Beginner',
    advanced: 'Advanced', gift_buyer: 'Gift', busy_professional: 'Busy Pro',
  }

  return (
    <div className={styles.strategyTab}>
      <p className={styles.strategyHint}>
        Each cell = angle × audience. {activePersonas.length} active audiences shown.
        {gapPersonas.length > 0 && ` +${gapPersonas.length} untested.`}
      </p>
      <div className={styles.matrixContainer}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.matrixCorner}></th>
              {personas.map(p => <th key={p} className={styles.matrixColHeader}>{personaLabels[p] || fmt(p).split(' ')[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {sortedAngles.map(angle => (
              <tr key={angle}>
                <td className={styles.matrixRowHeader}>{fmt(angle)}</td>
                {personas.map(persona => {
                  const cell = matrix[angle]?.[persona]
                  if (!cell) return <td key={persona} className={styles.matrixCell} />
                  const isGap = cell.status === 'gap'
                  return (
                    <td key={persona} className={`${styles.matrixCell} ${isGap ? styles.matrixGap : ''}`}>
                      {isGap ? (
                        <Link href={`/ads/create?angle=${angle}&persona=${persona}&mode=explore`} className={styles.matrixGapLink}>
                          +
                        </Link>
                      ) : (
                        <div className={styles.matrixFilled} style={{background: STATUS_COLORS[cell.status] + '20', borderColor: STATUS_COLORS[cell.status]}}>
                          <span className={styles.matrixCount}>{cell.ad_count}</span>
                          {cell.avg_roas !== null && <span className={styles.matrixRoas}>{cell.avg_roas.toFixed(1)}x</span>}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.matrixLegend}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className={styles.legendItem}>
            <span className={styles.legendDot} style={{background: color}} />
            {fmt(status)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Competitors Tab ───
function CompetitorsTab({ signals, compAds }: { signals: CompSignal[]; compAds: CompAd[] }) {
  if (compAds.length === 0 && signals.length === 0) return (
    <div className={styles.tabLoading}>
      No competitor data yet.
      <Link href="/ads/competitors" className={styles.actionCta} style={{marginTop: '1rem'}}>Set Up Competitor Tracking →</Link>
    </div>
  )

  // Group by angle
  const byAngle = new Map<string, CompAd[]>()
  for (const ad of compAds) {
    const a = ad.angle || 'unclassified'
    if (!byAngle.has(a)) byAngle.set(a, [])
    byAngle.get(a)!.push(ad)
  }

  return (
    <div className={styles.competitorsTab}>
      <p className={styles.strategyHint}>
        {compAds.length} competitor ad{compAds.length !== 1 ? 's' : ''} tracked across {byAngle.size} angles. See what hooks they use.
      </p>

      {/* Angle groups with actual ad copy */}
      {[...byAngle.entries()].sort((a, b) => b[1].length - a[1].length).map(([angle, ads]) => {
        const signal = signals.find(s => s.angle === angle)
        return (
          <div key={angle} className={styles.compAngleGroup}>
            <div className={styles.compAngleHeader}>
              <span className={styles.compAngleTitle}>{fmt(angle)}</span>
              <span className={styles.compAngleMeta}>
                {ads.length} ad{ads.length > 1 ? 's' : ''}
                {signal?.we_have
                  ? <span className={styles.compHave}> · You test this {signal.our_roas ? `(${signal.our_roas.toFixed(1)}x)` : ''}</span>
                  : <span className={styles.compMissing}> · You don&apos;t test this</span>
                }
              </span>
              {!signal?.we_have && (
                <Link href={`/ads/create?angle=${angle}&mode=explore`} className={styles.compCta}>Create →</Link>
              )}
            </div>
            <div className={styles.compAdsList}>
              {ads.slice(0, 3).map((ad, i) => (
                <div key={i} className={styles.compAdItem}>
                  <div className={styles.compAdMeta}>
                    <span className={styles.compAdPage}>{ad.page_name}</span>
                    {ad.hook_type && <span className={styles.compAdHook}>{fmt(ad.hook_type)}</span>}
                  </div>
                  <p className={styles.compAdBody}>{ad.ad_body?.slice(0, 150)}{(ad.ad_body?.length || 0) > 150 ? '...' : ''}</p>
                </div>
              ))}
              {ads.length > 3 && <span className={styles.compMore}>+{ads.length - 3} more</span>}
            </div>
          </div>
        )
      })}

      <Link href="/ads/competitors" className={styles.detailLink}>View full competitor analysis →</Link>
    </div>
  )
}

// ─── Main Page ───
export default function AdsCommandCenter() {
  const [tab, setTab] = useState<Tab>('overview')
  const [actions, setActions] = useState<Action[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [money, setMoney] = useState<Money | null>(null)
  const [matrix, setMatrix] = useState<Record<string, Record<string, MatrixCell>> | null>(null)
  const [compSignals, setCompSignals] = useState<CompSignal[]>([])
  const [compAds, setCompAds] = useState<CompAd[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load overview data
    fetch('/api/ads/actions').then(r => r.json()).then(data => {
      setActions(data.actions || [])
      setHealth(data.health || null)
      setMoney(data.money || null)
      setLoading(false)
    }).catch(() => setLoading(false))

    // Pre-load strategy map
    fetch('/api/ads/intelligence/map').then(r => r.json()).then(data => {
      setMatrix(data.matrix || null)
    }).catch(() => {})

    // Pre-load competitor ads (raw data for the tab)
    fetch('/api/ads/competitors').then(r => r.json()).then(data => {
      const allCompAds: CompAd[] = (data.competitors || []).flatMap((c: any) =>
        (c.ads || []).map((ad: any) => ({
          page_name: c.page_name || ad.page_name || 'Unknown',
          ad_body: ad.ad_body || '',
          angle: ad.angle || null,
          hook_type: ad.hook_type || null,
          ad_started_at: ad.ad_started_at || null,
          is_active: ad.is_active ?? true,
        }))
      )
      setCompAds(allCompAds)

      // Build angle signals
      const angleMap = new Map<string, number>()
      for (const ad of allCompAds) {
        if (ad.angle) angleMap.set(ad.angle, (angleMap.get(ad.angle) || 0) + 1)
      }
      setCompSignals(
        [...angleMap.entries()]
          .map(([angle, count]) => ({ angle, count, we_have: false, our_roas: null }))
          .sort((a, b) => b.count - a.count)
      )
    }).catch(() => {})
  }, [])

  // Update compSignals with our data once actions load
  useEffect(() => {
    if (actions.length > 0 && compSignals.length > 0) {
      fetch('/api/ads/angle-coverage').then(r => r.json()).then(data => {
        const coverage = data.coverage || []
        const coverageMap = new Map(coverage.map((c: any) => [c.angle, c]))
        setCompSignals(prev => prev.map(s => {
          const ours = coverageMap.get(s.angle) as any
          return { ...s, we_have: ours?.tested || false, our_roas: ours?.best_roas || null }
        }))
      }).catch(() => {})
    }
  }, [actions.length, compSignals.length])

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading your ads...</div></div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Ads</h1>
          <p className={styles.subtitle}>Media buyer intelligence + campaign performance</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads/create" className={styles.createBtn}>✨ Create Ads</Link>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        {([
          { id: 'overview' as Tab, label: '📊 Overview', badge: actions.length > 0 ? actions.length : undefined },
          { id: 'campaigns' as Tab, label: '📁 Campaigns' },
          { id: 'strategy' as Tab, label: '🗺️ Strategy Map' },
          { id: 'competitors' as Tab, label: '🏢 Competitors', badge: compSignals.filter(s => !s.we_have).length || undefined },
        ]).map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.badge && <span className={styles.tabBadge}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {tab === 'overview' && <OverviewTab actions={actions} health={health} money={money} />}
        {tab === 'campaigns' && <AuditContent embedded />}
        {tab === 'strategy' && <StrategyTab matrix={matrix} />}
        {tab === 'competitors' && <CompetitorsTab signals={compSignals} compAds={compAds} />}
      </div>
    </div>
  )
}
