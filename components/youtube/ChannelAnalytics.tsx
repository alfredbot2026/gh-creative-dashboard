/**
 * Channel Analytics Component
 * Shows Grace's YouTube channel stats, revenue, top videos.
 * Handles OAuth connect flow if not yet connected.
 * Surfaces analytics API errors for debugging.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Loader2, Eye, DollarSign, Clock, Users,
    TrendingUp, ArrowUpRight, ArrowDownRight, Link2,
    AlertTriangle, Sparkles
} from 'lucide-react'
import styles from './ChannelAnalytics.module.css'

/* -- Type definitions -- */
interface ChannelInfo {
    id: string
    title: string
    description: string
    thumbnail: string
    subscriberCount: number
    videoCount: number
    viewCount: number
}

interface AnalyticsSummary {
    period: string
    views: number
    watchTimeHours: number
    avgViewDurationSeconds: number
    subscribersGained: number
    subscribersLost: number
    netSubscribers: number
    estimatedRevenue: number
    estimatedAdRevenue: number
    avgCpm: number
}

interface TopVideo {
    videoId: string
    title: string
    thumbnail: string
    views: number
    watchTimeMinutes: number
    avgViewDuration: number
    revenue: number
    subscribersGained: number
}

interface RecentVideo {
    video_id: string
    title: string
    published_at: string
    thumbnail_url: string
    view_count: number
    like_count: number
    comment_count: number
}

/* Format large numbers */
function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(Math.round(n))
}

/* Format seconds to readable duration */
function fmtDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
}

