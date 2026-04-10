'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import styles from '../plans.module.css'

type PlanAsset = {
  id: string
  asset_type: string
  plan_section: string | null
  payload: Record<string, unknown> | null
  sort_order: number
}

type PlanDetail = {
  id: string
  plan_type: string
  priority: number
  objective: string
  hypothesis: string | null
  why_now: string | null
  target_angle: string | null
  target_persona: string | null
  target_formats: string[]
  status: string
  created_at: string
  completed_at: string | null
  evidence_summary: {
    winners: Array<Record<string, unknown>>
    losers: Array<Record<string, unknown>>
    fatigue: Array<Record<string, unknown>>
    gaps: Array<Record<string, unknown>>
  }
  assets: PlanAsset[]
  asset_groups: Record<string, PlanAsset[]>
}

function title(value?: string | null) {
  if (!value) return 'General'
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : null
}

function jsonPretty(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function SectionCopyButton({ label, text }: { label?: string; text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button className={styles.statusButton} onClick={() => void handleCopy()} type="button">
      {copied ? 'Copied' : label || 'Copy'}
    </button>
  )
}

function renderEvidenceItems(items: Array<Record<string, unknown>>) {
  return items.map((item, index) => (
    <li key={index} className={styles.listText}>{jsonPretty(item)}</li>
  ))
}

function findAsset(assets: PlanAsset[], type: string) {
  return assets.find(asset => asset.asset_type === type)
}

function sortByOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order)
}

function groupVideoAngles(assets: PlanAsset[]) {
  const map = new Map<string, { body?: PlanAsset; hooks: PlanAsset[]; summary?: PlanAsset }>()

  for (const asset of assets) {
    const section = asset.plan_section || ''
    const match = section.match(/^(video_angle_\d+)_/)
    if (!match) continue
    const key = match[1]
    if (!map.has(key)) map.set(key, { hooks: [] })
    const current = map.get(key)!
    if (asset.asset_type === 'video_body') current.body = asset
    else if (asset.asset_type === 'video_hook') current.hooks.push(asset)
    else if (asset.asset_type === 'video_angle_summary') current.summary = asset
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([key, value]) => ({ key, ...value, hooks: sortByOrder(value.hooks) }))
}

function groupStaticAngles(assets: PlanAsset[]) {
  const map = new Map<string, { summary?: PlanAsset; headlines: PlanAsset[]; supportLines: PlanAsset[]; ctas: PlanAsset[]; visuals: PlanAsset[] }>()

  for (const asset of assets) {
    const section = asset.plan_section || ''
    const match = section.match(/^(static_angle_\d+)_/)
    if (!match) continue
    const key = match[1]
    if (!map.has(key)) map.set(key, { headlines: [], supportLines: [], ctas: [], visuals: [] })
    const current = map.get(key)!
    if (asset.asset_type === 'static_angle_summary') current.summary = asset
    else if (asset.asset_type === 'static_headline') current.headlines.push(asset)
    else if (asset.asset_type === 'static_support_line') current.supportLines.push(asset)
    else if (asset.asset_type === 'static_cta') current.ctas.push(asset)
    else if (asset.asset_type === 'static_visual') current.visuals.push(asset)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([key, value]) => ({
      key,
      summary: value.summary,
      headlines: sortByOrder(value.headlines),
      supportLines: sortByOrder(value.supportLines),
      ctas: sortByOrder(value.ctas),
      visuals: sortByOrder(value.visuals),
    }))
}

