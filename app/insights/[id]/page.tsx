/**
 * Content Detail — Deep analysis view for a single post/video.
 * Shows: thumbnail, metrics, transcript, hook analysis, retention, insights, tips.
 */
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface PostDetail {
  id: string
  platform: string
  platform_id: string
  platform_url: string
  content_type: string
  caption: string
  description: string
  media_url: string
  tags: string[]
  published_at: string
  metrics: any
  deep_analysis: any
  deep_analyzed_at: string | null
  classification: any
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const pct = score * 10
  const color = score >= 8 ? '#49626a' : score >= 6 ? '#7b514d' : '#ba1a1a'
  return (
    <div className={styles.scoreRing}>
      <svg viewBox="0 0 36 36" className={styles.scoreCircle}>
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="var(--color-surface-high)" strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${pct}, 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className={styles.scoreValue}>{score}</div>
      <div className={styles.scoreLabel}>{label}</div>
    </div>
  )
}

function MetricCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  )
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{icon && <span>{icon}</span>} {title}</h2>
      {children}
    </section>
  )
}

export default function InsightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/pipeline/content/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setPost(data)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
  if (error || !post) return <div className={styles.page}><div className={styles.error}>{error || 'Not found'}</div></div>

  const da = post.deep_analysis && !post.deep_analysis.error ? post.deep_analysis : null
  const m = post.metrics || {}
  const views = m.views || m.viewCount || m.reach || m.impressions || 0
  const likes = m.likes || m.like_count || m.likeCount || 0
  const comments = m.comments || m.commentCount || m.comments_count || 0
  const shares = m.shares || 0
  const saves = m.saves || m.saved || 0
  const duration = m.duration
  const avgViewPct = m.avg_view_percentage
  const ctr = m.impressionClickThroughRate || m.ctr
  const impressions = m.impressions || 0
  const watchTime = m.watch_time_minutes

  const thumbnail = post.platform === 'youtube' && post.platform_id
    ? `https://i.ytimg.com/vi/${post.platform_id}/maxresdefault.jpg`
    : post.media_url

  return (
    <div className={styles.page}>
      {/* Back + Platform */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/insights')}>
          ← Back
        </button>
        {post.platform_url && (
          <a href={post.platform_url} target="_blank" rel="noopener" className={styles.externalLink}>
            Open on {post.platform} ↗
          </a>
        )}
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        {thumbnail && !thumbnail.includes('.mp4') ? (
          <img src={thumbnail} alt="" className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder}>
            {post.platform === 'youtube' ? '▶️' : post.platform === 'instagram' ? '📸' : '📘'}
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className={styles.postTitle}>{post.caption || 'Untitled'}</h1>
      <div className={styles.postMeta}>
        <span className={styles.platformBadge}>{post.platform}</span>
        <span className={styles.typeBadge}>{post.content_type}</span>
        {post.published_at && <span>{formatDate(post.published_at)}</span>}
      </div>

      {/* Score Row (if deep analysis) */}
      {da && (
        <div className={styles.scoreRow}>
          <ScoreRing score={da.overall_score || 0} label="Overall" />
          {da.hook_analysis?.hook_strength && (
            <ScoreRing score={da.hook_analysis.hook_strength} label="Hook" />
          )}
          {da.retention_factors && (
            <ScoreRing
              score={
                Math.round(
                  ((da.retention_factors.pacing === 'fast' ? 8 : da.retention_factors.pacing === 'medium' ? 6 : 5) +
                    (da.retention_factors.visual_variety === 'high' ? 8 : da.retention_factors.visual_variety === 'medium' ? 6 : 4)) / 2
                )
              }
              label="Retention"
            />
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {views > 0 && <MetricCard value={formatViews(views)} label="Views" />}
        {likes > 0 && <MetricCard value={formatViews(likes)} label="Likes" />}
        {comments > 0 && <MetricCard value={formatViews(comments)} label="Comments" />}
        {shares > 0 && <MetricCard value={formatViews(shares)} label="Shares" />}
        {saves > 0 && <MetricCard value={formatViews(saves)} label="Saves" />}
        {impressions > 0 && <MetricCard value={formatViews(impressions)} label="Impressions" />}
        {ctr > 0 && <MetricCard value={`${(ctr * 100).toFixed(1)}%`} label="CTR" />}
        {avgViewPct > 0 && <MetricCard value={`${avgViewPct.toFixed(0)}%`} label="Avg Retention" />}
        {watchTime > 0 && <MetricCard value={`${watchTime}`} label="Watch Min" />}
        {duration && <MetricCard value={duration.replace('PT', '').toLowerCase()} label="Duration" />}
      </div>

      {/* Deep Analysis Sections */}
      {da ? (
        <>
          {/* Summary */}
          {da.summary && (
            <Section title="Summary" icon="📝">
              <p className={styles.summaryText}>{da.summary}</p>
            </Section>
          )}

          {/* Content Analysis */}
          <Section title="Content Analysis" icon="🎯">
            <div className={styles.analysisGrid}>
              {da.content_purpose && (
                <div className={styles.analysisPill}>
                  <span className={styles.pillLabel}>Purpose</span>
                  <span className={styles.pillValue}>{da.content_purpose}</span>
                </div>
              )}
              {da.hook_analysis?.hook_type && (
                <div className={styles.analysisPill}>
                  <span className={styles.pillLabel}>Hook Type</span>
                  <span className={styles.pillValue}>{da.hook_analysis.hook_type}</span>
                </div>
              )}
              {da.visual_analysis?.style && (
                <div className={styles.analysisPill}>
                  <span className={styles.pillLabel}>Visual Style</span>
                  <span className={styles.pillValue}>{da.visual_analysis.style}</span>
                </div>
              )}
              {da.visual_analysis?.production_quality && (
                <div className={styles.analysisPill}>
                  <span className={styles.pillLabel}>Production</span>
                  <span className={styles.pillValue}>{da.visual_analysis.production_quality}</span>
                </div>
              )}
              {da.language?.primary && (
                <div className={styles.analysisPill}>
                  <span className={styles.pillLabel}>Language</span>
                  <span className={styles.pillValue}>{da.language.primary}</span>
                </div>
              )}
              {da.cta?.type && (
                <div className={styles.analysisPill}>
                  <span className={styles.pillLabel}>CTA</span>
                  <span className={styles.pillValue}>{da.cta.type}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Hook Analysis */}
          {da.hook_analysis?.why && (
            <Section title="Hook Analysis" icon="🪝">
              <p className={styles.analysisText}>{da.hook_analysis.why}</p>
            </Section>
          )}

          {/* Topics */}
          {da.topics?.length > 0 && (
            <Section title="Topics Covered" icon="📌">
              <div className={styles.topicsList}>
                {da.topics.map((t: string, i: number) => (
                  <span key={i} className={styles.topicChip}>{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Retention Factors */}
          {da.retention_factors && (
            <Section title="Retention Factors" icon="📈">
              <div className={styles.retentionGrid}>
                {da.retention_factors.pacing && (
                  <div className={styles.retentionItem}>
                    <span className={styles.retLabel}>Pacing</span>
                    <span className={styles.retValue}>{da.retention_factors.pacing}</span>
                  </div>
                )}
                {da.retention_factors.visual_variety && (
                  <div className={styles.retentionItem}>
                    <span className={styles.retLabel}>Visual Variety</span>
                    <span className={styles.retValue}>{da.retention_factors.visual_variety}</span>
                  </div>
                )}
              </div>
              {da.retention_factors.predicted_drop_off_points?.length > 0 && (
                <div className={styles.dropOffs}>
                  <h4 className={styles.dropOffTitle}>Predicted Drop-Off Points</h4>
                  {da.retention_factors.predicted_drop_off_points.map((p: any, i: number) => (
                    <div key={i} className={styles.dropOffItem}>
                      <span className={styles.dropOffTime}>⏱ {p.timestamp || p.time || p}</span>
                      {p.reason && <span className={styles.dropOffReason}>{p.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Transcript */}
          {da.transcript && (
            <Section title="Transcript" icon="💬">
              <div className={styles.transcript}>
                {da.transcript}
              </div>
            </Section>
          )}

          {/* Tips */}
          {da.tips?.length > 0 && (
            <Section title="Improvement Tips" icon="💡">
              <ul className={styles.tipsList}>
                {da.tips.map((tip: string, i: number) => (
                  <li key={i} className={styles.tipItem}>{tip}</li>
                ))}
              </ul>
            </Section>
          )}
        </>
      ) : (
        <Section title="Analysis" icon="🔍">
          <p className={styles.noAnalysis}>
            Deep analysis not yet available for this post.
            {post.platform === 'youtube' && ' Video analysis is being processed — check back later.'}
          </p>
        </Section>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <Section title="Tags" icon="🏷️">
          <div className={styles.topicsList}>
            {post.tags.map((t, i) => (
              <span key={i} className={styles.topicChip}>#{t}</span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
