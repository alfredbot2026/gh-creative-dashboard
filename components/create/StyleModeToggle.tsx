'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './StyleModeToggle.module.css'

export type StyleMode = 'polished' | 'ugc'

interface Props {
  value: StyleMode
  onChange: (mode: StyleMode) => void
  /** When UGC, show reference photos to pick from */
  onPhotoSelect?: (url: string | null) => void
  selectedPhoto?: string | null
}

interface RefPhoto {
  path: string
  signedUrl: string
}

export default function StyleModeToggle({ value, onChange, onPhotoSelect, selectedPhoto }: Props) {
  const [refPhotos, setRefPhotos] = useState<RefPhoto[]>([])
  const [uploadingOwn, setUploadingOwn] = useState(false)
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null)

  // Load reference photos when switching to UGC
  useEffect(() => {
    if (value !== 'ugc') return

    const loadPhotos = async () => {
      const supabase = createClient()
      const { data: persona } = await supabase
        .from('brand_persona')
        .select('reference_images, avatar_url')
        .limit(1)
        .maybeSingle()

      if (!persona) return

      const paths: string[] = (persona.reference_images as string[]) || []
      if (!paths.length && persona.avatar_url) paths.push(persona.avatar_url)

      // Get signed URLs for all
      const photos: RefPhoto[] = []
      for (const path of paths) {
        const { data } = await supabase.storage.from('ad-creatives').createSignedUrl(path, 3600)
        if (data?.signedUrl) {
          photos.push({ path, signedUrl: data.signedUrl })
        }
      }
      setRefPhotos(photos)
    }

    loadPhotos()
  }, [value])

  const handleUploadOwn = async (files: FileList | null) => {
    if (!files?.[0]) return
    setUploadingOwn(true)
    try {
      const fd = new FormData()
      fd.append('photos', files[0])
      const res = await fetch('/api/persona/avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const result = await res.json()
      const url = result.signed_urls?.[0]
      if (url) {
        setCustomPhotoUrl(url)
        onPhotoSelect?.(url)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploadingOwn(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>Image Style</div>
      <div className={styles.toggle}>
        <button
          className={`${styles.option} ${value === 'polished' ? styles.active : ''}`}
          onClick={() => { onChange('polished'); onPhotoSelect?.(null) }}
        >
          <span className={styles.icon}>✨</span>
          <span className={styles.text}>AI Polished</span>
        </button>
        <button
          className={`${styles.option} ${value === 'ugc' ? styles.active : ''}`}
          onClick={() => onChange('ugc')}
        >
          <span className={styles.icon}>📱</span>
          <span className={styles.text}>My Photo (UGC)</span>
        </button>
      </div>

      {value === 'ugc' && (
        <div className={styles.photoSection}>
          <p className={styles.hint}>Pick a reference photo or upload your own — this becomes the ad image directly.</p>

          {refPhotos.length > 0 && (
            <div className={styles.photoGrid}>
              {refPhotos.map((photo, i) => (
                <button
                  key={i}
                  className={`${styles.photoThumb} ${selectedPhoto === photo.signedUrl ? styles.selected : ''}`}
                  onClick={() => onPhotoSelect?.(photo.signedUrl)}
                >
                  <img src={photo.signedUrl} alt={`Reference ${i + 1}`} />
                  {selectedPhoto === photo.signedUrl && <span className={styles.check}>✓</span>}
                </button>
              ))}
            </div>
          )}

          <div className={styles.uploadRow}>
            <label className={styles.uploadBtn}>
              📤 Upload Your Own Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => handleUploadOwn(e.target.files)}
                hidden
              />
            </label>
            {uploadingOwn && <span className={styles.uploading}>Uploading...</span>}
          </div>

          {customPhotoUrl && (
            <div className={styles.photoGrid}>
              <button
                className={`${styles.photoThumb} ${selectedPhoto === customPhotoUrl ? styles.selected : ''}`}
                onClick={() => onPhotoSelect?.(customPhotoUrl)}
              >
                <img src={customPhotoUrl} alt="Uploaded" />
                {selectedPhoto === customPhotoUrl && <span className={styles.check}>✓</span>}
              </button>
            </div>
          )}

          {!selectedPhoto && refPhotos.length > 0 && (
            <p className={styles.selectHint}>Select a photo above to use as your ad image</p>
          )}
        </div>
      )}
    </div>
  )
}
