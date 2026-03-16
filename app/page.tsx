/**
 * Dashboard Page — Mission Control Home
 * Server component fetching summary data from Supabase.
 * Shows: weekly overview, top ads, today's actions, AI recommendations.
 */
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  BarChart3,
  Lightbulb,
} from 'lucide-react'
import styles from './page.module.css'

export default async function DashboardPage() {
  const supabase = await createClient()

  /* -- Fetch content items for this week -- */
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Sunday
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // Saturday

  const { data: contentItems } = await supabase
    .from('content_items')
    .select('*')
    .gte('scheduled_date', weekStart.toISOString().split('T')[0])
    .lte('scheduled_date', weekEnd.toISOString().split('T')[0])

  /* -- Fetch top performing ads (sorted by ROAS) -- */
  const { data: topAds } = await supabase
    .from('ad_performance')
    .select('*')
    .order('roas', { ascending: false })
    .limit(5)

  /* -- Fetch today's action items -- */
  const todayStr = today.toISOString().split('T')[0]
  const { data: todayItems } = await supabase
    .from('content_items')
    .select('*')
    .eq('scheduled_date', todayStr)
    .neq('status', 'published')

  /* -- Fetch latest research insights -- */
  const { data: latestInsights } = await supabase
    .from('research_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  /* -- Calculate stats -- */
  const totalItems = contentItems?.length || 0
  const doneItems = contentItems?.filter(i => i.status === 'published').length || 0
  const pendingItems = totalItems - doneItems
  const todayCount = todayItems?.length || 0

  return (
    <>
      <PageHeader
        title="Mission Control"
        subtitle={`Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
      />

      {/* ===== Weekly Overview Stats ===== */}
      <section className={styles.statsGrid}>
        <StatCard
          label="Content This Week"
          value={totalItems}
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="Published"
          value={doneItems}
          changeType="positive"
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          label="Pending"
          value={pendingItems}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Due Today"
          value={todayCount}
          icon={<Zap size={18} />}
        />
      </section>

      <div className={styles.twoCol}>
        {/* ===== Top Performing Ads ===== */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={18} />
            Top Performing Ads
          </h2>
          {topAds && topAds.length > 0 ? (
            <div className={styles.adsList}>
              {topAds.map((ad) => (
                <div key={ad.id} className={styles.adCard}>
                  <div className={styles.adHeader}>
                    <span className={styles.adName}>{ad.campaign_name}</span>
                    {ad.status && <StatusBadge status={ad.status} size="sm" />}
                  </div>
                  <div className={styles.adMetrics}>
                    <span>ROAS: <strong>{ad.roas}x</strong></span>
                    <span>CTR: <strong>{(Number(ad.ctr) * 100).toFixed(1)}%</strong></span>
                    <span>Spend: <strong>${Number(ad.spend).toFixed(0)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No ad data yet. Upload performance data to get started.</p>
          )}
        </section>

        {/* ===== Today's Actions ===== */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Zap size={18} />
            Today&apos;s Actions
          </h2>
          {todayItems && todayItems.length > 0 ? (
            <div className={styles.actionsList}>
              {todayItems.map((item) => (
                <div key={item.id} className={styles.actionCard}>
                  <span className={styles.actionTitle}>{item.title}</span>
                  <div className={styles.actionMeta}>
                    <StatusBadge status={item.status} size="sm" />
                    <span className={styles.platformTag}>{item.platform}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No action items for today. You&apos;re all caught up!</p>
          )}
        </section>
      </div>

      {/* ===== AI Recommendations / Latest Research ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Lightbulb size={18} />
          Latest Research Insights
        </h2>
        {latestInsights && latestInsights.length > 0 ? (
          <div className={styles.insightsGrid}>
            {latestInsights.map((insight) => (
              <div key={insight.id} className={styles.insightCard}>
                <span className={styles.insightTopic}>{insight.topic}</span>
                <h3 className={styles.insightTitle}>{insight.title}</h3>
                <p className={styles.insightContent}>
                  {insight.content.length > 150
                    ? insight.content.substring(0, 150) + '...'
                    : insight.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No research insights yet. Add some in the Research Hub.</p>
        )}
      </section>
    </>
  )
}