function VideoProductionView({ assets }: { assets: PlanAsset[] }) {
  const globalRules = findAsset(assets, 'video_global_rules')
  const editingNote = findAsset(assets, 'editing_note')
  const confidence = findAsset(assets, 'generation_confidence')
  const angles = groupVideoAngles(assets)

  return (
    <div className={styles.detailStack}>
      {globalRules ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Global Rules</h2>
              <p className={styles.helperText}>Production guardrails for every clip in this batch.</p>
            </div>
            <SectionCopyButton text={jsonPretty(globalRules.payload)} />
          </div>
          <div className={styles.assetsGrid}>
            <article className={styles.assetCard}><p className={styles.assetText}>Tone: {textValue(globalRules.payload?.tone)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Clip length: {textValue(globalRules.payload?.clip_length)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Takes per hook: {numberValue(globalRules.payload?.takes_per_hook) ?? 'n/a'}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>{textValue(globalRules.payload?.improvisation_rule)}</p></article>
          </div>
        </section>
      ) : null}

      {angles.map((angle, index) => {
        const body = angle.body?.payload || {}
        const summary = angle.summary?.payload || {}
        const takeDirections = body.take_directions as Record<string, unknown> | undefined
        const hooksCopy = angle.hooks.map((hook, hookIndex) => `${hookIndex + 1}. ${textValue(hook.payload?.text)} [${textValue(hook.payload?.hook_type)}]`).join('\n')

        return (
          <section key={angle.key} className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Angle {index + 1} — {textValue(body.angle_name || summary.angle_name) || title(angle.key)}</h2>
                <p className={styles.helperText}>{textValue(body.hypothesis || summary.hypothesis)}</p>
              </div>
            </div>
            <div className={styles.assetsGrid}>
              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Body</span>
                  <SectionCopyButton text={textValue(body.text)} />
                </div>
                <p className={styles.assetText}>{textValue(body.text)}</p>
                <p className={styles.helperText}>CTA note: {textValue(body.cta_note)}</p>
                <p className={styles.helperText}>Visual direction: {textValue(body.visual_notes)}</p>
              </article>

              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Hooks</span>
                  <SectionCopyButton text={hooksCopy} />
                </div>
                <ul className={styles.list}>
                  {angle.hooks.map((hook, hookIndex) => (
                    <li key={hook.id} className={styles.listText}>
                      {hookIndex + 1}. {textValue(hook.payload?.text)} [{textValue(hook.payload?.hook_type)}] — {textValue(hook.payload?.performance_note)}
                    </li>
                  ))}
                </ul>
              </article>

              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Take Directions</span>
                  <SectionCopyButton text={jsonPretty(takeDirections || {})} />
                </div>
                <p className={styles.assetText}>Calm: {textValue(takeDirections?.calm)}</p>
                <p className={styles.assetText}>Urgent: {textValue(takeDirections?.urgent)}</p>
                <p className={styles.assetText}>Personal: {textValue(takeDirections?.personal)}</p>
              </article>

              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Expected Raw</span>
                </div>
                <p className={styles.assetText}>{numberValue(body.expected_raw_count || summary.expected_raw_count) ?? 'n/a'} raw clips expected for this angle.</p>
              </article>
            </div>
          </section>
        )
      })}

      {editingNote ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Editing Instructions</h2>
              <p className={styles.helperText}>How to assemble the final ad variants.</p>
            </div>
            <SectionCopyButton text={jsonPretty(editingNote.payload)} />
          </div>
          <div className={styles.assetsGrid}>
            <article className={styles.assetCard}><p className={styles.assetText}>Pairing rule: {textValue(editingNote.payload?.pairing_rule)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Output count: {numberValue(editingNote.payload?.output_count) ?? 'n/a'}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Naming: {textValue(editingNote.payload?.naming_convention)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Export notes: {textValue(editingNote.payload?.export_notes)}</p></article>
          </div>
        </section>
      ) : null}

      {confidence ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Confidence</h2>
          <p className={styles.assetText}>{textValue(confidence.payload?.confidence)} — {textValue(confidence.payload?.note)}</p>
        </section>
      ) : null}
    </div>
  )
}

function StaticProductionView({ assets }: { assets: PlanAsset[] }) {
  const globalRules = findAsset(assets, 'static_global_rules')
  const production = findAsset(assets, 'static_production_instructions')
  const confidence = findAsset(assets, 'generation_confidence')
  const angles = groupStaticAngles(assets)

  return (
    <div className={styles.detailStack}>
      {globalRules ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Global Rules</h2>
              <p className={styles.helperText}>Static production guardrails.</p>
            </div>
            <SectionCopyButton text={jsonPretty(globalRules.payload)} />
          </div>
          <div className={styles.assetsGrid}>
            <article className={styles.assetCard}><p className={styles.assetText}>Tone: {textValue(globalRules.payload?.tone)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Layout: {textValue(globalRules.payload?.layout)}</p></article>
          </div>
        </section>
      ) : null}

      {angles.map((angle, index) => {
        const summary = angle.summary?.payload || {}
        const visualCopy = angle.visuals.map(item => `${textValue(item.payload?.concept_name)} — ${textValue(item.payload?.description)}`).join('\n')
        return (
          <section key={angle.key} className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Angle {index + 1} — {textValue(summary.angle_name) || title(angle.key)}</h2>
                <p className={styles.helperText}>{textValue(summary.hypothesis)}</p>
              </div>
            </div>

            <div className={styles.assetsGrid}>
              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Core Message</span>
                  <SectionCopyButton text={textValue(summary.core_message)} />
                </div>
                <p className={styles.assetText}>{textValue(summary.core_message)}</p>
                <p className={styles.helperText}>{textValue(summary.text_overlay_guidance)}</p>
              </article>

              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Headlines</span>
                  <SectionCopyButton text={angle.headlines.map((item, i) => `${i + 1}. ${textValue(item.payload?.headline)}`).join('\n')} />
                </div>
                <ul className={styles.list}>
                  {angle.headlines.map((item, i) => <li key={item.id} className={styles.listText}>{i + 1}. {textValue(item.payload?.headline)} [{textValue(item.payload?.hook_type)}]</li>)}
                </ul>
              </article>

              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Visual Concepts</span>
                  <SectionCopyButton text={visualCopy} />
                </div>
                <ul className={styles.list}>
                  {angle.visuals.map(item => <li key={item.id} className={styles.listText}>{textValue(item.payload?.concept_name)} — {textValue(item.payload?.description)}</li>)}
                </ul>
              </article>

              <article className={styles.assetCard}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>CTA Variants</span>
                  <SectionCopyButton text={angle.ctas.map(item => textValue(item.payload?.text)).join('\n')} />
                </div>
                <ul className={styles.list}>
                  {angle.ctas.map(item => <li key={item.id} className={styles.listText}>{textValue(item.payload?.text)}</li>)}
                </ul>
              </article>
            </div>

            {angle.supportLines.length > 0 ? (
              <article className={styles.assetCard} style={{ marginTop: '1rem' }}>
                <div className={styles.assetHeader}>
                  <span className={styles.assetBadge}>Support Lines</span>
                  <SectionCopyButton text={angle.supportLines.map(item => textValue(item.payload?.text)).join('\n')} />
                </div>
                <ul className={styles.list}>
                  {angle.supportLines.map(item => <li key={item.id} className={styles.listText}>{textValue(item.payload?.text)}</li>)}
                </ul>
              </article>
            ) : null}
          </section>
        )
      })}

      {production ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Production Instructions</h2>
              <p className={styles.helperText}>Design and export notes for this plan.</p>
            </div>
            <SectionCopyButton text={jsonPretty(production.payload)} />
          </div>
          <div className={styles.assetsGrid}>
            <article className={styles.assetCard}><p className={styles.assetText}>Headline rules: {textValue(production.payload?.headline_rules)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Text placement: {textValue(production.payload?.text_placement)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Export format: {textValue(production.payload?.export_format)}</p></article>
            <article className={styles.assetCard}><p className={styles.assetText}>Variants per angle: {numberValue(production.payload?.variants_per_angle) ?? 'n/a'}</p></article>
          </div>
        </section>
      ) : null}

      {confidence ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Confidence</h2>
          <p className={styles.assetText}>{textValue(confidence.payload?.confidence)} — {textValue(confidence.payload?.note)}</p>
        </section>
      ) : null}
    </div>
  )
}

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState<'video' | 'static'>('video')

  async function loadPlan() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/ads/plans/${params.id}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to load plan')
      setPlan(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) void loadPlan()
  }, [params.id])

  const videoAssets = useMemo(() => (plan?.assets || []).filter(asset => asset.asset_type.startsWith('video_') || (asset.plan_section || '').startsWith('video_') || asset.plan_section === 'video_editing_instructions' || asset.plan_section === 'video_confidence'), [plan])
  const staticAssets = useMemo(() => (plan?.assets || []).filter(asset => asset.asset_type.startsWith('static_') || (asset.plan_section || '').startsWith('static_') || asset.plan_section === 'static_confidence'), [plan])
  const hasVideoAssets = videoAssets.length > 0
  const hasStaticAssets = staticAssets.length > 0

  useEffect(() => {
    if (hasStaticAssets && !hasVideoAssets) setActiveTab('static')
    else if (hasVideoAssets) setActiveTab('video')
  }, [hasStaticAssets, hasVideoAssets])

  async function updateStatus(status: string, announce?: string) {
    setUpdating(true)
    setNotice('')
    setError('')
    try {
      const response = await fetch(`/api/ads/plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to update plan')
      setPlan(json)
      setNotice(announce || 'Plan updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan')
    } finally {
      setUpdating(false)
    }
  }

  async function generatePlan(format: 'video' | 'static' | 'hybrid') {
    setUpdating(true)
    setNotice('')
    setError('')
    try {
      const response = await fetch(`/api/ads/plans/${params.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to generate plan')
      setNotice(`Generated ${format} production brief (${json.asset_count} assets).`)
      await loadPlan()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setUpdating(false)
    }
  }

  const groupedAssets = useMemo(() => Object.entries(plan?.asset_groups || {}), [plan])

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <div>
          <h1 className={styles.detailTitle}>Open Plan</h1>
          <p className={styles.subtitle}>Review the rationale, evidence, and production sections before execution.</p>
        </div>
        <Link href="/ads/plans" className={styles.linkButton}>Back to Plans</Link>
      </div>

      {error ? <div className={styles.emptyState}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {loading ? <div className={styles.loading}>Loading plan…</div> : null}

      {plan ? (
        <div className={styles.detailStack}>
          <section className={styles.panel}>
            <div className={styles.metaRow}>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${plan.plan_type === 'scale' ? styles.typeScale : plan.plan_type === 'refresh' ? styles.typeRefresh : plan.plan_type === 'explore' ? styles.typeExplore : styles.typeMixed}`}>{title(plan.plan_type)}</span>
                <span className={styles.priority}>Priority {plan.priority}</span>
                <span className={styles.statusBadge}>{title(plan.status)}</span>
              </div>
              <div className={styles.metaText}>Created {new Date(plan.created_at).toLocaleDateString('en-PH')}</div>
            </div>
            <h2 className={styles.cardTitle}>{plan.objective}</h2>
            <p className={styles.detailBody}>{plan.hypothesis || 'No hypothesis recorded yet.'}</p>
            <p className={styles.detailBody}>{plan.why_now || 'No why-now note recorded yet.'}</p>
            <div className={styles.chipRow}>
              <span className={styles.badge}>Angle: {title(plan.target_angle)}</span>
              <span className={styles.badge}>Persona: {title(plan.target_persona)}</span>
              {plan.target_formats.map(format => <span key={format} className={styles.formatBadge}>{title(format)}</span>)}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Evidence Summary</h2>
                <p className={styles.helperText}>The signals that led to this plan recommendation.</p>
              </div>
            </div>
            <div className={styles.evidenceGrid}>
              {(['winners', 'fatigue', 'gaps', 'losers'] as const).map(key => (
                <article key={key} className={styles.evidenceCard}>
                  <h3 className={styles.assetTitle}>{title(key)}</h3>
                  {(plan.evidence_summary[key] || []).length === 0 ? (
                    <p className={styles.evidenceText}>No {key} captured yet.</p>
                  ) : (
                    <ul className={styles.list}>{renderEvidenceItems(plan.evidence_summary[key])}</ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.actionRow}>
              <button className={styles.primaryButton} disabled={updating} onClick={() => void updateStatus('accepted', 'Plan accepted.')}>Accept Plan</button>
              <button className={styles.secondaryButton} disabled={updating} onClick={() => void generatePlan('video')}>Generate Video Plan</button>
              <button className={styles.secondaryButton} disabled={updating} onClick={() => void generatePlan('static')}>Generate Static Plan</button>
              <button className={styles.secondaryButton} disabled={updating} onClick={() => void generatePlan('hybrid')}>Generate Both</button>
              <button className={styles.linkButton} disabled={updating} onClick={() => void updateStatus('dismissed', 'Plan dismissed.')}>Dismiss</button>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Production Content</h2>
                <p className={styles.helperText}>Agency-style production brief output for Grace.</p>
              </div>
            </div>

            {!hasVideoAssets && !hasStaticAssets ? (
              <div className={styles.emptyState}>No generated assets yet. Use the generate actions above to create the production brief.</div>
            ) : (
              <>
                {hasVideoAssets && hasStaticAssets ? (
                  <div className={styles.tabs} style={{ marginBottom: '1rem' }}>
                    <button className={`${styles.tabButton} ${activeTab === 'video' ? styles.tabButtonActive : ''}`} type="button" onClick={() => setActiveTab('video')}>Video Plan</button>
                    <button className={`${styles.tabButton} ${activeTab === 'static' ? styles.tabButtonActive : ''}`} type="button" onClick={() => setActiveTab('static')}>Static Plan</button>
                  </div>
                ) : null}

                {(hasVideoAssets && activeTab === 'video') || (hasVideoAssets && !hasStaticAssets) ? <VideoProductionView assets={videoAssets} /> : null}
                {(hasStaticAssets && activeTab === 'static') || (hasStaticAssets && !hasVideoAssets) ? <StaticProductionView assets={staticAssets} /> : null}
              </>
            )}
          </section>

          {groupedAssets.length > 0 ? (
            <section className={styles.panel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Raw Asset Groups</h2>
                  <p className={styles.helperText}>Low-level grouped payloads for debugging and QA.</p>
                </div>
              </div>
              <div className={styles.assetsGrid}>
                {groupedAssets.map(([section, assets]) => (
                  <article key={section} className={styles.assetCard}>
                    <div className={styles.assetHeader}>
                      <span className={styles.assetBadge}>{title(section)}</span>
                      <SectionCopyButton text={assets.map(item => jsonPretty(item.payload)).join('\n\n')} />
                    </div>
                    <p className={styles.helperText}>{assets.length} item(s)</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.panel}>
            <div className={styles.actionRow}>
              <button className={styles.linkButton} onClick={() => router.push('/ads/plans')}>Back to Plans</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
