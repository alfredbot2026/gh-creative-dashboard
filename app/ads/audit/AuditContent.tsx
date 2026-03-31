/**
 * Ad Classification Audit — Campaign Tree + Media Buyer Metrics
 * 
 * Date-range-aware metrics computed from daily data.
 * ROAS = total_revenue / total_spend (not averaged).
 * Campaign → Ad Set → Ads tree.
 */
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

// ─── Types ───

interface AdCreative {
  id: string
  meta_ad_id: string
  ad_name: string
  campaign_name: string
  adset_name: string
  creative_format: string
  image_url: string | null
  video_thumbnail_url: string | null
  headline: string | null
  body_text: string | null
  video_transcription: string | null
  frame_descriptions: Array<{ timestamp_s: number; description: string }> | null
  angle: string | null
  persona: string | null
  framework: string | null
  hook_type: string | null
  offer_type: string | null
  emotional_tone: string | null
  classification_version: string | null
  classification_confidence: number | null
  classification_raw: { reasoning?: string } | null
  ad_status: string | null
  is_active: boolean
  video_analyzed_at: string | null
  campaign_objective: string | null
  optimization_goal: string | null
}

interface AdMetrics {
  meta_ad_id: string
  spend: number
  impressions: number
  clicks: number
  purchases: number
  revenue: number
  reach: number
  roas: number | null
  cpa: number | null
  ctr: number
  cpc: number | null
  cpm: number | null
  frequency: number | null
  hook_rate: number | null
  hold_rate: number | null
  video_views: number
  conversations: number
  leads: number
  link_clicks: number
  landing_page_views: number
  engagement: number
  cost_per_conversation: number | null
  cost_per_lead: number | null
  cost_per_link_click: number | null
  roas_prev: number | null
  roas_trend: 'rising' | 'stable' | 'declining' | null
}

interface AccountMetrics {
  spend: number
  impressions: number
  clicks: number
  purchases: number
  revenue: number
  roas: number | null
  cpa: number | null
  ctr: number
  cpm: number | null
  frequency: number | null
  conversations: number
  cost_per_conversation: number | null
}

interface CampaignGroup {
  name: string
  spend: number
  roas: number | null
  adSets: AdSetGroup[]
  activeCount: number
  totalCount: number
}

interface AdSetGroup {
  name: string
  ads: (AdCreative & { metrics?: AdMetrics })[]
}

// ─── Constants ───

const DIMENSIONS: Record<string, string[]> = {
  angle: ['pain_point', 'aspiration', 'fear', 'social_proof', 'comparison', 'education', 'urgency', 'curiosity', 'transformation', 'authority'],
  persona: ['new_mom_curious', 'returning_buyer', 'price_sensitive', 'aspirational', 'skeptic', 'beginner', 'advanced', 'gift_buyer', 'busy_professional'],
  framework: ['PAS', 'AIDA', 'before_after', 'testimonial', 'urgency', 'FAB', 'comparison', 'storytelling', 'listicle', 'direct_offer'],
  hook_type: ['question', 'bold_claim', 'statistic', 'story_opening', 'curiosity_gap', 'pain_call', 'social_proof_lead', 'direct_benefit', 'controversy', 'how_to'],
  offer_type: ['discount', 'free_trial', 'value_stack', 'limited_time', 'social_proof', 'educational', 'no_offer', 'bundle', 'guarantee', 'sample'],
  emotional_tone: ['warm', 'urgent', 'educational', 'aspirational', 'fear', 'empowering', 'playful', 'authoritative', 'nostalgic', 'relieved'],
}

const STATUS_CFG: Record<string, { css: string; label: string }> = {
  winning: { css: 'badgeWinning', label: '✅ Working' },
  tired: { css: 'badgeTired', label: '😴 Tired' },
  dead: { css: 'badgeDead', label: '❌ Kill' },
  weak: { css: 'badgeWeak', label: '⚠️ Weak' },
  new: { css: 'badgeNew', label: '🆕 New' },
  unknown: { css: 'badgeNew', label: '❓' },
}

const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'lifetime', label: 'Lifetime' },
]

// ─── Helpers ───

