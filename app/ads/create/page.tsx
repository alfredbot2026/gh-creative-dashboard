'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ExecutionCard from '@/components/ads/ExecutionCard'
import styles from './page.module.css'

// ─── Types ───

interface ConceptBrief {
  angle: string; persona: string; core_message: string
  product_name: string; product_price: number; persona_context: string
  tone: string; framework: string; proof_points: string[]
  competitor_context: string; compliance_notes: string; winning_patterns: string
}

interface Hook {
  id: string; hook_text: string; hook_type: string
  proof_points_used: string[]; status: string
  executions: Execution[]
}

interface Execution {
  id: string; format: string; content: Record<string, unknown>; status: string
}

interface Recommendation {
  mode: string; angle: string; persona: string; reason: string
  suggested_formats: string[]; hook_count: number; day: string
}

interface AngleCoverage {
  angle: string
  tested: boolean
  winner_count: number
  best_roas: number | null
  ad_count: number
}

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

const ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
const PERSONAS = ['new_mom_curious', 'beginner', 'price_sensitive', 'aspirational', 'skeptic', 'returning_buyer', 'advanced', 'busy_professional']
const ALL_FORMATS = [
  { value: 'static_image', label: '🖼️ Static Image' },
  { value: 'carousel', label: '🎠 Carousel' },
  { value: 'video_ugc', label: '🎬 UGC Video' },
  { value: 'video_hq', label: '🎥 HQ Video' },
  { value: 'ig_carousel', label: '📱 IG Carousel' },
]

