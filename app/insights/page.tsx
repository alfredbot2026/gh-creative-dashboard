/**
 * Content Insights — Grace's Content Intelligence Library
 * Platform tabs, performance tiers, filters, search, sorted content cards.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

type Platform = 'all' | 'youtube' | 'instagram' | 'facebook'
type SortField = 'views' | 'engagement' | 'date' | 'score'
type Tier = 'all' | 'top' | 'above' | 'average' | 'below'

interface ContentItem {
  id: string
  platform: string
  platform_id: string
  platform_url: string
  content_type: string
  caption: string
  media_url: string
  tags: string[]
  published_at: string
  views: number
  engagement: number
  engagement_rate: number
  tier: string
  purpose: string | null
  hook_type: string | null
  score: number | null
  topics: string[]
  summary: string | null
  has_deep_analysis: boolean
}

interface Stats {
  total: number
  by_platform: Record<string, number>
  by_tier: Record<string, number>
  by_purpose: Record<string, number>
  deep_analyzed: number
}

const TIER_CONFIG = {
  top: { label: 'Top Performer', emoji: '🔥', color: '#e85d3a' },
  above: { label: 'Above Average', emoji: '✅', color: '#49626a' },
  average: { label: 'Average', emoji: '➡️', color: '#807478' },
  below: { label: 'Below Average', emoji: '⚠️', color: '#ba1a1a' },
}

const PLATFORM_CONFIG = {
  all: { label: 'All', icon: '📊' },
  youtube: { label: 'YouTube', icon: '▶️' },
  instagram: { label: 'Instagram', icon: '📸' },
  facebook: { label: 'Facebook', icon: '📘' },
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatEngRate(rate: number): string {
  return (rate * 100).toFixed(1) + '%'
}

function getThumbnail(item: ContentItem): string | null {
  if (item.platform === 'youtube' && item.platform_id) {
    return `https://i.ytimg.com/vi/${item.platform_id}/mqdefault.jpg`
  }
  if (item.media_url && !item.media_url.includes('.mp4') && !item.media_url.includes('/v/')) {
    return item.media_url
  }
  return null
}

export default function InsightsPage() {
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform>('all')
  const [sort, setSort] = useState<SortField>('views')
  const [tier, setTier] = useState<Tier>('all')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ContentItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchContent = useCallback(async (p: number = 1, append = false) => {
    setLoading(true)
    const params = new URLSearchParams({
      platform,
      sort,
      order: 'desc',
      page: p.toString(),
      limit: '30',
    })
    if (tier !== 'all') params.set('tier', tier)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/content/library?${params}`)
      const data = await res.json()
      setItems(prev => append ? [...prev, ...data.items] : data.items)
      setStats(data.stats)
      setHasMore(data.has_more)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to fetch content:', err)
    }
    setLoading(false)
  }, [platform, sort, tier, search])

  useEffect(() => {
    setPage(1)
    fetchContent(1)
  }, [fetchContent])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchContent(next, true)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Content Insights</h1>
          {stats && (
            <span className={styles.totalCount}>{stats.total.toLocaleString()} posts</span>
          )}
        </div>
        <p className={styles.subtitle}>Understand what works and why</p>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.by_platform.youtube || 0}</span>
            <span className={styles.statLabel}>▶️ YouTube</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.by_platform.instagram || 0}</span>
            <span className={styles.statLabel}>📸 Instagram</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.by_platform.facebook || 0}</span>
            <span className={styles.statLabel}>📘 Facebook</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.deep_analyzed}</span>
            <span className={styles.statLabel}>🔍 Analyzed</span>
          </div>
        </div>
      )}

      {/* Platform Tabs */}
      <div className={styles.tabs}>
        {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG.all][]).map(([key, cfg]) => (
          <button
            key={key}
            className={`${styles.tab} ${platform === key ? styles.tabActive : ''}`}
            onClick={() => setPlatform(key)}
          >
            <span className={styles.tabIcon}>{cfg.icon}</span>
            <span>{cfg.label}</span>
            {stats && key !== 'all' && (
              <span className={styles.tabCount}>{stats.by_platform[key] || 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className={styles.filters}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={styles.filterSelect} value={sort} onChange={e => setSort(e.target.value as SortField)}>
          <option value="views">Most Viewed</option>
          <option value="engagement">Highest Engagement</option>
          <option value="date">Most Recent</option>
          <option value="score">Best Score</option>
        </select>
        <select className={styles.filterSelect} value={tier} onChange={e => setTier(e.target.value as Tier)}>
          <option value="all">All Tiers</option>
          <option value="top">🔥 Top Performers</option>
          <option value="above">✅ Above Average</option>
          <option value="average">➡️ Average</option>
          <option value="below">⚠️ Below Average</option>
        </select>
      </div>

      {/* Content Grid */}
      {loading && items.length === 0 ? (
        <div className={styles.loading}>Loading content...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>No content found matching your filters.</div>
      ) : (
        <>
          <div className={styles.grid}>
            {items.map(item => {
              const thumb = getThumbnail(item)
              const tierCfg = TIER_CONFIG[item.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.average
              return (
                <article
                  key={item.id}
                  className={styles.card}
                  onClick={() => router.push(`/insights/${item.id}`)}
                >
                  {/* Thumbnail */}
                  <div className={styles.cardThumb}>
                    {thumb ? (
                      <img src={thumb} alt="" className={styles.thumbImg} loading="lazy" />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        {item.platform === 'instagram' ? '📸' : item.platform === 'facebook' ? '📘' : '▶️'}
                      </div>
                    )}
                    {/* Tier badge */}
                    <span className={styles.tierBadge} style={{ background: tierCfg.color }}>
                      {tierCfg.emoji}
                    </span>
                    {/* Platform pill */}
                    <span className={styles.platformPill}>
                      {PLATFORM_CONFIG[item.platform as Platform]?.icon || '📄'}
                    </span>
                    {/* Score */}
                    {item.score && (
                      <span className={styles.scorePill}>{item.score}/10</span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>
                      {item.caption?.slice(0, 80) || 'Untitled'}
                      {(item.caption?.length || 0) > 80 ? '...' : ''}
                    </h3>

                    {/* Tags row */}
                    <div className={styles.cardTags}>
                      {item.purpose && (
                        <span className={styles.purposeTag}>{item.purpose}</span>
                      )}
                      {item.hook_type && (
                        <span className={styles.hookTag}>{item.hook_type}</span>
                      )}
                    </div>

                    {/* Metrics row */}
                    <div className={styles.cardMetrics}>
                      <span className={styles.metric}>
                        <strong>{formatViews(item.views)}</strong> views
                      </span>
                      <span className={styles.metric}>
                        <strong>{formatEngRate(item.engagement_rate)}</strong> eng
                      </span>
                      <span className={styles.metricDate}>
                        {item.published_at ? formatDate(item.published_at) : ''}
                      </span>
                    </div>
                  </div>

                  {/* Deep analysis indicator */}
                  {item.has_deep_analysis && (
                    <div className={styles.analyzedStrip}>🔍 Deep Analysis Available</div>
                  )}
                </article>
              )
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className={styles.loadMore}>
              <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
                {loading ? 'Loading...' : `Load More (${items.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
