'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SceneCard from '@/components/create/SceneCard'
import QualityBadge from '@/components/create/QualityBadge'
import { addScriptToCalendar } from '@/app/actions/create'
import type { GenerateShortFormRequest, GenerateShortFormResponse } from '@/lib/create/types'
import {
  Wand2,
  Sparkles,
  Settings,
  CalendarPlus,
  RotateCw,
  Clock,
  Hash,
  BookOpen,
  LayoutTemplate
} from 'lucide-react'
import layout from '@/app/create/layout.module.css'
import styles from './page.module.css'

export default function ShortFormCreationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<GenerateShortFormResponse | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')

  // Form state
  const [formData, setFormData] = useState<GenerateShortFormRequest>({
    topic: '',
    platform: 'instagram-reels',
    style: 'hook-first',
    target_duration: 45,
    angle: ''
  })

  const handleGenerate = async () => {
    if (!formData.topic) return alert('Topic is required')

    setLoading(true)
    try {
      const res = await fetch('/api/create/short-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToCalendar = async () => {
    if (!result?.script) return

    setSaving(true)
    try {
      await addScriptToCalendar(result.script, scheduledDate || undefined)
      alert('Successfully saved to calendar!')
      router.push('/calendar')
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Short-form Script Generator"
        subtitle="Create research-backed scripts optimized for retention and brand voice"
      />

      <div className={layout.layout}>
        {/* Left Panel: Configuration */}
        <div className={layout.panel}>
          <h2 className={layout.panelTitle}>
            <Settings size={18} />
            Script Settings
          </h2>

          <div className={layout.formGroup}>
            <label className={layout.label}>Topic / Idea (Required)</label>
            <textarea
              className={layout.input}
              rows={3}
              placeholder="e.g. 3 common mistakes when scaling FB ads"
              value={formData.topic}
              onChange={e => setFormData({ ...formData, topic: e.target.value })}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Creative Angle (Optional)</label>
            <input
              type="text"
              className={layout.input}
              placeholder="e.g. Counter-intuitive approach"
              value={formData.angle}
              onChange={e => setFormData({ ...formData, angle: e.target.value })}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Platform</label>
            <select
              className={layout.select}
              value={formData.platform}
              onChange={e => setFormData({ ...formData, platform: e.target.value as any })}
            >
              <option value="instagram-reels">Instagram Reels</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube-shorts">YouTube Shorts</option>
            </select>
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Framework Style</label>
            <select
              className={layout.select}
              value={formData.style}
              onChange={e => setFormData({ ...formData, style: e.target.value as any })}
            >
              <option value="hook-first">Hook-First (High Retention)</option>
              <option value="tutorial">Step-by-Step Tutorial</option>
              <option value="storytelling">Storytelling / Founder Journey</option>
              <option value="mistake">Mistake &amp; Correction</option>
              <option value="proof">Social Proof / Results</option>
            </select>
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Target Duration: {formData.target_duration}s</label>
            <div className={layout.sliderContainer}>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                className={layout.slider}
                value={formData.target_duration}
                onChange={e => setFormData({ ...formData, target_duration: Number(e.target.value) })}
              />
            </div>
          </div>

          <button
            className={layout.generateBtn}
            onClick={handleGenerate}
            disabled={loading || !formData.topic}
          >
            {loading ? <RotateCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
            {loading ? 'Generating...' : 'Generate Script'}
          </button>
        </div>

        {/* Center Panel: Preview */}
        <div className={layout.panel} style={{ padding: result ? 'var(--space-xl)' : 'var(--space-lg)' }}>
          {!result ? (
            <div className={layout.emptyState}>
              <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3>No Script Generated</h3>
              <p>Fill out the settings on the left and click Generate to create a new script backed by your Knowledge Base.</p>
            </div>
          ) : (
            <div>
              <div className={styles.previewHeader}>
                <h1 className={styles.scriptTitle}>{result.script.title}</h1>
                <div className={styles.scriptMeta}>
                  <span className={layout.metaBadge}><Clock size={14} /> {result.script.total_duration_seconds}s Total</span>
                  <span className={layout.metaBadge}><Hash size={14} /> {result.script.scenes.length} Scenes</span>
                </div>
              </div>

              {result.quality_score && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <QualityBadge score={result.quality_score} />
                </div>
              )}

              <div className={styles.hookBanner}>
                <div className={styles.hookLabel}>The Hook</div>
                <div className={styles.hookText}>&ldquo;{result.script.hook}&rdquo;</div>
              </div>

              <div>
                {result.script.scenes.map(scene => (
                  <SceneCard key={scene.scene_number} scene={scene} />
                ))}
              </div>

              <div className={styles.captionBox}>
                <h4>Caption Draft</h4>
                <div className={styles.captionText}>{result.script.caption_draft}</div>
                <div className={styles.hashtags}>
                  {result.script.hashtags.map(tag => (
                    <span key={tag} className={styles.hashtag}>#{tag.replace('#', '')}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Context & Actions */}
        <div className={layout.panel}>
          <div className={layout.sidebarSection}>
            <h4>Actions</h4>
            <button
              className={layout.actionBtn}
              onClick={handleGenerate}
              disabled={!result || loading}
            >
              <RotateCw size={16} />
              Regenerate Full Script
            </button>

            <div className={layout.scheduleGroup}>
              <label className={layout.label}>Schedule Date (Optional)</label>
              <input
                type="date"
                className={`${layout.input} ${layout.scheduleInput}`}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                disabled={!result}
              />
              <button
                className={`${layout.actionBtn} ${layout.primaryAction}`}
                onClick={handleSaveToCalendar}
                disabled={!result || saving}
              >
                <CalendarPlus size={16} />
                {saving ? 'Saving...' : 'Add to Calendar'}
              </button>
            </div>
          </div>

          <div className={layout.sidebarSection}>
            <h4>Knowledge Used</h4>
            {result ? (
              <ul className={layout.itemList}>
                {result.knowledge_context.hooks_used.map((hook, i) => (
                  <li key={`hook-${i}`} className={layout.itemListItem}>
                    <BookOpen size={14} className={layout.knowledgeIconPurple} />
                    <span>Hook: {hook}</span>
                  </li>
                ))}
                {result.knowledge_context.frameworks_used.map((fw, i) => (
                  <li key={`fw-${i}`} className={layout.itemListItem}>
                    <LayoutTemplate size={14} className={layout.knowledgeIconPrimary} />
                    <span>Framework: {fw}</span>
                  </li>
                ))}
                {result.knowledge_context.hooks_used.length === 0 && result.knowledge_context.frameworks_used.length === 0 && (
                  <li className={`${layout.itemListItem} ${layout.textMuted}`}>
                    No specific hooks or frameworks referenced.
                  </li>
                )}
              </ul>
            ) : (
              <p className={layout.textMuted}>
                Generation context will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
