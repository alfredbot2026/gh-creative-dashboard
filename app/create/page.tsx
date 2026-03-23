'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RotateCw, CalendarPlus, ArrowLeft } from 'lucide-react'
import BlockEditor from '@/components/create/BlockEditor'
import type { RegenerateContext } from '@/components/create/BlockEditor'
import type { ScriptScene } from '@/lib/create/types'
import styles from './create.module.css'

type Platform = 'instagram-reels' | 'youtube-shorts' | 'youtube' | 'facebook-post' | 'facebook-ad'
type ContentGoal = 'educate' | 'story' | 'sell' | 'inspire' | 'prove' | 'trend'

interface Structure {
  slug: string
  name: string
  description: string
  content_type: string
  difficulty: string
  is_cutting_edge: boolean
  blocks: any[]
  ideal_length_min: number
  ideal_length_max: number
}

interface GeneratedScript {
  title: string
  scenes: ScriptScene[]
  total_duration_seconds: number
  structure_used?: string
  caption_draft?: string
  hashtags?: string[]
}

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram-reels', label: 'Reel' },
  { id: 'youtube-shorts', label: 'YouTube Short' },
  { id: 'youtube', label: 'YouTube Video' },
  { id: 'facebook-post', label: 'Facebook Post' },
  { id: 'facebook-ad', label: 'Facebook Ad' },
]

const GOALS: { id: ContentGoal; label: string }[] = [
  { id: 'educate', label: 'Teach something' },
  { id: 'story', label: 'Tell a story' },
  { id: 'sell', label: 'Promote & sell' },
  { id: 'inspire', label: 'Inspire' },
  { id: 'prove', label: 'Show proof' },
  { id: 'trend', label: 'Ride a trend' },
]

function CreatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Form state
  const [platform, setPlatform] = useState<Platform>('instagram-reels')
  const [goal, setGoal] = useState<ContentGoal | ''>('')
  const [topic, setTopic] = useState('')
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null)
  const [structures, setStructures] = useState<Structure[]>([])
  const [showStructurePicker, setShowStructurePicker] = useState(false)
  
  // Generation state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedScript | null>(null)
  const [saving, setSaving] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')

  // Load structures
  useEffect(() => {
    fetch('/api/structures')
      .then(r => r.json())
      .then(data => setStructures(Array.isArray(data) ? data : data.structures || []))
      .catch(() => {})
  }, [])

  // Pre-fill from URL params
  useEffect(() => {
    const t = searchParams.get('topic')
    const s = searchParams.get('structure')
    if (t) setTopic(t)
    if (s && structures.length > 0) {
      const found = structures.find(st => st.slug === s)
      if (found) setSelectedStructure(found)
    }
  }, [searchParams, structures])

  // Filter structures by platform type
  const platformStructures = structures.filter(s => {
    if (platform === 'instagram-reels' || platform === 'youtube-shorts') return s.content_type === 'reel'
    if (platform === 'youtube') return s.content_type === 'youtube'
    if (platform === 'facebook-ad') return s.content_type === 'ad'
    return true
  })

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/create/short-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          platform,
          structure_slug: selectedStructure?.slug,
          content_purpose: goal || undefined,
          target_duration: selectedStructure ? selectedStructure.ideal_length_max : 30,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      // Map the response to our expected format
      const script: GeneratedScript = data.script || data
      if (script.scenes) {
        // Ensure scene numbers
        script.scenes = script.scenes.map((s: any, i: number) => ({
          scene_number: i + 1,
          duration_seconds: s.duration_seconds || parseInt(s.timing?.split('-')?.[1]) || 5,
          script_text: s.script_text || s.voiceover || '',
          visual_direction: s.visual_direction || s.visual || '',
          block_id: s.block_id,
          block_label: s.block_label,
          timing: s.timing,
          on_screen_text: s.on_screen_text,
          production_notes: s.production_notes,
          hook_type: s.hook_type,
          b_roll_suggestion: s.b_roll_suggestion,
        }))
      }
      setResult(script)
    } catch (err: any) {
      alert(err.message || 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBlock = async (blockIndex: number, context: RegenerateContext) => {
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
    if (!res.ok) throw new Error('Failed to regenerate block')
    return await res.json()
  }

  const handleScenesChange = (newScenes: ScriptScene[]) => {
    if (!result) return
    setResult({ ...result, scenes: newScenes })
  }

  const handleCopyAll = () => {
    if (!result) return
    const text = result.scenes.map(s => {
      const label = s.block_label ? `[${s.block_label}]` : `Scene ${s.scene_number}`
      const timing = s.timing ? ` (${s.timing})` : ''
      return `${label}${timing}\n${s.script_text}\nVisual: ${s.visual_direction}`
    }).join('\n\n')
    const full = `${result.title}\n\n${text}${result.caption_draft ? `\n\nCaption: ${result.caption_draft}` : ''}`
    navigator.clipboard.writeText(full)
  }

  return (
    <div className={styles.createPage}>
      {!result ? (
        /* === FORM STATE === */
        <div className={styles.formContainer}>
          <h1 className={styles.heading}>Create</h1>

          {/* Platform pills */}
          <div className={styles.section}>
            <label className={styles.label}>Platform</label>
            <div className={styles.pills}>
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  className={`${styles.pill} ${platform === p.id ? styles.pillActive : ''}`}
                  onClick={() => { setPlatform(p.id); setSelectedStructure(null) }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Structure picker */}
          <div className={styles.section}>
            <label className={styles.label}>
              Structure
              <span className={styles.labelHint}>recommended</span>
            </label>
            {selectedStructure ? (
              <div className={styles.selectedStructure}>
                <div>
                  <strong>{selectedStructure.name}</strong>
                  <p className={styles.structureDesc}>{selectedStructure.description}</p>
                  <div className={styles.blockFlow}>
                    {selectedStructure.blocks.map((b: any, i: number) => (
                      <span key={i} className={styles.blockTag}>
                        {b.label}
                        {i < selectedStructure.blocks.length - 1 && <span className={styles.arrow}>→</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <button className={styles.changeBtn} onClick={() => setShowStructurePicker(true)}>
                  Change
                </button>
              </div>
            ) : (
              <button
                className={styles.pickStructureBtn}
                onClick={() => setShowStructurePicker(true)}
              >
                Pick a proven structure
              </button>
            )}

            {/* Structure picker dropdown */}
            {showStructurePicker && (
              <div className={styles.structureList}>
                <button
                  className={styles.structureOption}
                  onClick={() => { setSelectedStructure(null); setShowStructurePicker(false) }}
                >
                  <strong>No structure</strong>
                  <span className={styles.optionDesc}>AI picks the best format</span>
                </button>
                {platformStructures.map(s => (
                  <button
                    key={s.slug}
                    className={`${styles.structureOption} ${selectedStructure?.slug === s.slug ? styles.optionActive : ''}`}
                    onClick={() => { setSelectedStructure(s); setShowStructurePicker(false) }}
                  >
                    <strong>
                      {s.name}
                      {s.is_cutting_edge && <span className={styles.newBadge}>New</span>}
                    </strong>
                    <span className={styles.optionDesc}>{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Goal pills */}
          <div className={styles.section}>
            <label className={styles.label}>
              Goal
              <span className={styles.labelHint}>optional</span>
            </label>
            <div className={styles.pills}>
              {GOALS.map(g => (
                <button
                  key={g.id}
                  className={`${styles.pill} ${goal === g.id ? styles.pillActive : ''}`}
                  onClick={() => setGoal(goal === g.id ? '' : g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic input */}
          <div className={styles.section}>
            <label className={styles.label}>Topic</label>
            <input
              className={styles.topicInput}
              placeholder="What's this about?"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
          </div>

          {/* Generate button */}
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={!topic.trim() || loading}
          >
            {loading ? 'Generating...' : 'Generate Script'}
          </button>
        </div>
      ) : (
        /* === RESULT STATE === */
        <div className={styles.resultContainer}>
          <div className={styles.resultHeader}>
            <button className={styles.backBtn} onClick={() => setResult(null)}>
              <ArrowLeft size={16} /> Back
            </button>
            <h1 className={styles.resultTitle}>{result.title}</h1>
            {result.structure_used && (
              <span className={styles.structureBadge}>{result.structure_used}</span>
            )}
          </div>

          <BlockEditor
            scenes={result.scenes}
            structureSlug={selectedStructure?.slug}
            topic={topic}
            platform={platform}
            onChange={handleScenesChange}
            onRegenerateBlock={handleRegenerateBlock}
          />

          {/* Caption */}
          {result.caption_draft && (
            <div className={styles.captionSection}>
              <label className={styles.label}>Caption</label>
              <p className={styles.captionText}>{result.caption_draft}</p>
              {result.hashtags && result.hashtags.length > 0 && (
                <div className={styles.hashtagRow}>
                  {result.hashtags.map(t => (
                    <span key={t} className={styles.hashtag}>#{t.replace('#', '')}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actionBar}>
            <button className={styles.actionBtn} onClick={handleGenerate} disabled={loading}>
              <RotateCw size={16} />
              Regenerate All
            </button>
            <button className={styles.actionBtn} onClick={handleCopyAll}>
              Copy Script
            </button>
            <div className={styles.scheduleGroup}>
              <input
                type="date"
                className={styles.dateInput}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
              <button className={styles.actionBtnPrimary} disabled={saving}>
                <CalendarPlus size={16} />
                {saving ? 'Saving...' : 'Save to Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageContent />
    </Suspense>
  )
}
