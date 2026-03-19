'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ContentPurpose } from '@/lib/create/types'
import styles from './PurposePicker.module.css'

interface KBTechnique {
  id: string
  title: string
  content: string
  effectiveness_score: number
  category: string
}

interface TechniquesResponse {
  purpose: string
  lane: string
  hooks: KBTechnique[]
  frameworks: KBTechnique[]
}

interface PurposePickerProps {
  lane: 'short-form' | 'ads'
  onSelect: (purpose: ContentPurpose | null, hookId: string | null, frameworkId: string | null) => void
}

const PURPOSES: { id: ContentPurpose; label: string; emoji: string; desc: string }[] = [
  { id: 'educate', emoji: '📚', label: 'Educate', desc: 'Teach something valuable' },
  { id: 'story',   emoji: '📖', label: 'Story',   desc: 'Share a journey or experience' },
  { id: 'sell',    emoji: '🎯', label: 'Sell',    desc: 'Convert viewers to buyers' },
  { id: 'prove',   emoji: '🤝', label: 'Prove',   desc: 'Show results & social proof' },
  { id: 'trend',   emoji: '🔥', label: 'Trend',   desc: 'Ride a trending topic' },
  { id: 'inspire', emoji: '💡', label: 'Inspire', desc: 'Motivate & energize' },
]

function scoreToStars(score: number): string {
  if (score >= 0.85) return '⭐⭐⭐'
  if (score >= 0.65) return '⭐⭐'
  return '⭐'
}

export default function PurposePicker({ lane, onSelect }: PurposePickerProps) {
  const [activePurpose, setActivePurpose] = useState<ContentPurpose | null>(null)
  const [techniques, setTechniques] = useState<TechniquesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedHookId, setSelectedHookId] = useState<string | null>(null)
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null)

  const fetchTechniques = useCallback(async (purpose: ContentPurpose) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge/techniques?purpose=${purpose}&lane=${lane}`)
      if (res.ok) {
        const data = await res.json()
        setTechniques(data)
      }
    } catch (err) {
      console.error('Failed to fetch techniques:', err)
    } finally {
      setLoading(false)
    }
  }, [lane])

  const handlePurposeClick = (purpose: ContentPurpose) => {
    if (activePurpose === purpose) {
      // Deselect
      setActivePurpose(null)
      setTechniques(null)
      setSelectedHookId(null)
      setSelectedFrameworkId(null)
      onSelect(null, null, null)
    } else {
      setActivePurpose(purpose)
      setSelectedHookId(null)
      setSelectedFrameworkId(null)
      onSelect(purpose, null, null)
      fetchTechniques(purpose)
    }
  }

  const handleHookClick = (id: string) => {
    const newId = selectedHookId === id ? null : id
    setSelectedHookId(newId)
    onSelect(activePurpose!, newId, selectedFrameworkId)
  }

  const handleFrameworkClick = (id: string) => {
    const newId = selectedFrameworkId === id ? null : id
    setSelectedFrameworkId(newId)
    onSelect(activePurpose!, selectedHookId, newId)
  }

  return (
    <div className={styles.container}>
      <div className={styles.purposeRow}>
        {PURPOSES.map(p => (
          <button
            key={p.id}
            className={`${styles.purposePill} ${activePurpose === p.id ? styles.purposePillActive : ''}`}
            onClick={() => handlePurposeClick(p.id)}
            title={p.desc}
            type="button"
          >
            <span className={styles.emoji}>{p.emoji}</span>
            <span className={styles.pillLabel}>{p.label}</span>
          </button>
        ))}
      </div>

      {activePurpose && (
        <div className={styles.techniquesPanel}>
          {loading ? (
            <div className={styles.loadingText}>Loading techniques...</div>
          ) : techniques && (techniques.hooks.length > 0 || techniques.frameworks.length > 0) ? (
            <>
              {techniques.hooks.length > 0 && (
                <div className={styles.techniqueGroup}>
                  <div className={styles.techniqueGroupLabel}>Hooks</div>
                  <div className={styles.chipRow}>
                    {techniques.hooks.map(h => (
                      <button
                        key={h.id}
                        type="button"
                        className={`${styles.chip} ${selectedHookId === h.id ? styles.chipActive : ''}`}
                        onClick={() => handleHookClick(h.id)}
                        title={h.content.slice(0, 120)}
                      >
                        <span className={styles.chipLabel}>{h.title}</span>
                        <span className={styles.chipScore}>{scoreToStars(h.effectiveness_score)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {techniques.frameworks.length > 0 && (
                <div className={styles.techniqueGroup}>
                  <div className={styles.techniqueGroupLabel}>Frameworks</div>
                  <div className={styles.chipRow}>
                    {techniques.frameworks.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        className={`${styles.chip} ${selectedFrameworkId === f.id ? styles.chipActive : ''}`}
                        onClick={() => handleFrameworkClick(f.id)}
                        title={f.content.slice(0, 120)}
                      >
                        <span className={styles.chipLabel}>{f.title}</span>
                        <span className={styles.chipScore}>{scoreToStars(f.effectiveness_score)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(selectedHookId || selectedFrameworkId) && (
                <div className={styles.selectionNote}>
                  ✓ {[selectedHookId && 'Hook', selectedFrameworkId && 'Framework'].filter(Boolean).join(' + ')} locked in — AI will follow this technique
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyTechniques}>No techniques found for this purpose yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