function formatPeso(n: number) {
  return '₱' + n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function TrendBadge({ trend, roas, prev }: { trend: AdMetrics['roas_trend']; roas: number | null; prev: number | null }) {
  if (!trend || roas === null) return null
  const arrow = trend === 'rising' ? '↑' : trend === 'declining' ? '↓' : '→'
  const color = trend === 'rising' ? '#16a34a' : trend === 'declining' ? '#dc2626' : 'var(--color-text-dim)'
  return <span style={{ color, fontSize: '0.65rem', fontWeight: 700 }} title={prev !== null ? `prev: ${prev.toFixed(1)}x` : ''}>
    {arrow} {roas.toFixed(1)}x
  </span>
}

// ─── Chip ───
function Chip({ dimension, value, isManual, onCorrect }: {
  dimension: string; value: string | null; isManual: boolean
  onCorrect: (dim: string, val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const short = dimension === 'hook_type' ? 'hook' : dimension === 'offer_type' ? 'offer' : dimension === 'emotional_tone' ? 'tone' : dimension

  return (
    <div ref={ref} className={`${styles.chip} ${isManual ? styles.chipManual : ''}`} onClick={() => setOpen(!open)}>
      <span className={styles.chipLabel}>{short}:</span>
      <span className={styles.chipValue}>{value?.replace(/_/g, ' ') || '—'}</span>
      {open && (
        <div className={styles.chipDropdown}>
          {(DIMENSIONS[dimension] || []).map(opt => (
            <div key={opt} className={`${styles.chipOption} ${opt === value ? styles.chipOptionActive : ''}`}
              onClick={e => { e.stopPropagation(); onCorrect(dimension, opt); setOpen(false) }}>
              {opt.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Ad Card with Metrics ───
function AdCard({ ad, onCorrect, biz }: { ad: AdCreative & { metrics?: AdMetrics }; onCorrect: (id: string, d: string, v: string) => void; biz: { winningCPA: number; breakevenCPA: number; winningCostPerConv: number; breakevenCostPerConv: number } | null }) {
  const [expanded, setExpanded] = useState(false)
  const thumb = ad.image_url || ad.video_thumbnail_url
  const st = STATUS_CFG[ad.ad_status || 'unknown'] || STATUS_CFG.unknown
  const isManual = ad.classification_version === 'manual'
  const m = ad.metrics
  const isVideo = ad.creative_format === 'video'

  return (
    <div className={styles.adCard}>
      {thumb ? <img src={thumb} alt="" className={styles.adThumb} />
        : <div className={styles.adThumbPlaceholder}>{isVideo ? '🎬' : ad.creative_format === 'carousel' ? '🎠' : '🖼️'}</div>}
      <div className={styles.adContent}>
        <h4 className={styles.adName}>{ad.ad_name || ad.meta_ad_id}</h4>
        <div className={styles.badgeRow}>
          <span className={`${styles.badge} ${styles.badgeFormat}`}>{ad.creative_format}</span>
          <span className={`${styles.badge} ${styles[st.css]}`}>{st.label}</span>
          {ad.campaign_objective && <span className={`${styles.badge} ${styles.badgeObjective}`}>
            {ad.campaign_objective === 'OUTCOME_SALES' ? '💰 Sales' :
             ad.campaign_objective === 'OUTCOME_ENGAGEMENT' || ad.campaign_objective === 'MESSAGES' ? '💬 Engagement' :
             ad.campaign_objective === 'OUTCOME_AWARENESS' ? '👁️ Awareness' :
             ad.campaign_objective === 'OUTCOME_TRAFFIC' || ad.campaign_objective === 'LINK_CLICKS' ? '🔗 Traffic' :
             ad.campaign_objective}
          </span>}
          {!ad.is_active && <span className={`${styles.badge} ${styles.badgeInactive}`}>paused</span>}
          {isManual && <span className={`${styles.badge} ${styles.badgeManual}`}>✏️</span>}
          {m?.roas_trend && <TrendBadge trend={m.roas_trend} roas={m.roas} prev={m.roas_prev} />}
        </div>

        {/* Objective-aware metrics */}
        {m && m.spend > 0 && (() => {
          const obj = ad.campaign_objective || ''
          const isSales = obj === 'OUTCOME_SALES'
          const isEngagement = obj === 'OUTCOME_ENGAGEMENT' || obj === 'MESSAGES'
          const isAwareness = obj === 'OUTCOME_AWARENESS'
          const isTraffic = obj === 'OUTCOME_TRAFFIC' || obj === 'LINK_CLICKS'

          return (
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Spend</span>
                <span className={styles.metricValue}>{formatPeso(m.spend)}</span>
              </div>

              {/* SALES: ROAS + CPA + Revenue are primary */}
              {isSales && <>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>ROAS</span>
                  <span className={`${styles.metricValue} ${m.roas !== null && m.roas >= 2 ? styles.metricGood : m.roas !== null && m.roas < 1 ? styles.metricBad : ''}`}>
                    {m.roas !== null ? m.roas.toFixed(2) + 'x' : '—'}
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>CPA</span>
                  <span className={`${styles.metricValue} ${m.cpa !== null && biz && m.cpa <= biz.winningCPA ? styles.metricGood : m.cpa !== null && biz && m.cpa > biz.breakevenCPA ? styles.metricBad : ''}`}>
                    {m.cpa !== null ? formatPeso(m.cpa) : '—'}
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Purchases</span>
                  <span className={styles.metricValue}>{m.purchases}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Revenue</span>
                  <span className={styles.metricValue}>{formatPeso(m.revenue)}</span>
                </div>
              </>}

              {/* ENGAGEMENT: Cost per conversation + conversations are primary */}
              {isEngagement && <>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Conversations</span>
                  <span className={styles.metricValue}>{m.conversations}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Cost/Conv</span>
                  <span className={`${styles.metricValue} ${m.cost_per_conversation !== null && biz && m.cost_per_conversation <= biz.winningCostPerConv ? styles.metricGood : m.cost_per_conversation !== null && biz && m.cost_per_conversation > biz.breakevenCostPerConv ? styles.metricBad : ''}`}>
                    {m.cost_per_conversation !== null ? formatPeso(m.cost_per_conversation) : '—'}
                  </span>
                </div>
                {m.leads > 0 && <div className={styles.metric}>
                  <span className={styles.metricLabel}>Leads</span>
                  <span className={styles.metricValue}>{m.leads}</span>
                </div>}
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Engagement</span>
                  <span className={styles.metricValue}>{m.engagement.toLocaleString()}</span>
                </div>
              </>}

              {/* AWARENESS: CPM + Reach + Frequency are primary */}
              {isAwareness && <>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>CPM</span>
                  <span className={styles.metricValue}>{m.cpm !== null ? formatPeso(m.cpm) : '—'}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Reach</span>
                  <span className={styles.metricValue}>{m.reach.toLocaleString()}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Impressions</span>
                  <span className={styles.metricValue}>{m.impressions.toLocaleString()}</span>
                </div>
              </>}

              {/* TRAFFIC: CPC + Link clicks + Landing page views */}
              {isTraffic && <>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Link Clicks</span>
                  <span className={styles.metricValue}>{m.link_clicks}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Cost/Click</span>
                  <span className={styles.metricValue}>{m.cost_per_link_click !== null ? formatPeso(m.cost_per_link_click) : '—'}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>LP Views</span>
                  <span className={styles.metricValue}>{m.landing_page_views}</span>
                </div>
              </>}

              {/* Common metrics for all objectives */}
              <div className={styles.metric}>
                <span className={styles.metricLabel}>CTR</span>
                <span className={`${styles.metricValue} ${m.ctr >= 2 ? styles.metricGood : m.ctr < 1 ? styles.metricBad : ''}`}>
                  {m.ctr.toFixed(1)}%
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Freq</span>
                <span className={`${styles.metricValue} ${m.frequency !== null && m.frequency > 3.0 ? styles.metricBad : ''}`}>
                  {m.frequency !== null ? m.frequency.toFixed(1) : '—'}
                </span>
              </div>

              {/* Video metrics if applicable */}
              {isVideo && m.hook_rate !== null && (
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Hook</span>
                  <span className={`${styles.metricValue} ${m.hook_rate >= 30 ? styles.metricGood : m.hook_rate < 15 ? styles.metricBad : ''}`}>
                    {m.hook_rate.toFixed(0)}%
                  </span>
                </div>
              )}
              {isVideo && m.hold_rate !== null && (
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Hold</span>
                  <span className={styles.metricValue}>{m.hold_rate.toFixed(0)}%</span>
                </div>
              )}

              {/* Cross-objective: show purchases if they happened (even on non-sales campaigns) */}
              {!isSales && m.purchases > 0 && <>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Purchases</span>
                  <span className={styles.metricValue}>{m.purchases}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Revenue</span>
                  <span className={styles.metricValue}>{formatPeso(m.revenue)}</span>
                </div>
              </>}
            </div>
          )
        })()}

        <div className={styles.chips}>
          {(['angle', 'persona', 'framework', 'hook_type', 'offer_type', 'emotional_tone'] as const).map(d => (
            <Chip key={d} dimension={d} value={ad[d as keyof AdCreative] as string | null} isManual={isManual}
              onCorrect={(dim, val) => onCorrect(ad.id, dim, val)} />
          ))}
        </div>

        <button className={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ Hide' : '▼ What AI saw'}
        </button>
        {expanded && (
          <div className={styles.expandSection}>
            {ad.body_text && <div className={styles.expandBlock}><div className={styles.expandLabel}>Ad Copy</div><div className={styles.expandText}>{ad.body_text}</div></div>}
            {ad.video_transcription && <div className={styles.expandBlock}><div className={styles.expandLabel}>🎙️ Transcription</div><div className={styles.expandText}>{ad.video_transcription}</div></div>}
            {ad.frame_descriptions?.length ? (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>🎬 Visual Timeline</div>
                <div className={styles.frameTimeline}>{ad.frame_descriptions.map((f, i) => (
                  <div key={i} className={styles.frameItem}><span className={styles.frameTime}>{f.timestamp_s}s</span><span className={styles.frameDesc}>{f.description}</span></div>
                ))}</div>
              </div>
            ) : null}
            {ad.classification_raw?.reasoning && <div className={styles.expandBlock}><div className={styles.expandLabel}>🧠 Reasoning</div><div className={styles.expandText}>{ad.classification_raw.reasoning}</div></div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ad Set Row ───
type BizThresholds = { winningCPA: number; breakevenCPA: number; winningCostPerConv: number; breakevenCostPerConv: number } | null

function AdSetRow({ group, onCorrect, biz }: { group: AdSetGroup; onCorrect: (id: string, d: string, v: string) => void; biz: BizThresholds }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.adsetGroup}>
      <div className={styles.adsetHeader} onClick={() => setOpen(!open)}>
        <span className={`${styles.campaignArrow} ${open ? styles.campaignArrowOpen : ''}`}>▸</span>
        <span className={styles.adsetName}>{group.name}</span>
        <span className={styles.adsetCount}>{group.ads.length}</span>
      </div>
      {open && <div className={styles.adList}>{group.ads.map(ad => <AdCard key={ad.id} ad={ad} onCorrect={onCorrect} biz={biz} />)}</div>}
    </div>
  )
}

// ─── Campaign Row ───
function CampaignRow({ group, onCorrect, biz }: { group: CampaignGroup; onCorrect: (id: string, d: string, v: string) => void; biz: BizThresholds }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.campaignGroup}>
      <div className={styles.campaignHeader} onClick={() => setOpen(!open)}>
        <span className={`${styles.campaignArrow} ${open ? styles.campaignArrowOpen : ''}`}>▸</span>
        <span className={styles.campaignName}>{group.name}</span>
        {group.roas !== null && <span className={styles.campaignRoas}>{group.roas.toFixed(1)}x ROAS</span>}
        <span className={styles.campaignCount}>{group.activeCount}/{group.totalCount}</span>
        {group.spend > 0 && <span className={styles.campaignSpend}>{formatPeso(group.spend)}</span>}
      </div>
      {open && group.adSets.map(as => <AdSetRow key={as.name} group={as} onCorrect={onCorrect} biz={biz} />)}
    </div>
  )
}

// ─── Page ───
const INITIAL_CAMPAIGNS = 10

export default function AuditPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [allAds, setAllAds] = useState<AdCreative[]>([])
  const [metricsMap, setMetricsMap] = useState<Map<string, AdMetrics>>(new Map())
  const [accountMetrics, setAccountMetrics] = useState<AccountMetrics | null>(null)
  const [freshness, setFreshness] = useState<{ latest_date: string | null; stale_hours: number | null; is_stale: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [period, setPeriod] = useState('7')
  const [showInactive, setShowInactive] = useState(false)
  const [filterFormat, setFilterFormat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_CAMPAIGNS)
  const [business, setBusiness] = useState<{
    productPrice: number; convToSaleRate: number
    breakevenCPA: number; winningCPA: number
    breakevenCostPerConv: number; winningCostPerConv: number
  } | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [adsRes, metricsRes] = await Promise.all([
      fetch('/api/ads/creatives'),
      fetch(`/api/ads/metrics?period=${period}&compare=true`),
    ])
    const adsData = await adsRes.json()
    const metricsData = await metricsRes.json()

    setAllAds(adsData.creatives || [])
    setAccountMetrics(metricsData.account || null)
    setBusiness(metricsData.business || null)
    setFreshness(metricsData.freshness || null)

    const map = new Map<string, AdMetrics>()
    for (const m of metricsData.ads || []) {
      map.set(m.meta_ad_id, m)
    }
    setMetricsMap(map)
    setLoading(false)
  }, [period])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Merge ads with metrics + filter
  const enrichedAds = useMemo(() => {
    let ads = allAds.map(ad => ({ ...ad, metrics: metricsMap.get(ad.meta_ad_id) }))
    if (!showInactive) ads = ads.filter(a => a.is_active)
    if (filterFormat) ads = ads.filter(a => a.creative_format === filterFormat)
    if (filterStatus) ads = ads.filter(a => a.ad_status === filterStatus)
    return ads
  }, [allAds, metricsMap, showInactive, filterFormat, filterStatus])

  // Group into campaign tree
  const campaigns = useMemo(() => {
    const map = new Map<string, (AdCreative & { metrics?: AdMetrics })[]>()
    for (const ad of enrichedAds) {
      const key = ad.campaign_name || 'Uncategorized'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ad)
    }
    const groups: CampaignGroup[] = []
    for (const [name, ads] of map) {
      const adSetMap = new Map<string, (AdCreative & { metrics?: AdMetrics })[]>()
      for (const ad of ads) {
        const key = ad.adset_name || 'Default'
        if (!adSetMap.has(key)) adSetMap.set(key, [])
        adSetMap.get(key)!.push(ad)
      }
      const adSets: AdSetGroup[] = Array.from(adSetMap.entries()).map(([n, a]) => ({ name: n, ads: a }))
      const spend = ads.reduce((s, a) => s + (a.metrics?.spend || 0), 0)
      const revenue = ads.reduce((s, a) => s + (a.metrics?.revenue || 0), 0)
      const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null
      groups.push({ name, spend, roas, adSets, activeCount: ads.filter(a => a.is_active).length, totalCount: ads.length })
    }
    groups.sort((a, b) => b.spend - a.spend)
    return groups
  }, [enrichedAds])

  const handleSync = async (reclassify = false) => {
    setSyncing(true)
    setSyncMsg(reclassify ? 'Reclassifying ads...' : 'Syncing ads + performance data...')
    try {
      // Single sync: fetches ads from Meta, syncs daily performance, classifies, aggregates
      const res = await fetch('/api/ads/creatives/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reclassify }) })
      const data = await res.json()
      setSyncMsg(data.success ? `Done — ${data.ads_fetched} ads, ${data.performance_updated || 0} updated` : `Error: ${data.error}`)
      await fetchAll()
    } catch (err) { setSyncMsg(`Failed: ${err}`) }
    setSyncing(false)
  }

  const handleCorrect = async (id: string, dim: string, val: string) => {
    setAllAds(prev => prev.map(ad => ad.id === id ? { ...ad, [dim]: val, classification_version: 'manual' } : ad))
    try { await fetch('/api/ads/creatives', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, corrections: { [dim]: val } }) }) }
    catch { await fetchAll() }
  }

  const a = accountMetrics
  const active = allAds.filter(a => a.is_active).length
  const videoAnalyzed = allAds.filter(a => a.video_analyzed_at).length
  const videoTotal = allAds.filter(a => a.creative_format === 'video').length

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>

  return (
    <div className={styles.page}>
      {!embedded && <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Ads</h1>
          <p className={styles.subtitle}>Campaign → Ad Set → Ad. Metrics from daily data. Click classifications to correct.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads/create" className={styles.btnPrimary}>✨ Create Ads</Link>
          <Link href="/ads" className={styles.btnOutline}>📊 Strategy Map</Link>
          <Link href="/ads/competitors" className={styles.btnOutline}>🏢 Intel</Link>
          <button className={styles.btnOutline} onClick={() => handleSync(false)} disabled={syncing}>🔄 Sync</button>
          <button className={styles.btn} onClick={() => handleSync(true)} disabled={syncing}>🔁 Reclassify</button>
        </div>
      </div>}

      {/* Sync controls when embedded in tab */}
      {embedded && (
        <div className={styles.embeddedControls}>
          <button className={styles.btnOutline} onClick={() => handleSync(false)} disabled={syncing}>🔄 Sync</button>
          <button className={styles.btn} onClick={() => handleSync(true)} disabled={syncing}>🔁 Reclassify</button>
          {syncMsg && <span className={styles.syncMsgInline}>{syncMsg}</span>}
        </div>
      )}

      {!embedded && syncMsg && <div className={styles.syncMsg}>{syncMsg}</div>}

      {/* Data freshness banner — only show if >5 days (Meta has 2-3 day reporting delay) */}
      {freshness?.is_stale && (freshness.stale_hours || 0) > 120 && (
        <div className={styles.staleBanner}>
          ℹ️ Latest data: <strong>{freshness.latest_date}</strong>. Meta typically has a 2-3 day reporting delay — this is normal.
          <button className={styles.staleSyncBtn} onClick={() => handleSync(false)} disabled={syncing}>
            Sync
          </button>
        </div>
      )}

      {/* Period selector */}
      <div className={styles.periodBar}>
        {PERIODS.map(p => (
          <button key={p.value} className={`${styles.periodBtn} ${period === p.value ? styles.periodBtnActive : ''}`}
            onClick={() => { setPeriod(p.value); setVisibleCount(INITIAL_CAMPAIGNS) }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Business economics context */}
      {business && (
        <div className={styles.bizContext}>
          <span className={styles.bizItem}>📦 <strong>Papers to Profits</strong> {formatPeso(business.productPrice)}</span>
          <span className={styles.bizItem}>💰 Winning CPA: &lt;{formatPeso(business.winningCPA)}</span>
          <span className={styles.bizItem}>💬 Conv rate: {(business.convToSaleRate * 100).toFixed(0)}%</span>
          <span className={styles.bizItem}>💬 Winning cost/conv: &lt;{formatPeso(business.winningCostPerConv)}</span>
        </div>
      )}

      {/* Account-level metrics — split by funnel */}
      {a && (
        <div className={styles.accountMetrics}>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>Total Spend</span>
            <span className={styles.accountValue}>{formatPeso(a.spend)}</span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>💰 Revenue</span>
            <span className={styles.accountValue}>{formatPeso(a.revenue)}</span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>💰 ROAS</span>
            <span className={`${styles.accountValue} ${a.roas !== null && a.roas >= 2 ? styles.metricGood : a.roas !== null && a.roas < 1 ? styles.metricBad : ''}`}>
              {a.roas !== null ? a.roas.toFixed(2) + 'x' : '—'}
            </span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>💰 Purchases</span>
            <span className={styles.accountValue}>{a.purchases}</span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>💬 Convos</span>
            <span className={styles.accountValue}>{a.conversations?.toLocaleString() || '0'}</span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>💬 Cost/Conv</span>
            <span className={styles.accountValue}>{a.cost_per_conversation !== null ? formatPeso(a.cost_per_conversation) : '—'}</span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>CTR</span>
            <span className={styles.accountValue}>{a.ctr.toFixed(1)}%</span>
          </div>
          <div className={styles.accountMetric}>
            <span className={styles.accountLabel}>Freq</span>
            <span className={`${styles.accountValue} ${a.frequency !== null && a.frequency > 3.0 ? styles.metricBad : ''}`}>
              {a.frequency !== null ? a.frequency.toFixed(1) : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.toolbar}>
        <select className={styles.filterSelect} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
          <option value="">All Formats</option>
          <option value="static_image">Static</option>
          <option value="video">Video</option>
          <option value="carousel">Carousel</option>
        </select>
        <select className={styles.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="winning">Working</option>
          <option value="weak">Weak</option>
          <option value="dead">Kill</option>
          <option value="new">New</option>
        </select>
        <label className={styles.toggle}>
          <input type="checkbox" className={styles.toggleCheck} checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Inactive ({allAds.length - active})
        </label>
      </div>

      {/* Campaign tree */}
      {campaigns.length === 0 ? (
        <div className={styles.empty}>No ads match your filters.</div>
      ) : (
        <>
          {campaigns.slice(0, visibleCount).map(c => <CampaignRow key={c.name} group={c} onCorrect={handleCorrect} biz={business} />)}
          {visibleCount < campaigns.length && (
            <div className={styles.loadMore}>
              <button className={styles.loadMoreBtn} onClick={() => setVisibleCount(v => v + 10)}>
                Show more ({campaigns.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
