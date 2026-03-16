/**
 * Ad Performance Page — With Sync Button
 * Campaign cards with metrics, status badges, and one-click Meta sync.
 * Client component for interactive sync + auto-refresh.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { DollarSign, MousePointerClick, Target, TrendingUp, RefreshCw, Loader2 } from 'lucide-react'
import styles from './page.module.css'

/* Ad row from Supabase */
interface AdRow {
    id: string
    campaign_name: string
    ad_name: string | null
    spend: number | null
    roas: number | null
    ctr: number | null
    conversions: number | null
    status: string | null
    ad_copy: string | null
    headline: string | null
    cta_type: string | null
    creative_type: string | null
    ai_analysis: string | null
    date_range_start: string | null
    date_range_end: string | null
}

export default function AdsPage() {
    const [ads, setAds] = useState<AdRow[]>([])
    const [syncing, setSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    /* Fetch ads from Supabase */
    const fetchAds = useCallback(async () => {
        const { data } = await supabase
            .from('ad_performance')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setAds(data)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchAds() }, [fetchAds])

    /* Sync Meta Ads — calls /api/meta/sync */
    const handleSync = async () => {
        setSyncing(true)
        setSyncResult(null)
        try {
            const res = await fetch('/api/meta/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datePreset: 'last_7d' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Sync failed')
            setSyncResult(`✅ Synced ${data.campaigns_synced} campaigns, ${data.creatives_fetched} creatives`)
            await fetchAds() // refresh
        } catch (err) {
            setSyncResult(`❌ ${err instanceof Error ? err.message : 'Sync failed'}`)
        } finally {
            setSyncing(false)
        }
    }

    /* Calculate aggregate stats */
    const totalSpend = ads.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
    const avgRoas = ads.length > 0
        ? (ads.reduce((sum, ad) => sum + Number(ad.roas || 0), 0) / ads.length).toFixed(1)
        : '0'
    const totalConversions = ads.reduce((sum, ad) => sum + (ad.conversions || 0), 0)
    const avgCtr = ads.length > 0
        ? ((ads.reduce((sum, ad) => sum + Number(ad.ctr || 0), 0) / ads.length) * 100).toFixed(2)
        : '0'

    return (
        <>
            <PageHeader
                title="Ad Performance"
                subtitle="Campaign metrics and AI-powered recommendations"
                action={
                    <div className={styles.headerActions}>
                        {syncResult && <span className={styles.syncResult}>{syncResult}</span>}
                        <button className={styles.syncButton} onClick={handleSync} disabled={syncing}>
                            {syncing ? <Loader2 size={16} className={styles.spinner} /> : <RefreshCw size={16} />}
                            {syncing ? 'Syncing...' : 'Sync Ads'}
                        </button>
                    </div>
                }
            />

            {/* Overview stats */}
            <div className={styles.statsGrid}>
                <StatCard label="Total Spend" value={`$${totalSpend.toLocaleString()}`} icon={<DollarSign size={18} />} />
                <StatCard label="Avg ROAS" value={`${avgRoas}x`} icon={<TrendingUp size={18} />} />
                <StatCard label="Total Conversions" value={totalConversions} icon={<Target size={18} />} />
                <StatCard label="Avg CTR" value={`${avgCtr}%`} icon={<MousePointerClick size={18} />} />
            </div>

            {/* Campaign cards */}
            {ads.length > 0 ? (
                <div className={styles.campaignGrid}>
                    {ads.map((ad) => (
                        <div key={ad.id} className={styles.campaignCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.campaignName}>{ad.campaign_name}</h3>
                                {ad.status && <StatusBadge status={ad.status} />}
                            </div>
                            {ad.ad_name && <span className={styles.adName}>{ad.ad_name}</span>}

                            <div className={styles.metricsGrid}>
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>Spend</span>
                                    <span className={styles.metricValue}>${Number(ad.spend).toLocaleString()}</span>
                                </div>
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>ROAS</span>
                                    <span className={styles.metricValue}>{ad.roas}x</span>
                                </div>
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>CTR</span>
                                    <span className={styles.metricValue}>{(Number(ad.ctr) * 100).toFixed(2)}%</span>
                                </div>
                                <div className={styles.metric}>
                                    <span className={styles.metricLabel}>Conversions</span>
                                    <span className={styles.metricValue}>{ad.conversions || 0}</span>
                                </div>
                            </div>

                            {ad.ai_analysis && (
                                <div className={styles.analysis}>
                                    <span className={styles.analysisLabel}>AI Analysis</span>
                                    <p className={styles.analysisText}>{ad.ai_analysis}</p>
                                </div>
                            )}

                            {ad.date_range_start && ad.date_range_end && (
                                <span className={styles.dateRange}>
                                    {ad.date_range_start} → {ad.date_range_end}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>No ad performance data yet.</p>
                    <p>Click <strong>Sync Ads</strong> to pull data from Meta.</p>
                </div>
            )}
        </>
    )
}
