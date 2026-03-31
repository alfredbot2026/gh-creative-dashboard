/**
 * Ad Execution Card Component
 * 
 * Unified editing experience matching /create:
 * - Video scripts → BlockEditor (scene-by-scene edit + regenerate + undo)
 * - Carousels → SlideBlockEditor (per-slide edit, block-style)
 * - Static ads → inline fields
 * - Save to Library, Generate Image, Build in Studio
 */
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BlockEditor from '@/components/create/BlockEditor'
import type { RegenerateContext } from '@/components/create/BlockEditor'
import type { ScriptScene } from '@/lib/create/types'
import styles from './ExecutionCard.module.css'

interface ExecutionCardProps {
  id: string
  format: string
  content: any
  angle: string
  persona: string
  hookText: string
  hookType: string
  onUpdate: (id: string, newContent: any) => void
}

// ─── Slide Block Editor (carousel/ig_carousel) ───
function SlideBlockEditor({ slides, format, onChange }: {
  slides: any[]
  format: string
  onChange: (slides: any[]) => void
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState<any>({})

  const startEdit = (i: number) => {
    setEditingIdx(i)
    setDraft({ ...slides[i] })
  }

  const saveEdit = () => {
    if (editingIdx === null) return
    const updated = [...slides]
    updated[editingIdx] = draft
    onChange(updated)
    setEditingIdx(null)
  }

  const cancelEdit = () => {
    setEditingIdx(null)
    setDraft({})
  }

  return (
    <div className={styles.slideEditor}>
      {slides.map((slide, i) => (
        <div key={i} className={styles.slideBlock}>
          <div className={styles.slideBlockHeader}>
            <span className={styles.slideNum}>Slide {i + 1}</span>
            {editingIdx !== i && (
              <button className={styles.editBlockBtn} onClick={() => startEdit(i)}>✏️ Edit</button>
            )}
          </div>
          {editingIdx === i ? (
            <div className={styles.slideEditArea}>
              {format === 'ig_carousel' && (
                <input
                  className={styles.input}
                  value={draft.title || ''}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Slide title"
                />
              )}
              <textarea
                className={styles.textarea}
                value={draft.body_text || ''}
                onChange={e => setDraft({ ...draft, body_text: e.target.value })}
                placeholder="Slide text"
                rows={3}
              />
              {draft.image_prompt !== undefined && (
                <textarea
                  className={styles.textarea}
                  value={draft.image_prompt || ''}
                  onChange={e => setDraft({ ...draft, image_prompt: e.target.value })}
                  placeholder="Image description"
                  rows={2}
                  style={{ opacity: 0.7 }}
                />
              )}
              <div className={styles.editBtns}>
                <button className={styles.saveBlockBtn} onClick={saveEdit}>✓ Save</button>
                <button className={styles.cancelBlockBtn} onClick={cancelEdit}>✕ Cancel</button>
              </div>
            </div>
          ) : (
            <div className={styles.slidePreview}>
              {slide.title && <div className={styles.slideTitle}>{slide.title}</div>}
              <p className={styles.slideText}>{slide.body_text}</p>
              {slide.image_prompt && (
                <p className={styles.slidePrompt}>🖼️ {slide.image_prompt}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Card ───
export default function ExecutionCard({ id, format, content, angle, persona, hookText, hookType, onUpdate }: ExecutionCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [genImage, setGenImage] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(content.image_url || null)

  const isVideo = format === 'video_ugc' || format === 'video_hq'
  const isCarousel = format === 'carousel' || format === 'ig_carousel'
  const hasScenes = isVideo && Array.isArray(editedContent.scenes) && editedContent.scenes.length > 0

  // ─── BlockEditor handlers for video ───
  const handleScenesChange = useCallback((newScenes: ScriptScene[]) => {
    const next = {
      ...editedContent,
      scenes: newScenes,
      hook_script: newScenes[0]?.script_text || editedContent.hook_script,
      body_script: newScenes.slice(1, -1).map((s: ScriptScene) => s.script_text).join('\n\n'),
      cta_script: newScenes[newScenes.length - 1]?.script_text || editedContent.cta_script,
    }
    setEditedContent(next)
    onUpdate(id, next)
  }, [editedContent, id, onUpdate])

  const handleRegenerateBlock = useCallback(async (blockIndex: number, context: RegenerateContext) => {
    const res = await fetch('/api/create/regenerate-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockIndex,
        block: context.block,
        allBlocks: context.allBlocks,
        topic: `${angle} ad for ${persona}: ${hookText}`,
        platform: format === 'video_ugc' ? 'instagram-reels' : 'facebook-reels',
      }),
    })
    if (!res.ok) throw new Error('Regenerate failed')
    return res.json()
  }, [angle, persona, hookText, format])

  // ─── Carousel slide changes ───
  const handleSlidesChange = useCallback((newSlides: any[]) => {
    const next = { ...editedContent, slides: newSlides }
    setEditedContent(next)
    onUpdate(id, next)
  }, [editedContent, id, onUpdate])

  // ─── Save / Image / Studio ───
  const handleSaveToLibrary = async () => {
    setSaving(true)
    try {
      const title = (editedContent.headline as string)
        || (editedContent.hook_script as string)?.slice(0, 60)
        || hookText.slice(0, 60)

      let platform = 'facebook-ad'
      if (format.includes('ig_')) platform = 'instagram-reels'
      if (format === 'video_ugc') platform = 'instagram-reels'
      if (format === 'video_hq') platform = 'facebook-reels'

      const type = isVideo ? 'script' : isCarousel ? 'carousel' : 'image'

      const res = await fetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          platform,
          hook: hookText,
          cta: (editedContent.cta_script as string) || (editedContent.cta_text as string),
          contentType: 'sell',
          imageUrl: imageUrl || undefined,
          scriptData: (isVideo || type === 'image') ? {
            angle, persona, hook_type: hookType, format,
            ...editedContent, image_url: imageUrl,
          } : undefined,
          slideUrls: isCarousel ? [] : undefined,
        }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch (err) { console.error('Save failed', err) }
    setSaving(false)
  }

  const handleGenerateImage = async () => {
    if (!editedContent.image_prompt) return
    setGenImage(true)
    try {
      const formData = new FormData()
      formData.append('prompt', editedContent.image_prompt)
      formData.append('aspectRatio', '1:1')
      const res = await fetch('/api/studio/generate', { method: 'POST', body: formData })
      const data = await res.json()
      const imgUrl = data.imageUrl || data.image_url
      if (imgUrl) {
        setImageUrl(imgUrl)
        onUpdate(id, { ...editedContent, image_url: imgUrl })
      }
    } catch (err) { console.error(err) }
    setGenImage(false)
  }

  const sendToStudio = () => {
    if (!isCarousel) return
    const slides = (editedContent.slides || []) as Array<{ body_text?: string; title?: string }>
    const texts = slides.map(s => s.body_text || s.title || '')
    const query = new URLSearchParams()
    query.set('format', 'carousel')
    query.set('headline', (editedContent.headline as string) || '')
    texts.forEach((t, i) => query.append(`slide${i}`, t))
    router.push(`/create/ads?${query.toString()}`)
  }

  // ─── Static field handlers ───
  const updateField = (field: string, value: any) => {
    const next = { ...editedContent, [field]: value }
    setEditedContent(next)
    onUpdate(id, next)
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.formatBadge}>
          {format === 'static_image' ? '🖼️ Static Ad' : 
           format === 'carousel' ? '🎠 Carousel Ad' : 
           format === 'ig_carousel' ? '📱 IG Carousel' : '🎬 Video Script'}
        </span>
        <div className={styles.actions}>
          {/* Video: BlockEditor handles its own edit mode. Static: toggle edit. Carousel: inline per-slide. */}
          {!isVideo && !isCarousel && (
            <button className={styles.iconBtn} onClick={() => setEditing(!editing)}>
              {editing ? '👁️ Preview' : '✏️ Edit'}
            </button>
          )}
          {isCarousel && (
            <button className={styles.primaryBtn} onClick={sendToStudio}>
              ✨ Build in Studio
            </button>
          )}
          <button className={styles.saveBtn} onClick={handleSaveToLibrary} disabled={saving || saved}>
            {saved ? '✅ Saved' : saving ? '⏳...' : '💾 Save'}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* ─── STATIC IMAGE ─── */}
        {format === 'static_image' && (
          <div className={styles.layout}>
            <div className={styles.imageCol}>
              {imageUrl ? (
                <img src={imageUrl} alt="Ad creative" className={styles.previewImg} />
              ) : (
                <div className={styles.placeholder}>
                  <div className={styles.prompt}>{editedContent.image_prompt}</div>
                  <button className={styles.genBtn} onClick={handleGenerateImage} disabled={genImage}>
                    {genImage ? '🎨 Generating...' : '🎨 Generate Image'}
                  </button>
                </div>
              )}
            </div>
            <div className={styles.textCol}>
              {editing ? (
                <>
                  <input className={styles.input} value={editedContent.headline || ''} onChange={e => updateField('headline', e.target.value)} placeholder="Headline" />
                  <textarea className={styles.textarea} value={editedContent.body_text || ''} onChange={e => updateField('body_text', e.target.value)} placeholder="Primary text" rows={6} />
                  <input className={styles.input} value={editedContent.link_description || ''} onChange={e => updateField('link_description', e.target.value)} placeholder="Link description" />
                  <select className={styles.select} value={editedContent.cta_text || ''} onChange={e => updateField('cta_text', e.target.value)}>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="SEND_MESSAGE">Send Message</option>
                    <option value="SHOP_NOW">Shop Now</option>
                  </select>
                </>
              ) : (
                <>
                  <div className={styles.previewLine}><strong>{editedContent.headline}</strong></div>
                  <div className={styles.previewBody}>{editedContent.body_text}</div>
                  {editedContent.link_description && <div className={styles.previewDesc}>{editedContent.link_description}</div>}
                  <div className={styles.previewCta}>{editedContent.cta_text?.replace('_', ' ')}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── CAROUSEL (Block-style slide editor) ─── */}
        {isCarousel && (
          <div className={styles.carouselLayout}>
            {editedContent.headline && (
              <div className={styles.previewLine} style={{ marginBottom: '0.75rem' }}>
                <strong>{editedContent.headline}</strong>
              </div>
            )}
            <SlideBlockEditor
              slides={editedContent.slides || []}
              format={format}
              onChange={handleSlidesChange}
            />
            {editedContent.cta_text && (
              <div className={styles.previewCta} style={{ marginTop: '0.75rem' }}>
                {editedContent.cta_text.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        )}

        {/* ─── VIDEO SCRIPT (BlockEditor — same as /create) ─── */}
        {isVideo && (
          <div className={styles.scriptLayout}>
            {/* KB metadata */}
            {(editedContent.kb_hooks_used as string[] || []).length > 0 && (
              <div className={styles.kbMeta}>
                <span>📚 KB: {(editedContent.kb_hooks_used as string[]).slice(0, 2).join(', ')}</span>
                {(editedContent.kb_frameworks_used as string[] || []).length > 0 && (
                  <span> · {(editedContent.kb_frameworks_used as string[]).slice(0, 1).join(', ')}</span>
                )}
                {editedContent.quality_score && (
                  <span className={editedContent.passed_quality_gate ? styles.qPass : styles.qFail}>
                    {' '}· Quality: {Math.round(editedContent.quality_score as number * 100)}% {editedContent.passed_quality_gate ? '✅' : '⚠️'}
                  </span>
                )}
              </div>
            )}

            {hasScenes ? (
              <>
                <BlockEditor
                  scenes={(editedContent.scenes as any[]).map((s: any, i: number) => ({
                    scene_number: s.scene_number || i + 1,
                    duration_seconds: s.duration_seconds || parseInt(s.timing) || 5,
                    script_text: s.script_text || '',
                    visual_direction: s.visual_direction || '',
                    block_label: s.block_label || (i === 0 ? 'Hook' : i === (editedContent.scenes as any[]).length - 1 ? 'CTA' : `Scene ${i + 1}`),
                    timing: s.timing,
                    on_screen_text: s.on_screen_text,
                    production_notes: s.production_notes,
                  }))}
                  topic={`${angle} ad: ${hookText}`}
                  platform={format === 'video_ugc' ? 'instagram-reels' : 'facebook-reels'}
                  onChange={handleScenesChange}
                  onRegenerateBlock={handleRegenerateBlock}
                />
                {/* Caption draft below scenes */}
                {editedContent.caption_draft && (
                  <div className={styles.captionSection}>
                    <div className={styles.captionLabel}>📱 Caption Draft</div>
                    <div className={styles.captionText}>{editedContent.caption_draft as string}</div>
                    {(editedContent.hashtags as string[] || []).length > 0 && (
                      <div className={styles.hashtags}>{(editedContent.hashtags as string[]).join(' ')}</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Fallback: simple 3-part view for non-scene video content */
              <div className={styles.scriptPreview}>
                <div className={styles.scriptRow}>
                  <div className={styles.scriptTime}>Hook</div>
                  <div className={styles.scriptText}><strong>{editedContent.hook_script as string}</strong></div>
                </div>
                <div className={styles.scriptRow}>
                  <div className={styles.scriptTime}>Body</div>
                  <div className={styles.scriptText}>{editedContent.body_script as string}</div>
                </div>
                <div className={styles.scriptRow}>
                  <div className={styles.scriptTime}>CTA</div>
                  <div className={styles.scriptText}><strong>{editedContent.cta_script as string}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
