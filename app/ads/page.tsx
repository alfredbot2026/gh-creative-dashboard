'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import AuditContent from './audit/AuditContent'
import styles from './ads.module.css'

type Confidence = 'high' | 'medium' | 'low'
type Priority = 'high' | 'medium' | 'low'

interface Health {
  active_ads: number
  winning: number
  tired: number
  dead_active: number
  untested_angles: number
  total_angles: number
  coverage_pct: number
  week_spend?: number
}

interface WinnerContext {
  ad_id: string
  ad_name: string
  angle: string
  persona: string
  format: string
  hook_preview: string
  roas: number
  spend: number
  confidence: Confidence
  why_it_works: string
  hook_family: string
  cta_pattern: string
}

interface FadingContext {
  ad_id: string
  ad_name: string
  angle: string
  reason: string
  trend_pct: number
  suggested_action: string
  new_hook_families_to_try: string[]
}

interface DeadContext {
  ad_id: string
  ad_name: string
  angle: string
  total_spend: number
  roas: number
  primary_mistake: string
  avoid_this: string[]
  try_this_instead: string[]
}

interface OpportunityContext {
  angle: string
  persona: string
  why_here: string
  competitor_signal: number
  suggested_approach: string
  estimated_variants: number
  priority: Priority
}

interface TopPlan {
  id: string
  plan_type: string
  objective: string
  target_angle: string | null
  target_persona: string | null
  status: string
  asset_count: number
}

interface ActionsResponse {
  health: Health
  winners_context: WinnerContext[]
  fading_context: FadingContext[]
  dead_context: DeadContext[]
  opportunities_context: OpportunityContext[]
  top_plans: TopPlan[]
}

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
const formatPeso = (n: number) => '₱' + Math.round(n).toLocaleString()

function Badge({ children }: { children: ReactNode }) {
  return <span className={styles.badge}>{children}</span>
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`${styles.priorityBadge} ${styles[`priority${priority[0].toUpperCase()}${priority.slice(1)}`]}`}>{priority}</span>
}

