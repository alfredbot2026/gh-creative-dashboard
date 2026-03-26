/**
 * Ad Classification Audit — Campaign Tree View
 * 
 * Groups: Campaign → Ad Set → Ads
 * Active-only by default. Lazy-loaded tree.
 * Inline classification corrections.
 */
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

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
  cta_text: string | null
  link_description: string | null
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
  total_spend: number
  total_purchases: number
  avg_roas: number | null
  avg_cpa: number | null
  avg_ctr: number | null
  classified_at: string | null
  video_analyzed_at: string | null
  is_active: boolean
}

interface CampaignGroup {
  name: string
  totalSpend: number
  adSets: AdSetGroup[]
  activeCount: number
  totalCount: number
}

interface AdSetGroup {
  name: string
  ads: AdCreative[]
}

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

// ─── Ad Card ───
function AdCard({ ad, onCorrect }: { ad: AdCreative; onCorrect: (id: string, dim: string, val: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const thumb = ad.image_url || ad.video_thumbnail_url
  const st = STATUS_CFG[ad.ad_status || 'unknown'] || STATUS_CFG.unknown
  const isManual = ad.classification_version === 'manual'
  const hasTranscript = !!ad.video_transcription
  const hasFrames = ad.frame_descriptions && ad.frame_descriptions.length > 0
  const conf = ad.classification_confidence
  const confCls = conf === null ? '' : conf >= 0.8 ? styles.confHigh : conf >= 0.6 ? styles.confMed : styles.confLow

  return (
    <div className={styles.adCard}>
      {thumb ? <img src={thumb} alt="" className={styles.adThumb} />
        : <div className={styles.adThumbPlaceholder}>{ad.creative_format === 'video' ? '🎬' : ad.creative_format === 'carousel' ? '🎠' : '🖼️'}</div>}
      <div className={styles.adContent}>
        <h4 className={styles.adName}>{ad.ad_name || ad.meta_ad_id}</h4>
        <div className={styles.badgeRow}>
          <span className={`${styles.badge} ${styles.badgeFormat}`}>{ad.creative_format}</span>
          <span className={`${styles.badge} ${styles[st.css]}`}>{st.label}</span>
          {!ad.is_active && <span className={`${styles.badge} ${styles.badgeInactive}`}>paused</span>}
          {isManual && <span className={`${styles.badge} ${styles.badgeManual}`}>✏️</span>}
          {hasTranscript && <span className={`${styles.badge} ${styles.badgeTranscribed}`}>📝</span>}
          {conf !== null && <span className={`${styles.confDot} ${confCls}`} title={`${(conf * 100).toFixed(0)}%`} />}
        </div>
        {ad.total_spend > 0 && (
          <div className={styles.perfRow}>
            <span className={styles.perfItem}>₱<span className={styles.perfValue}>{ad.total_spend.toLocaleString()}</span></span>
            {ad.avg_roas !== null && <span className={styles.perfItem}><span className={styles.perfValue}>{ad.avg_roas.toFixed(1)}x</span> ROAS</span>}
            {ad.avg_cpa !== null && <span className={styles.perfItem}>₱<span className={styles.perfValue}>{ad.avg_cpa.toFixed(0)}</span> CPA</span>}
          </div>
        )}
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
            {hasTranscript && <div className={styles.expandBlock}><div className={styles.expandLabel}>🎙️ Transcription</div><div className={styles.expandText}>{ad.video_transcription}</div></div>}
            {hasFrames && (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>🎬 Visual Timeline</div>
                <div className={styles.frameTimeline}>
                  {ad.frame_descriptions!.map((f, i) => (
                    <div key={i} className={styles.frameItem}>
                      <span className={styles.frameTime}>{f.timestamp_s}s</span>
                      <span className={styles.frameDesc}>{f.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ad.classification_raw?.reasoning && <div className={styles.expandBlock}><div className={styles.expandLabel}>🧠 Reasoning</div><div className={styles.expandText}>{ad.classification_raw.reasoning}</div></div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ad Set Row ───
function AdSetRow({ group, onCorrect }: { group: AdSetGroup; onCorrect: (id: string, dim: string, val: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.adsetGroup}>
      <div className={styles.adsetHeader} onClick={() => setOpen(!open)}>
        <span className={`${styles.campaignArrow} ${open ? styles.campaignArrowOpen : ''}`}>▸</span>
        <span className={styles.adsetName}>{group.name}</span>
        <span className={styles.adsetCount}>{group.ads.length}</span>
      </div>
      {open && (
        <div className={styles.adList}>
          {group.ads.map(ad => <AdCard key={ad.id} ad={ad} onCorrect={onCorrect} />)}
        </div>
      )}
    </div>
  )
}

// ─── Campaign Row ───
function CampaignRow({ group, onCorrect }: { group: CampaignGroup; onCorrect: (id: string, dim: string, val: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.campaignGroup}>
      <div className={styles.campaignHeader} onClick={() => setOpen(!open)}>
        <span className={`${styles.campaignArrow} ${open ? styles.campaignArrowOpen : ''}`}>▸</span>
        <span className={styles.campaignName}>{group.name}</span>
        <span className={styles.campaignCount}>{group.activeCount}/{group.totalCount} active</span>
        {group.totalSpend > 0 && <span className={styles.campaignSpend}>₱{group.totalSpend.toLocaleString()}</span>}
      </div>
      {open && group.adSets.map(as => (
        <AdSetRow key={as.name} group={as} onCorrect={onCorrect} />
      ))}
    </div>
  )
}

// ─── Page ───
const INITIAL_CAMPAIGNS = 10

export default function AuditPage() {
  const [allAds, setAllAds] = useState<AdCreative[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [filterFormat, setFilterFormat] = useState('')
  const [filterConfidence, setFilterConfidence] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_CAMPAIGNS)

  const fetchAds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ads/creatives')
      const data = await res.json()
      setAllAds(data.creatives || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAds() }, [fetchAds])

  // Filter
  const filtered = useMemo(() => {
    let ads = allAds
    if (!showInactive) ads = ads.filter(a => a.is_active)
    if (filterFormat) ads = ads.filter(a => a.creative_format === filterFormat)
    if (filterStatus) ads = ads.filter(a => a.ad_status === filterStatus)
    if (filterConfidence === 'low') ads = ads.filter(a => (a.classification_confidence ?? 0) < 0.6)
    else if (filterConfidence === 'medium') ads = ads.filter(a => { const c = a.classification_confidence ?? 0; return c >= 0.6 && c < 0.8 })
    else if (filterConfidence === 'high') ads = ads.filter(a => (a.classification_confidence ?? 0) >= 0.8)
    return ads
  }, [allAds, showInactive, filterFormat, filterStatus, filterConfidence])

  // Group into campaign tree, sorted by total spend desc
  const campaigns = useMemo(() => {
    const map = new Map<string, AdCreative[]>()
    for (const ad of filtered) {
      const key = ad.campaign_name || 'Uncategorized'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ad)
    }
    const groups: CampaignGroup[] = []
    for (const [name, ads] of map) {
      const adSetMap = new Map<string, AdCreative[]>()
      for (const ad of ads) {
        const key = ad.adset_name || 'Default'
        if (!adSetMap.has(key)) adSetMap.set(key, [])
        adSetMap.get(key)!.push(ad)
      }
      const adSets: AdSetGroup[] = Array.from(adSetMap.entries()).map(([n, a]) => ({ name: n, ads: a }))
      const totalSpend = ads.reduce((s, a) => s + (a.total_spend || 0), 0)
      const activeCount = ads.filter(a => a.is_active).length
      groups.push({ name, totalSpend, adSets, activeCount, totalCount: ads.length })
    }
    groups.sort((a, b) => b.totalSpend - a.totalSpend)
    return groups
  }, [filtered])

  const visibleCampaigns = campaigns.slice(0, visibleCount)
  const hasMore = visibleCount < campaigns.length

  const handleSync = async (reclassify = false) => {
    setSyncing(true)
    setSyncMsg(reclassify ? 'Reclassifying + analyzing videos...' : 'Syncing from Meta...')
    try {
      const res = await fetch('/api/ads/creatives/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reclassify }),
      })
      const data = await res.json()
      if (data.success) {
        setSyncMsg(`Done — ${data.ads_fetched} ads, ${data.videos_analyzed || 0} videos, ${data.creatives_classified} classified`)
        await fetchAds()
      } else setSyncMsg(`Error: ${data.error}`)
    } catch (err) { setSyncMsg(`Failed: ${err}`) }
    setSyncing(false)
  }

  const handleCorrect = async (id: string, dimension: string, value: string) => {
    setAllAds(prev => prev.map(ad => ad.id === id ? { ...ad, [dimension]: value, classification_version: 'manual' } : ad))
    try {
      await fetch('/api/ads/creatives', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, corrections: { [dimension]: value } }),
      })
    } catch { await fetchAds() }
  }

  // Stats
  const total = allAds.length
  const active = allAds.filter(a => a.is_active).length
  const videoAnalyzed = allAds.filter(a => a.video_analyzed_at).length
  const videoTotal = allAds.filter(a => a.creative_format === 'video').length
  const confAds = allAds.filter(a => a.classification_confidence != null)
  const avgConf = confAds.length > 0 ? confAds.reduce((s, a) => s + (a.classification_confidence || 0), 0) / confAds.length : 0
  const manualCount = allAds.filter(a => a.classification_version === 'manual').length

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Classification Audit</h1>
          <p className={styles.subtitle}>Campaign → Ad Set → Ads. Click any classification to correct it.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads" className={styles.btnOutline}>← Ads</Link>
          <button className={styles.btnOutline} onClick={() => handleSync(false)} disabled={syncing}>🔄 Sync</button>
          <button className={styles.btn} onClick={() => handleSync(true)} disabled={syncing}>🔁 Reclassify</button>
        </div>
      </div>

      {syncMsg && <div className={styles.syncMsg}>{syncMsg}</div>}

      <div className={styles.statsRow}>
        <div className={styles.statCard}><span className={styles.statEmoji}>📊</span><span className={styles.statValue}>{active}/{total}</span><span className={styles.statLabel}>Active Ads</span></div>
        <div className={styles.statCard}><span className={styles.statEmoji}>🎬</span><span className={styles.statValue}>{videoAnalyzed}/{videoTotal}</span><span className={styles.statLabel}>Videos Analyzed</span></div>
        <div className={styles.statCard}><span className={styles.statEmoji}>🎯</span><span className={styles.statValue}>{(avgConf * 100).toFixed(0)}%</span><span className={styles.statLabel}>Avg Confidence</span></div>
        <div className={styles.statCard}><span className={styles.statEmoji}>✏️</span><span className={styles.statValue}>{manualCount}</span><span className={styles.statLabel}>Manual Fixes</span></div>
        <div className={styles.statCard}><span className={styles.statEmoji}>📁</span><span className={styles.statValue}>{campaigns.length}</span><span className={styles.statLabel}>Campaigns</span></div>
      </div>

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
        <select className={styles.filterSelect} value={filterConfidence} onChange={e => setFilterConfidence(e.target.value)}>
          <option value="">All Confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className={styles.toggle}>
          <input type="checkbox" className={styles.toggleCheck} checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive ({total - active})
        </label>
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.empty}>No ads match your filters.</div>
      ) : (
        <>
          {visibleCampaigns.map(c => <CampaignRow key={c.name} group={c} onCorrect={handleCorrect} />)}
          {hasMore && (
            <div className={styles.loadMore}>
              <button className={styles.loadMoreBtn} onClick={() => setVisibleCount(v => v + 10)}>
                Show more campaigns ({campaigns.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
