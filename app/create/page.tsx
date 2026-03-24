'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Check, Copy, RotateCw, CalendarPlus, Wand2, Save, Download } from 'lucide-react'
import { formatScriptForExport, downloadScriptAsText } from '@/lib/studio/download-utils'
import BlockEditor from '@/components/create/BlockEditor'
import type { RegenerateContext } from '@/components/create/BlockEditor'
import type { ScriptScene } from '@/lib/create/types'
import styles from './create.module.css'

type WizardStep = 'mode' | 'platform' | 'goal' | 'structure' | 'topic' | 'loading' | 'results' | 'improve-input' | 'improve-loading' | 'improve-results'
type Platform = 'reels' | 'youtube' | 'facebook-post' | 'facebook-ad' | 'carousel' | 'static-image'
type ContentGoal = 'educate' | 'story' | 'sell' | 'inspire' | 'prove' | 'trend' | 'debunk' | 'process' | 'journey' | 'announce'

const PLATFORMS = [
  { id: 'reels' as Platform, label: 'Reel / TikTok' },
  { id: 'youtube' as Platform, label: 'YouTube' },
  { id: 'facebook-post' as Platform, label: 'Facebook Post' },
  { id: 'facebook-ad' as Platform, label: 'Facebook Ad' },
  { id: 'carousel' as Platform, label: 'Carousel' },
  { id: 'static-image' as Platform, label: 'Static Image' },
]

type Funnel = 'attract' | 'trust' | 'convert'

const GOAL_GROUPS: { funnel: Funnel; label: string; goals: { id: ContentGoal; label: string }[] }[] = [
  {
    funnel: 'attract', label: 'Attract',
    goals: [
      { id: 'trend', label: 'Ride a trend' },
      { id: 'inspire', label: 'Inspire & motivate' },
      { id: 'journey', label: 'Share my journey' },
    ],
  },
  {
    funnel: 'trust', label: 'Build Trust',
    goals: [
      { id: 'educate', label: 'Teach something' },
      { id: 'story', label: 'Tell a story' },
      { id: 'debunk', label: 'Debunk a myth' },
      { id: 'process', label: 'Show the process' },
    ],
  },
  {
    funnel: 'convert', label: 'Convert',
    goals: [
      { id: 'prove', label: 'Show proof' },
      { id: 'sell', label: 'Promote & sell' },
      { id: 'announce', label: 'Announce something' },
    ],
  },
]

// Flat list for lookups
const ALL_GOALS = GOAL_GROUPS.flatMap(g => g.goals)

const STRUCTURE_PLATFORMS: Platform[] = ['reels', 'youtube', 'facebook-ad', 'carousel', 'static-image']

// Goals that DON'T make sense for certain platforms — hide them
const HIDDEN_GOALS_BY_PLATFORM: Partial<Record<Platform, string[]>> = {
  youtube: ['trend'],
  'facebook-ad': ['journey', 'debunk', 'process', 'trend'],
  carousel: ['journey', 'debunk', 'process', 'trend'],
  'static-image': ['journey', 'debunk', 'process', 'trend'],
  'facebook-post': ['trend'],
}

const LOADING_MESSAGES = [
  'Pulling from your knowledge base...',
  'Found some great angles',
  'Writing your script...',
  'Almost there...',
]

interface Variant {
  id: string
  number: number
  hook: string
  content: any
  qualityScore: number
  imageUrl?: string
}

