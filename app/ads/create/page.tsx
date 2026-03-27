/**
 * Creative Testing V2 — Concept → Hooks → Formats
 * 
 * Entry points:
 * 1. Weekly planner recommendations (top)
 * 2. Manual concept creation (config panel)
 * 3. Strategy map link (?angle=X&persona=Y)
 */
'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

// ─── Format Renderer ───
function ExecContent({ format, content }: { format: string; content: Record<string, unknown> }) {
  if (format === 'static_image') {
    return (
      <div className={styles.execContent}>
        <div className={styles.execField}><span className={styles.execFieldLabel}>Headline: </span>{content.headline as string}</div>
        <div className={styles.execField}><span className={styles.execFieldLabel}>Body: </span>{content.body_text as string}</div>
        <div className={styles.execField}><span className={styles.execFieldLabel}>CTA: </span>{content.cta_text as string}</div>
      </div>
    )
  }
  if (format === 'carousel') {
    const slides = (content.slides || []) as Array<{ body_text: string }>
    return (
      <div className={styles.execContent}>
        <div className={styles.execSlides}>
          {slides.map((s, i) => <div key={i} className={styles.execSlide}>Slide {i + 1}: {s.body_text}</div>)}
        </div>
        <div className={styles.execField}><span className={styles.execFieldLabel}>CTA: </span>{content.cta_text as string}</div>
      </div>
    )
  }
  if (format === 'video_hq' || format === 'video_ugc') {
    return (
      <div className={styles.execContent}>
        <div className={styles.execField}><span className={styles.execFieldLabel}>Hook (3s): </span>{content.hook_script as string}</div>
        <div className={styles.execField}><span className={styles.execFieldLabel}>Body: </span>{(content.body_script as string)?.slice(0, 200)}...</div>
        <div className={styles.execField}><span className={styles.execFieldLabel}>CTA: </span>{content.cta_script as string}</div>
        <div className={styles.execField}><span className={styles.execFieldLabel}>Duration: </span>{content.duration_seconds as number}s</div>
      </div>
    )
  }
  if (format === 'ig_carousel') {
    const slides = (content.slides || []) as Array<{ title: string; body_text: string }>
    return (
      <div className={styles.execContent}>
        <div className={styles.execSlides}>
          {slides.map((s, i) => <div key={i} className={styles.execSlide}><strong>{s.title}</strong> — {s.body_text}</div>)}
        </div>
      </div>
    )
  }
  return <div className={styles.execContent}><pre>{JSON.stringify(content, null, 2)}</pre></div>
}

