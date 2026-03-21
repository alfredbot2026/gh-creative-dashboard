'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface ContentItem {
  id: string
  platform: string
  platform_id: string
  platform_url: string | null
  content_type: string
  caption: string | null
  description: string | null
  media_url: string | null
  tags: string[] | null
  published_at: string
  metrics: any
  engagement_rate: number
  classification: any | null
  confidence_avg: number | null
  classified_at: string | null
}

export default function ContentBrowser() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [platform, setPlatform] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const limit = 20

  async function load(p: number, plat: string) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (plat) params.set('platform', plat)
    const res = await fetch(`/api/pipeline/content?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  async function loadDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    const res = await fetch(`/api/pipeline/content/${id}`)
    const data = await res.json()
    setDetail(data)
  }

  useEffect(() => { load(page, platform) }, [page, platform])

  const totalPages = Math.ceil(total / limit)

  const platformIcon = (p: string) => p === 'youtube' ? '▶️' : p === 'instagram' ? '📸' : '📘'
  const purposeColor = (p: string) => {
    const colors: Record<string, string> = {
      educate: '#818cf8', sell: '#f87171', story: '#fbbf24', inspire: '#4ade80', prove: '#22d3ee', trend: '#a78bfa'
    }
    return colors[p] || '#94a3b8'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Content Browser</h1>
        <a href="/pipeline" className={styles.backLink}>← Back to Dashboard</a>
      </div>

      <div className={styles.filters}>
        <button className={`${styles.filterBtn} ${!platform ? styles.active : ''}`} onClick={() => { setPlatform(''); setPage(1) }}>All ({total})</button>
        <button className={`${styles.filterBtn} ${platform === 'youtube' ? styles.active : ''}`} onClick={() => { setPlatform('youtube'); setPage(1) }}>▶️ YouTube</button>
        <button className={`${styles.filterBtn} ${platform === 'instagram' ? styles.active : ''}`} onClick={() => { setPlatform('instagram'); setPage(1) }}>📸 Instagram</button>
        <button className={`${styles.filterBtn} ${platform === 'facebook' ? styles.active : ''}`} onClick={() => { setPlatform('facebook'); setPage(1) }}>📘 Facebook</button>
      </div>

      <div className={styles.layout}>
        {/* List */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>No content found</div>
          ) : items.map(item => (
            <div
              key={item.id}
              className={`${styles.card} ${selectedId === item.id ? styles.selected : ''}`}
              onClick={() => loadDetail(item.id)}
            >
              <div className={styles.cardRow}>
                {item.media_url && (
                  <div className={styles.thumbWrap}>
                    {item.media_url.includes('.mp4') || item.media_url.includes('video') ? (
                      <div className={styles.videoThumb}>▶️</div>
                    ) : (
                      <img src={item.media_url} alt="" className={styles.thumb} loading="lazy" />
                    )}
                  </div>
                )}
                <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <span className={styles.platformBadge}>{platformIcon(item.platform)} {item.platform}</span>
                <span className={styles.date}>{new Date(item.published_at).toLocaleDateString()}</span>
              </div>
              <div className={styles.cardTitle}>
                {item.caption?.slice(0, 100) || item.description?.slice(0, 100) || 'Untitled'}
              </div>
              <div className={styles.cardMeta}>
                {item.classification && (
                  <span className={styles.purposeBadge} style={{ borderColor: purposeColor(item.classification.content_purpose) }}>
                    {item.classification.content_purpose}
                  </span>
                )}
                {item.classification?.hook_type && (
                  <span className={styles.hookBadge}>{item.classification.hook_type}</span>
                )}
                <span className={styles.engRate}>
                  {(item.engagement_rate * 100).toFixed(2)}% eng
                </span>
              </div>
              <div className={styles.cardMetrics}>
                {item.platform === 'youtube' ? (
                  <>
                    <span>👁 {(item.metrics?.viewCount || item.metrics?.views || 0).toLocaleString()}</span>
                    <span>👍 {(item.metrics?.likeCount || item.metrics?.likes || 0).toLocaleString()}</span>
                    <span>💬 {(item.metrics?.commentCount || item.metrics?.comments || 0).toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <span>👁 {(item.metrics?.reach || item.metrics?.impressions || 0).toLocaleString()}</span>
                    <span>❤️ {(item.metrics?.likes || item.metrics?.like_count || 0).toLocaleString()}</span>
                    <span>💾 {(item.metrics?.saves || item.metrics?.saved || 0).toLocaleString()}</span>
                  </>
                )}
              </div>
              {item.confidence_avg !== null && (
                <div className={styles.confBar}>
                  <div className={styles.confFill} style={{ width: `${item.confidence_avg * 100}%` }} />
                  <span className={styles.confLabel}>{Math.round(item.confidence_avg * 100)}% conf</span>
                </div>
              )}
                </div>{/* end cardContent */}
              </div>{/* end cardRow */}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className={styles.detailPanel}>
          {!selectedId ? (
            <div className={styles.detailEmpty}>Click a post to see full analysis</div>
          ) : !detail ? (
            <div className={styles.loading}>Loading detail...</div>
          ) : (
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <span className={styles.platformBadge}>{platformIcon(detail.platform)} {detail.platform}</span>
                <span className={styles.date}>{new Date(detail.published_at).toLocaleString()}</span>
                {detail.platform_url && (
                  <a href={detail.platform_url} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                    Open original ↗
                  </a>
                )}
              </div>

              {/* Media */}
              {detail.media_url && (
                <div className={styles.detailMedia}>
                  {detail.media_url.includes('.mp4') || detail.media_url.includes('video') ? (
                    <video src={detail.media_url} controls className={styles.detailVideo} />
                  ) : (
                    <img src={detail.media_url} alt="" className={styles.detailImage} />
                  )}
                </div>
              )}

              {/* Content */}
              <section className={styles.detailSection}>
                <h3>Content</h3>
                <div className={styles.contentType}>{detail.content_type}</div>
                {detail.caption && <p className={styles.caption}>{detail.caption}</p>}
                {detail.description && detail.description !== detail.caption && (
                  <p className={styles.description}>{detail.description}</p>
                )}
                {detail.tags && detail.tags.length > 0 && (
                  <div className={styles.tagList}>
                    {detail.tags.map((t: string, i: number) => <span key={i} className={styles.tag}>#{t}</span>)}
                  </div>
                )}
              </section>

              {/* Metrics */}
              <section className={styles.detailSection}>
                <h3>Performance Metrics</h3>
                <div className={styles.metricsGrid}>
                  {Object.entries(detail.metrics || {}).map(([key, val]) => (
                    <div key={key} className={styles.metricItem}>
                      <div className={styles.metricLabel}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</div>
                      <div className={styles.metricValue}>
                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
                {detail.metrics_updated_at && (
                  <div className={styles.metricsMeta}>Metrics updated: {new Date(detail.metrics_updated_at).toLocaleString()}</div>
                )}
              </section>

              {/* AI Classification */}
              {detail.analysis ? (
                <section className={styles.detailSection}>
                  <h3>AI Classification</h3>
                  <div className={styles.classGrid}>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Purpose</span>
                      <span className={styles.classValue} style={{ color: purposeColor(detail.analysis.classification?.content_purpose) }}>
                        {detail.analysis.classification?.content_purpose}
                      </span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Hook Type</span>
                      <span className={styles.classValue}>{detail.analysis.classification?.hook_type || 'None'}</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Hook Confidence</span>
                      <span className={styles.classValue}>{Math.round((detail.analysis.classification?.hook_confidence || 0) * 100)}%</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Structure</span>
                      <span className={styles.classValue}>{detail.analysis.classification?.structure_type || 'None'}</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Structure Confidence</span>
                      <span className={styles.classValue}>{Math.round((detail.analysis.classification?.structure_confidence || 0) * 100)}%</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Visual Style</span>
                      <span className={styles.classValue}>{detail.analysis.classification?.visual_style || 'N/A'}</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Emotional Tone</span>
                      <span className={styles.classValue}>{detail.analysis.classification?.emotional_tone || 'N/A'}</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>CTA</span>
                      <span className={styles.classValue}>{detail.analysis.classification?.cta_type || 'None'}</span>
                    </div>
                    <div className={styles.classItem}>
                      <span className={styles.classLabel}>Language Mix</span>
                      <span className={styles.classValue}>{detail.analysis.classification?.taglish_ratio || 'N/A'}</span>
                    </div>
                    {detail.analysis.classification?.topics && (
                      <div className={styles.classItem}>
                        <span className={styles.classLabel}>Topics</span>
                        <div className={styles.topicList}>
                          {detail.analysis.classification.topics.map((t: string, i: number) => (
                            <span key={i} className={styles.topicTag}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.classMeta}>
                    Model: {detail.analysis.model_used} • Confidence: {Math.round((detail.analysis.confidence_avg || 0) * 100)}% • Classified: {new Date(detail.analysis.created_at).toLocaleString()}
                  </div>
                </section>
              ) : (
                <section className={styles.detailSection}>
                  <h3>AI Classification</h3>
                  <p className={styles.noAnalysis}>Not classified yet</p>
                </section>
              )}

              {/* Raw JSON (collapsible) */}
              <details className={styles.rawJson}>
                <summary>Raw API Response</summary>
                <pre>{JSON.stringify(detail.raw_api_response, null, 2)}</pre>
              </details>
              <details className={styles.rawJson}>
                <summary>Raw Classification JSON</summary>
                <pre>{JSON.stringify(detail.analysis?.classification, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
