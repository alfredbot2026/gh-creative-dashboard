/**
 * Competitor Intelligence Dashboard
 * 
 * Shows: competitive landscape, market sentiment, competitor ad analysis.
 * Data comes from Supabase (populated by OpenClaw cron + Vercel sentiment API).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Competitor {
  id: string
  page_name: string
  page_url: string | null
  niche: string | null
  discovered_via: string
  active_ads: number
  ads: Array<{
    ad_body: string
    ad_format: string
    angle: string | null
    framework: string | null
    hook_type: string | null
    first_seen_at: string
    ad_started_at: string | null
  }>
  latest_snapshot: {
    active_ad_count: number
    angle_distribution: Record<string, number> | null
    format_distribution: Record<string, number> | null
    oldest_ad_days: number | null
  } | null
}

interface Landscape {
  total_competitors: number
  total_ads: number
  angle_breakdown: Record<string, number>
  hook_breakdown: Record<string, number>
}

interface SentimentSignal {
  query: string
  score: number
  summary: string
  raw_data: { key_signals?: string[] } | null
  signal_date: string
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [landscape, setLandscape] = useState<Landscape | null>(null)
  const [sentiment, setSentiment] = useState<SentimentSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [compRes, sentRes] = await Promise.all([
      fetch('/api/ads/competitors'),
      fetch('/api/ads/sentiment?days=7'),
    ])
    const compData = await compRes.json()
    const sentData = await sentRes.json()

    setCompetitors(compData.competitors || [])
    setLandscape(compData.landscape || null)
    // Get latest sentiment per query
    const latest = new Map<string, SentimentSignal>()
    for (const s of sentData.signals || []) {
      if (!latest.has(s.query)) latest.set(s.query, s)
    }
    setSentiment(Array.from(latest.values()))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const collectSentiment = async () => {
    setCollecting(true)
    setStatusMsg('Collecting market sentiment...')
    try {
      const res = await fetch('/api/ads/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      setStatusMsg(data.success ? `Done — ${data.collected} signals collected` : `Error: ${data.error}`)
      await fetchAll()
    } catch (err) { setStatusMsg(`Failed: ${err}`) }
    setCollecting(false)
  }

  const scoreClass = (score: number) =>
    score > 20 ? styles.scorePositive : score < -20 ? styles.scoreNegative : styles.scoreNeutral

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading intelligence...</div></div>

  const hasData = competitors.length > 0 || sentiment.length > 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Competitive Intelligence</h1>
          <p className={styles.subtitle}>What competitors are doing + market sentiment</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads" className={styles.btnOutline}>← Ads</Link>
          <Link href="/ads/audit" className={styles.btnOutline}>Audit</Link>
          <button className={styles.btn} onClick={collectSentiment} disabled={collecting}>
            {collecting ? '⏳ Collecting...' : '🔍 Collect Sentiment'}
          </button>
        </div>
      </div>

      {statusMsg && <div className={styles.statusMsg}>{statusMsg}</div>}

      {/* Landscape overview */}
      {landscape && (
        <div className={styles.landscape}>
          <div className={styles.landscapeCard}>
            <span className={styles.landscapeEmoji}>🏢</span>
            <span className={styles.landscapeValue}>{landscape.total_competitors}</span>
            <span className={styles.landscapeLabel}>Competitors</span>
          </div>
          <div className={styles.landscapeCard}>
            <span className={styles.landscapeEmoji}>📢</span>
            <span className={styles.landscapeValue}>{landscape.total_ads}</span>
            <span className={styles.landscapeLabel}>Active Ads</span>
          </div>
          <div className={styles.landscapeCard}>
            <span className={styles.landscapeEmoji}>🎯</span>
            <span className={styles.landscapeValue}>
              {Object.entries(landscape.angle_breakdown).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || '—'}
            </span>
            <span className={styles.landscapeLabel}>Top Angle</span>
          </div>
          <div className={styles.landscapeCard}>
            <span className={styles.landscapeEmoji}>🪝</span>
            <span className={styles.landscapeValue}>
              {Object.entries(landscape.hook_breakdown).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || '—'}
            </span>
            <span className={styles.landscapeLabel}>Top Hook</span>
          </div>
          <div className={styles.landscapeCard}>
            <span className={styles.landscapeEmoji}>📊</span>
            <span className={styles.landscapeValue}>
              {sentiment.length > 0 ? Math.round(sentiment.reduce((s, sig) => s + sig.score, 0) / sentiment.length) : '—'}
            </span>
            <span className={styles.landscapeLabel}>Avg Sentiment</span>
          </div>
        </div>
      )}

      {/* Market Sentiment */}
      {sentiment.length > 0 && (
        <div className={styles.sentimentSection}>
          <h2 className={styles.sectionTitle}>📡 Market Sentiment</h2>
          <div className={styles.sentimentGrid}>
            {sentiment.map(s => (
              <div key={s.query} className={styles.sentimentCard}>
                <div className={styles.sentimentHeader}>
                  <h4 className={styles.sentimentQuery}>{s.query}</h4>
                  <span className={`${styles.sentimentScore} ${scoreClass(s.score)}`}>
                    {s.score > 0 ? '+' : ''}{s.score}
                  </span>
                </div>
                <p className={styles.sentimentSummary}>{s.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Angle distribution across competitors */}
      {landscape && Object.keys(landscape.angle_breakdown).length > 0 && (
        <div className={styles.distSection}>
          <h2 className={styles.sectionTitle}>🎯 Competitor Angles</h2>
          <div className={styles.distGrid}>
            {Object.entries(landscape.angle_breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([angle, count]) => (
                <span key={angle} className={styles.distChip}>
                  <span className={styles.distChipLabel}>{angle.replace(/_/g, ' ')}</span>
                  <span className={styles.distChipCount}>{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Competitor cards */}
      <div className={styles.sentimentSection}>
        <h2 className={styles.sectionTitle}>🏢 Competitors ({competitors.length})</h2>
        {competitors.length === 0 ? (
          <div className={styles.empty}>
            <p>No competitors tracked yet.</p>
            <p style={{ fontSize: '0.8rem' }}>Run the competitor scraper or add competitors manually.</p>
          </div>
        ) : (
          <div className={styles.competitorList}>
            {competitors.map(comp => (
              <div key={comp.id} className={styles.compCard}>
                <div className={styles.compHeader}>
                  <div>
                    <span className={styles.compName}>{comp.page_name}</span>
                    <span className={styles.compMeta}> · {comp.discovered_via} · {comp.niche || 'general'}</span>
                  </div>
                  <span className={styles.compAdCount}>{comp.active_ads} ads</span>
                </div>
                {comp.latest_snapshot?.oldest_ad_days && (
                  <div className={styles.compMeta}>
                    Longest running ad: {comp.latest_snapshot.oldest_ad_days} days
                  </div>
                )}
                {comp.ads && comp.ads.length > 0 && (
                  <div className={styles.compAds}>
                    {comp.ads.slice(0, 2).map((ad, i) => (
                      <div key={i} className={styles.compAd}>
                        <div className={styles.compAdBody}>{ad.ad_body}</div>
                        <div className={styles.compAdMeta}>
                          {ad.ad_format && <span className={styles.compAdBadge}>{ad.ad_format}</span>}
                          {ad.angle && <span className={styles.compAdBadge}>{ad.angle}</span>}
                          {ad.framework && <span className={styles.compAdBadge}>{ad.framework}</span>}
                          {ad.hook_type && <span className={styles.compAdBadge}>{ad.hook_type}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!hasData && (
        <div className={styles.empty}>
          <p>No intelligence data yet.</p>
          <p style={{ fontSize: '0.8rem' }}>Click "Collect Sentiment" to start market monitoring, and run the competitor scraper to discover competitors.</p>
        </div>
      )}
    </div>
  )
}
