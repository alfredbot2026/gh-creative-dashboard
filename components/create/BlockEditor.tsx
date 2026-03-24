'use client'

import { useState, useRef, useEffect } from 'react'
import { RotateCw, ChevronDown, ChevronUp, Pencil, Check, X, Eye, EyeOff, Undo2 } from 'lucide-react'
import type { ScriptScene } from '@/lib/create/types'
import styles from './BlockEditor.module.css'

interface BlockEditorProps {
  scenes: ScriptScene[]
  structureSlug?: string
  topic?: string
  platform?: string
  onChange: (scenes: ScriptScene[]) => void
  onRegenerateBlock: (blockIndex: number, context: RegenerateContext) => Promise<ScriptScene & { alternatives?: ScriptScene[] }>
}

export interface RegenerateContext {
  block: ScriptScene
  allBlocks: ScriptScene[]
  blockIndex: number
  topic?: string
  platform?: string
  structureSlug?: string
}

interface BlockHistory {
  [index: number]: ScriptScene[] // previous versions for each block
}

export default function BlockEditor({ scenes, structureSlug, topic, platform, onChange, onRegenerateBlock }: BlockEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<ScriptScene>>({})
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({})
  
  // Alternatives picker
  const [alternatives, setAlternatives] = useState<{ index: number; options: ScriptScene[] } | null>(null)
  
  // Version history
  const [history, setHistory] = useState<BlockHistory>({})
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editingIndex])

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditDraft({
      script_text: scenes[index].script_text,
      visual_direction: scenes[index].visual_direction,
      on_screen_text: scenes[index].on_screen_text || '',
    })
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    // Save current version to history before editing
    pushHistory(editingIndex, scenes[editingIndex])
    const updated = [...scenes]
    updated[editingIndex] = { ...updated[editingIndex], ...editDraft }
    onChange(updated)
    setEditingIndex(null)
    setEditDraft({})
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditDraft({})
  }

  const pushHistory = (index: number, scene: ScriptScene) => {
    setHistory(prev => ({
      ...prev,
      [index]: [...(prev[index] || []), scene],
    }))
  }

  const undoBlock = (index: number) => {
    const prev = history[index]
    if (!prev || prev.length === 0) return
    const lastVersion = prev[prev.length - 1]
    setHistory(h => ({
      ...h,
      [index]: prev.slice(0, -1),
    }))
    const updated = [...scenes]
    updated[index] = lastVersion
    onChange(updated)
  }

  const handleRegenerate = async (index: number) => {
    setRegeneratingIndex(index)
    setAlternatives(null)
    try {
      const result = await onRegenerateBlock(index, {
        block: scenes[index],
        allBlocks: scenes,
        blockIndex: index,
        topic,
        platform,
        structureSlug,
      })
      
      // If we got alternatives, show the picker
      if (result.alternatives && result.alternatives.length > 1) {
        setAlternatives({ index, options: result.alternatives })
      } else {
        // Single result — apply directly (save history first)
        pushHistory(index, scenes[index])
        const updated = [...scenes]
        updated[index] = { ...updated[index], ...result }
        onChange(updated)
      }
    } catch (err) {
      console.error('Regenerate failed:', err)
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const pickAlternative = (altIndex: number) => {
    if (!alternatives) return
    const { index, options } = alternatives
    // Save current to history
    pushHistory(index, scenes[index])
    const picked = options[altIndex]
    const updated = [...scenes]
    updated[index] = { ...updated[index], ...picked }
    onChange(updated)
    setAlternatives(null)
  }

  const dismissAlternatives = () => {
    setAlternatives(null)
  }

  return (
    <div className={styles.blockEditor}>
      {scenes.map((scene, i) => (
        <div key={i} className={`${styles.block} ${expandedIndex === i ? styles.blockExpanded : ''}`}>
          {/* Block header */}
          <div className={styles.blockHeader} onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}>
            <div className={styles.blockLabel}>
              {scene.block_label && <span className={styles.label}>{scene.block_label}</span>}
              {scene.timing && <span className={styles.timing}>{scene.timing}</span>}
            </div>
            <div className={styles.blockActions}>
              {history[i]?.length ? (
                <button
                  className={styles.iconBtn}
                  onClick={(e) => { e.stopPropagation(); undoBlock(i) }}
                  title="Undo last change"
                >
                  <Undo2 size={14} />
                </button>
              ) : null}
              <button
                className={styles.iconBtn}
                onClick={(e) => { e.stopPropagation(); startEdit(i) }}
                title="Edit text"
              >
                <Pencil size={14} />
              </button>
              <button
                className={`${styles.iconBtn} ${regeneratingIndex === i ? styles.spinning : ''}`}
                onClick={(e) => { e.stopPropagation(); handleRegenerate(i) }}
                disabled={regeneratingIndex !== null}
                title="Generate alternatives"
              >
                <RotateCw size={14} />
              </button>
              {expandedIndex === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {/* Script text — always visible */}
          {editingIndex === i ? (
            <div className={styles.editArea}>
              <label className={styles.editLabel}>Script</label>
              <textarea
                ref={textareaRef}
                className={styles.editTextarea}
                value={editDraft.script_text || ''}
                onChange={(e) => setEditDraft({ ...editDraft, script_text: e.target.value })}
              />
              <label className={styles.editLabel}>Visual Direction</label>
              <textarea
                className={styles.editTextarea}
                value={editDraft.visual_direction || ''}
                onChange={(e) => setEditDraft({ ...editDraft, visual_direction: e.target.value })}
                rows={2}
              />
              <label className={styles.editLabel}>On-Screen Text</label>
              <input
                className={styles.editInput}
                value={editDraft.on_screen_text || ''}
                onChange={(e) => setEditDraft({ ...editDraft, on_screen_text: e.target.value })}
                placeholder="Text overlay (optional)"
              />
              <div className={styles.editButtons}>
                <button className={styles.saveBtn} onClick={saveEdit}><Check size={14} /> Save</button>
                <button className={styles.cancelBtn} onClick={cancelEdit}><X size={14} /> Cancel</button>
              </div>
            </div>
          ) : (
            <p className={styles.scriptText}>{scene.script_text}</p>
          )}

          {/* Alternatives picker */}
          {alternatives?.index === i && (
            <div className={styles.alternativesPanel}>
              <div className={styles.altHeader}>
                <span className={styles.altTitle}>Pick a version</span>
                <button className={styles.altDismiss} onClick={dismissAlternatives}>
                  <X size={14} /> Keep current
                </button>
              </div>
              <div className={styles.altGrid}>
                {alternatives.options.map((alt, ai) => (
                  <button
                    key={ai}
                    className={styles.altCard}
                    onClick={() => pickAlternative(ai)}
                  >
                    <span className={styles.altNumber}>Version {ai + 1}</span>
                    <p className={styles.altScript}>{alt.script_text}</p>
                    {alt.visual_direction && (
                      <p className={styles.altVisual}>{alt.visual_direction}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expanded details */}
          {expandedIndex === i && editingIndex !== i && (
            <div className={styles.blockDetails}>
              {scene.visual_direction && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Visual</span>
                  <p>{scene.visual_direction}</p>
                </div>
              )}
              {scene.on_screen_text && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>On-Screen</span>
                  <p>{scene.on_screen_text}</p>
                </div>
              )}
              {scene.production_notes && (
                <div className={styles.detailRow}>
                  <button
                    className={styles.notesToggle}
                    onClick={(e) => { e.stopPropagation(); setShowNotes(n => ({ ...n, [i]: !n[i] })) }}
                  >
                    {showNotes[i] ? <EyeOff size={12} /> : <Eye size={12} />}
                    Production Notes
                  </button>
                  {showNotes[i] && <p className={styles.notesText}>{scene.production_notes}</p>}
                </div>
              )}
              {/* History indicator */}
              {history[i]?.length ? (
                <div className={styles.historyHint}>
                  {history[i].length} previous version{history[i].length > 1 ? 's' : ''} saved
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