function HealthTile({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  return (
    <div className={styles.healthTile}>
      <div className={`${styles.healthValue} ${tone !== 'default' ? styles[`health${tone[0].toUpperCase()}${tone.slice(1)}`] : ''}`}>{value}</div>
      <div className={styles.healthLabel}>{label}</div>
    </div>
  )
}

function WinnersSection({ winners }: { winners: WinnerContext[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <div>
          <h2 className={styles.sectionTitle}>What&apos;s Working Now</h2>
          <p className={styles.sectionSubtitle}>Top performers with the strongest signals worth scaling.</p>
        </div>
      </div>

      {winners.length === 0 ? (
        <div className={styles.emptyState}>No winning ads yet. Once winners are classified, they’ll show up here.</div>
      ) : (
        <div className={styles.winnerStrip}>
          {winners.map(winner => (
            <article key={winner.ad_id} className={styles.winnerCard}>
              <div className={styles.cardEyebrow}>Winner</div>
              <h3 className={styles.cardTitle}>{winner.ad_name}</h3>
              <div className={styles.badgeRow}>
                <Badge>{fmt(winner.angle)}</Badge>
                <Badge>{fmt(winner.persona)}</Badge>
                <Badge>{fmt(winner.format)}</Badge>
                <Badge>{winner.confidence} confidence</Badge>
              </div>
              <p className={styles.hookPreview}>&ldquo;{winner.hook_preview}&rdquo;</p>
              <div className={styles.metricRow}>
                <div><span className={styles.metricLabel}>ROAS</span><strong>{winner.roas.toFixed(1)}x</strong></div>
                <div><span className={styles.metricLabel}>Spend</span><strong>{formatPeso(winner.spend)}</strong></div>
              </div>
              <p className={styles.whyLine}>{winner.why_it_works}</p>
              <div className={styles.metaRow}>
                <span>Hook family: {fmt(winner.hook_family)}</span>
                <span>CTA: {fmt(winner.cta_pattern)}</span>
              </div>
              <Link href={`/ads/create?angle=${winner.angle}&persona=${winner.persona}&mode=scale`} className={styles.primaryCta}>
                Create more like this →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function AttentionSection({ fading, dead }: { fading: FadingContext[]; dead: DeadContext[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <div>
          <h2 className={styles.sectionTitle}>What Needs Attention</h2>
          <p className={styles.sectionSubtitle}>Fatigue and wasted spend that should be refreshed or retired.</p>
        </div>
      </div>

      <div className={styles.attentionGrid}>
        <div className={styles.stackColumn}>
          <h3 className={styles.subsectionTitle}>Fatiguing ads</h3>
          {fading.length === 0 ? (
            <div className={styles.emptyState}>No clear fatigue signals right now.</div>
          ) : (
            fading.map(item => (
              <article key={item.ad_id} className={`${styles.infoCard} ${styles.warningCard}`}>
                <div className={styles.cardTopRow}>
                  <h4 className={styles.cardTitleSmall}>{item.ad_name}</h4>
                  <span className={styles.trendBadge}>-{item.trend_pct}%</span>
                </div>
                <div className={styles.badgeRow}>
                  <Badge>{fmt(item.angle)}</Badge>
                </div>
                <p className={styles.cardText}>{item.reason}</p>
                <p className={styles.cardTextMuted}>Suggested move: {item.suggested_action}</p>
                <p className={styles.cardTextMuted}>Try next: {item.new_hook_families_to_try.map(fmt).join(' · ')}</p>
                <Link href={`/ads/create?angle=${item.angle}&mode=refresh`} className={styles.secondaryCta}>Refresh this →</Link>
              </article>
            ))
          )}
        </div>

        <div className={styles.stackColumn}>
          <h3 className={styles.subsectionTitle}>Dead ads</h3>
          {dead.length === 0 ? (
            <div className={styles.emptyState}>No dead-spend patterns surfaced right now.</div>
          ) : (
            dead.map(item => (
              <article key={item.ad_id} className={`${styles.infoCard} ${styles.dangerCard}`}>
                <div className={styles.cardTopRow}>
                  <h4 className={styles.cardTitleSmall}>{item.ad_name}</h4>
                  <span className={styles.deadMetric}>{item.roas.toFixed(1)}x</span>
                </div>
                <p className={styles.cardText}>Primary mistake: {fmt(item.primary_mistake)}</p>
                <p className={styles.cardTextMuted}>Spent {formatPeso(item.total_spend)}. Avoid: {item.avoid_this.map(fmt).join(' · ')}</p>
                <p className={styles.cardTextMuted}>Try instead: {item.try_this_instead.map(fmt).join(' · ')}</p>
                <Link href={`/ads/create?angle=${item.angle}&mode=refresh`} className={styles.secondaryCta}>Stop wasting budget →</Link>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function OpportunitiesSection({ opportunities }: { opportunities: OpportunityContext[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <div>
          <h2 className={styles.sectionTitle}>Opportunities</h2>
          <p className={styles.sectionSubtitle}>Best gaps to explore next based on missing tests and competitor pressure.</p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className={styles.emptyState}>No open opportunities were detected.</div>
      ) : (
        <div className={styles.opportunityGrid}>
          {opportunities.map(item => (
            <article key={`${item.angle}-${item.persona}`} className={`${styles.infoCard} ${styles.opportunityCard}`}>
              <div className={styles.cardTopRow}>
                <h3 className={styles.cardTitleSmall}>{fmt(item.angle)} × {fmt(item.persona)}</h3>
                <PriorityBadge priority={item.priority} />
              </div>
              <div className={styles.badgeRow}>
                <Badge>{item.why_here}</Badge>
                <Badge>{item.competitor_signal} competitor signals</Badge>
              </div>
              <p className={styles.cardText}>{item.suggested_approach}</p>
              <p className={styles.cardTextMuted}>Estimated variants: {item.estimated_variants}</p>
              <Link href={`/ads/create?angle=${item.angle}&persona=${item.persona}&mode=explore`} className={styles.primaryCta}>
                Explore this →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function PlansSection({ plans, onGenerate, generating }: { plans: TopPlan[]; onGenerate: () => void; generating: boolean }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <div>
          <h2 className={styles.sectionTitle}>Plans</h2>
          <p className={styles.sectionSubtitle}>Top plan cards ready for review and execution.</p>
        </div>
        <div className={styles.inlineActions}>
          <Link href="/ads/plans" className={styles.secondaryCta}>View All Plans →</Link>
          <button className={styles.primaryCtaButton} onClick={onGenerate} disabled={generating}>{generating ? 'Generating…' : 'Generate New Plans'}</button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className={styles.emptyState}>No plans yet. Generate your first batch.</div>
      ) : (
        <div className={styles.opportunityGrid}>
          {plans.map(plan => (
            <article key={plan.id} className={styles.infoCard}>
              <div className={styles.cardTopRow}>
                <h3 className={styles.cardTitleSmall}>{plan.objective}</h3>
                <span className={styles.priorityBadge}>{fmt(plan.plan_type)}</span>
              </div>
              <div className={styles.badgeRow}>
                <Badge>{fmt(plan.status)}</Badge>
                <Badge>{fmt(plan.target_angle || 'all_angles')}</Badge>
                <Badge>{fmt(plan.target_persona || 'all_personas')}</Badge>
              </div>
              <p className={styles.cardTextMuted}>{plan.asset_count} assets linked</p>
              <Link href={`/ads/plans/${plan.id}`} className={styles.primaryCta}>Open Plan →</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function SectionSkeleton() {
  return (
    <div className={styles.skeletonSection}>
      <div className={styles.skeletonHeader} />
      <div className={styles.skeletonGrid}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    </div>
  )
}

export default function AdsCommandCenter() {
  const [data, setData] = useState<ActionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCampaignTree, setShowCampaignTree] = useState(false)
  const [generatingPlans, setGeneratingPlans] = useState(false)

  async function loadData() {
    const res = await fetch('/api/ads/actions')
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to load /ads data')
    setData(json)
  }

  useEffect(() => {
    loadData()
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load /ads data'))
      .finally(() => setLoading(false))
  }, [])

  async function generatePlans() {
    setGeneratingPlans(true)
    try {
      const res = await fetch('/api/ads/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto', count: 3 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate plans')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plans')
    } finally {
      setGeneratingPlans(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ads Command Center</h1>
          <p className={styles.subtitle}>See what’s working, what’s fading, and where to test next.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads/create" className={styles.createBtn}>Create ads</Link>
        </div>
      </header>

      {loading ? (
        <>
          <div className={styles.healthBar}>
            <div className={styles.healthTile} />
            <div className={styles.healthTile} />
            <div className={styles.healthTile} />
            <div className={styles.healthTile} />
          </div>
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </>
      ) : error ? (
        <div className={styles.emptyState}>{error}</div>
      ) : data ? (
        <>
          <section className={styles.healthBar}>
            <HealthTile label="Active Ads" value={data.health.active_ads} />
            <HealthTile label="Winning" value={data.health.winning} tone="good" />
            <HealthTile label="Tiring" value={data.health.tired} tone="warn" />
            <HealthTile label="This Week's Spend" value={formatPeso(data.health.week_spend || 0)} tone="bad" />
          </section>

          <WinnersSection winners={data.winners_context || []} />
          <AttentionSection fading={data.fading_context || []} dead={data.dead_context || []} />
          <OpportunitiesSection opportunities={data.opportunities_context || []} />
          <PlansSection plans={data.top_plans || []} onGenerate={() => void generatePlans()} generating={generatingPlans} />

          <section className={styles.section}>
            <button className={styles.collapseToggle} onClick={() => setShowCampaignTree(v => !v)}>
              {showCampaignTree ? 'Hide full campaign tree' : 'Show full campaign tree'}
            </button>
            {showCampaignTree && (
              <div className={styles.auditWrap}>
                <AuditContent embedded />
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