function CreateWizard() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('mode')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  // Form state
  const [platform, setPlatform] = useState<Platform>('reels')
  const [goal, setGoal] = useState<ContentGoal>('educate')
  const [topic, setTopic] = useState('')
  const [selectedStructure, setSelectedStructure] = useState<any>(null)
  const [structures, setStructures] = useState<any[]>([])

  // Improve mode
  const [pastedScript, setPastedScript] = useState('')
  const [improvePlatform, setImprovePlatform] = useState<Platform>('reels')

  // Results
  const [results, setResults] = useState<Variant[]>([])
  const [improveResult, setImproveResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loadingPhase, setLoadingPhase] = useState(0)

  // Load structures
  useEffect(() => {
    fetch('/api/structures')
      .then(r => r.json())
      .then(data => setStructures(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Loading animation
  useEffect(() => {
    if (step !== 'loading' && step !== 'improve-loading') return
    setLoadingPhase(0)
    const interval = setInterval(() => {
      setLoadingPhase(p => (p + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [step])

  // Goal → purpose tag mapping
  const GOAL_TO_PURPOSE: Record<string, string> = {
    educate: 'educate',
    story: 'story',
    sell: 'sell',
    prove: 'prove',
    inspire: 'inspire',
    trend: 'trend',
    debunk: 'debunk',
    process: 'process',
    journey: 'journey',
    announce: 'announce',
  }

  const filteredStructures = structures.filter(s => {
    // Filter by platform content_type
    let platformMatch = false
    if (platform === 'reels') platformMatch = s.content_type === 'reel'
    else if (platform === 'youtube') platformMatch = s.content_type === 'youtube'
    else if (platform === 'facebook-ad' || platform === 'carousel' || platform === 'static-image') platformMatch = s.content_type === 'ad'
    else if (platform === 'facebook-post') platformMatch = s.content_type === 'story'
    if (!platformMatch) return false

    // Filter by goal (purpose array) — if goal has a mapping, show only matching structures
    const purposeTag = GOAL_TO_PURPOSE[goal]
    if (purposeTag && s.purpose?.length > 0) {
      return s.purpose.includes(purposeTag)
    }
    return true
  })

  const hasStructures = STRUCTURE_PLATFORMS.includes(platform) || filteredStructures.length > 0

  const goTo = (next: WizardStep, dir: 'forward' | 'back' = 'forward') => {
    setDirection(dir)
    setStep(next)
  }

  // === GENERATE ===
  const handleGenerate = async () => {
    goTo('loading')
    setError(null)

    try {
      const res = await fetch('/api/create/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          contentType: goal,
          topic: topic.trim() || undefined,
          variants: 3,
          structure_slug: selectedStructure?.slug || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      setResults(data.variants || [])
      goTo('results')
    } catch (err: any) {
      setError(err.message)
      goTo('topic', 'back')
    }
  }

  // === IMPROVE ===
  const handleImprove = async () => {
    if (!pastedScript.trim()) return
    goTo('improve-loading')
    setError(null)

    try {
      const res = await fetch('/api/create/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: pastedScript.trim(),
          platform: improvePlatform,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Improvement failed')
      }

      const data = await res.json()
      setImproveResult(data)
      goTo('improve-results')
    } catch (err: any) {
      setError(err.message)
      goTo('improve-input', 'back')
    }
  }

  // Block editor handlers
  async function handleRegenerateBlock(blockIndex: number, context: RegenerateContext) {
    const res = await fetch('/api/create/regenerate-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockIndex,
        block: context.block,
        allBlocks: context.allBlocks,
        topic,
        platform,
      }),
    })
    if (!res.ok) throw new Error('Failed to regenerate')
    return await res.json()
  }

  function handleScenesChange(variantId: string, newScenes: ScriptScene[]) {
    setResults(prev => prev.map(v =>
      v.id === variantId ? { ...v, content: { ...v.content, scenes: newScenes } } : v
    ))
  }

  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleSaveVariant(variant: Variant) {
    setSavingId(variant.id)
    try {
      const res = await fetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'script',
          title: variant.hook?.substring(0, 100) || topic || 'Untitled script',
          platform,
          hook: variant.hook,
          cta: variant.content?.scenes?.slice(-1)?.[0]?.script_text,
          contentType: goal,
          structureSlug: selectedStructure?.slug,
          scriptData: {
            scenes: variant.content?.scenes,
            qualityScore: variant.qualityScore,
          },
        }),
      })
      if (res.ok) {
        setSavedIds(prev => new Set([...prev, variant.id]))
      }
    } finally {
      setSavingId(null)
    }
  }

  function handleDownloadVariant(variant: Variant) {
    downloadScriptAsText(variant, `script-${goal}-${Date.now()}.txt`)
  }

  function formatVariantText(variant: Variant): string {
    let text = variant.hook + '\n\n'
    const c = variant.content
    if (c.scenes) {
      text += c.scenes.map((s: any, i: number) => {
        const label = s.block_label || `Scene ${s.sceneNumber || i + 1}`
        return `[${label}]\n${s.script_text || s.voiceover || ''}\nVisual: ${s.visual_direction || s.visual || ''}`
      }).join('\n\n')
    } else if (c.headline) {
      text += `${c.headline}\n\n${c.primaryText || c.body || ''}`
    } else if (c.caption) {
      text += c.caption
    }
    if (c.hashtags) text += '\n\n' + (Array.isArray(c.hashtags) ? c.hashtags.map((t: string) => '#' + t.replace('#', '')).join(' ') : c.hashtags)
    return text
  }

  const stepIndex = ['mode', 'platform', 'goal', 'structure', 'topic'].indexOf(step)
  const totalSteps = hasStructures ? 5 : 4
  const progressPct = stepIndex >= 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0

  return (
    <div className={styles.wizard}>
      {/* Progress bar */}
      {stepIndex >= 0 && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* === MODE SELECTION === */}
      {step === 'mode' && (
        <div className={`${styles.stepContainer} ${styles.fadeIn}`}>
          <h1 className={styles.stepTitle}>What would you like to do?</h1>
          <div className={styles.modeCards}>
            <button className={styles.modeCard} onClick={() => goTo('platform')}>
              <span className={styles.modeLabel}>Create new content</span>
              <span className={styles.modeDesc}>Generate a fresh script from scratch</span>
              <ArrowRight size={16} className={styles.modeArrow} />
            </button>
            <button className={styles.modeCard} onClick={() => goTo('improve-input')}>
              <span className={styles.modeLabel}>Improve existing script</span>
              <span className={styles.modeDesc}>Paste a script and make it better</span>
              <ArrowRight size={16} className={styles.modeArrow} />
            </button>
          </div>
        </div>
      )}

      {/* === PLATFORM === */}
      {step === 'platform' && (
        <div className={`${styles.stepContainer} ${direction === 'forward' ? styles.slideIn : styles.slideBack}`}>
          <button className={styles.backBtn} onClick={() => goTo('mode', 'back')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className={styles.stepTitle}>What are you creating?</h1>
          <div className={styles.optionGrid}>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                className={`${styles.optionCard} ${platform === p.id ? styles.optionSelected : ''}`}
                onClick={() => {
                  setPlatform(p.id)
                  setSelectedStructure(null)
                  // Skip structure step for non-video platforms
                  setTimeout(() => goTo('goal'), 150)
                }}
              >
                {p.label}
                {platform === p.id && <Check size={16} className={styles.checkIcon} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === GOAL === */}
      {step === 'goal' && (
        <div className={`${styles.stepContainer} ${direction === 'forward' ? styles.slideIn : styles.slideBack}`}>
          <button className={styles.backBtn} onClick={() => goTo('platform', 'back')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className={styles.stepTitle}>What&apos;s the goal?</h1>
          <div className={styles.goalGroups}>
            {GOAL_GROUPS.map(group => (
              <div key={group.funnel} className={styles.goalGroup}>
                <div className={styles.goalGroupLabel}>{group.label}</div>
                <div className={styles.goalGroupOptions}>
                  {group.goals
                    .filter(g => !(HIDDEN_GOALS_BY_PLATFORM[platform] || []).includes(g.id))
                    .map(g => {
                    // Check if this goal has structures for the current platform
                    const purposeTag = GOAL_TO_PURPOSE[g.id]
                    const goalHasStructures = STRUCTURE_PLATFORMS.includes(platform) && structures.some(s => {
                      let typeMatch = false
                      if (platform === 'reels') typeMatch = s.content_type === 'reel'
                      else if (platform === 'youtube') typeMatch = s.content_type === 'youtube'
                      else if (platform === 'facebook-ad' || platform === 'carousel' || platform === 'static-image') typeMatch = s.content_type === 'ad'
                      else if (platform === 'facebook-post') typeMatch = s.content_type === 'story'
                      if (!typeMatch) return false
                      return purposeTag && s.purpose?.includes(purposeTag)
                    })
                    return (
                    <button
                      key={g.id}
                      className={`${styles.optionCard} ${goal === g.id ? styles.optionSelected : ''}`}
                      onClick={() => {
                        setGoal(g.id)
                        setTimeout(() => goTo(goalHasStructures ? 'structure' : 'topic'), 150)
                      }}
                    >
                      {g.label}
                      {goal === g.id && <Check size={16} className={styles.checkIcon} />}
                    </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === STRUCTURE (video only) === */}
      {step === 'structure' && (
        <div className={`${styles.stepContainer} ${direction === 'forward' ? styles.slideIn : styles.slideBack}`}>
          <button className={styles.backBtn} onClick={() => goTo('goal', 'back')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className={styles.stepTitle}>Pick a structure</h1>
          <p className={styles.stepHint}>Proven frameworks that guide the AI</p>
          <div className={styles.structureList}>
            <button
              className={`${styles.structureCard} ${!selectedStructure ? styles.structureSelected : ''}`}
              onClick={() => { setSelectedStructure(null); setTimeout(() => goTo('topic'), 150) }}
            >
              <div className={styles.structureName}>Let AI decide</div>
              <div className={styles.structureDesc}>AI picks the best format for your topic</div>
            </button>
            {filteredStructures.map(s => (
              <button
                key={s.slug}
                className={`${styles.structureCard} ${selectedStructure?.slug === s.slug ? styles.structureSelected : ''}`}
                onClick={() => { setSelectedStructure(s); setTimeout(() => goTo('topic'), 200) }}
              >
                <div className={styles.structureName}>
                  {s.name}
                  {s.is_cutting_edge && <span className={styles.newBadge}>New</span>}
                </div>
                <div className={styles.structureDesc}>{s.description}</div>
                {s.blocks && (
                  <div className={styles.blockFlow}>
                    {s.blocks.map((b: any, i: number) => (
                      <span key={i} className={styles.blockTag}>
                        {b.label}{i < s.blocks.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === TOPIC === */}
      {step === 'topic' && (
        <div className={`${styles.stepContainer} ${direction === 'forward' ? styles.slideIn : styles.slideBack}`}>
          <button className={styles.backBtn} onClick={() => goTo(hasStructures ? 'structure' : 'goal', 'back')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className={styles.stepTitle}>What&apos;s it about?</h1>
          <p className={styles.stepHint}>Optional — leave blank and AI will pick a topic based on your goal</p>

          {/* Summary chips */}
          <div className={styles.summaryRow}>
            <span className={styles.summaryChip}>{PLATFORMS.find(p => p.id === platform)?.label}</span>
            <span className={styles.summaryChip}>{ALL_GOALS.find(g => g.id === goal)?.label}</span>
            {selectedStructure && <span className={styles.summaryChip}>{selectedStructure.name}</span>}
          </div>

          <textarea
            className={styles.topicTextarea}
            placeholder="e.g. How to make stickers using Canva, or a story about your first Shopee sale..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            autoFocus
            rows={3}
          />

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
          >
            {topic.trim() ? 'Generate Script' : 'Generate (AI picks topic)'}
          </button>
        </div>
      )}

      {/* === LOADING === */}
      {(step === 'loading' || step === 'improve-loading') && (
        <div className={`${styles.stepContainer} ${styles.fadeIn}`}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText} key={loadingPhase}>{LOADING_MESSAGES[loadingPhase]}</p>
          </div>
        </div>
      )}

      {/* === RESULTS === */}
      {step === 'results' && (
        <div className={`${styles.stepContainer} ${styles.fadeIn}`}>
          <button className={styles.backBtn} onClick={() => goTo('topic', 'back')}>
            <ArrowLeft size={16} /> Start over
          </button>
          <h1 className={styles.stepTitle}>Here are your scripts</h1>

          <div className={styles.variantList}>
            {results.map((variant, vi) => (
              <div key={variant.id} className={styles.variantCard} style={{ animationDelay: `${vi * 100}ms` }}>
                <div className={styles.variantHeader}>
                  <span className={styles.variantNumber}>Option {variant.number}</span>
                  {variant.qualityScore && (
                    <span className={styles.qualityBadge}>{variant.qualityScore}/10</span>
                  )}
                </div>
                <div className={styles.variantHook}>{variant.hook}</div>

                {/* Structure-aware scenes → BlockEditor */}
                {variant.content.scenes && variant.content.scenes[0]?.block_label ? (
                  <BlockEditor
                    scenes={variant.content.scenes.map((s: any, i: number) => ({
                      scene_number: i + 1,
                      duration_seconds: s.duration_seconds || 5,
                      script_text: s.script_text || s.voiceover || '',
                      visual_direction: s.visual_direction || s.visual || '',
                      block_id: s.block_id,
                      block_label: s.block_label,
                      timing: s.timing,
                      on_screen_text: s.on_screen_text,
                      production_notes: s.production_notes,
                    }))}
                    structureSlug={selectedStructure?.slug}
                    topic={topic}
                    platform={platform}
                    onChange={(newScenes) => handleScenesChange(variant.id, newScenes)}
                    onRegenerateBlock={handleRegenerateBlock}
                  />
                ) : variant.content.scenes ? (
                  /* Old-style scenes */
                  <div className={styles.sceneList}>
                    {variant.content.scenes.map((s: any, i: number) => (
                      <div key={i} className={styles.sceneRow}>
                        <span className={styles.sceneBadge}>Scene {s.sceneNumber || i + 1}</span>
                        <p className={styles.sceneText}>{s.voiceover}</p>
                        <p className={styles.sceneVisual}>{s.visual}</p>
                      </div>
                    ))}
                  </div>
                ) : variant.content.headline ? (
                  <div className={styles.adContent}>
                    <h3>{variant.content.headline}</h3>
                    <p>{variant.content.primaryText || variant.content.body}</p>
                  </div>
                ) : variant.content.caption ? (
                  <p className={styles.captionText}>{variant.content.caption}</p>
                ) : null}

                {/* Hashtags */}
                {variant.content.hashtags && (
                  <div className={styles.hashtags}>
                    {(Array.isArray(variant.content.hashtags) ? variant.content.hashtags : []).map((t: string) => (
                      <span key={t} className={styles.hashtag}>#{t.replace('#', '')}</span>
                    ))}
                  </div>
                )}

                <div className={styles.variantActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleCopy(formatVariantText(variant), variant.id)}
                  >
                    {copiedId === variant.id ? <Check size={16} /> : <Copy size={16} />}
                    {copiedId === variant.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleDownloadVariant(variant)}
                  >
                    <Download size={16} /> Download
                  </button>
                  <button
                    className={`${styles.iconBtn} ${savedIds.has(variant.id) ? styles.iconBtnSuccess : ''}`}
                    onClick={() => handleSaveVariant(variant)}
                    disabled={savingId === variant.id || savedIds.has(variant.id)}
                  >
                    {savedIds.has(variant.id) ? <Check size={16} /> : <Save size={16} />}
                    {savedIds.has(variant.id) ? 'Saved' : savingId === variant.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.bottomActions}>
            <button className={styles.secondaryBtn} onClick={handleGenerate}>
              <RotateCw size={16} /> Regenerate All
            </button>
          </div>
        </div>
      )}

      {/* === IMPROVE INPUT === */}
      {step === 'improve-input' && (
        <div className={`${styles.stepContainer} ${direction === 'forward' ? styles.slideIn : styles.slideBack}`}>
          <button className={styles.backBtn} onClick={() => goTo('mode', 'back')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className={styles.stepTitle}>Paste your script</h1>
          <p className={styles.stepHint}>We&apos;ll analyze it and suggest improvements based on what works best</p>

          <div className={styles.improveSection}>
            <label className={styles.fieldLabel}>Platform</label>
            <div className={styles.pillRow}>
              {PLATFORMS.filter(p => ['reels', 'youtube', 'facebook-post'].includes(p.id)).map(p => (
                <button
                  key={p.id}
                  className={`${styles.pill} ${improvePlatform === p.id ? styles.pillActive : ''}`}
                  onClick={() => setImprovePlatform(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className={styles.pasteTextarea}
            placeholder="Paste your existing script here..."
            value={pastedScript}
            onChange={e => setPastedScript(e.target.value)}
            autoFocus
            rows={8}
          />

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            className={styles.generateBtn}
            onClick={handleImprove}
            disabled={!pastedScript.trim()}
          >
            <Wand2 size={16} /> Improve Script
          </button>
        </div>
      )}

      {/* === IMPROVE RESULTS === */}
      {step === 'improve-results' && improveResult && (
        <div className={`${styles.stepContainer} ${styles.fadeIn}`}>
          <button className={styles.backBtn} onClick={() => goTo('improve-input', 'back')}>
            <ArrowLeft size={16} /> Try another
          </button>
          <h1 className={styles.stepTitle}>Improved Script</h1>

          {/* Analysis */}
          {improveResult.analysis && (
            <div className={styles.analysisCard}>
              <h3 className={styles.analysisTitle}>What we found</h3>
              {improveResult.analysis.strengths && (
                <div className={styles.analysisSection}>
                  <strong>Strengths</strong>
                  <ul>{improveResult.analysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {improveResult.analysis.improvements && (
                <div className={styles.analysisSection}>
                  <strong>Improvements made</strong>
                  <ul>{improveResult.analysis.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Improved script */}
          {improveResult.improved_script && (
            <div className={styles.improvedScript}>
              <pre className={styles.scriptPre}>{improveResult.improved_script}</pre>
              <button
                className={styles.iconBtn}
                onClick={() => handleCopy(improveResult.improved_script, 'improved')}
              >
                {copiedId === 'improved' ? <Check size={16} /> : <Copy size={16} />}
                {copiedId === 'improved' ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreateWizard />
    </Suspense>
  )
}
