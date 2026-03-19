'use client'

import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import PurposePicker from '@/components/create/PurposePicker'
import ProductSelect from '@/components/create/ProductSelect'
import TemplatePicker from '@/components/create/TemplatePicker'
import type { ContentPurpose } from '@/lib/create/types'
import type { ProductData } from '@/app/actions/products'
import {
  Wand2,
  Copy,
  Clock,
  Film,
  Type,
  Hash,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react'
import layout from '@/app/create/layout.module.css'
import styles from './page.module.css'

interface ScriptSection {
  name: string
  duration: string
  speaking_lines: string
  visual_notes: string
  tips?: string
}

interface YouTubeScriptResult {
  title_options: string[]
  description: string
  tags: string[]
  thumbnail_concept: string
  total_duration_estimate: string
  sections: ScriptSection[]
  model?: string
  knowledge_used?: Array<{ title: string; category: string }>
}

const VIDEO_TYPES = [
  { value: 'tutorial', label: '📚 Tutorial / How-To' },
  { value: 'vlog', label: '📷 Vlog / Day in the Life' },
  { value: 'review', label: '⭐ Product Review' },
  { value: 'story', label: '📖 Story / Transformation' },
  { value: 'listicle', label: '📋 Listicle (Top 5, 10 Tips)' },
  { value: 'qa', label: '❓ Q&A / FAQ' },
]

const TARGET_LENGTHS = [
  { value: '3-5', label: '3-5 min (Short)' },
  { value: '8-12', label: '8-12 min (Standard)' },
  { value: '15-20', label: '15-20 min (Long)' },
  { value: '20+', label: '20+ min (Deep Dive)' },
]

const SECTION_ICONS: Record<string, string> = {
  HOOK: '🎯',
  INTRO: '👋',
  'MAIN CONTENT': '📝',
  CTA: '🔔',
  OUTRO: '👋',
}

export default function YouTubeScriptPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<YouTubeScriptResult | null>(null)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    topic: '',
    video_type: 'tutorial',
    target_length: '8-12',
    content_purpose: undefined as ContentPurpose | undefined,
    product_name: undefined as string | undefined,
    hook_id: undefined as string | undefined,
    framework_id: undefined as string | undefined,
  })

  const handlePurposeChange = (purpose: ContentPurpose | undefined) => {
    setFormData(prev => ({ ...prev, content_purpose: purpose }))
  }

  const handleProductSelect = (product: ProductData | null) => {
    if (product) {
      setFormData(prev => ({ ...prev, product_name: product.name }))
    } else {
      setFormData(prev => ({ ...prev, product_name: undefined }))
    }
  }

  const handleGenerate = async () => {
    if (!formData.topic && !formData.content_purpose) {
      return alert('Enter a topic or select a content purpose')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/create/youtube-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(id)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const copySection = async (section: ScriptSection) => {
    const text = `## ${section.name} (${section.duration})\n\n${section.speaking_lines}\n\n[Visual: ${section.visual_notes}]`
    await navigator.clipboard.writeText(text)
    setCopiedSection(section.name)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const copyFullScript = async () => {
    if (!result) return
    const full = result.sections
      .map(s => `## ${s.name} (${s.duration})\n\n${s.speaking_lines}\n\n[Visual: ${s.visual_notes}]`)
      .join('\n\n---\n\n')
    const header = `# ${result.title_options[0]}\n\nDuration: ${result.total_duration_estimate}\n\n---\n\n`
    await navigator.clipboard.writeText(header + full)
    setCopiedField('full')
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <>
      <PageHeader
        title="YouTube Script Generator"
        subtitle="Create complete video scripts with hooks, chapters, SEO, and thumbnail concepts"
      />

      <div className={layout.grid}>
        {/* Left Panel: Settings */}
        <div className={layout.sidebar}>
          <h2 className={layout.sidebarTitle}>
            <Film size={18} />
            Video Settings
          </h2>

          <TemplatePicker
            lane="youtube"
            onSelect={(t) => setFormData(prev => ({ ...prev, topic: (t.config as any)?.topic || prev.topic }))}
          />

          <PurposePicker
            lane="youtube"
            onSelect={(purpose, hookId, frameworkId) => {
              setFormData(prev => ({
                ...prev,
                content_purpose: purpose || undefined,
                hook_id: hookId || undefined,
                framework_id: frameworkId || undefined,
              }))
            }}
          />

          <ProductSelect onSelect={handleProductSelect} />

          <div className={layout.field}>
            <label className={layout.label}>Topic / Video Idea</label>
            <textarea
              className={layout.textarea}
              rows={2}
              value={formData.topic}
              onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g. How I earn ₱50K/month from paper crafting at home"
            />
          </div>

          <div className={layout.field}>
            <label className={layout.label}>Video Type</label>
            <select
              className={layout.select}
              value={formData.video_type}
              onChange={e => setFormData(prev => ({ ...prev, video_type: e.target.value }))}
            >
              {VIDEO_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={layout.field}>
            <label className={layout.label}>Target Length</label>
            <select
              className={layout.select}
              value={formData.target_length}
              onChange={e => setFormData(prev => ({ ...prev, target_length: e.target.value }))}
            >
              {TARGET_LENGTHS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <button
            className={`${layout.generateBtn} ${loading ? layout.generating : ''}`}
            onClick={handleGenerate}
            disabled={loading || (!formData.topic && !formData.content_purpose)}
          >
            <Wand2 size={16} />
            {loading ? 'Writing Script...' : 'Generate Script'}
          </button>
        </div>

        {/* Center Panel: Script */}
        <div className={layout.panel}>
          {!result ? (
            <div className={layout.emptyState}>
              <Film size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
              <h3>No Script Generated</h3>
              <p>Choose a topic and video type, then click Generate to create a full YouTube script.</p>
            </div>
          ) : (
            <div className={styles.scriptContainer}>
              {/* Title Options */}
              <div className={styles.titleSection}>
                <h3 className={styles.sectionLabel}>
                  <Type size={16} /> Title Options
                </h3>
                {result.title_options.map((title, i) => (
                  <button
                    key={i}
                    className={styles.titleOption}
                    onClick={() => copyToClipboard(title, `title-${i}`)}
                  >
                    <span>{title}</span>
                    <Copy size={14} />
                    {copiedField === `title-${i}` && <span className={styles.copiedBadge}>Copied!</span>}
                  </button>
                ))}
              </div>

              {/* Duration */}
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <Clock size={14} /> {result.total_duration_estimate}
                </span>
                {result.model && (
                  <span className={styles.metaItem}>Model: {result.model}</span>
                )}
              </div>

              {/* Script Sections */}
              <div className={styles.sections}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionLabel}>
                    <BookOpen size={16} /> Script
                  </h3>
                  <button className={styles.copyAllBtn} onClick={copyFullScript}>
                    <Copy size={14} />
                    {copiedField === 'full' ? 'Copied!' : 'Copy Full Script'}
                  </button>
                </div>

                {result.sections.map((section, i) => (
                  <div key={i} className={styles.scriptSection}>
                    <div className={styles.sectionTop}>
                      <h4 className={styles.sectionName}>
                        {SECTION_ICONS[section.name] || '📌'} {section.name}
                      </h4>
                      <span className={styles.duration}>{section.duration}</span>
                      <button
                        className={styles.copySectionBtn}
                        onClick={() => copySection(section)}
                      >
                        {copiedSection === section.name ? '✓' : <Copy size={12} />}
                      </button>
                    </div>
                    <div className={styles.speakingLines}>{section.speaking_lines}</div>
                    <div className={styles.visualNotes}>
                      🎥 <em>{section.visual_notes}</em>
                    </div>
                    {section.tips && (
                      <div className={styles.tips}>💡 {section.tips}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Thumbnail Concept */}
              <div className={styles.thumbnailSection}>
                <h3 className={styles.sectionLabel}>
                  <ImageIcon size={16} /> Thumbnail Concept
                </h3>
                <p className={styles.thumbnailText}>{result.thumbnail_concept}</p>
              </div>

              {/* Description + Tags */}
              <div className={styles.seoSection}>
                <div>
                  <h3 className={styles.sectionLabel}>Description</h3>
                  <div className={styles.descriptionBox}>
                    <p>{result.description}</p>
                    <button
                      className={styles.copySectionBtn}
                      onClick={() => copyToClipboard(result.description, 'desc')}
                    >
                      {copiedField === 'desc' ? '✓ Copied' : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className={styles.sectionLabel}>
                    <Hash size={16} /> Tags
                  </h3>
                  <div className={styles.tagsGrid}>
                    {result.tags.map((tag, i) => (
                      <span key={i} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                  <button
                    className={styles.copyTagsBtn}
                    onClick={() => copyToClipboard(result.tags.join(', '), 'tags')}
                  >
                    <Copy size={12} />
                    {copiedField === 'tags' ? 'Copied!' : 'Copy All Tags'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Knowledge */}
        <div className={layout.sidebar}>
          <h4 className={layout.sidebarTitle}>
            <BookOpen size={16} /> Knowledge Used
          </h4>
          {result?.knowledge_used?.length ? (
            <ul className={layout.knowledgeList}>
              {result.knowledge_used.map((k, i) => (
                <li key={i}>
                  {k.category === 'hook_library' ? '🪝' : '📘'} {k.title} ({k.category})
                </li>
              ))}
            </ul>
          ) : (
            <p className={layout.emptyHint}>Generation context will appear here.</p>
          )}
        </div>
      </div>
    </>
  )
}