/* Format currency as Philippine Peso */
function fmtPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* Format ISO date to readable */
function fmtDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ChannelAnalytics() {
    const [loading, setLoading] = useState(true)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState('')
    const [analyticsError, setAnalyticsError] = useState('')
    const [channel, setChannel] = useState<ChannelInfo | null>(null)
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
    const [topVideos, setTopVideos] = useState<TopVideo[]>([])
    const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([])

    /* Fetch channel analytics from our API */
    const fetchAnalytics = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/youtube/channel')
            const data = await res.json()

            setConnected(data.connected || false)
            if (data.error && !data.connected) {
                setError(data.error)
            } else if (data.channel) {
                setChannel(data.channel)
                setAnalytics(data.analytics || null)
                setTopVideos(data.topVideos || [])
                setRecentVideos(data.recentVideos || [])
                // Surface analytics API error for debugging
                if (data.analyticsError) {
                    setAnalyticsError(data.analyticsError)
                }
            }
        } catch {
            setError('Failed to fetch analytics')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

    /* Loading state */
    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader2 size={24} className={styles.spinner} />
                <p>Loading channel analytics...</p>
            </div>
        )
    }

    /* Not connected — show connect button */
    if (!connected) {
        return (
            <div className={styles.connectSection}>
                <div className={styles.connectCard}>
                    <h3>Connect Your YouTube Channel</h3>
                    <p>Connect Graceful Homeschooling to see analytics, revenue, and AI insights.</p>
                    {error && <p className={styles.errorText}>{error}</p>}
                    <a href="/api/youtube/connect" className={styles.connectButton}>
                        <Link2 size={16} /> Connect with Google
                    </a>
                </div>
            </div>
        )
    }

    /* Connected — show analytics */
    // Convert revenue USD to PHP (approximate rate: 1 USD ≈ 56 PHP)
    const phpRate = 56
    const revenuePHP = (analytics?.estimatedRevenue || 0) * phpRate
    const adRevenuePHP = (analytics?.estimatedAdRevenue || 0) * phpRate
    const cpmPHP = (analytics?.avgCpm || 0) * phpRate

    return (
        <div className={styles.analyticsLayout}>
            {/* Channel header */}
            {channel && (
                <div className={styles.channelHeader}>
                    <img src={channel.thumbnail} alt={channel.title} className={styles.channelAvatar} />
                    <div className={styles.channelMeta}>
                        <h2 className={styles.channelName}>{channel.title}</h2>
                        <div className={styles.channelQuickStats}>
                            <span><Users size={14} /> {fmt(channel.subscriberCount)} subscribers</span>
                            <span>{fmt(channel.videoCount)} videos</span>
                            <span>{fmt(channel.viewCount)} total views</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Metric cards — only if analytics available */}
            {analytics && (
                <>
                    <div className={styles.periodLabel}>Last 90 Days ({analytics.period})</div>
                    <div className={styles.metricsGrid}>
                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}><Eye size={18} /></div>
                            <div className={styles.metricValue}>{fmt(analytics.views)}</div>
                            <div className={styles.metricLabel}>Views</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}><Clock size={18} /></div>
                            <div className={styles.metricValue}>{fmt(analytics.watchTimeHours)}h</div>
                            <div className={styles.metricLabel}>Watch Time</div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}><Clock size={18} /></div>
                            <div className={styles.metricValue}>{fmtDuration(analytics.avgViewDurationSeconds)}</div>
                            <div className={styles.metricLabel}>Avg View Duration</div>
                        </div>
                        <div className={`${styles.metricCard} ${styles.revenueCard}`}>
                            <div className={styles.metricIcon}><DollarSign size={18} /></div>
                            <div className={styles.metricValue}>{fmtPeso(revenuePHP)}</div>
                            <div className={styles.metricLabel}>
                                Total Revenue
                                <span className={styles.metricSub}>(${analytics.estimatedRevenue.toFixed(2)} USD)</span>
                            </div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}><DollarSign size={18} /></div>
                            <div className={styles.metricValue}>{fmtPeso(adRevenuePHP)}</div>
                            <div className={styles.metricLabel}>
                                Ad Revenue
                                <span className={styles.metricSub}>CPM: {fmtPeso(cpmPHP)}</span>
                            </div>
                        </div>
                        <div className={styles.metricCard}>
                            <div className={styles.metricIcon}><Users size={18} /></div>
                            <div className={styles.metricValue}>
                                {analytics.netSubscribers >= 0 ? '+' : ''}{fmt(analytics.netSubscribers)}
                            </div>
                            <div className={styles.metricLabel}>
                                Net Subscribers
                                <span className={styles.metricSub}>
                                    <ArrowUpRight size={10} /> {fmt(analytics.subscribersGained)} gained ·{' '}
                                    <ArrowDownRight size={10} /> {fmt(analytics.subscribersLost)} lost
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Analytics error banner — help user debug */}
            {analyticsError && !analytics && (
                <div className={styles.errorBanner}>
                    <AlertTriangle size={16} />
                    <div>
                        <strong>YouTube Analytics API Error</strong>
                        <p>The YouTube Analytics API returned an error. You may need to enable it in your Google Cloud Console.</p>
                        <details>
                            <summary>Technical details</summary>
                            <code>{analyticsError}</code>
                        </details>
                    </div>
                </div>
            )}

            {/* Top performing videos — from Analytics API */}
            {topVideos.length > 0 && (
                <div className={styles.topVideosSection}>
                    <h3 className={styles.sectionTitle}>
                        <Sparkles size={14} /> Top Performing Videos (90 Days)
                    </h3>
                    <div className={styles.topVideosList}>
                        {topVideos.map((video, i) => (
                            <div key={video.videoId} className={styles.topVideoRow}>
                                <span className={styles.videoRank}>#{i + 1}</span>
                                {video.thumbnail && (
                                    <img src={video.thumbnail} alt="" className={styles.topVideoThumb} />
                                )}
                                <div className={styles.topVideoInfo}>
                                    <a
                                        href={`https://youtube.com/watch?v=${video.videoId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.topVideoTitle}
                                    >
                                        {video.title}
                                    </a>
                                    <div className={styles.topVideoMetrics}>
                                        <span><Eye size={11} /> {fmt(video.views)}</span>
                                        <span><Clock size={11} /> {fmt(video.watchTimeMinutes)}m</span>
                                        <span><DollarSign size={11} /> {fmtPeso(video.revenue * phpRate)}</span>
                                        <span><Users size={11} /> +{video.subscribersGained}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent videos fallback — always show if we have them */}
            {recentVideos.length > 0 && !topVideos.length && (
                <div className={styles.topVideosSection}>
                    <h3 className={styles.sectionTitle}>Recent Videos (Last 3 Months)</h3>
                    <div className={styles.topVideosList}>
                        {recentVideos.map((video, i) => (
                            <div key={video.video_id} className={styles.topVideoRow}>
                                <span className={styles.videoRank}>#{i + 1}</span>
                                <img src={video.thumbnail_url} alt="" className={styles.topVideoThumb} />
                                <div className={styles.topVideoInfo}>
                                    <a
                                        href={`https://youtube.com/watch?v=${video.video_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.topVideoTitle}
                                    >
                                        {video.title}
                                    </a>
                                    <div className={styles.topVideoMetrics}>
                                        <span><Eye size={11} /> {fmt(video.view_count)}</span>
                                        <span>👍 {fmt(video.like_count)}</span>
                                        <span>💬 {fmt(video.comment_count)}</span>
                                        <span>{fmtDate(video.published_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No data at all fallback */}
            {!analytics && !recentVideos.length && !analyticsError && (
                <div className={styles.noAnalytics}>
                    <p>Channel connected but no data available yet.</p>
                    <p className={styles.noAnalyticsHint}>
                        Make sure the YouTube Analytics API is enabled in your Google Cloud Console.
                    </p>
                </div>
            )}
        </div>
    )
}
