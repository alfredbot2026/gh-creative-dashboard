import React from 'react'
import type { CarouselSlide } from '@/lib/create/carousel-types'
import { Sparkles, RotateCw, Image as ImageIcon, Download } from 'lucide-react'
import styles from './CarouselSlideCard.module.css'

interface CarouselSlideCardProps {
  slide: CarouselSlide
  imageUrl?: string | null
  isGeneratingImage?: boolean
  onGenerateImage: () => void
  onDownloadImage: () => void
}

const ROLE_COLORS: Record<string, string> = {
  hook: 'var(--accent-purple)',
  problem: 'var(--color-danger)',
  agitate: 'var(--color-warning)',
  solution: 'var(--accent-emerald)',
  proof: 'var(--color-primary)',
  cta: 'var(--accent-violet)',
}

export default function CarouselSlideCard({
  slide,
  imageUrl,
  isGeneratingImage,
  onGenerateImage,
  onDownloadImage
}: CarouselSlideCardProps) {
  const roleColor = ROLE_COLORS[slide.role] || 'var(--color-text-muted)'

  return (
    <div className={styles.slideCard}>
      <div className={styles.slideHeader}>
        <span
          className={styles.roleBadge}
          style={{
            backgroundColor: `color-mix(in srgb, ${roleColor} 20%, transparent)`,
            color: roleColor,
          }}
        >
          {slide.role.toUpperCase()}
        </span>
        <span className={styles.slideNumber}>Slide {slide.slide_number}</span>
      </div>

      {imageUrl ? (
        <div className={styles.slideImage}>
          <img src={imageUrl} alt={`Slide ${slide.slide_number}`} />
          <button className={styles.downloadBtn} onClick={onDownloadImage} title="Download Image">
            <Download size={14} />
          </button>
        </div>
      ) : (
        <div className={styles.slideImagePlaceholder}>
          <ImageIcon size={24} style={{ color: 'var(--color-text-muted)' }} />
          <button
            onClick={onGenerateImage}
            disabled={isGeneratingImage}
            className={styles.slideGenBtn}
          >
            {isGeneratingImage ? <RotateCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
            {isGeneratingImage ? 'Generating...' : 'Gen Image'}
          </button>
        </div>
      )}

      <h4 className={styles.slideHeadline}>{slide.headline}</h4>
      <p className={styles.slideBody}>{slide.body_text}</p>
      {slide.text_overlay && (
        <p className={styles.slideOverlay}>📝 {slide.text_overlay}</p>
      )}
      {slide.cta_text && (
        <div className={styles.ctaPreview}>
          <span className={styles.ctaLabel}>{slide.cta_text}</span>
        </div>
      )}
    </div>
  )
}
