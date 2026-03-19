'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SceneCard from '@/components/create/SceneCard'
import QualityBadge from '@/components/create/QualityBadge'
import PurposePicker from '@/components/create/PurposePicker'
import ProductSelect from '@/components/create/ProductSelect'
import TemplatePicker from '@/components/create/TemplatePicker'
import { addScriptToCalendar } from '@/app/actions/create'
import type { GenerateShortFormRequest, GenerateShortFormResponse, ContentPurpose } from '@/lib/create/types'
import {
  Wand2,
  Sparkles,
  Settings,
  CalendarPlus,
  RotateCw,
  Clock,
  Hash,
  BookOpen,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import layout from '@/app/create/layout.module.css'
import styles from './page.module.css'

function ShortFormCreationPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<GenerateShortFormResponse | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Form state
  const [formData, setFormData] = useState<GenerateShortFormRequest>({
    topic: '',
    platform: 'instagram-reels',
    style: 'hook-first',
    target_duration: 45,
    angle: ''
  })

  // Pre-fill from query params (Today page suggestions)
  useEffect(() => {
    const topic = searchParams.get('topic')
    const purpose = searchParams.get('purpose')
    if (topic || purpose) {
      setFormData(prev => ({
        ...prev,
        ...(topic ? { topic } : {}),
        ...(purpose ? { content_purpose: purpose as ContentPurpose } : {}),
      }))
    }
  }, [searchParams])

  const handleGenerate = async () => {
    if (!formData.topic && !formData.content_purpose) return alert('Enter a topic or select a content purpose')

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
        title="Short-form Script"
        subtitle="Backed by your brand knowledge"
      />

      <div className={layout.layout}>
        {/* Left Panel: Configuration */}
        <div className={layout.panel}>
          <h2 className={layout.panelTitle}>
            <Settings size={16} />
            Settings
          </h2>

          <TemplatePicker
            lane="short-form"
            onSelect={(params) => setFormData(prev => ({ ...prev, ...params as any }))}
          />

          <div className={layout.formGroup}>
            <label className={layout.label}>What&apos;s the vibe? <span style={{color:'var(--color-text-muted)',fontWeight:400}}>(optional)</span></label>
            <PurposePicker
              lane="short-form"
              onSelect={(purpose, hookId, frameworkId) => {
                setFormData(prev => ({
                  ...prev,
                  content_purpose: purpose ?? undefined,
                  selected_hook_id: hookId ?? undefined,
                  selected_framework_id: frameworkId ?? undefined,
                }))
              }}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Product <span style={{color:'var(--color-text-muted)',fontWeight:400}}>(optional)</span></label>
            <ProductSelect
              onSelect={(product) => {
                if (product) {
                  setFormData(prev => ({
                    ...prev,
                    topic: prev.topic || product.name,
                    product_context: {
                      name: product.name,
                      description: product.description,
                      price: product.price,
                      offer_details: product.offer_details,
                      target_audience: product.target_audience,
                      usps: product.usps,
                    },
                  }))
                } else {
                  setFormData(prev => ({ ...prev, product_context: undefined }))
                }
              }}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>
              What&apos;s the idea?{' '}
              <span style={{color:'var(--color-text-muted)',fontWeight:400}}>
                {formData.content_purpose ? '(optional)' : '(required)'}
              </span>
            </label>
            <textarea
              className={layout.input}
              rows={3}
              placeholder="e.g. How I made my first sale using paper flowers"
              value={formData.topic}
              onChange={e => setFormData({ ...formData, topic: e.target.value })}
            />
          </div>

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '0.75rem',
              fontWeight: 500, padding: '0.25rem 0', marginBottom: '0.5rem',
              fontFamily: 'inherit',
            }}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAdvanced ? 'Hide' : 'More'} options
          </button>

          {showAdvanced && <>
          <div className={layout.formGroup}>
            <label className={layout.label}>Angle <span style={{color:'var(--color-text-muted)',fontWeight:400}}>(optional)</span></label>
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
            <label className={layout.label}>Duration: {formData.target_duration}s</label>
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
          </>}

          <button
            className={layout.generateBtn}
            onClick={handleGenerate}
            disabled={loading || (!formData.topic && !formData.content_purpose)}
          >
            {loading ? <RotateCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? 'Creating...' : '✨ Create Script'}
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

            <button
              className={layout.actionBtn}
              disabled={!result}
              onClick={async () => {
                if (!result) return
                const name = prompt('Template name:', result.script.title || 'My Template')
                if (!name) return
                try {
                  await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name,
                      content_purpose: formData.content_purpose,
                      content_lane: 'short-form',
                      hook_entry_id: formData.selected_hook_id,
                      framework_entry_id: formData.selected_framework_id,
                      template_params: formData,
                      sample_output: result,
                    })
                  })
                  alert('Template saved! Reuse it anytime from the template picker.')
                } catch { alert('Failed to save template') }
              }}
            >
              <LayoutTemplate size={16} />
              Save as Template
            </button>
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

export default function ShortFormCreationPage() {
  return (
    <Suspense>
      <ShortFormCreationPageInner />
    </Suspense>
  )
}
