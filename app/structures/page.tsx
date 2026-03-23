/**
 * Structure Library — Browse proven content structures
 * Filter by type (Reels/YouTube/Ads/Stories), purpose, difficulty
 * Each card shows timing, source creator, and cutting-edge badge
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

type ContentType = 'all' | 'reel' | 'youtube' | 'ad' | 'story'
type ViewMode = 'structures' | 'techniques'

interface Structure {
  id: string
  name: string
  slug: string
  description: string
  source_creator: string
  content_type: string
  purpose: string[]
  difficulty: string
  blocks: any[]
  ideal_length_min: number | null
  ideal_length_max: number | null
  is_cutting_edge: boolean
  times_used: number
  avg_score: number | null
  avg_engagement: number | null
}

interface Technique {
  id: string
  name: string
  slug: string
  category: string
  description: string
  source_creator: string
  steps: { step: number; text: string }[]
  examples: { text: string; context?: string }[]
  timing_rules: Record<string, string>
  is_cutting_edge: boolean
}

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'reel', label: 'Reels' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'ad', label: 'Ads' },
  { key: 'story', label: 'Stories' },
]

const TECHNIQUE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'hook', label: 'Hooks' },
  { key: 'retention', label: 'Retention' },
  { key: 'algorithm', label: 'Algorithm' },
  { key: 'production', label: 'Production' },
  { key: 'strategy', label: 'Strategy' },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#2d8a4e',
  intermediate: '#c17a2f',
  advanced: '#ba1a1a',
}

function formatDuration(min: number | null, max: number | null): string {
  if (!min && !max) return ''
  if (min && min >= 60) {
    const minM = Math.round(min / 60)
    const maxM = max ? Math.round(max / 60) : minM
    return `${minM}-${maxM} min`
  }
  return `${min || '?'}-${max || '?'}s`
}

export default function StructuresPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('structures')
  const [contentType, setContentType] = useState<ContentType>('all')
  const [techniqueCategory, setTechniqueCategory] = useState('all')
  const [structures, setStructures] = useState<Structure[]>([])
  const [techniques, setTechniques] = useState<Technique[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchStructures = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (contentType !== 'all') params.set('type', contentType)
    if (search) params.set('search', search)
    
    const res = await fetch(`/api/structures?${params}`)
    const data = await res.json()
    setStructures(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [contentType, search])

  const fetchTechniques = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (techniqueCategory !== 'all') params.set('category', techniqueCategory)
    
    const res = await fetch(`/api/techniques?${params}`)
    const data = await res.json()
    setTechniques(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [techniqueCategory])

  useEffect(() => {
    if (viewMode === 'structures') fetchStructures()
    else fetchTechniques()
  }, [viewMode, fetchStructures, fetchTechniques])

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Content Structures</h1>
          <span className={styles.totalCount}>
            {viewMode === 'structures' ? structures.length : techniques.length}
          </span>
        </div>
        <p className={styles.subtitle}>
          Proven frameworks for creating content that performs. Pick a structure, enter your topic, get a script.
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${viewMode === 'structures' ? styles.modeBtnActive : ''}`}
          onClick={() => setViewMode('structures')}
        >
          Structures
        </button>
        <button
          className={`${styles.modeBtn} ${viewMode === 'techniques' ? styles.modeBtnActive : ''}`}
          onClick={() => setViewMode('techniques')}
        >
          Techniques
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(viewMode === 'structures' ? TYPE_TABS : TECHNIQUE_TABS).map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${
              (viewMode === 'structures' ? contentType : techniqueCategory) === tab.key
                ? styles.tabActive
                : ''
            }`}
            onClick={() => {
              if (viewMode === 'structures') setContentType(tab.key as ContentType)
              else setTechniqueCategory(tab.key)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search (structures only) */}
      {viewMode === 'structures' && (
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search structures..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : viewMode === 'structures' ? (
        <div className={styles.grid}>
          {structures.map(s => (
            <Link href={`/structures/${s.slug}`} key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  {s.name}
                  {s.is_cutting_edge && <span className={styles.cuttingEdge}>New</span>}
                </h3>
                <span
                  className={styles.difficultyBadge}
                  style={{ color: DIFFICULTY_COLORS[s.difficulty] || '#807478' }}
                >
                  {s.difficulty}
                </span>
              </div>
              
              <p className={styles.cardDesc}>{s.description}</p>
              
              {/* Block timeline preview */}
              <div className={styles.timeline}>
                {s.blocks.slice(0, 5).map((block: any, i: number) => (
                  <div key={i} className={styles.timelineBlock}>
                    <span className={styles.blockLabel}>{block.label}</span>
                    <span className={styles.blockTiming}>{block.timing}</span>
                  </div>
                ))}
                {s.blocks.length > 5 && (
                  <div className={styles.timelineMore}>+{s.blocks.length - 5} more</div>
                )}
              </div>
              
              <div className={styles.cardFooter}>
                <span className={styles.cardMeta}>
                  {formatDuration(s.ideal_length_min, s.ideal_length_max)}
                </span>
                <span className={styles.cardMeta}>
                  {s.purpose.join(', ')}
                </span>
                <span className={styles.cardSource}>{s.source_creator}</span>
              </div>

              {s.avg_score && (
                <div className={styles.perfBadge}>
                  Avg {s.avg_score.toFixed(1)}/10
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.techniqueList}>
          {techniques.map(t => (
            <div key={t.id} className={styles.techniqueCard}>
              <div className={styles.techniqueHeader}>
                <h3 className={styles.techniqueTitle}>
                  {t.name}
                  {t.is_cutting_edge && <span className={styles.cuttingEdge}>New</span>}
                </h3>
                <span className={styles.categoryBadge}>{t.category}</span>
              </div>
              
              <p className={styles.techniqueDesc}>{t.description}</p>
              
              {t.steps.length > 0 && (
                <div className={styles.steps}>
                  {t.steps.map((step, i) => (
                    <div key={i} className={styles.step}>
                      <span className={styles.stepNum}>{step.step}</span>
                      <span className={styles.stepText}>{step.text}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {t.examples.length > 0 && (
                <div className={styles.examples}>
                  {t.examples.map((ex, i) => (
                    <div key={i} className={styles.example}>
                      <span className={styles.exampleText}>"{ex.text}"</span>
                      {ex.context && <span className={styles.exampleContext}>— {ex.context}</span>}
                    </div>
                  ))}
                </div>
              )}
              
              {Object.keys(t.timing_rules).length > 0 && (
                <div className={styles.timingRules}>
                  {Object.entries(t.timing_rules).map(([k, v]) => (
                    <span key={k} className={styles.timingRule}>
                      ⏱ {k}: {v}
                    </span>
                  ))}
                </div>
              )}
              
              <div className={styles.techniqueFooter}>
                <span className={styles.cardSource}>{t.source_creator}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
