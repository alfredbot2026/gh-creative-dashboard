/**
 * Topic Intelligence — Which topics perform best?
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface TopicCluster {
  name: string
  raw_topics: string[]
  video_count: number
  total_views: number
  avg_views: number
  total_likes: number
  total_comments: number
  avg_score: number
  avg_engagement_rate: number
  top_hook: string
  top_purpose: string
  best_video: { id: string; title: string; views: number } | null
  videos: Array<{ id: string; title: string; views: number; score: number }>
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

export default function TopicsPage() {
  const router = useRouter()
  const [clusters, setClusters] = useState<TopicCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'views' | 'count' | 'engagement' | 'score'>('views')

  useEffect(() => {
    fetch('/api/content/topics')
      .then(r => r.json())
      .then(data => {
        setClusters(data.clusters || [])
        setTotalAnalyzed(data.total_analyzed || 0)
      })
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...clusters].sort((a, b) => {
    switch (sortBy) {
      case 'views': return b.total_views - a.total_views
      case 'count': return b.video_count - a.video_count
      case 'engagement': return b.avg_engagement_rate - a.avg_engagement_rate
      case 'score': return b.avg_score - a.avg_score
    }
  })

  // Find the best cluster for comparison
  const topCluster = clusters.sort((a, b) => b.avg_views - a.avg_views)[0]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Topic Intelligence</h1>
          <p className={styles.subtitle}>
            {totalAnalyzed} videos analyzed · {clusters.length} topic clusters
          </p>
        </div>
        <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="views">Sort by Total Views</option>
          <option value="count">Sort by Video Count</option>
          <option value="engagement">Sort by Engagement</option>
          <option value="score">Sort by Avg Score</option>
        </select>
      </header>

      {loading ? (
        <div className={styles.loading}>Analyzing topics...</div>
      ) : clusters.length === 0 ? (
        <div className={styles.empty}>
          Not enough analyzed content yet. Deep analysis needs to process more videos.
        </div>
      ) : (
        <div className={styles.list}>
          {sorted.map((cluster, i) => {
            const isExpanded = expanded === cluster.name
            const viewsVsTop = topCluster && topCluster.name !== cluster.name
              ? Math.round((cluster.avg_views / topCluster.avg_views) * 100)
              : 100
            
            return (
              <article
                key={cluster.name}
                className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}
              >
                <div className={styles.cardMain} onClick={() => setExpanded(isExpanded ? null : cluster.name)}>
                  <div className={styles.rank}>#{i + 1}</div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.clusterName}>{cluster.name}</h3>
                    <div className={styles.clusterMeta}>
                      <span>{cluster.video_count} videos</span>
                      <span>·</span>
                      <span>{formatViews(cluster.total_views)} total views</span>
                      <span>·</span>
                      <span>{cluster.avg_engagement_rate}% eng</span>
                    </div>
                  </div>
                  <div className={styles.cardStats}>
                    <div className={styles.avgViews}>
                      <span className={styles.statBig}>{formatViews(cluster.avg_views)}</span>
                      <span className={styles.statSmall}>avg views</span>
                    </div>
                    <div className={styles.scoreChip} data-score={cluster.avg_score >= 7.5 ? 'high' : cluster.avg_score >= 6 ? 'mid' : 'low'}>
                      {cluster.avg_score}/10
                    </div>
                  </div>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ width: `${viewsVsTop}%` }} />
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardDetail}>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Top Hook</span>
                        <span className={styles.detailValue}>{cluster.top_hook}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Primary Purpose</span>
                        <span className={styles.detailValue}>{cluster.top_purpose}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Total Likes</span>
                        <span className={styles.detailValue}>{formatViews(cluster.total_likes)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Total Comments</span>
                        <span className={styles.detailValue}>{formatViews(cluster.total_comments)}</span>
                      </div>
                    </div>

                    <div className={styles.relatedTopics}>
                      <span className={styles.detailLabel}>Related Topics: </span>
                      {cluster.raw_topics.map(t => (
                        <span key={t} className={styles.topicChip}>{t}</span>
                      ))}
                    </div>

                    <h4 className={styles.videosTitle}>Top Videos</h4>
                    <div className={styles.videoList}>
                      {cluster.videos.map(v => (
                        <div
                          key={v.id}
                          className={styles.videoRow}
                          onClick={() => router.push(`/insights/${v.id}`)}
                        >
                          <span className={styles.videoTitle}>{v.title}</span>
                          <span className={styles.videoViews}>{formatViews(v.views)}</span>
                          <span className={styles.videoScore}>{v.score}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
