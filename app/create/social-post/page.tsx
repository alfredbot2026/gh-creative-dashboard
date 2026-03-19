'use client'

import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import PurposePicker from '@/components/create/PurposePicker'
import ProductSelect from '@/components/create/ProductSelect'
import TemplatePicker from '@/components/create/TemplatePicker'
import StyleModeToggle from '@/components/create/StyleModeToggle'
import type { StyleMode } from '@/components/create/StyleModeToggle'
import type { ContentPurpose } from '@/lib/create/types'
import type { ProductData } from '@/app/actions/products'
import { Wand2, Copy, Image as ImageIcon, Hash } from 'lucide-react'
import layout from '@/app/create/layout.module.css'
import styles from './page.module.css'

interface SocialPostResult {
  caption: string
  hashtags: string[]
  image_concept: string
  image_prompt: string
  hook_used: string
}

export default function SocialPostPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SocialPostResult | null>(null)
  const [copied, setCopied] = useState(false)

  const [styleMode, setStyleMode] = useState<StyleMode>('polished')
  const [ugcPhoto, setUgcPhoto] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    topic: '',
    platform: 'instagram' as 'instagram' | 'facebook',
    content_purpose: undefined as ContentPurpose | undefined,
    selected_hook_id: undefined as string | undefined,
    selected_framework_id: undefined as string | undefined,
    product_context: undefined as ProductData | undefined,
  })

  const handleGenerate = async () => {
    if (!formData.topic && !formData.content_purpose && !formData.product_context) {
      return alert('Enter a topic, select a content purpose, or pick a product')
    }
    setLoading(true)
    try {
      const res = await fetch('/api/create/social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: formData.topic || undefined,
          platform: formData.platform,
          content_purpose: formData.content_purpose,
          selected_hook_id: formData.selected_hook_id,
          selected_framework_id: formData.selected_framework_id,
          product_context: formData.product_context ? {
            name: formData.product_context.name,
            price: formData.product_context.price,
            offer_details: formData.product_context.offer_details,
          } : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setResult(await res.json())
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyCaption = () => {
    if (!result) return
    const full = `${result.caption}\n\n${result.hashtags.map(h => `#${h}`).join(' ')}`
    navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <PageHeader
        title="Social Post"
        subtitle="Backed by your brand knowledge"
      />

      <div className={layout.layout}>
        {/* Left: Settings */}
        <div className={layout.panel}>
          <h2 className={layout.panelTitle}>Post Settings</h2>

          <TemplatePicker lane="short-form" onSelect={(p) => setFormData(prev => ({ ...prev, ...p as any }))} />

          <div className={layout.formGroup}>
            <label>What's the vibe? (optional)</label>
            <PurposePicker
              lane="short-form"
              onSelect={(purpose, hookId, frameworkId) => setFormData(prev => ({
                ...prev,
                content_purpose: purpose ?? undefined,
                selected_hook_id: hookId ?? undefined,
                selected_framework_id: frameworkId ?? undefined,
              }))}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Product (Optional)</label>
            <ProductSelect onSelect={(p) => setFormData(prev => ({ ...prev, product_context: p ?? undefined }))} />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>What is the idea? (optional)</label>
            <textarea
              className={layout.input}
              rows={2}
              placeholder="e.g. Why I switched to paper crafting for income"
              value={formData.topic}
              onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Platform</label>
            <select
              className={layout.select}
              value={formData.platform}
              onChange={e => setFormData(prev => ({ ...prev, platform: e.target.value as any }))}
            >
              <option value="instagram">Instagram Feed</option>
              <option value="facebook">Facebook Post</option>
            </select>
          </div>

          <StyleModeToggle
            value={styleMode}
            onChange={setStyleMode}
            onPhotoSelect={setUgcPhoto}
            selectedPhoto={ugcPhoto}
          />

          <button
            className={`${layout.generateBtn} ${loading ? layout.generating : ''}`}
            onClick={handleGenerate}
            disabled={loading}
          >
            <Wand2 size={16} />
            {loading ? 'Creating...' : '✨ Create Post'}
          </button>
        </div>

        {/* Right: Result */}
        <div className={layout.mainContent}>
          {!result ? (
            <div className={layout.emptyState}>
              <h3>No Post Generated</h3>
              <p>Select a purpose or enter a topic and click Generate.</p>
            </div>
          ) : (
            <div className={styles.result}>
              <div className={styles.captionCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.hookBadge}>Hook: {result.hook_used}</span>
                  <button className={styles.copyBtn} onClick={copyCaption}>
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy Caption + Hashtags'}
                  </button>
                </div>
                <div className={styles.caption}>{result.caption}</div>
                <div className={styles.hashtags}>
                  {result.hashtags.map(h => (
                    <span key={h} className={styles.hashtag}>#{h}</span>
                  ))}
                </div>
              </div>

              <div className={styles.imageConcept}>
                <div className={styles.conceptHeader}>
                  <ImageIcon size={14} />
                  <strong>Image Concept</strong>
                </div>
                <p className={styles.conceptText}>{result.image_concept}</p>
                <details className={styles.promptDetails}>
                  <summary className={styles.promptSummary}>View full image prompt for Gemini</summary>
                  <pre className={styles.promptText}>{result.image_prompt}</pre>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={layout.sidebar}>
          <div className={layout.sidebarSection}>
            <h4>Actions</h4>
            <button className={layout.actionBtn} onClick={handleGenerate} disabled={!result || loading}>
              Regenerate
            </button>
            <button className={layout.actionBtn} onClick={copyCaption} disabled={!result}>
              <Copy size={14} /> Copy All
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