// ─── Hook Section ───
function HookSection({ hook, onStatusChange }: { hook: Hook; onStatusChange: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div className={styles.hookSection}>
      <div className={styles.hookHeader} onClick={() => setOpen(!open)}>
        <div className={styles.hookInfo}>
          <p className={styles.hookText}>{open ? '▾' : '▸'} "{hook.hook_text}"</p>
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
            <div key={exec.id} className={styles.execCard}>
              <div className={styles.execFormat}>{fmt(exec.format)}</div>
              <ExecContent format={exec.format} content={exec.content} />
            </div>
          ))}
        </div>
      )}
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
  const [selectedFormats, setSelectedFormats] = useState(['static_image', 'carousel', 'video_ugc'])
  const [hookCount, setHookCount] = useState(3)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState<ConceptBrief | null>(null)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [conceptId, setConceptId] = useState<string | null>(null)

  const [weeklyPlan, setWeeklyPlan] = useState<{ week_label: string; recommendations: Recommendation[] } | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)

  // Load weekly plan
  useEffect(() => {
    fetch('/api/ads/weekly-plan').then(r => r.json()).then(data => {
      setWeeklyPlan(data)
      setLoadingPlan(false)
    }).catch(() => setLoadingPlan(false))
  }, [])

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
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setBrief(data.brief)
      setHooks(data.hooks || [])
      setConceptId(data.concept_id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setGenerating(false)
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
    setSelectedFormats(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  const useRecommendation = (rec: Recommendation) => {
    setAngle(rec.angle)
    setPersona(rec.persona)
    setMode(rec.mode === 'scale' ? 'scale' : 'explore')
    setSelectedFormats(rec.suggested_formats)
    setHookCount(rec.hook_count)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Creative Factory</h1>
          <p className={styles.subtitle}>One concept → hook variations → format expansions → test batch</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/ads" className={styles.btnOutline}>← Ads</Link>
          <Link href="/ads/strategy" className={styles.btnOutline}>Strategy Map</Link>
          <Link href="/ads/audit" className={styles.btnOutline}>Audit</Link>
          <Link href="/ads/competitors" className={styles.btnOutline}>🏢 Intel</Link>
        </div>
      </header>

      {/* Weekly Plan Recommendations */}
      {!brief && !generating && weeklyPlan && weeklyPlan.recommendations.length > 0 && (
        <div className={styles.weeklySection}>
          <h2 className={styles.weeklyTitle}>📅 {weeklyPlan.week_label} — Recommended Tests</h2>
          <div className={styles.recCards}>
            {weeklyPlan.recommendations.map((rec, i) => (
              <div key={i} className={styles.recCard}>
                <span className={styles.recDay}>{rec.day}</span>
                <div className={styles.recContent}>
                  <span className={`${styles.recMode} ${rec.mode === 'explore' ? styles.recExplore : rec.mode === 'scale' ? styles.recScale : styles.recIterate}`}>
                    {rec.mode}
                  </span>
                  <div className={styles.recAngle}>{fmt(rec.angle)} × {fmt(rec.persona)}</div>
                  <p className={styles.recReason}>{rec.reason}</p>
                  <div className={styles.recFormats}>
                    {rec.suggested_formats.map(f => <span key={f} className={styles.recFormatTag}>{fmt(f)}</span>)}
                  </div>
                  <button className={styles.recAction} onClick={() => useRecommendation(rec)}>
                    Use This →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Panel */}
      {!brief && !generating && (
        <div className={styles.configPanel}>
          <div className={styles.modeRow}>
            <div className={`${styles.modeCard} ${mode === 'explore' ? styles.modeActive : ''}`} onClick={() => setMode('explore')}>
              <div className={styles.modeLabel}>🔍 Explore</div>
              <div className={styles.modeDesc}>Test a new angle you haven't tried</div>
            </div>
            <div className={`${styles.modeCard} ${mode === 'scale' ? styles.modeActive : ''}`} onClick={() => setMode('scale')}>
              <div className={styles.modeLabel}>📈 Scale</div>
              <div className={styles.modeDesc}>Create fresh variations of a winning angle</div>
            </div>
          </div>

          <div className={styles.configRow}>
            <label className={styles.label}>
              Angle
              <select className={styles.select} value={angle} onChange={e => setAngle(e.target.value)}>
                <option value="">Select angle...</option>
                {ANGLES.map(a => <option key={a} value={a}>{fmt(a)}</option>)}
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
              <label key={f.value} className={styles.formatCheck}>
                <input type="checkbox" checked={selectedFormats.includes(f.value)} onChange={() => toggleFormat(f.value)} />
                {f.label}
              </label>
            ))}
          </div>

          <div className={styles.configBottom}>
            <label className={styles.label}>
              Hook Variations
              <select className={styles.select} value={hookCount} onChange={e => setHookCount(Number(e.target.value))}>
                <option value={2}>2 hooks</option>
                <option value={3}>3 hooks</option>
                <option value={4}>4 hooks</option>
                <option value={5}>5 hooks</option>
              </select>
            </label>
            <button className={styles.generateBtn} onClick={handleGenerate} disabled={!angle || !persona || selectedFormats.length === 0 || generating}>
              ✨ Generate Creative Tree ({hookCount} hooks × {selectedFormats.length} formats = {hookCount * selectedFormats.length} executions)
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {generating && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Building creative tree...</p>
          <p className={styles.loadingSub}>
            Generating concept brief → {hookCount} hook variations → {selectedFormats.length} formats each
          </p>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {/* Results */}
      {brief && hooks.length > 0 && (
        <>
          {/* Concept Brief */}
          <div className={styles.briefCard}>
            <h3 className={styles.briefTitle}>{fmt(brief.angle)} × {fmt(brief.persona)}</h3>
            <p className={styles.briefMessage}>{brief.core_message}</p>
            <div className={styles.briefMeta}>
              <span className={styles.briefTag}>📦 {brief.product_name} ₱{brief.product_price.toLocaleString()}</span>
              <span className={styles.briefTag}>📐 {fmt(brief.framework)}</span>
              <span className={styles.briefTag}>🎯 {mode === 'scale' ? 'Scaling winner' : 'Exploring new angle'}</span>
              <span className={styles.briefTag}>🏢 {brief.competitor_context.slice(0, 60)}...</span>
            </div>
          </div>

          <div className={styles.resultsHeader}>
            <h2>{hooks.length} Hook Variations × {selectedFormats.length} Formats = {hooks.reduce((s, h) => s + h.executions.length, 0)} Executions</h2>
            <div className={styles.headerActions}>
              <button className={styles.btnOutline} onClick={() => { setBrief(null); setHooks([]) }}>← New Concept</button>
            </div>
          </div>

          {/* Hook Sections */}
          {hooks.map(hook => (
            <HookSection key={hook.id} hook={hook} onStatusChange={handleStatusChange} />
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
