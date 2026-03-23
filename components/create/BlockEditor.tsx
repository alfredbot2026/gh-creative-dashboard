'use client'

import { useState, useRef, useEffect } from 'react'
import { RotateCw, ChevronDown, ChevronUp, Pencil, Check, X, Eye, EyeOff } from 'lucide-react'
import type { ScriptScene } from '@/lib/create/types'
import styles from './BlockEditor.module.css'

interface BlockEditorProps {
  scenes: ScriptScene[]
  structureSlug?: string
  topic?: string
  platform?: string
  onChange: (scenes: ScriptScene[]) => void
  onRegenerateBlock: (blockIndex: number, context: RegenerateContext) => Promise<ScriptScene>
}

export interface RegenerateContext {
  block: ScriptScene
  allBlocks: ScriptScene[]
  blockIndex: number
  topic?: string
  platform?: string
  structureSlug?: string
}

export default function BlockEditor({ scenes, structureSlug, topic, platform, onChange, onRegenerateBlock }: BlockEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<ScriptScene>>({})
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({})
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

  const handleRegenerate = async (index: number) => {
    setRegeneratingIndex(index)
    try {
      const newScene = await onRegenerateBlock(index, {
        block: scenes[index],
        allBlocks: scenes,
        blockIndex: index,
        topic,
        platform,
        structureSlug,
      })
      const updated = [...scenes]
      updated[index] = { ...updated[index], ...newScene }
      onChange(updated)
    } catch (err) {
      console.error('Regenerate failed:', err)
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const toggleNotes = (index: number) => {
    setShowNotes(prev => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className={styles.editor}>
      {scenes.map((scene, index) => {
        const isEditing = editingIndex === index
        const isRegenerating = regeneratingIndex === index
        const isExpanded = expandedIndex === index
        const hasNotes = scene.production_notes || scene.on_screen_text

        return (
          <div key={index} className={`${styles.block} ${isEditing ? styles.blockEditing : ''}`}>
            {/* Block header */}
            <div className={styles.blockHeader} onClick={() => setExpandedIndex(isExpanded ? null : index)}>
              <div className={styles.blockLabel}>
                <span className={styles.blockNumber}>{index + 1}</span>
                {scene.block_label && (
                  <span className={styles.blockName}>{scene.block_label}</span>
                )}
                {!scene.block_label && (
                  <span className={styles.blockName}>Scene {scene.scene_number || index + 1}</span>
                )}
                {scene.timing && (
                  <span className={styles.timing}>{scene.timing}</span>
                )}
              </div>
              <div className={styles.blockActions}>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Script text — always visible */}
            <div className={styles.scriptContent}>
              {isEditing ? (
                <div className={styles.editForm}>
                  <label className={styles.editLabel}>Script</label>
                  <textarea
                    ref={textareaRef}
                    className={styles.editTextarea}
                    value={editDraft.script_text || ''}
                    onChange={(e) => {
                      setEditDraft(prev => ({ ...prev, script_text: e.target.value }))
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                  />
                  <label className={styles.editLabel}>Visual Direction</label>
                  <textarea
                    className={styles.editTextarea}
                    value={editDraft.visual_direction || ''}
                    onChange={(e) => setEditDraft(prev => ({ ...prev, visual_direction: e.target.value }))}
                  />
                  {scene.on_screen_text !== undefined && (
                    <>
                      <label className={styles.editLabel}>On-Screen Text</label>
                      <input
                        className={styles.editInput}
                        value={editDraft.on_screen_text || ''}
                        onChange={(e) => setEditDraft(prev => ({ ...prev, on_screen_text: e.target.value }))}
                      />
                    </>
                  )}
                  <div className={styles.editActions}>
                    <button className={styles.saveBtn} onClick={saveEdit}>
                      <Check size={14} /> Save
                    </button>
                    <button className={styles.cancelBtn} onClick={cancelEdit}>
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={styles.scriptText}>{scene.script_text}</p>
                  {scene.visual_direction && (
                    <p className={styles.visualDir}>{scene.visual_direction}</p>
                  )}
                </>
              )}
            </div>

            {/* Expanded: notes + actions */}
            {(isExpanded || isEditing) && !isEditing && (
              <div className={styles.expandedContent}>
                {scene.on_screen_text && (
                  <div className={styles.onScreenText}>
                    <strong>On-screen:</strong> {scene.on_screen_text}
                  </div>
                )}
                {scene.production_notes && (
                  <div className={styles.prodNotes}>
                    <strong>Notes:</strong> {scene.production_notes}
                  </div>
                )}
                <div className={styles.actionRow}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => { e.stopPropagation(); startEdit(index) }}
                    disabled={isRegenerating}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className={`${styles.regenBtn} ${isRegenerating ? styles.regenBtnLoading : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleRegenerate(index) }}
                    disabled={isRegenerating || isEditing}
                  >
                    <RotateCw size={14} className={isRegenerating ? styles.spinning : ''} />
                    {isRegenerating ? 'Rewriting...' : 'Rewrite'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
