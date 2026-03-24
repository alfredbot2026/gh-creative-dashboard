'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './competitive.module.css'

interface Channel {
  channel_id: string
  channel_title: string
  subscriber_count: number
  video_count: number
  language: string
  last_analyzed_at: string | null
  competitor_videos: { count: number }[]
}

interface Trends {
  topHooks: { hook_type: string; frequency: number; avg_views: number }[]
  topStructures: { structure: string; frequency: number; avg_views: number }[]
  topTopics: { topic: string; frequency: number; total_views: number }[]
  topPurposes: { purpose: string; frequency: number; pct: number }[]
  sampleSize: number
  channelCount: number
  computedAt: string
  status?: string
  message?: string
}

export default function CompetitivePage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [trends, setTrends] = useState<Trends | null>(null)
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [discoverResult, setDiscoverResult] = useState<string | null>(null)
  const [tab, setTab] = useState<'trends' | 'channels'>('trends')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [chRes, trRes] = await Promise.all([
        fetch('/api/competitive/channels'),
        fetch('/api/competitive/trends'),
      ])
      const chData = await chRes.json()
      const trData = await trRes.json()
      setChannels(chData.channels || [])
      setTrends(trData)
    } finally {
      setLoading(false)
    }
  }

  async function handleDiscover() {
    setDiscovering(true)
    setDiscoverResult(null)
    try {
      const res = await fetch('/api/competitive/discover', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setDiscoverResult(`Error: ${data.error}`)
      } else {
        setDiscoverResult(`Found ${data.discovered} creators, saved ${data.saved}.`)
        await loadData()
      }
    } finally {
      setDiscovering(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/competitive/analyze', { method: 'POST' })
      const data = await res.json()
      setDiscoverResult(`Analyzed ${data.analyzed} videos across ${data.channels_processed?.length || 0} channels.`)
      await loadData()
    } finally {
      setAnalyzing(false)
    }
  }

  function fmtViews(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  function fmtSubs(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  const hasData = (trends?.sampleSize || 0) > 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link href="/insights" className={styles.back}>Insights</Link>
          <h1 className={styles.title}>Competitive Intelligence</h1>
          <p className={styles.subtitle}>
            What top creators in your niche are doing right now
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={handleDiscover}
            disabled={discovering}
          >
            {discovering ? 'Discovering...' : 'Discover Creators'}
          </button>
          {channels.length > 0 && (
            <button
              className={styles.actionBtnPrimary}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Videos'}
            </button>
          )}
        </div>
      </div>

      {discoverResult && (
        <div className={styles.notice}>{discoverResult}</div>
      )}

      {/* Stats row */}
      {!loading && (
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{trends?.channelCount || 0}</span>
            <span className={styles.statLabel}>Creators tracked</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{trends?.sampleSize || 0}</span>
            <span className={styles.statLabel}>Videos analyzed</span>
          </div>
          {hasData && (
            <div className={styles.stat}>
              <span className={styles.statNum}>{trends!.topHooks.length}</span>
              <span className={styles.statLabel}>Hook types found</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'trends' ? styles.tabActive : ''}`} onClick={() => setTab('trends')}>
          Niche Trends
        </button>
        <button className={`${styles.tab} ${tab === 'channels' ? styles.tabActive : ''}`} onClick={() => setTab('channels')}>
          Creators ({channels.length})
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : tab === 'trends' ? (
        !hasData ? (
          <div className={styles.empty}>
            <p>No data yet.</p>
            <p className={styles.emptyHint}>
              {channels.length === 0
                ? 'Start by clicking "Discover Creators" to find top creators in your niche.'
                : 'Creators found. Click "Analyze Videos" to classify their content.'}
            </p>
          </div>
        ) : (
          <div className={styles.trendsGrid}>
            {/* Top Hooks */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Top Hooks in Niche</h2>
              <p className={styles.cardHint}>What hook types get the most views</p>
              <div className={styles.rankList}>
                {trends!.topHooks.slice(0, 8).map((h, i) => (
                  <div key={h.hook_type} className={styles.rankRow}>
                    <span className={styles.rankNum}>{i + 1}</span>
                    <div className={styles.rankContent}>
                      <span className={styles.rankName}>{h.hook_type}</span>
                      <span className={styles.rankMeta}>{h.frequency} videos · avg {fmtViews(h.avg_views)} views</span>
                    </div>
                    <div className={styles.rankBar}>
                      <div
                        className={styles.rankBarFill}
                        style={{ width: `${Math.round(h.avg_views / trends!.topHooks[0].avg_views * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Structures */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Top Content Structures</h2>
              <p className={styles.cardHint}>What formats are getting views</p>
              <div className={styles.rankList}>
                {trends!.topStructures.slice(0, 8).map((s, i) => (
                  <div key={s.structure} className={styles.rankRow}>
                    <span className={styles.rankNum}>{i + 1}</span>
                    <div className={styles.rankContent}>
                      <span className={styles.rankName}>{s.structure}</span>
                      <span className={styles.rankMeta}>{s.frequency} videos · avg {fmtViews(s.avg_views)} views</span>
                    </div>
                    <div className={styles.rankBar}>
                      <div
                        className={styles.rankBarFill}
                        style={{ width: `${Math.round(s.avg_views / trends!.topStructures[0].avg_views * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Topics */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Top Topics</h2>
              <p className={styles.cardHint}>What your niche is posting about</p>
              <div className={styles.topicGrid}>
                {trends!.topTopics.slice(0, 12).map((t, i) => (
                  <div key={t.topic} className={`${styles.topicTag} ${i < 3 ? styles.topicTagTop : ''}`}>
                    <span className={styles.topicName}>{t.topic}</span>
                    <span className={styles.topicMeta}>{t.frequency} videos · {fmtViews(t.total_views)} views</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Mix */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Content Mix in Niche</h2>
              <p className={styles.cardHint}>How top creators distribute their content types</p>
              <div className={styles.purposeList}>
                {trends!.topPurposes.map(p => (
                  <div key={p.purpose} className={styles.purposeRow}>
                    <span className={styles.purposeName}>{p.purpose}</span>
                    <div className={styles.purposeBar}>
                      <div className={styles.purposeBarFill} style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className={styles.purposePct}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        /* Channels tab */
        <div className={styles.channelsList}>
          {channels.length === 0 ? (
            <div className={styles.empty}>
              <p>No creators tracked yet.</p>
              <p className={styles.emptyHint}>Click "Discover Creators" to find top creators in your niche automatically.</p>
            </div>
          ) : channels.map(ch => (
            <div key={ch.channel_id} className={styles.channelRow}>
              <div className={styles.channelInfo}>
                <a
                  href={`https://youtube.com/channel/${ch.channel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelName}
                >
                  {ch.channel_title}
                </a>
                <div className={styles.channelMeta}>
                  <span>{fmtSubs(ch.subscriber_count)} subscribers</span>
                  <span>·</span>
                  <span>{ch.video_count.toLocaleString()} videos</span>
                  <span>·</span>
                  <span className={styles.langBadge}>{ch.language}</span>
                </div>
              </div>
              <div className={styles.channelStats}>
                <span className={styles.vidCount}>
                  {ch.competitor_videos?.[0]?.count || 0} analyzed
                </span>
                <span className={styles.lastAnalyzed}>
                  {ch.last_analyzed_at
                    ? `Last: ${new Date(ch.last_analyzed_at).toLocaleDateString()}`
                    : 'Not yet analyzed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
