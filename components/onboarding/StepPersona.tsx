'use client'
import { useState } from 'react'
import styles from './steps.module.css'

interface Props {
  data: any
  onChange: (partial: any) => void
}

export default function StepPersona({ data, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      for (const file of Array.from(files)) {
        fd.append('photos', file)
      }
      const res = await fetch('/api/persona/avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
      const result = await res.json()
      setPreviews(result.signed_urls || [])
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Your Brand Character</h2>
      <p className={styles.subtitle}>Tell AI who you are — so generated content sounds and looks like you</p>

      <label className={styles.label}>
        Your Name / Character Name
        <input className={styles.input} value={data.character_name} onChange={e => onChange({ character_name: e.target.value })} placeholder="e.g. Grace" />
      </label>

      <label className={styles.label}>
        Your Story (backstory for AI context)
        <textarea className={styles.textarea} rows={3} value={data.backstory} onChange={e => onChange({ backstory: e.target.value })} placeholder="e.g. Filipino mompreneur who turned paper crafting into a business. Started with zero experience..." />
      </label>

      <label className={styles.label}>
        Appearance (for AI image generation)
        <textarea className={styles.textarea} rows={2} value={data.appearance} onChange={e => onChange({ appearance: e.target.value })} placeholder="e.g. Filipino woman, 30s, warm smile, casual-professional style" />
      </label>

      <div className={styles.label}>
        Reference Photos (3-6 recommended)
        {previews.length > 0 && (
          <div className={styles.photoGrid}>
            {previews.map((url, i) => (
              <img key={i} src={url} alt={`Ref ${i + 1}`} className={styles.photoThumb} />
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={e => handleUpload(e.target.files)}
          className={styles.fileInput}
        />
        {uploading && <span className={styles.hint}>Uploading...</span>}
        <p className={styles.hint}>Upload clear photos from different angles. AI uses these to generate images that look like you.</p>
      </div>

      <label className={styles.label}>
        Voice Style
        <select className={styles.input} value={data.voice_preset} onChange={e => onChange({ voice_preset: e.target.value })}>
          <option value="warm_empowering">🤗 Warm & Empowering (Ate Energy)</option>
          <option value="professional_mommy">👩‍💼 Professional Mommy</option>
          <option value="bestie_vibes">💬 Bestie Vibes (Casual, Fun)</option>
          <option value="hustle_queen">🔥 Hustle Queen (Motivational)</option>
          <option value="expert_teacher">📚 Expert Teacher (Educational)</option>
          <option value="custom">✏️ Custom</option>
        </select>
      </label>

      {data.voice_preset === 'custom' && (
        <label className={styles.label}>
          Custom Voice Notes
          <textarea className={styles.textarea} rows={3} value={data.custom_voice_notes} onChange={e => onChange({ custom_voice_notes: e.target.value })} placeholder="Describe how you talk, your catchphrases, tone..." />
        </label>
      )}
    </div>
  )
}
