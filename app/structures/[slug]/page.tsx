/**
 * Structure Detail — Full view of a content structure with timed blocks
 * Shows: description, block timeline with timing/instructions/rules, examples, when to use
 */
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface Block {
  id: string
  label: string
  timing: string
  duration_hint: string
  instruction: string
  example?: string
  rules?: string[]
}

interface Structure {
  id: string
  name: string
  slug: string
  description: string
  source_creator: string
  content_type: string
  purpose: string[]
  difficulty: string
  blocks: Block[]
  ideal_length_min: number | null
  ideal_length_max: number | null
  is_cutting_edge: boolean
  times_used: number
  avg_score: number | null
  avg_engagement: number | null
}

const TYPE_LABELS: Record<string, string> = {
  reel: 'Reel',
  youtube: 'YouTube',
  ad: 'Ad',
  story: 'Story',
}

const PURPOSE_LABELS: Record<string, string> = {
  educate: 'Educate',
  sell: 'Sell',
  inspire: 'Inspire',
  story: 'Story',
  prove: 'Prove',
  trend: 'Trend',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#2d8a4e',
  intermediate: '#c17a2f',
  advanced: '#ba1a1a',
}

function formatDuration(min: number | null, max: number | null): string {
  if (!min && !max) return 'Flexible'
  if (min && min >= 60) {
    const minM = Math.round(min / 60)
    const maxM = max ? Math.round(max / 60) : minM
    return `${minM}-${maxM} minutes`
  }
  return `${min || '?'}-${max || '?'} seconds`
}

export default function StructureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [structure, setStructure] = useState<Structure | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/structures/${params.slug}`)
      if (!res.ok) {
        router.push('/structures')
        return
      }
      const data = await res.json()
      setStructure(data.structure)
      setLoading(false)
    }
    load()
  }, [params.slug, router])

  if (loading || !structure) {
    return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.page}>
      {/* Back link */}
      <Link href="/structures" className={styles.back}>← All Structures</Link>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>
            {structure.name}
          </h1>
        </div>
        <p className={styles.description}>{structure.description}</p>
        
        {/* Meta badges */}
        <div className={styles.badges}>
          <span className={styles.badge}>{TYPE_LABELS[structure.content_type] || structure.content_type}</span>
          <span className={styles.badge} style={{ color: DIFFICULTY_COLORS[structure.difficulty] }}>
            {structure.difficulty}
          </span>
          <span className={styles.badge}>⏱ {formatDuration(structure.ideal_length_min, structure.ideal_length_max)}</span>
          {structure.purpose.map(p => (
            <span key={p} className={styles.badge}>{PURPOSE_LABELS[p] || p}</span>
          ))}
          <span className={styles.badgeSource}>Source: {structure.source_creator}</span>
        </div>

        {/* Performance stats if available */}
        {(structure.avg_score || structure.times_used > 0) && (
          <div className={styles.perfBar}>
            {structure.avg_score && (
              <div className={styles.perfStat}>
                <span className={styles.perfValue}>{structure.avg_score.toFixed(1)}/10</span>
                <span className={styles.perfLabel}>Avg Score</span>
              </div>
            )}
            {structure.times_used > 0 && (
              <div className={styles.perfStat}>
                <span className={styles.perfValue}>{structure.times_used}</span>
                <span className={styles.perfLabel}>Times Used</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block Timeline */}
      <div className={styles.timelineSection}>
        <h2 className={styles.sectionTitle}>Script Structure</h2>
        <p className={styles.sectionSub}>Tap a block to see details, instructions, and rules.</p>
        
        <div className={styles.timeline}>
          {structure.blocks.map((block, i) => {
            const isExpanded = expandedBlock === block.id
            return (
              <div key={block.id} className={styles.blockWrapper}>
                {/* Connector line */}
                {i > 0 && <div className={styles.connector} />}
                
                <button
                  className={`${styles.block} ${isExpanded ? styles.blockExpanded : ''}`}
                  onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                >
                  <div className={styles.blockHeader}>
                    <div className={styles.blockLeft}>
                      <span className={styles.blockNumber}>{i + 1}</span>
                      <div>
                        <span className={styles.blockLabel}>{block.label}</span>
                        <span className={styles.blockTiming}>{block.timing} · {block.duration_hint}</span>
                      </div>
                    </div>
                    <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                  </div>
                  
                  {isExpanded && (
                    <div className={styles.blockBody}>
                      <div className={styles.instruction}>
                        <strong>What to do:</strong> {block.instruction}
                      </div>
                      
                      {block.example && (
                        <div className={styles.blockExample}>
                          <strong>Example:</strong> <em>{block.example}</em>
                        </div>
                      )}
                      
                      {block.rules && block.rules.length > 0 && (
                        <div className={styles.rules}>
                          <strong>Rules:</strong>
                          <ul>
                            {block.rules.map((rule, ri) => (
                              <li key={ri}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Use This Structure CTA */}
      <div className={styles.ctaSection}>
        <Link href={`/create?structure=${structure.slug}`} className={styles.ctaButton}>
          Use This Structure →
        </Link>
      </div>
    </div>
  )
}
