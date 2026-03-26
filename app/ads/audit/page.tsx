/**
 * Ad Classification Audit Page
 * 
 * View all ad creatives with their AI classifications.
 * Correct mistakes inline. See what the classifier "saw".
 * Matches Loom & Petal design system.
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

const DIMENSIONS: Record<string, string[]> = {
  angle: ['pain_point', 'aspiration', 'fear', 'social_proof', 'comparison', 'education', 'urgency', 'curiosity', 'transformation', 'authority'],
  persona: ['new_mom_curious', 'returning_buyer', 'price_sensitive', 'aspirational', 'skeptic', 'beginner', 'advanced', 'gift_buyer', 'busy_professional'],
  framework: ['PAS', 'AIDA', 'before_after', 'testimonial', 'urgency', 'FAB', 'comparison', 'storytelling', 'listicle', 'direct_offer'],
  hook_type: ['question', 'bold_claim', 'statistic', 'story_opening', 'curiosity_gap', 'pain_call', 'social_proof_lead', 'direct_benefit', 'controversy', 'how_to'],
  offer_type: ['discount', 'free_trial', 'value_stack', 'limited_time', 'social_proof', 'educational', 'no_offer', 'bundle', 'guarantee', 'sample'],
  emotional_tone: ['warm', 'urgent', 'educational', 'aspirational', 'fear', 'empowering', 'playful', 'authoritative', 'nostalgic', 'relieved'],
}

const STATUS_CONFIG: Record<string, { css: string; label: string; emoji: string }> = {
  winning: { css: 'badgeWinning', label: 'Working', emoji: '✅' },
  tired: { css: 'badgeTired', label: 'Tired', emoji: '😴' },
  dead: { css: 'badgeDead', label: 'Turn Off', emoji: '❌' },
  weak: { css: 'badgeWeak', label: 'Weak', emoji: '⚠️' },
  new: { css: 'badgeNew', label: 'New', emoji: '🆕' },
  unknown: { css: 'badgeNew', label: 'Unknown', emoji: '❓' },
}

function ClassificationChip({
  dimension,
  value,
  isManual,
  onCorrect,
}: {
  dimension: string
  value: string | null
  isManual: boolean
  onCorrect: (dim: string, val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const options = DIMENSIONS[dimension] || []
  const shortLabel = dimension === 'hook_type' ? 'hook'
    : dimension === 'offer_type' ? 'offer'
    : dimension === 'emotional_tone' ? 'tone'
    : dimension

  return (
    <div
      ref={ref}
      className={`${styles.chip} ${isManual ? styles.chipManual : ''}`}
      onClick={() => setOpen(!open)}
    >
      <span className={styles.chipLabel}>{shortLabel}:</span>
      <span className={styles.chipValue}>{value?.replace(/_/g, ' ') || '—'}</span>
      {open && (
        <div className={styles.chipDropdown}>
          {options.map(opt => (
            <div
              key={opt}
              className={`${styles.chipOption} ${opt === value ? styles.chipOptionActive : ''}`}
              onClick={e => {
                e.stopPropagation()
                onCorrect(dimension, opt)
                setOpen(false)
              }}
            >
              {opt.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfidenceDot({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null
  const cls = confidence >= 0.8 ? styles.confHigh : confidence >= 0.6 ? styles.confMed : styles.confLow
  return <span className={`${styles.confDot} ${cls}`} title={`${(confidence * 100).toFixed(0)}% confidence`} />
}

function AdCard({ ad, onCorrect }: { ad: AdCreative; onCorrect: (id: string, dim: string, val: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const thumb = ad.image_url || ad.video_thumbnail_url
  const status = STATUS_CONFIG[ad.ad_status || 'unknown'] || STATUS_CONFIG.unknown
  const isManual = ad.classification_version === 'manual'
  const hasTranscription = !!ad.video_transcription
  const hasFrames = ad.frame_descriptions && ad.frame_descriptions.length > 0

  return (
    <div className={styles.adCard}>
      {thumb ? (
        <img src={thumb} alt={ad.ad_name || ''} className={styles.adThumb} />
      ) : (
        <div className={styles.adThumbPlaceholder}>
          {ad.creative_format === 'video' ? '🎬' : ad.creative_format === 'carousel' ? '🎠' : '🖼️'}
        </div>
      )}
      <div className={styles.adContent}>
        <h3 className={styles.adName}>{ad.ad_name || ad.meta_ad_id}</h3>
        <div className={styles.adMeta}>{ad.campaign_name} › {ad.adset_name}</div>

        <div className={styles.badgeRow}>
          <span className={`${styles.badge} ${styles.badgeFormat}`}>{ad.creative_format}</span>
          <span className={`${styles.badge} ${styles[status.css]}`}>{status.emoji} {status.label}</span>
          {isManual && <span className={`${styles.badge} ${styles.badgeManual}`}>✏️ Manual</span>}
          {hasTranscription && <span className={`${styles.badge} ${styles.badgeTranscribed}`}>📝 Transcribed</span>}
          <ConfidenceDot confidence={ad.classification_confidence} />
        </div>

        {(ad.total_spend > 0 || ad.avg_roas) && (
          <div className={styles.perfRow}>
            <span className={styles.perfItem}>Spend: <span className={styles.perfValue}>₱{ad.total_spend?.toLocaleString()}</span></span>
            {ad.avg_roas !== null && <span className={styles.perfItem}>ROAS: <span className={styles.perfValue}>{ad.avg_roas.toFixed(1)}x</span></span>}
            {ad.avg_cpa !== null && <span className={styles.perfItem}>CPA: <span className={styles.perfValue}>₱{ad.avg_cpa.toFixed(0)}</span></span>}
          </div>
        )}

        <div className={styles.chips}>
          {(['angle', 'persona', 'framework', 'hook_type', 'offer_type', 'emotional_tone'] as const).map(dim => (
            <ClassificationChip
              key={dim}
              dimension={dim}
              value={ad[dim as keyof AdCreative] as string | null}
              isManual={isManual}
              onCorrect={(d, v) => onCorrect(ad.id, d, v)}
            />
          ))}
        </div>

        <button className={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ Hide details' : '▼ What AI saw'}
        </button>

        {expanded && (
          <div className={styles.expandSection}>
            {ad.body_text && (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>Ad Copy</div>
                <div className={styles.expandText}>{ad.body_text}</div>
              </div>
            )}
            {hasTranscription && (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>🎙️ Video Transcription</div>
                <div className={styles.expandText}>{ad.video_transcription}</div>
              </div>
            )}
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
            {ad.classification_raw?.reasoning && (
              <div className={styles.expandBlock}>
                <div className={styles.expandLabel}>🧠 Classifier Reasoning</div>
                <div className={styles.expandText}>{ad.classification_raw.reasoning}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuditPage() {
  const [ads, setAds] = useState<AdCreative[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [filterFormat, setFilterFormat] = useState('')
  const [filterConfidence, setFilterConfidence] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterVersion, setFilterVersion] = useState('')

  const fetchAds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ads/creatives')
      const data = await res.json()
      setAds(data.creatives || [])
    } catch (err) {
      console.error('Failed to fetch:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAds() }, [fetchAds])

  const handleSync = async (reclassify = false) => {
    setSyncing(true)
    setSyncMsg(reclassify ? 'Reclassifying all ads + analyzing videos...' : 'Syncing from Meta...')
    try {
      const res = await fetch('/api/ads/creatives/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reclassify }),
      })
      const data = await res.json()
      if (data.success) {
        setSyncMsg(`Done — ${data.ads_fetched} ads, ${data.videos_analyzed || 0} videos analyzed, ${data.creatives_classified} classified`)
        await fetchAds()
      } else {
        setSyncMsg(`Error: ${data.error}`)
      }
    } catch (err) {
      setSyncMsg(`Failed: ${err}`)
    }
    setSyncing(false)
  }

  const handleCorrect = async (id: string, dimension: string, value: string) => {
    setAds(prev => prev.map(ad =>
      ad.id === id ? { ...ad, [dimension]: value, classification_version: 'manual' } : ad
    ))
    try {
      await fetch('/api/ads/creatives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, corrections: { [dimension]: value } }),
      })
    } catch {
      await fetchAds()
    }
  }

  // Apply filters
  let filtered = ads
  if (filterFormat) filtered = filtered.filter(a => a.creative_format === filterFormat)
  if (filterStatus) filtered = filtered.filter(a => a.ad_status === filterStatus)
  if (filterVersion === 'manual') filtered = filtered.filter(a => a.classification_version === 'manual')
  else if (filterVersion === 'ai') filtered = filtered.filter(a => a.classification_version !== 'manual')
  if (filterConfidence === 'low') filtered = filtered.filter(a => (a.classification_confidence ?? 0) < 0.6)
  else if (filterConfidence === 'medium') filtered = filtered.filter(a => { const c = a.classification_confidence ?? 0; return c >= 0.6 && c < 0.8 })
  else if (filterConfidence === 'high') filtered = filtered.filter(a => (a.classification_confidence ?? 0) >= 0.8)

  // Stats
  const total = ads.length
  const classified = ads.filter(a => a.classified_at).length
  const videoAnalyzed = ads.filter(a => a.video_analyzed_at).length
  const videoTotal = ads.filter(a => a.creative_format === 'video').length
  const confAds = ads.filter(a => a.classification_confidence != null)
  const avgConf = confAds.length > 0 ? confAds.reduce((s, a) => s + (a.classification_confidence || 0), 0) / confAds.length : 0
  const manualCount = ads.filter(a => a.classification_version === 'manual').length

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading ads...</div></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Classification Audit</h1>
          <p className={styles.subtitle}>Review AI classifications, correct mistakes, see what the classifier understood</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads" className={styles.syncBtnOutline} style={{ textDecoration: 'none' }}>← Back to Ads</Link>
          <button className={styles.syncBtnOutline} onClick={() => handleSync(false)} disabled={syncing}>
            🔄 Sync
          </button>
          <button className={styles.syncBtn} onClick={() => handleSync(true)} disabled={syncing}>
            🔁 Reclassify All
          </button>
        </div>
      </div>

      {syncMsg && <div className={styles.syncMsg}>{syncMsg}</div>}

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>📊</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statLabel}>Total Ads</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>🤖</span>
          <span className={styles.statValue}>{classified}</span>
          <span className={styles.statLabel}>Classified</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>🎬</span>
          <span className={styles.statValue}>{videoAnalyzed}/{videoTotal}</span>
          <span className={styles.statLabel}>Videos Analyzed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>🎯</span>
          <span className={styles.statValue}>{(avgConf * 100).toFixed(0)}%</span>
          <span className={styles.statLabel}>Avg Confidence</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>✏️</span>
          <span className={styles.statValue}>{manualCount}</span>
          <span className={styles.statLabel}>Manual Fixes</span>
        </div>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
          <option value="">All Formats</option>
          <option value="static_image">Static Image</option>
          <option value="video">Video</option>
          <option value="carousel">Carousel</option>
        </select>
        <select className={styles.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="winning">✅ Working</option>
          <option value="tired">😴 Tired</option>
          <option value="dead">❌ Turn Off</option>
          <option value="weak">⚠️ Weak</option>
          <option value="new">🆕 New</option>
        </select>
        <select className={styles.filterSelect} value={filterConfidence} onChange={e => setFilterConfidence(e.target.value)}>
          <option value="">All Confidence</option>
          <option value="high">High (&gt;80%)</option>
          <option value="medium">Medium (60-80%)</option>
          <option value="low">Low (&lt;60%)</option>
        </select>
        <select className={styles.filterSelect} value={filterVersion} onChange={e => setFilterVersion(e.target.value)}>
          <option value="">All Sources</option>
          <option value="ai">AI Classified</option>
          <option value="manual">✏️ Manual</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No ads match your filters.</p>
        </div>
      ) : (
        <div className={styles.adList}>
          {filtered.map(ad => (
            <AdCard key={ad.id} ad={ad} onCorrect={handleCorrect} />
          ))}
        </div>
      )}
    </div>
  )
}
