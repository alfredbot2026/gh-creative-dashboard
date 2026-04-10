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

interface SavedConcept {
  id: string; angle: string; persona: string; core_message: string
  concept_brief: ConceptBrief; mode: string; status: string
  updated_at: string; hooks: Hook[]
}

interface PlanExecutionAsset {
  id: string
  asset_type: string
  plan_section: string | null
  payload: Record<string, unknown> | null
}

interface PlanExecutionDetail {
  id: string
  plan_type: string
  objective: string
  target_angle: string | null
  target_persona: string | null
  target_formats: string[]
  status: string
  generated_concept_ids?: string[]
  evidence_summary?: {
    winners?: Array<Record<string, unknown>>
    losers?: Array<Record<string, unknown>>
    fatigue?: Array<Record<string, unknown>>
    gaps?: Array<Record<string, unknown>>
    learning_confidence?: string
    winning_hooks?: string[]
  }
  assets?: PlanExecutionAsset[]
}

type WizardStep = 'pick' | 'brief' | 'hooks' | 'results'
type CreateMode = 'explore' | 'scale' | 'refresh'

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

function normalizePlanEvidence(evidence: PlanExecutionDetail['evidence_summary']) {
  return {
    winners: Array.isArray(evidence?.winners) ? evidence.winners : [],
    losers: Array.isArray(evidence?.losers) ? evidence.losers : [],
    fatigue: Array.isArray(evidence?.fatigue) ? evidence.fatigue : [],
    gaps: Array.isArray(evidence?.gaps) ? evidence.gaps : [],
    winning_hooks: Array.isArray(evidence?.winning_hooks) ? evidence.winning_hooks : [],
    learning_confidence: typeof evidence?.learning_confidence === 'string' ? evidence.learning_confidence : '',
  }
}

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
  hook, angle, persona, expanding, onExpand, onStatusChange, onExecutionUpdate
}: {
  hook: Hook; angle: string; persona: string; expanding: boolean
  onExpand: (hookId: string) => void
  onStatusChange: (id: string, status: string) => void
  onExecutionUpdate: (id: string, content: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(true)
  const hasExecs = hook.executions.length > 0
  return (
    <div className={styles.hookSection}>
      <div className={styles.hookHeader} onClick={() => setOpen(!open)}>
        <div className={styles.hookInfo}>
          <p className={styles.hookText}>{open ? '▾' : '▸'} &quot;{hook.hook_text}&quot;</p>
        </div>
        <div className={styles.hookStatus}>
          <span className={styles.hookType}>{hook.hook_type.replace(/_/g, ' ')}</span>
          {!hasExecs && !expanding && (
            <button className={styles.expandBtn} onClick={e => { e.stopPropagation(); onExpand(hook.id) }}>
              ✨ Generate Ads
            </button>
          )}
          {expanding && <span className={styles.expandingTag}>⏳ Generating...</span>}
          {hook.status === 'winner' && <span className={`${styles.statusBtn} ${styles.statusWinner}`}>🏆 Winner</span>}
          {hook.status === 'loser' && <span className={`${styles.statusBtn} ${styles.statusLoser}`}>❌ Loser</span>}
          {hook.status === 'draft' && hasExecs && (
            <>
              <button className={`${styles.statusBtn} ${styles.statusWinner}`} onClick={e => { e.stopPropagation(); onStatusChange(hook.id, 'winner') }}>🏆</button>
              <button className={`${styles.statusBtn} ${styles.statusLoser}`} onClick={e => { e.stopPropagation(); onStatusChange(hook.id, 'loser') }}>❌</button>
            </>
          )}
        </div>
      </div>
      {open && hasExecs && (
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

// ─── Step Indicator ───
function StepIndicator({ step }: { step: WizardStep }) {
  const steps: { key: WizardStep; label: string }[] = [
    { key: 'pick', label: 'Pick Angle' },
    { key: 'brief', label: 'Review Brief' },
    { key: 'hooks', label: 'Choose Hooks' },
    { key: 'results', label: 'Ad Executions' },
  ]
  const idx = steps.findIndex(s => s.key === step)
  return (
    <div className={styles.stepIndicator}>
      {steps.map((s, i) => (
        <div key={s.key} className={`${styles.stepDot} ${i <= idx ? styles.stepActive : ''} ${i === idx ? styles.stepCurrent : ''}`}>
          <span className={styles.stepNum}>{i + 1}</span>
          <span className={styles.stepLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ───
function CreatePageInner() {
  const searchParams = useSearchParams()
  const angleParam = searchParams.get('angle') || ''
  const personaParam = searchParams.get('persona') || ''
  const modeParam = searchParams.get('mode') || ''
  const planIdParam = searchParams.get('plan_id') || ''

  // Wizard state
  const [step, setStep] = useState<WizardStep>('pick')
  const [angle, setAngle] = useState(angleParam)
  const [persona, setPersona] = useState(personaParam)
  const initialMode: CreateMode = modeParam === 'scale' ? 'scale' : modeParam === 'refresh' ? 'refresh' : 'explore'
  const [mode, setMode] = useState<CreateMode>(initialMode)
  const [selectedFormats, setSelectedFormats] = useState(['static_image', 'carousel'])
  const [hookCount, setHookCount] = useState(3)

  // Progressive generation state
  const [conceptId, setConceptId] = useState<string | null>(null)
  const [brief, setBrief] = useState<ConceptBrief | null>(null)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [expandingHooks, setExpandingHooks] = useState<Set<string>>(new Set())

  // Bank-first state
  type BankHook = { id: string; hook_text: string; hook_type: string; proof_points_used: string[]; quality_score: number | null; ad_roas: number | null; ad_status: string | null; status: string; times_selected: number; persona?: string; _crossPersona?: boolean }
  const [bankHooks, setBankHooks] = useState<BankHook[]>([])
  const [crossPersonaHooks, setCrossPersonaHooks] = useState<BankHook[]>([])
  const [bankStatus, setBankStatus] = useState<{ fresh: number; total: number; needs_refill: boolean } | null>(null)
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set())
  const [bankLoading, setBankLoading] = useState(false)
  const [bankMode, setBankMode] = useState<'bank' | 'generate'>('bank')

  const [generating, setGenerating] = useState(false)
  const [genStage, setGenStage] = useState('')
  const [error, setError] = useState('')

  const [weeklyPlan, setWeeklyPlan] = useState<{ week_label: string; recommendations: Recommendation[] } | null>(null)
  const [coverage, setCoverage] = useState<AngleCoverage[]>([])
  const [loadingCoverage, setLoadingCoverage] = useState(true)
  const [savedConcepts, setSavedConcepts] = useState<SavedConcept[]>([])
  const [planDetail, setPlanDetail] = useState<PlanExecutionDetail | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [executingPlan, setExecutingPlan] = useState(false)

  useEffect(() => {
    fetch('/api/ads/weekly-plan').then(r => r.json()).then(data => setWeeklyPlan(data)).catch(() => {})
    fetch('/api/ads/angle-coverage').then(r => r.json()).then(data => {
      setCoverage(data.coverage || [])
      setLoadingCoverage(false)
    }).catch(() => setLoadingCoverage(false))
    // Load previously generated concepts
    fetch('/api/ads/creative-tree').then(r => r.json()).then(data => {
      setSavedConcepts((data.concepts || []).slice(0, 5))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!planIdParam) return
    setLoadingPlan(true)
    fetch(`/api/ads/plans/${planIdParam}`, { cache: 'no-store' })
      .then(async r => {
        const data = await r.json().catch(() => ({})) as PlanExecutionDetail & { error?: string }
        if (!r.ok || !data?.id) {
          throw new Error(data?.error || 'Failed to load plan execution context')
        }
        return data as PlanExecutionDetail
      })
      .then((data: PlanExecutionDetail) => {
        const normalizedEvidence = normalizePlanEvidence(data.evidence_summary)
        setPlanDetail({
          ...data,
          evidence_summary: normalizedEvidence,
          assets: Array.isArray(data.assets) ? data.assets : [],
        })
        if (data.target_angle) setAngle(data.target_angle)
        if (data.target_persona) setPersona(data.target_persona)
        setMode(data.plan_type === 'explore' ? 'explore' : 'scale')
        setBrief({
          angle: data.target_angle || '',
          persona: data.target_persona || '',
          core_message: data.objective,
          product_name: 'Plan Execution',
          product_price: 0,
          persona_context: data.target_persona || '',
          tone: 'Use the approved production brief and existing winning patterns.',
          framework: data.plan_type,
          proof_points: [],
          competitor_context: '',
          compliance_notes: 'Reuse approved plan guidance.',
          winning_patterns: normalizedEvidence.winning_hooks.join(' | '),
        })
        if (Array.isArray(data.target_formats) && data.target_formats.length > 0) {
          const hasStaticAssets = (data.assets || []).some(asset => asset.asset_type.startsWith('static_'))
          const filteredFormats = hasStaticAssets
            ? data.target_formats.filter(format => !format.includes('video'))
            : data.target_formats
          const hasStatic = filteredFormats.some(format => format === 'static_image' || format === 'carousel' || format === 'ig_carousel')
          setSelectedFormats(hasStatic ? filteredFormats : ['static_image', 'carousel'])
        }
        setStep('brief')
      })
      .catch((err: unknown) => {
        setPlanDetail(null)
        setError(err instanceof Error ? err.message : 'Failed to load plan execution context')
      })
      .finally(() => setLoadingPlan(false))
  }, [planIdParam])

  // Auto-advance to brief step if angle/persona pre-filled from URL
  useEffect(() => {
    if (!planIdParam && angleParam && personaParam && step === 'pick') {
      handleGenerateBrief()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshSavedConcepts = async () => {
    try {
      const res = await fetch('/api/ads/creative-tree', { cache: 'no-store' })
      const data = await res.json()
      setSavedConcepts((data.concepts || []).slice(0, 5))
      return data.concepts || []
    } catch {
      return []
    }
  }

  const handleExecutePlan = async () => {
    if (!planDetail) return
    setExecutingPlan(true)
    setGenerating(true)
    setGenStage('Building ads from the approved plan...')
    setError('')

    try {
      const response = await fetch(`/api/ads/plans/${planDetail.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook_count: hookCount, formats: selectedFormats }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Plan execution failed')

      const concepts = await refreshSavedConcepts()
      const builtConcept = concepts.find((item: SavedConcept) => item.id === json.concept_id)
      if (builtConcept) {
        resumeConcept(builtConcept)
      }

      const planResponse = await fetch(`/api/ads/plans/${planDetail.id}`, { cache: 'no-store' })
      const latestPlan = await planResponse.json()
      if (planResponse.ok) setPlanDetail(latestPlan)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Plan execution failed')
    }

    setExecutingPlan(false)
    setGenerating(false)
    setGenStage('')
  }

  const planEvidence = normalizePlanEvidence(planDetail?.evidence_summary)

  const planEvidenceItems = planDetail
    ? [
        `${planEvidence.winners.length} winner signal(s)`,
        `${planEvidence.fatigue.length} fatigue signal(s)`,
        `${planEvidence.gaps.length} gap(s)`,
        planEvidence.learning_confidence ? `${fmt(planEvidence.learning_confidence)} confidence` : '',
      ].filter(Boolean)
    : []

  const planAssetSummary = planDetail?.assets?.slice(0, 6) || []

  // ─── Step 1→2: Generate brief ───
  const handleGenerateBrief = async () => {
    if (!angle || !persona) return
    setGenerating(true)
    setGenStage('Analyzing your ad account + loading knowledge base...')
    setError('')
    try {
      const res = await fetch('/api/ads/creative-tree/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle, persona, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Brief generation failed')
      setBrief(data.brief)
      setConceptId(data.concept_id)
      setStep('brief')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setGenerating(false)
    setGenStage('')
  }

  // ─── Step 2→3: Load bank hooks (default) or generate fresh ───
  const handleLoadBank = async () => {
    if (!angle || !persona) return
    setBankLoading(true)
    setBankMode('bank')
    setError('')
    try {
      const res = await fetch(`/api/ads/bank?angle=${encodeURIComponent(angle)}&persona=${encodeURIComponent(persona)}&count=12`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bank load failed')
      setBankHooks(data.hooks || [])
      setCrossPersonaHooks(data.cross_persona_hooks || [])
      setBankStatus(data.bank_status || null)
      setSelectedBankIds(new Set())
      setStep('hooks')
    } catch (err: unknown) {
      // Bank empty or failed — fall back to generate mode
      setBankHooks([])
      setBankStatus({ fresh: 0, total: 0, needs_refill: true })
      setStep('hooks')
    }
    setBankLoading(false)
  }

  const handleUseBankHooks = async () => {
    if (!conceptId || selectedBankIds.size === 0) return
    setGenerating(true)
    setGenStage('Saving selected hooks...')
    try {
      // Create creative_hooks entries from selected bank hooks
      const selected = bankHooks.filter(h => selectedBankIds.has(h.id))
      const res = await fetch('/api/ads/creative-tree/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: conceptId,
          bank_hook_ids: selected.map(h => h.id),
          bank_hooks: selected.map(h => ({
            hook_text: h.hook_text,
            hook_type: h.hook_type,
            proof_points_used: h.proof_points_used,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save hooks')
      setHooks((data.hooks || []).map((h: Hook) => ({ ...h, executions: [] })))
      // Mark bank hooks as selected
      fetch('/api/ads/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', ids: [...selectedBankIds] }),
      }).catch(() => {})
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setGenerating(false)
    setGenStage('')
  }

  const handleGenerateFresh = async () => {
    if (!conceptId) return
    setGenerating(true)
    setBankMode('generate')
    setGenStage('Generating fresh hooks (avoiding existing patterns)...')
    setError('')
    try {
      const res = await fetch('/api/ads/creative-tree/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId, hookCount, fresh: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hook generation failed')
      setHooks((data.hooks || []).map((h: Hook) => ({ ...h, executions: [] })))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setGenerating(false)
    setGenStage('')
  }

  const toggleBankHook = (id: string) => {
    setSelectedBankIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Legacy: direct LLM generation (kept as fallback)
  const handleGenerateHooks = async () => {
    if (!conceptId) return
    setGenerating(true)
    setGenStage('Generating hook variations from knowledge base...')
    setError('')
    try {
      const res = await fetch('/api/ads/creative-tree/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId, hookCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hook generation failed')
      setHooks((data.hooks || []).map((h: Hook) => ({ ...h, executions: [] })))
      setStep('hooks')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
    setGenerating(false)
    setGenStage('')
  }

  // ─── Step 3→4: Expand a single hook ───
  const handleExpandHook = async (hookId: string) => {
    if (!conceptId) return
    setExpandingHooks(prev => new Set(prev).add(hookId))
    try {
      const res = await fetch('/api/ads/creative-tree/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook_id: hookId, concept_id: conceptId, formats: selectedFormats }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Expansion failed')
      setHooks(prev => prev.map(h =>
        h.id === hookId ? { ...h, executions: data.executions || [] } : h
      ))
      setStep('results')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Expansion failed')
    }
    setExpandingHooks(prev => { const next = new Set(prev); next.delete(hookId); return next })
  }

  // ─── Expand ALL hooks ───
  const handleExpandAll = async () => {
    const unexpanded = hooks.filter(h => h.executions.length === 0)
    // Run in parallel for non-video, sequential would be safer for video
    const hasVideo = selectedFormats.some(f => f === 'video_ugc' || f === 'video_hq')
    if (hasVideo) {
      for (const h of unexpanded) await handleExpandHook(h.id)
    } else {
      await Promise.all(unexpanded.map(h => handleExpandHook(h.id)))
    }
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
    setMode(rec.mode === 'scale' ? 'scale' : rec.mode === 'refresh' ? 'refresh' : 'explore')
    setSelectedFormats(rec.suggested_formats.filter(f => f !== 'video_ugc' && f !== 'video_hq'))
    setHookCount(Math.min(rec.hook_count, 3))
  }

  const selectFromCoverage = (selectedAngle: string, selectedMode: 'explore' | 'scale') => {
    setAngle(selectedAngle)
    setMode(selectedMode)
    document.querySelector('[data-section="config"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  const resumeConcept = (concept: SavedConcept) => {
    setBrief(concept.concept_brief)
    setConceptId(concept.id)
    setAngle(concept.angle)
    setPersona(concept.persona)
    setMode(concept.mode === 'scale' ? 'scale' : concept.mode === 'refresh' ? 'refresh' : 'explore')
    if (concept.hooks.length > 0) {
      setHooks(concept.hooks)
      const hasExecs = concept.hooks.some(h => h.executions.length > 0)
      setStep(hasExecs ? 'results' : 'hooks')
    } else {
      setStep('brief')
    }
  }

  const resetWizard = () => {
    setStep('pick')
    setBrief(null)
    setHooks([])
    setConceptId(null)
    setError('')
    setExpandingHooks(new Set())
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Creative Factory</h1>
          <p className={styles.subtitle}>
            {step === 'pick' && 'What should we create next?'}
            {step === 'brief' && 'Review the creative brief'}
            {step === 'hooks' && 'Pick hooks to expand into ads'}
            {step === 'results' && 'Your generated ads'}
          </p>
        </div>
        <div className={styles.headerActions}>
          {step !== 'pick' && <button className={styles.btnOutline} onClick={resetWizard}>← Start Over</button>}
          <Link href="/ads" className={styles.btnOutline}>Dashboard</Link>
        </div>
      </header>

      {planDetail && (
        <section className={styles.briefCard} style={{ marginBottom: '1rem' }}>
          <h3 className={styles.briefTitle}>Executing: {fmt(planDetail.plan_type)} — {planDetail.objective}</h3>
          <div className={styles.briefMeta}>
            <span className={styles.briefTag}>Status: {fmt(planDetail.status)}</span>
            {planEvidenceItems.map(item => <span key={item} className={styles.briefTag}>{item}</span>)}
          </div>
          {!!planEvidence.winning_hooks.length && (
            <div className={styles.briefDetail}>
              <strong>Winning hooks:</strong> {planEvidence.winning_hooks.slice(0, 3).join(' · ')}
            </div>
          )}
        </section>
      )}

      <StepIndicator step={step} />

      {loadingPlan && <div className={styles.loading}><div className={styles.spinner} /><p>Loading plan…</p></div>}

      {/* ─── STEP 1: Pick angle + persona ─── */}
      {step === 'pick' && !generating && (
        <>
          {!loadingCoverage && coverage.length > 0 && (
            <AngleCoveragePanel coverage={coverage} onSelect={selectFromCoverage} />
          )}

          {weeklyPlan && weeklyPlan.recommendations.length > 0 && (
            <div className={styles.weeklySection}>
              <h2 className={styles.weeklyTitle}>📅 {weeklyPlan.week_label} — AI Recommends</h2>
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

          {/* Previously generated — resume */}
          {savedConcepts.length > 0 && (
            <div className={styles.savedSection}>
              <h3 className={styles.savedTitle}>📂 Previously Generated</h3>
              <div className={styles.savedGrid}>
                {savedConcepts.map(c => {
                  const totalExecs = c.hooks.reduce((s, h) => s + h.executions.length, 0)
                  const ago = Math.round((Date.now() - new Date(c.updated_at).getTime()) / 3600000)
                  return (
                    <div key={c.id} className={styles.savedCard} onClick={() => resumeConcept(c)}>
                      <div className={styles.savedAngle}>{fmt(c.angle)} × {fmt(c.persona)}</div>
                      <div className={styles.savedMeta}>
                        {c.hooks.length} hooks · {totalExecs} ads · {ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`}
                      </div>
                      <div className={styles.savedAction}>Resume →</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className={styles.configPanel} data-section="config">
            <div className={styles.modeRow}>
              <div className={`${styles.modeCard} ${mode === 'explore' ? styles.modeActive : ''}`} onClick={() => setMode('explore')}>
                <div className={styles.modeLabel}>Explore</div>
                <div className={styles.modeDesc}>Test an untested angle. Bold, varied hooks.</div>
              </div>
              <div className={`${styles.modeCard} ${mode === 'scale' ? styles.modeActive : ''}`} onClick={() => setMode('scale')}>
                <div className={styles.modeLabel}>Scale</div>
                <div className={styles.modeDesc}>Fresh creative for a winning angle. Prevent fatigue.</div>
              </div>
              <div className={`${styles.modeCard} ${mode === 'refresh' ? styles.modeActive : ''}`} onClick={() => setMode('refresh')}>
                <div className={styles.modeLabel}>Refresh</div>
                <div className={styles.modeDesc}>Keep the core message but swap the hook, framing, or format.</div>
              </div>
            </div>

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

            <button
              className={styles.generateBtn}
              onClick={handleGenerateBrief}
              disabled={!angle || !persona}
            >
              Next: Generate Brief →
            </button>
          </div>
        </>
      )}

      {/* ─── STEP 2: Review brief ─── */}
      {step === 'brief' && brief && !generating && (
        <div className={styles.briefStep}>
          {planDetail && planAssetSummary.length > 0 ? (
            <div className={styles.execGrid} style={{ marginBottom: '1rem' }}>
              <div className={styles.briefCard}>
                <h3 className={styles.briefTitle}>Production Brief</h3>
                <div className={styles.hooksList}>
                  {planAssetSummary.map(asset => (
                    <div key={asset.id} className={styles.hookPickCard}>
                      <div className={styles.hookPickContent}>
                        <p className={styles.hookPickText}>{fmt(asset.asset_type)}</p>
                        <span className={styles.hookType}>{asset.plan_section ? fmt(asset.plan_section) : 'General'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.briefCard}>
                <h3 className={styles.briefTitle}>Build Ads from This Plan</h3>
                <p className={styles.briefMessage}>Use the approved plan settings without re-entering angle, persona, or formats.</p>
                <div className={styles.briefMeta}>
                  <span className={styles.briefTag}>{selectedFormats.length} selected format(s)</span>
                  <span className={styles.briefTag}>{hookCount} hook variation(s)</span>
                </div>
                <div className={styles.briefActions}>
                  <button className={styles.generateBtn} onClick={handleExecutePlan} disabled={executingPlan}>
                    {planDetail.target_formats.some(format => format.includes('video')) ? 'Build Ads from This Plan →' : 'Build Static Ads from This Plan →'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.briefCard}>
            <h3 className={`${styles.briefTitle} ${styles.briefTitleRow}`}>
              <span>{fmt(brief.angle)} × {fmt(brief.persona)}</span>
              <span className={styles.modeTag}>{mode === 'scale' ? 'Scale' : mode === 'refresh' ? 'Refresh' : 'Explore'}</span>
            </h3>
            <p className={styles.briefMessage}>{brief.core_message}</p>
            <div className={styles.briefMeta}>
              <span className={styles.briefTag}>📦 {brief.product_name} ₱{brief.product_price.toLocaleString()}</span>
              <span className={styles.briefTag}>📐 {fmt(brief.framework)}</span>
            </div>
            {brief.competitor_context && (
              <p className={styles.briefDetail}>🏢 {brief.competitor_context}</p>
            )}
            {brief.proof_points.length > 0 && (
              <div className={styles.briefDetail}>
                <strong>Proof Points:</strong> {brief.proof_points.slice(0, 5).join(' · ')}
              </div>
            )}
          </div>

          <div className={styles.hookConfig}>
            <label className={styles.label}>
              How many hook variations?
              <select className={styles.select} value={hookCount} onChange={e => setHookCount(Number(e.target.value))}>
                <option value={2}>2 hooks (quick test)</option>
                <option value={3}>3 hooks (recommended)</option>
                <option value={4}>4 hooks (thorough)</option>
              </select>
            </label>
          </div>

          <div className={styles.briefActions}>
            <button className={styles.btnOutline} onClick={() => setStep('pick')}>← Change Angle</button>
            {planDetail && planDetail.status === 'accepted' ? (
              <button className={styles.generateBtn} onClick={handleExecutePlan} disabled={executingPlan}>
                {planDetail.target_formats.some(format => format.includes('video')) ? 'Build Video Ads from Plan →' : 'Build Ads from Plan →'}
              </button>
            ) : null}
            <button className={styles.generateBtn} onClick={handleLoadBank}>
              Looks Good — Browse Hook Bank →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Choose hooks + pick formats ─── */}
      {step === 'hooks' && !generating && (
        <div className={styles.hooksStep}>
          {/* Bank mode: show pre-generated hooks as selectable grid */}
          {bankMode === 'bank' && bankHooks.length > 0 && hooks.length === 0 && (
            <>
              <div className={styles.bankHeader}>
                <div>
                  <strong>Hook Bank</strong> — {bankStatus?.fresh ?? 0} fresh · {bankStatus?.total ?? 0} total for {fmt(angle)} × {fmt(persona)}
                </div>
                <button className={styles.btnOutline} onClick={handleGenerateFresh} style={{ fontSize: '0.85rem' }}>
                  🔄 Generate Fresh
                </button>
              </div>
              <div className={styles.bankGrid}>
                {bankHooks.map(hook => (
                  <div
                    key={hook.id}
                    className={`${styles.bankCard} ${selectedBankIds.has(hook.id) ? styles.bankCardSelected : ''}`}
                    onClick={() => toggleBankHook(hook.id)}
                  >
                    <div className={styles.bankCardHeader}>
                      <span className={styles.hookType}>{hook.hook_type.replace(/_/g, ' ')}</span>
                      {hook.ad_roas != null && <span className={styles.roasBadge}>{hook.ad_roas.toFixed(1)}x ROAS</span>}
                      {hook.ad_status === 'winning' && <span className={styles.winnerBadge}>🏆</span>}
                      {hook.ad_status === 'tired' && <span className={styles.tiredBadge}>😴</span>}
                    </div>
                    <p className={styles.bankCardText}>&quot;{hook.hook_text}&quot;</p>
                    <div className={styles.bankCardMeta}>
                      {hook.proof_points_used?.slice(0, 2).map((pp, i) => (
                        <span key={i} className={styles.proofTag}>{pp}</span>
                      ))}
                    </div>
                    {selectedBankIds.has(hook.id) && <div className={styles.bankCardCheck}>✓</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Cross-persona suggestions */}
          {bankMode === 'bank' && crossPersonaHooks.length > 0 && hooks.length === 0 && (
            <>
              <div className={styles.bankHeader} style={{ marginTop: '0.75rem' }}>
                <div><strong>Also works for this angle</strong> — from similar personas</div>
              </div>
              <div className={styles.bankGrid}>
                {crossPersonaHooks.map(hook => (
                  <div
                    key={hook.id}
                    className={`${styles.bankCard} ${selectedBankIds.has(hook.id) ? styles.bankCardSelected : ''}`}
                    onClick={() => toggleBankHook(hook.id)}
                    style={{ borderStyle: 'dashed' }}
                  >
                    <div className={styles.bankCardHeader}>
                      <span className={styles.hookType}>{hook.hook_type.replace(/_/g, ' ')}</span>
                      {hook.persona && <span className={styles.proofTag}>from {fmt(hook.persona)}</span>}
                      {hook.ad_roas != null && <span className={styles.roasBadge}>{hook.ad_roas.toFixed(1)}x ROAS</span>}
                    </div>
                    <p className={styles.bankCardText}>&quot;{hook.hook_text}&quot;</p>
                    {selectedBankIds.has(hook.id) && <div className={styles.bankCardCheck}>✓</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Bank empty: show message + generate option */}
          {bankMode === 'bank' && bankHooks.length === 0 && hooks.length === 0 && (
            <div className={styles.bankEmpty}>
              <p>No hooks in the bank for <strong>{fmt(angle)} × {fmt(persona)}</strong> yet.</p>
              <button className={styles.generateBtn} onClick={handleGenerateFresh}>
                ✨ Generate Fresh Hooks
              </button>
            </div>
          )}

          {/* Generated hooks (from "Generate Fresh" or legacy flow) */}
          {hooks.length > 0 && (
            <div className={styles.hooksList}>
              {hooks.map((hook, i) => (
                <div key={hook.id} className={styles.hookPickCard}>
                  <div className={styles.hookPickNum}>{i + 1}</div>
                  <div className={styles.hookPickContent}>
                    <p className={styles.hookPickText}>&quot;{hook.hook_text}&quot;</p>
                    <span className={styles.hookType}>{hook.hook_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Format config */}
          <div className={styles.formatConfig}>
            <div className={styles.label}>What formats to generate?</div>
            <div className={styles.formatRow}>
              {ALL_FORMATS.map(f => (
                <label key={f.value} className={`${styles.formatCheck} ${(f.value === 'video_ugc' || f.value === 'video_hq') ? styles.formatSlow : ''}`}>
                  <input type="checkbox" checked={selectedFormats.includes(f.value)} onChange={() => toggleFormat(f.value)} />
                  {f.label}
                  {(f.value === 'video_ugc' || f.value === 'video_hq') && <span className={styles.slowTag}>~2min each</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.briefActions}>
            <button className={styles.btnOutline} onClick={() => { setStep('brief'); setBankHooks([]); setHooks([]); setSelectedBankIds(new Set()) }}>← Back to Brief</button>
            {/* Bank mode: use selected hooks */}
            {bankMode === 'bank' && selectedBankIds.size > 0 && hooks.length === 0 && (
              <button
                className={styles.generateBtn}
                onClick={handleUseBankHooks}
                disabled={selectedFormats.length === 0}
              >
                ✨ Use {selectedBankIds.size} Hooks → Generate {selectedBankIds.size * selectedFormats.length} Ads
              </button>
            )}
            {/* Generated hooks: expand all */}
            {hooks.length > 0 && (
              <button
                className={styles.generateBtn}
                onClick={handleExpandAll}
                disabled={selectedFormats.length === 0}
              >
                ✨ Generate All ({hooks.length} hooks × {selectedFormats.length} formats = {hooks.length * selectedFormats.length} ads)
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── STEP 4: Results ─── */}
      {step === 'results' && brief && hooks.length > 0 && (
        <>
          <div className={styles.briefCard}>
            <h3 className={`${styles.briefTitle} ${styles.briefTitleRow}`}>
              <span>{fmt(brief.angle)} × {fmt(brief.persona)}</span>
              <span className={styles.modeTag}>{mode === 'scale' ? 'Scale' : mode === 'refresh' ? 'Refresh' : 'Explore'}</span>
            </h3>
            <p className={styles.briefMessage}>{brief.core_message}</p>
          </div>

          <div className={styles.resultsHeader}>
            <h2>{hooks.length} hooks · {hooks.reduce((s, h) => s + h.executions.length, 0)} ads generated</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={styles.btnOutline}
                onClick={async () => {
                  const name = prompt('Template name:', `${fmt(brief.angle)} × ${fmt(brief.persona)} Template`)
                  if (!name) return
                  try {
                    await fetch('/api/templates', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name,
                        content_purpose: mode === 'scale' ? 'sell' : 'prove',
                        content_lane: 'ads',
                        template_params: { angle: brief.angle, persona: brief.persona, mode, hookCount, selectedFormats },
                        sample_output: { brief, hooks: hooks.map(h => ({ hook_text: h.hook_text, hook_type: h.hook_type })) },
                      })
                    })
                    alert('Template saved! Reuse this brief configuration anytime.')
                  } catch { alert('Failed to save template') }
                }}
              >
                💾 Save as Template
              </button>
              <button className={styles.btnOutline} onClick={resetWizard}>← New Batch</button>
            </div>
          </div>

          {hooks.map(hook => (
            <HookSection
              key={hook.id}
              hook={hook}
              angle={brief.angle}
              persona={brief.persona}
              expanding={expandingHooks.has(hook.id)}
              onExpand={handleExpandHook}
              onStatusChange={handleStatusChange}
              onExecutionUpdate={handleExecutionUpdate}
            />
          ))}
        </>
      )}

      {/* ─── Loading overlay ─── */}
      {generating && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{genStage || 'Working...'}</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
          <button className={styles.btnOutline} style={{marginLeft: '1rem', fontSize: '0.8rem'}} onClick={() => setError('')}>Dismiss</button>
        </div>
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
