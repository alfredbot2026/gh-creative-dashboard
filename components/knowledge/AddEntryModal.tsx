/**
 * Add Knowledge Entry Modal
 * Form for manual entry creation.
 */
'use client'

import { useState } from 'react'
import { X, Loader2, Plus, Info } from 'lucide-react'
import { 
  KNOWLEDGE_CATEGORIES, 
  CATEGORY_LABELS, 
  CONTENT_LANES, 
  SOURCE_TYPES,
  type KnowledgeEntryInsert 
} from '@/lib/knowledge/types'
import { createKnowledgeEntry } from '@/app/actions/knowledge'
import styles from './AddEntryModal.module.css'

interface AddEntryModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddEntryModal({ onClose, onSuccess }: AddEntryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<Partial<KnowledgeEntryInsert>>({
    category: 'hook_library',
    subcategory: '',
    title: '',
    content: '',
    examples: [],
    lanes: [],
    source: 'manual',
    source_confidence: 'curated_manual',
    tags: [],
    is_mandatory_first_read: false
  })

  const [examplesText, setExamplesText] = useState('')
  const [tagsText, setTagsText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Basic validation
      if (!formData.title || !formData.content || !formData.subcategory) {
        throw new Error('Please fill in all required fields')
      }
      
      if (!formData.lanes || formData.lanes.length === 0) {
        throw new Error('Please select at least one content lane')
      }

      // Process text areas
      const examples = examplesText.split('\n').filter(line => line.trim())
      const tags = tagsText.split(',').map(tag => tag.trim()).filter(Boolean)

      await createKnowledgeEntry({
        ...(formData as KnowledgeEntryInsert),
        examples,
        tags
      })
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry')
    } finally {
      setLoading(false)
    }
  }

  const toggleLane = (lane: string) => {
    const currentLanes = formData.lanes || []
    if (currentLanes.includes(lane as any)) {
      setFormData({ ...formData, lanes: currentLanes.filter(l => l !== lane) })
    } else {
      setFormData({ ...formData, lanes: [...currentLanes, lane as any] })
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBox}>
              <Plus size={20} />
            </div>
            <div>
              <h2 className={styles.title}>New Knowledge Entry</h2>
              <p className={styles.subtitle}>Add a curated framework or pattern to the base</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Category *</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                required
              >
                {KNOWLEDGE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Subcategory *</label>
              <input 
                type="text" 
                placeholder="e.g. iceberg_effect"
                value={formData.subcategory}
                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Title *</label>
            <input 
              type="text" 
              placeholder="Descriptive title"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Content (Core Knowledge) *</label>
            <textarea 
              rows={4}
              placeholder="Explain the framework, theory, or rule..."
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Examples (one per line)</label>
            <textarea 
              rows={3}
              placeholder="Exact examples of this in action..."
              value={examplesText}
              onChange={e => setExamplesText(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Applicable Lanes *</label>
            <div className={styles.laneOptions}>
              {CONTENT_LANES.map(lane => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => toggleLane(lane)}
                  className={`${styles.laneBtn} ${formData.lanes?.includes(lane) ? styles.activeLane : ''}`}
                >
                  {lane}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Source</label>
              <select 
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value as any })}
              >
                {SOURCE_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Tags (comma separated)</label>
              <input 
                type="text" 
                placeholder="hook, viral, psychology"
                value={tagsText}
                onChange={e => setTagsText(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="mandatory"
              checked={formData.is_mandatory_first_read}
              onChange={e => setFormData({ ...formData, is_mandatory_first_read: e.target.checked })}
            />
            <label htmlFor="mandatory">
              Mandatory First Read
              <span className={styles.tooltip}>
                <Info size={12} />
                <span className={styles.tooltipText}>If true, this entry is always included in generation prompts (best for brand identity).</span>
              </span>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <Loader2 size={18} className={styles.spinner} /> : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