// ─── Hook Section ───
function HookSection({
  hook, angle, persona, onStatusChange, onExecutionUpdate
}: {
  hook: Hook; angle: string; persona: string
  onStatusChange: (id: string, status: string) => void
  onExecutionUpdate: (id: string, content: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className={styles.hookSection}>
      <div className={styles.hookHeader} onClick={() => setOpen(!open)}>
        <div className={styles.hookInfo}>
          <p className={styles.hookText}>{open ? '▾' : '▸'} &quot;{hook.hook_text}&quot;</p>
        </div>
        <div className={styles.hookStatus}>
          <span className={styles.hookType}>{hook.hook_type.replace(/_/g, ' ')}</span>
          {hook.status === 'winner' && <span className={`${styles.statusBtn} ${styles.statusWinner}`}>🏆 Winner</span>}
          {hook.status === 'loser' && <span className={`${styles.statusBtn} ${styles.statusLoser}`}>❌ Loser</span>}
          {hook.status === 'draft' && (
            <>
              <button className={`${styles.statusBtn} ${styles.statusWinner}`} onClick={e => { e.stopPropagation(); onStatusChange(hook.id, 'winner') }}>🏆</button>
              <button className={`${styles.statusBtn} ${styles.statusLoser}`} onClick={e => { e.stopPropagation(); onStatusChange(hook.id, 'loser') }}>❌</button>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className={styles.execGrid}>
          {hook.executions.map(exec => (
            <ExecutionCard
              key={exec.id}
              id={exec.id}
              format={exec.format}
              content={exec.content}
              angle={angle}
              persona={persona}
              hookText={hook.hook_text}
              hookType={hook.hook_type}
              onUpdate={onExecutionUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Angle Coverage Map ───
function AngleCoveragePanel({ coverage, onSelect }: { coverage: AngleCoverage[]; onSelect: (angle: string, mode: 'explore' | 'scale') => void }) {
  return (
    <div className={styles.coveragePanel}>
      <h3 className={styles.coverageTitle}>Your Angle Coverage</h3>
      <p className={styles.coverageDesc}>What you&apos;ve tested vs what&apos;s untapped</p>
      <div className={styles.coverageGrid}>
        {coverage.map(c => (
          <div
            key={c.angle}
            className={`${styles.coverageCard} ${c.tested ? (c.winner_count > 0 ? styles.coverageWinner : styles.coverageTested) : styles.coverageUntested}`}
            onClick={() => onSelect(c.angle, c.winner_count > 0 ? 'scale' : 'explore')}
          >
            <div className={styles.coverageAngle}>{fmt(c.angle)}</div>
            {c.tested ? (
              <>
                <div className={styles.coverageStats}>
                  {c.ad_count} ads · {c.winner_count > 0 ? `${c.winner_count} winner${c.winner_count > 1 ? 's' : ''}` : 'no winners yet'}
                </div>
                {c.best_roas && <div className={styles.coverageRoas}>{c.best_roas.toFixed(1)}x ROAS</div>}
                <div className={styles.coverageAction}>{c.winner_count > 0 ? '📈 Scale' : '🔄 Retry'}</div>
              </>
            ) : (
              <>
                <div className={styles.coverageStats}>Never tested</div>
                <div className={styles.coverageAction}>🔍 Explore</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───
function CreatePageInner() {
  const searchParams = useSearchParams()
  const angleParam = searchParams.get('angle') || ''
  const personaParam = searchParams.get('persona') || ''
  const modeParam = searchParams.get('mode') || ''

  const [angle, setAngle] = useState(angleParam)
  const [persona, setPersona] = useState(personaParam)
  const [mode, setMode] = useState<'explore' | 'scale'>(modeParam === 'scale' ? 'scale' : 'explore')
  // Safer defaults: 2 hooks, Static + Carousel only (no video by default — too slow)
  const [selectedFormats, setSelectedFormats] = useState(['static_image', 'carousel'])
  const [hookCount, setHookCount] = useState(2)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState<ConceptBrief | null>(null)
  const [hooks, setHooks] = useState<Hook[]>([])

  const [weeklyPlan, setWeeklyPlan] = useState<{ week_label: string; recommendations: Recommendation[] } | null>(null)
  const [coverage, setCoverage] = useState<AngleCoverage[]>([])
  const [loadingCoverage, setLoadingCoverage] = useState(true)

  useEffect(() => {
    fetch('/api/ads/weekly-plan').then(r => r.json()).then(data => setWeeklyPlan(data)).catch(() => {})
    // Load angle coverage from ad_creatives
    fetch('/api/ads/angle-coverage').then(r => r.json()).then(data => {
      setCoverage(data.coverage || [])
      setLoadingCoverage(false)
    }).catch(() => setLoadingCoverage(false))
  }, [])

  const hasVideo = selectedFormats.some(f => f === 'video_ugc' || f === 'video_hq')
  const estimatedTime = hasVideo
    ? `~${hookCount * 2}-${hookCount * 3} min`
    : `~${Math.ceil(hookCount * 20 / 60)} min`

  const handleGenerate = async () => {
    if (!angle || !persona) return
    setGenerating(true)
    setError('')
    setBrief(null)
    setHooks([])
    try {
      const res = await fetch('/api/ads/creative-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle, persona, mode, hookCount, formats: selectedFormats }),
      })
      // Handle non-JSON responses (timeout, server error)
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Server error (likely timeout). Try fewer hooks or formats — especially avoid video for large batches.`)
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setBrief(data.brief)
      setHooks(data.hooks || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setGenerating(false)
  }

  const handleExecutionUpdate = async (id: string, newContent: Record<string, unknown>) => {
    setHooks(prev => prev.map(h => ({
      ...h,
      executions: h.executions.map(e => e.id === id ? { ...e, content: newContent } : e)
    })))
    try {
      await fetch('/api/ads/creative-tree', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'execution', id, status: 'draft', content: newContent }),
      })
    } catch { /* silent */ }
  }

  const handleStatusChange = async (hookId: string, status: string) => {
    try {
      await fetch('/api/ads/creative-tree', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hook', id: hookId, status }),
      })
      setHooks(prev => prev.map(h => h.id === hookId ? { ...h, status } : h))
    } catch { /* silent */ }
  }

  const toggleFormat = (f: string) => {
    setSelectedFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const useRecommendation = (rec: Recommendation) => {
    setAngle(rec.angle)
    setPersona(rec.persona)
    setMode(rec.mode === 'scale' ? 'scale' : 'explore')
    setSelectedFormats(rec.suggested_formats.filter(f => f !== 'video_ugc' && f !== 'video_hq'))
    setHookCount(Math.min(rec.hook_count, 2))
  }

  const selectFromCoverage = (selectedAngle: string, selectedMode: 'explore' | 'scale') => {
    setAngle(selectedAngle)
    setMode(selectedMode)
    // Scroll to config
    document.querySelector('[data-section="config"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Creative Factory</h1>
          <p className={styles.subtitle}>Pick an angle → generate hooks → get format-ready ads</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads" className={styles.btnOutline}>← Ads</Link>
          <Link href="/ads/strategy" className={styles.btnOutline}>Strategy Map</Link>
          <Link href="/ads" className={styles.btnOutline}>Dashboard</Link>
        </div>
      </header>

      {/* Angle Coverage — always visible, collapses when results shown */}
      {!brief && !generating && (
        <>
          {!loadingCoverage && coverage.length > 0 && (
            <AngleCoveragePanel coverage={coverage} onSelect={selectFromCoverage} />
          )}

          {/* Weekly Plan */}
          {weeklyPlan && weeklyPlan.recommendations.length > 0 && (
            <div className={styles.weeklySection}>
              <h2 className={styles.weeklyTitle}>📅 {weeklyPlan.week_label} — Recommended</h2>
              <div className={styles.recCards}>
                {weeklyPlan.recommendations.map((rec, i) => (
                  <div key={i} className={styles.recCard}>
                    <span className={styles.recDay}>{rec.day}</span>
                    <div className={styles.recContent}>
                      <span className={`${styles.recMode} ${rec.mode === 'scale' ? styles.recScale : styles.recExplore}`}>{rec.mode}</span>
                      <div className={styles.recAngle}>{fmt(rec.angle)} × {fmt(rec.persona)}</div>
                      <p className={styles.recReason}>{rec.reason}</p>
                      <button className={styles.recAction} onClick={() => useRecommendation(rec)}>Use This →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config Panel */}
          <div className={styles.configPanel} data-section="config">
            {/* Mode toggle — now explains the difference clearly */}
            <div className={styles.modeRow}>
              <div className={`${styles.modeCard} ${mode === 'explore' ? styles.modeActive : ''}`} onClick={() => setMode('explore')}>
                <div className={styles.modeLabel}>🔍 Explore</div>
                <div className={styles.modeDesc}>Test an angle you haven&apos;t run yet. Bold, varied hooks — find what resonates.</div>
              </div>
              <div className={`${styles.modeCard} ${mode === 'scale' ? styles.modeActive : ''}`} onClick={() => setMode('scale')}>
                <div className={styles.modeLabel}>📈 Scale</div>
                <div className={styles.modeDesc}>You have a winning angle. Generate fresh creative to prevent fatigue — different hooks, same proven logic.</div>
              </div>
            </div>
            {mode === 'scale' && (
              <div className={styles.scaleTip}>
                ℹ️ Scale mode pulls your top-ROAS ads for this angle and generates new hooks that follow the same emotional pattern — without repeating the ones you&apos;ve already run.
              </div>
            )}

            <div className={styles.configRow}>
              <label className={styles.label}>
                Angle
                <select className={styles.select} value={angle} onChange={e => setAngle(e.target.value)}>
                  <option value="">Select angle...</option>
                  {ANGLES.map(a => {
                    const cov = coverage.find(c => c.angle === a)
                    const tag = cov?.winner_count ? ` ✅ ${cov.best_roas?.toFixed(1)}x` : cov?.tested ? ' (tested)' : ' (new)'
                    return <option key={a} value={a}>{fmt(a)}{cov ? tag : ''}</option>
                  })}
                </select>
              </label>
              <label className={styles.label}>
                Target Persona
                <select className={styles.select} value={persona} onChange={e => setPersona(e.target.value)}>
                  <option value="">Select persona...</option>
                  {PERSONAS.map(p => <option key={p} value={p}>{fmt(p)}</option>)}
                </select>
              </label>
            </div>

            <div className={styles.label}>Formats to Generate</div>
            <div className={styles.formatRow}>
              {ALL_FORMATS.map(f => (
                <label key={f.value} className={`${styles.formatCheck} ${(f.value === 'video_ugc' || f.value === 'video_hq') ? styles.formatSlow : ''}`}>
                  <input type="checkbox" checked={selectedFormats.includes(f.value)} onChange={() => toggleFormat(f.value)} />
                  {f.label}
                  {(f.value === 'video_ugc' || f.value === 'video_hq') && <span className={styles.slowTag}>~2min each</span>}
                </label>
              ))}
            </div>

            <div className={styles.configBottom}>
              <label className={styles.label}>
                Hook Variations
                <select className={styles.select} value={hookCount} onChange={e => setHookCount(Number(e.target.value))}>
                  <option value={1}>1 hook</option>
                  <option value={2}>2 hooks</option>
                  <option value={3}>3 hooks</option>
                  <option value={4}>4 hooks</option>
                </select>
              </label>
              <button className={styles.generateBtn} onClick={handleGenerate} disabled={!angle || !persona || selectedFormats.length === 0 || generating}>
                ✨ Generate ({hookCount} hooks × {selectedFormats.length} formats = {hookCount * selectedFormats.length} ads · {estimatedTime})
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loading */}
      {generating && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Building creative tree...</p>
          <p className={styles.loadingSub}>
            {hasVideo
              ? `Video scripts use the full KB pipeline — expect ${estimatedTime}. Static/Carousel run in parallel.`
              : `Generating ${hookCount} hooks in parallel × ${selectedFormats.length} formats. Should take ${estimatedTime}.`
            }
          </p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
          <button className={styles.btnOutline} style={{marginLeft: '1rem', fontSize: '0.8rem'}} onClick={() => { setError(''); setBrief(null); setHooks([]) }}>Try Again</button>
        </div>
      )}

      {/* Results */}
      {brief && hooks.length > 0 && (
        <>
          <div className={styles.briefCard}>
            <h3 className={styles.briefTitle}>
              {fmt(brief.angle)} × {fmt(brief.persona)}
              <span className={styles.modeTag}>{mode === 'scale' ? '📈 Scaling Winner' : '🔍 Exploring'}</span>
            </h3>
            <p className={styles.briefMessage}>{brief.core_message}</p>
            <div className={styles.briefMeta}>
              <span className={styles.briefTag}>📦 {brief.product_name} ₱{brief.product_price.toLocaleString()}</span>
              <span className={styles.briefTag}>📐 {fmt(brief.framework)}</span>
            </div>
          </div>

          <div className={styles.resultsHeader}>
            <h2>{hooks.length} hooks × {selectedFormats.length} formats = {hooks.reduce((s, h) => s + h.executions.length, 0)} ads</h2>
            <button className={styles.btnOutline} onClick={() => { setBrief(null); setHooks([]) }}>← New Batch</button>
          </div>

          {hooks.map(hook => (
            <HookSection
              key={hook.id}
              hook={hook}
              angle={brief.angle}
              persona={brief.persona}
              onStatusChange={handleStatusChange}
              onExecutionUpdate={handleExecutionUpdate}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <CreatePageInner />
    </Suspense>
  )
}
