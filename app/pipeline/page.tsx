'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface PipelineStatus {
  connected_platforms: string[]
  total_ingested: number
  total_classified: number
  total_unclassified: number
  profile: { version: number; generated_at: string; hours_ago: number } | null
  health: 'healthy' | 'stale' | 'not_started'
  quotas: Record<string, { used: number; limit: number; remaining: number; percentage: number }>
}

interface IngestStatus {
  meta: { connected: boolean; ig_username: string; page_name: string; total_instagram: number; total_facebook: number; last_connected: string }
  youtube: { connected: boolean; channel_title: string; total_videos: number; last_connected: string }
  total_ingested: number
  last_ingest: string
}

interface ClassifyStatus {
  total_ingested: number
  total_classified: number
  total_unclassified: number
  progress_percent: number
  last_classified_at: string
}

interface ProfileData {
  exists: boolean
  version: number
  confidence: string
  total_analyzed: number
  generated_at: string
  profile: any
}

interface Insight {
  type: 'recommendation' | 'warning' | 'pattern' | 'opportunity'
  title: string
  detail: string
  confidence: 'low' | 'medium' | 'high'
  actionable: boolean
}

export default function PipelineDashboard() {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [ingest, setIngest] = useState<IngestStatus | null>(null)
  const [classify, setClassify] = useState<ClassifyStatus | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [pRes, iRes, cRes, prRes, insRes] = await Promise.all([
          fetch('/api/pipeline/status').then(r => r.json()),
          fetch('/api/ingest/status').then(r => r.json()),
          fetch('/api/classify/status').then(r => r.json()),
          fetch('/api/profile/current').then(r => r.json()),
          fetch('/api/profile/insights').then(r => r.json()),
        ])
        setPipeline(pRes)
        setIngest(iRes)
        setClassify(cRes)
        setProfile(prRes)
        setInsights(insRes.insights || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className={styles.container}><div className={styles.loading}>Loading pipeline data...</div></div>
  if (error) return <div className={styles.container}><div className={styles.error}>Error: {error}</div></div>

  const healthColor = pipeline?.health === 'healthy' ? '#22c55e' : pipeline?.health === 'stale' ? '#f59e0b' : '#ef4444'
  const healthLabel = pipeline?.health === 'healthy' ? '✅ Healthy' : pipeline?.health === 'stale' ? '⚠️ Stale' : '❌ Not Started'

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Learning Pipeline</h1>
        <span className={styles.healthBadge} style={{ background: healthColor }}>
          {healthLabel}
        </span>
      </div>

      {/* Navigation */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <a href="/pipeline/content" style={{ color: '#818cf8', textDecoration: 'none', fontSize: 14, padding: '8px 16px', border: '1px solid #334155', borderRadius: 8, background: '#1e293b' }}>
          📋 Browse All Content →
        </a>
      </div>

      {/* Connected Platforms */}
      <section className={styles.section}>
        <h2>Connected Platforms</h2>
        <div className={styles.platformGrid}>
          <div className={`${styles.platformCard} ${ingest?.youtube?.connected ? styles.connected : styles.disconnected}`}>
            <div className={styles.platformIcon}>▶️</div>
            <div className={styles.platformInfo}>
              <h3>YouTube</h3>
              <p className={styles.platformName}>{ingest?.youtube?.channel_title || 'Not connected'}</p>
              <div className={styles.platformStat}>
                <span className={styles.statNumber}>{ingest?.youtube?.total_videos?.toLocaleString() || 0}</span>
                <span className={styles.statLabel}>videos ingested</span>
              </div>
            </div>
            <div className={styles.platformStatus}>{ingest?.youtube?.connected ? '🟢' : '🔴'}</div>
          </div>

          <div className={`${styles.platformCard} ${ingest?.meta?.connected ? styles.connected : styles.disconnected}`}>
            <div className={styles.platformIcon}>📸</div>
            <div className={styles.platformInfo}>
              <h3>Instagram</h3>
              <p className={styles.platformName}>@{ingest?.meta?.ig_username || 'Not connected'}</p>
              <div className={styles.platformStat}>
                <span className={styles.statNumber}>{ingest?.meta?.total_instagram?.toLocaleString() || 0}</span>
                <span className={styles.statLabel}>posts ingested</span>
              </div>
            </div>
            <div className={styles.platformStatus}>{ingest?.meta?.connected ? '🟢' : '🔴'}</div>
          </div>
        </div>
      </section>

      {/* Pipeline Progress */}
      <section className={styles.section}>
        <h2>Pipeline Progress</h2>
        <div className={styles.pipelineSteps}>
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>📥</span>
              <h3>Ingest</h3>
            </div>
            <div className={styles.stepValue}>{pipeline?.total_ingested?.toLocaleString() || 0}</div>
            <div className={styles.stepLabel}>posts pulled</div>
            <div className={styles.stepMeta}>Last: {ingest?.last_ingest ? new Date(ingest.last_ingest).toLocaleString() : 'Never'}</div>
          </div>

          <div className={styles.stepArrow}>→</div>

          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>🧠</span>
              <h3>Classify</h3>
            </div>
            <div className={styles.stepValue}>{classify?.total_classified?.toLocaleString() || 0}</div>
            <div className={styles.stepLabel}>posts analyzed</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${classify?.progress_percent || 0}%` }} />
            </div>
            <div className={styles.stepMeta}>{classify?.progress_percent || 0}% complete</div>
          </div>

          <div className={styles.stepArrow}>→</div>

          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>📊</span>
              <h3>Profile</h3>
            </div>
            <div className={styles.stepValue}>{profile?.total_analyzed?.toLocaleString() || 0}</div>
            <div className={styles.stepLabel}>posts in profile</div>
            <div className={styles.stepMeta}>
              {profile?.exists
                ? `v${profile.version} • ${profile.confidence} confidence`
                : 'Not generated'}
            </div>
          </div>
        </div>

        {classify && classify.total_unclassified > 0 && (
          <div className={styles.warning}>
            ⚠️ {classify.total_unclassified} posts still unclassified
          </div>
        )}
      </section>

      {/* Performance Profile */}
      {profile?.exists && profile.profile && (
        <>
          {/* Content Mix */}
          <section className={styles.section}>
            <h2>Content Mix</h2>
            <div className={styles.mixGrid}>
              {Object.entries(profile.profile.content_mix_actual as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([purpose, actual]) => {
                  const optimal = (profile.profile.content_mix_optimal as Record<string, number>)[purpose] || 0
                  const diff = actual - optimal
                  const diffColor = Math.abs(diff) > 0.1 ? (diff > 0 ? '#ef4444' : '#f59e0b') : '#22c55e'
                  return (
                    <div key={purpose} className={styles.mixCard}>
                      <div className={styles.mixPurpose}>{purpose}</div>
                      <div className={styles.mixBars}>
                        <div className={styles.mixBarRow}>
                          <span className={styles.mixBarLabel}>Actual</span>
                          <div className={styles.mixBarTrack}>
                            <div className={styles.mixBarFill} style={{ width: `${actual * 100}%`, background: diffColor }} />
                          </div>
                          <span className={styles.mixBarPct}>{Math.round(actual * 100)}%</span>
                        </div>
                        <div className={styles.mixBarRow}>
                          <span className={styles.mixBarLabel}>Optimal</span>
                          <div className={styles.mixBarTrack}>
                            <div className={styles.mixBarFill} style={{ width: `${optimal * 100}%`, background: '#6366f1' }} />
                          </div>
                          <span className={styles.mixBarPct}>{Math.round(optimal * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>

          {/* Hook Performance */}
          <section className={styles.section}>
            <h2>Hook Performance</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Hook</th>
                    <th>Engagement Rate</th>
                    <th>Avg Reach</th>
                    <th>Posts</th>
                    <th>Trend</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.profile.hook_performance as any[]).map((h, i) => (
                    <tr key={i}>
                      <td className={styles.hookName}>{h.label}</td>
                      <td className={styles.number}>{(h.avg_engagement_rate * 100).toFixed(2)}%</td>
                      <td className={styles.number}>{h.avg_reach?.toLocaleString()}</td>
                      <td className={styles.number}>{h.sample_size}</td>
                      <td>
                        <span className={`${styles.trendBadge} ${styles[h.trend]}`}>
                          {h.trend === 'rising' ? '📈' : h.trend === 'declining' ? '📉' : '➡️'} {h.trend}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.confBadge} ${styles[h.confidence]}`}>
                          {h.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Visual Style Performance */}
          <section className={styles.section}>
            <h2>Visual Style Performance</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Style</th>
                    <th>Engagement Rate</th>
                    <th>Avg Reach</th>
                    <th>Posts</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.profile.visual_style_performance as any[]).map((v, i) => (
                    <tr key={i}>
                      <td>{v.label}</td>
                      <td className={styles.number}>{(v.avg_engagement_rate * 100).toFixed(2)}%</td>
                      <td className={styles.number}>{v.avg_reach?.toLocaleString()}</td>
                      <td className={styles.number}>{v.sample_size}</td>
                      <td>
                        <span className={`${styles.trendBadge} ${styles[v.trend]}`}>
                          {v.trend === 'rising' ? '📈' : v.trend === 'declining' ? '📉' : '➡️'} {v.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Best Posting Times */}
          <section className={styles.section}>
            <h2>Best Posting Times</h2>
            <div className={styles.timesGrid}>
              {(profile.profile.best_posting_times as any[]).slice(0, 5).map((t, i) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                return (
                  <div key={i} className={styles.timeCard}>
                    <div className={styles.timeRank}>#{i + 1}</div>
                    <div className={styles.timeDay}>{days[t.day_of_week]}</div>
                    <div className={styles.timeHour}>{t.hour}:00</div>
                    <div className={styles.timeStat}>{(t.avg_engagement * 100).toFixed(2)}% eng</div>
                    <div className={styles.timeSample}>{t.sample_size} posts</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Best Posting Days */}
          <section className={styles.section}>
            <h2>Best Posting Days</h2>
            <div className={styles.daysGrid}>
              {(profile.profile.best_posting_days as any[]).map((d, i) => (
                <div key={i} className={styles.dayCard}>
                  <div className={styles.dayName}>{d.day}</div>
                  <div className={styles.dayBar}>
                    <div className={styles.dayBarFill} style={{ width: `${(d.avg_engagement / 0.03) * 100}%` }} />
                  </div>
                  <div className={styles.dayStat}>{(d.avg_engagement * 100).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </section>

          {/* Purpose Performance */}
          <section className={styles.section}>
            <h2>Content Purpose Performance</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Purpose</th>
                    <th>Engagement Rate</th>
                    <th>Avg Reach</th>
                    <th>Posts</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.profile.purpose_performance as any[]).map((p, i) => (
                    <tr key={i}>
                      <td className={styles.capitalize}>{p.label}</td>
                      <td className={styles.number}>{(p.avg_engagement_rate * 100).toFixed(2)}%</td>
                      <td className={styles.number}>{p.avg_reach?.toLocaleString()}</td>
                      <td className={styles.number}>{p.sample_size}</td>
                      <td>
                        <span className={`${styles.trendBadge} ${styles[p.trend]}`}>
                          {p.trend === 'rising' ? '📈' : p.trend === 'declining' ? '📉' : '➡️'} {p.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA Performance */}
          <section className={styles.section}>
            <h2>CTA Performance</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>CTA Type</th>
                    <th>Engagement Rate</th>
                    <th>Avg Reach</th>
                    <th>Posts</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.profile.cta_performance as any[]).map((c, i) => (
                    <tr key={i}>
                      <td>{c.label}</td>
                      <td className={styles.number}>{(c.avg_engagement_rate * 100).toFixed(2)}%</td>
                      <td className={styles.number}>{c.avg_reach?.toLocaleString()}</td>
                      <td className={styles.number}>{c.sample_size}</td>
                      <td>
                        <span className={`${styles.trendBadge} ${styles[c.trend]}`}>
                          {c.trend === 'rising' ? '📈' : c.trend === 'declining' ? '📉' : '➡️'} {c.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <section className={styles.section}>
          <h2>AI Insights</h2>
          <div className={styles.insightsGrid}>
            {insights.map((ins, i) => (
              <div key={i} className={`${styles.insightCard} ${styles[ins.type]}`}>
                <div className={styles.insightHeader}>
                  <span className={styles.insightType}>
                    {ins.type === 'recommendation' ? '💡' : ins.type === 'warning' ? '⚠️' : ins.type === 'opportunity' ? '🎯' : '📊'}
                    {ins.type}
                  </span>
                  <span className={`${styles.confBadge} ${styles[ins.confidence]}`}>{ins.confidence}</span>
                </div>
                <h3>{ins.title}</h3>
                <p>{ins.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* API Quotas */}
      <section className={styles.section}>
        <h2>API Quotas (Today)</h2>
        <div className={styles.quotaGrid}>
          {pipeline && Object.entries(pipeline.quotas).map(([name, q]) => (
            <div key={name} className={styles.quotaCard}>
              <div className={styles.quotaName}>{name.replace(/_/g, ' ')}</div>
              <div className={styles.quotaBar}>
                <div
                  className={styles.quotaFill}
                  style={{ width: `${q.percentage}%`, background: q.percentage > 80 ? '#ef4444' : q.percentage > 50 ? '#f59e0b' : '#22c55e' }}
                />
              </div>
              <div className={styles.quotaLabel}>{q.used} / {q.limit} ({q.percentage}%)</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
