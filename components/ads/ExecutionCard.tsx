/**
 * Ad Execution Card Component
 * 
 * Interactive UI for an ad execution. Allows:
 * - Editing text (headline, body, script)
 * - Generating images for static ads
 * - Saving to content_items (Library)
 * - Launching Carousel Builder
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ExecutionCard({ id, format, content, angle, persona, hookText, hookType, onUpdate }: ExecutionCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [genImage, setGenImage] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(content.image_url || null)

  const handleSaveToLibrary = async () => {
    setSaving(true)
    try {
      const isVideo = format === 'video_ugc' || format === 'video_hq'
      const isCarousel = format === 'carousel' || format === 'ig_carousel'

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
          // For scripts — full data in scriptData
          scriptData: isVideo ? {
            angle,
            persona,
            hook_type: hookType,
            format,
            ...editedContent,
          } : undefined,
          // For carousels — pass slide texts (no image URLs yet)
          slideUrls: isCarousel ? [] : undefined,
          // For static images
          ...(type === 'image' ? {
            scriptData: {
              angle,
              persona,
              hook_type: hookType,
              format,
              ...editedContent,
              image_url: imageUrl,
            }
          } : {}),
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const err = await res.json()
        console.error('Save failed:', err)
      }
    } catch (err) {
      console.error('Save failed', err)
    }
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
    } catch (err) {
      console.error(err)
    }
    setGenImage(false)
  }

  const sendToStudio = () => {
    // For carousels, encode the slide text and send to studio
    if (format !== 'carousel' && format !== 'ig_carousel') return
    const slides = editedContent.slides || []
    const texts = slides.map((s: any) => s.body_text || s.title || '')
    const query = new URLSearchParams()
    query.set('tab', 'carousel')
    texts.forEach((t: string, i: number) => query.append(`slide${i}`, t))
    router.push(`/studio?${query.toString()}`)
  }

  // Edit Handlers
  const updateField = (field: string, value: any) => {
    const next = { ...editedContent, [field]: value }
    setEditedContent(next)
    onUpdate(id, next)
  }

  const updateSlide = (idx: number, field: string, value: string) => {
    const slides = [...(editedContent.slides || [])]
    slides[idx] = { ...slides[idx], [field]: value }
    updateField('slides', slides)
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
          <button className={styles.iconBtn} onClick={() => setEditing(!editing)}>
            {editing ? '👁️ Preview' : '✏️ Edit'}
          </button>
          {format.includes('carousel') && (
            <button className={styles.primaryBtn} onClick={sendToStudio}>
              ✨ Build in Studio
            </button>
          )}
          <button className={styles.saveBtn} onClick={handleSaveToLibrary} disabled={saving || saved}>
            {saved ? '✅ Saved' : saving ? '⏳...' : '💾 Save to Library'}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* --- STATIC IMAGE --- */}
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

        {/* --- CAROUSEL --- */}
        {(format === 'carousel' || format === 'ig_carousel') && (
          <div className={styles.carouselLayout}>
            {editing && <input className={styles.input} value={editedContent.headline || ''} onChange={e => updateField('headline', e.target.value)} placeholder="Carousel Title/Headline" style={{marginBottom: '1rem'}} />}
            {!editing && editedContent.headline && <div className={styles.previewLine} style={{marginBottom: '1rem'}}><strong>{editedContent.headline}</strong></div>}
            
            <div className={styles.slidesGrid}>
              {(editedContent.slides || []).map((slide: any, i: number) => (
                <div key={i} className={styles.slideCard}>
                  <div className={styles.slideNum}>Slide {i + 1}</div>
                  {editing ? (
                    <>
                      {slide.title !== undefined && <input className={styles.input} value={slide.title} onChange={e => updateSlide(i, 'title', e.target.value)} placeholder="Title" />}
                      <textarea className={styles.textarea} value={slide.body_text || ''} onChange={e => updateSlide(i, 'body_text', e.target.value)} placeholder="Slide text" rows={3} />
                    </>
                  ) : (
                    <>
                      {slide.title && <strong>{slide.title}</strong>}
                      <p>{slide.body_text}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              {editing ? (
                <select className={styles.select} value={editedContent.cta_text || ''} onChange={e => updateField('cta_text', e.target.value)} style={{width: '200px'}}>
                  <option value="LEARN_MORE">Learn More</option>
                  <option value="SIGN_UP">Sign Up</option>
                  <option value="SEND_MESSAGE">Send Message</option>
                </select>
              ) : (
                <div className={styles.previewCta}>{editedContent.cta_text?.replace('_', ' ')}</div>
              )}
            </div>
          </div>
        )}

        {/* --- VIDEO SCRIPT --- */}
        {(format === 'video_hq' || format === 'video_ugc') && (
          <div className={styles.scriptLayout}>
            {/* KB metadata — shown when generated via full pipeline */}
            {!editing && (editedContent.kb_hooks_used as string[] || []).length > 0 && (
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

            {editing ? (
              <>
                <div className={styles.fieldGroup}>
                  <label>Hook (First 3 seconds)</label>
                  <textarea className={styles.textarea} value={editedContent.hook_script as string || ''} onChange={e => updateField('hook_script', e.target.value)} rows={2} />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Body Script</label>
                  <textarea className={styles.textarea} value={editedContent.body_script as string || ''} onChange={e => updateField('body_script', e.target.value)} rows={6} />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Call to Action</label>
                  <input className={styles.input} value={editedContent.cta_script as string || ''} onChange={e => updateField('cta_script', e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Visual / Acting Notes</label>
                  <textarea className={styles.textarea} value={(editedContent.visual_directions as string) || (editedContent.style_notes as string) || ''} onChange={e => updateField(format === 'video_ugc' ? 'style_notes' : 'visual_directions', e.target.value)} rows={2} />
                </div>
                {editedContent.caption_draft && (
                  <div className={styles.fieldGroup}>
                    <label>Caption Draft</label>
                    <textarea className={styles.textarea} value={editedContent.caption_draft as string} onChange={e => updateField('caption_draft', e.target.value)} rows={3} />
                  </div>
                )}
              </>
            ) : (editedContent.scenes as any[])?.length > 0 ? (
              // Scene-by-scene view (from full KB pipeline)
              <div className={styles.scriptPreview}>
                {(editedContent.scenes as any[]).map((scene: any, i: number) => (
                  <div key={i} className={styles.scriptRow}>
                    <div className={styles.scriptTime}>{scene.timing || `${scene.duration_seconds}s`}</div>
                    <div className={styles.scriptText}>
                      <div>{scene.script_text}</div>
                      {scene.visual_direction && <div className={styles.scriptVisual}>📷 {scene.visual_direction}</div>}
                      {scene.on_screen_text && <div className={styles.scriptOnScreen}>📝 On screen: {scene.on_screen_text}</div>}
                      {scene.production_notes && <div className={styles.scriptProdNote}>🎬 {scene.production_notes}</div>}
                    </div>
                  </div>
                ))}
                {editedContent.caption_draft && (
                  <div className={styles.captionDraft}>
                    <div className={styles.captionLabel}>📱 Caption Draft</div>
                    <div className={styles.captionText}>{editedContent.caption_draft as string}</div>
                    {(editedContent.hashtags as string[] || []).length > 0 && (
                      <div className={styles.hashtags}>{(editedContent.hashtags as string[]).join(' ')}</div>
                    )}
                  </div>
                )}
                <div className={styles.scriptNotes}>
                  <em>🎬 {editedContent.visual_directions || editedContent.style_notes}</em>
                </div>
              </div>
            ) : (
              // Simple 3-part view (from basic generation)
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
                <div className={styles.scriptNotes}>
                  <em>🎬 {editedContent.visual_directions || editedContent.style_notes}</em>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
