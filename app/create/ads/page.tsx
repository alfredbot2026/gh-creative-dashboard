'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import QualityBadge from '@/components/create/QualityBadge'
import { addAdToCalendar } from '@/app/actions/create'
import type { AdGenerationRequest, AdGenerationResponse, AdVariant } from '@/lib/create/ad-types'
import type { CarouselGenerationResponse, CarouselSlide } from '@/lib/create/carousel-types'
import {
  Wand2,
  Sparkles,
  Settings,
  CalendarPlus,
  RotateCw,
  BookOpen,
  LayoutTemplate,
  Image as ImageIcon,
  Download,
  Layers
} from 'lucide-react'
import layout from '@/app/create/layout.module.css'
import styles from './page.module.css'

// Framework → CSS var mapping (no hardcoded hex)
const FRAMEWORK_COLORS: Record<string, string> = {
  PAS: 'var(--color-primary)',
  AIDA: 'var(--accent-emerald)',
  before_after: 'var(--accent-violet)',
  FAB: 'var(--color-warning)',
  urgency: 'var(--color-danger)',
  social_proof: 'var(--color-primary)',
}

function getFrameworkColor(framework: string): string {
  return FRAMEWORK_COLORS[framework] ?? 'var(--color-text-muted)'
}

// Slide role → color for carousel badges
const ROLE_COLORS: Record<string, string> = {
  hook: 'var(--accent-purple)',
  problem: 'var(--color-danger)',
  agitate: 'var(--color-warning)',
  solution: 'var(--accent-emerald)',
  proof: 'var(--color-primary)',
  cta: 'var(--accent-violet)',
}

const CAROUSEL_STYLES = [
  { value: 'educational', label: 'Educational' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'product-showcase', label: 'Product Showcase' },
  { value: 'testimonial', label: 'Testimonial' },
]

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Learn More',
  SHOP_NOW: 'Shop Now',
  SIGN_UP: 'Sign Up',
  GET_OFFER: 'Get Offer',
  BOOK_NOW: 'Book Now',
  CONTACT_US: 'Contact Us',
}

export default function AdsCreationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<AdGenerationResponse | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')

  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set())
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({})
  const [isGeneratingImage, setIsGeneratingImage] = useState<Record<string, boolean>>({})

  // Carousel state
  const [carouselResult, setCarouselResult] = useState<CarouselGenerationResponse | null>(null)
  const [slideImages, setSlideImages] = useState<Record<number, string | null>>({})
  const [generatingSlide, setGeneratingSlide] = useState<number | null>(null)
  const [generatingAllImages, setGeneratingAllImages] = useState(false)
  const [carouselSlideCount, setCarouselSlideCount] = useState(5)
  const [carouselStyle, setCarouselStyle] = useState('educational')

  const [formData, setFormData] = useState<AdGenerationRequest>({
    product: '',
    offer_details: '',
    objective: 'conversions',
    ad_format: 'static',
    platform: 'facebook'
  })

  const handleGenerate = async () => {
    if (!formData.product) return alert('Product Name is required')

    setLoading(true)
    try {
      if (formData.ad_format === 'carousel') {
        // Carousel generation
        const res = await fetch('/api/create/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: formData.product,
            offer_details: formData.offer_details || undefined,
            objective: formData.objective,
            platform: formData.platform,
            slide_count: carouselSlideCount,
            style: carouselStyle,
          })
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Carousel generation failed')
        }

        const data: CarouselGenerationResponse = await res.json()
        setCarouselResult(data)
        setResult(null)
        setSlideImages({})
        setGeneratingSlide(null)
      } else {
        // Standard ad generation
        const res = await fetch('/api/create/ad', {
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
        setCarouselResult(null)
        setSelectedVariants(new Set())
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSlideImage = async (slide: CarouselSlide) => {
    if (!carouselResult) return
    setGeneratingSlide(slide.slide_number)
    try {
      const res = await fetch('/api/create/carousel/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: [slide],
          carousel_theme: carouselResult.carousel_theme,
        })
      })
      if (!res.ok) throw new Error('Image generation failed')
      const data = await res.json()
      if (data.results?.[0]?.image_url) {
        setSlideImages(prev => ({ ...prev, [slide.slide_number]: data.results[0].image_url }))
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setGeneratingSlide(null)
    }
  }

  const handleGenerateAllSlideImages = async () => {
    if (!carouselResult) return
    setGeneratingAllImages(true)
    for (const slide of carouselResult.slides) {
      if (slideImages[slide.slide_number]) continue // skip already generated
      setGeneratingSlide(slide.slide_number)
      try {
        const res = await fetch('/api/create/carousel/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slides: [slide],
            carousel_theme: carouselResult.carousel_theme,
          })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.results?.[0]?.image_url) {
            setSlideImages(prev => ({ ...prev, [slide.slide_number]: data.results[0].image_url }))
          }
        }
      } catch (err) {
        console.error(`Slide ${slide.slide_number} image failed:`, err)
      }
    }
    setGeneratingSlide(null)
    setGeneratingAllImages(false)
  }

  const handleGenerateImage = async (variant: AdVariant) => {
    setIsGeneratingImage(prev => ({ ...prev, [variant.id]: true }))
    try {
      const res = await fetch('/api/create/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: variant.image_prompt, style: 'promotional', aspect_ratio: '1:1' })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Image generation failed')
      }

      const data = await res.json()
      setGeneratedImages(prev => ({ ...prev, [variant.id]: data.image_url }))
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setIsGeneratingImage(prev => ({ ...prev, [variant.id]: false }))
    }
  }

  const toggleVariantSelection = (id: string) => {
    const newSelected = new Set(selectedVariants)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedVariants(newSelected)
  }

  const handleSaveToCalendar = async () => {
    if (!result?.variants || selectedVariants.size === 0) return

    setSaving(true)
    try {
      const variantsToSave = result.variants.filter(v => selectedVariants.has(v.id))
      for (const variant of variantsToSave) {
        await addAdToCalendar(variant, generatedImages[variant.id], scheduledDate || undefined)
      }
      alert('Successfully saved selected ads to calendar!')
      router.push('/calendar')
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    const variantsToDownload = result?.variants.filter(v => selectedVariants.has(v.id)) || []
    for (const variant of variantsToDownload) {
      const url = generatedImages[variant.id]
      if (!url) continue
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const objectUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = `ad-creative-${variant.id}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(objectUrl)
      } catch (err) {
        console.error('Failed to download image:', err)
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Ad Copy Generator"
        subtitle="Create high-converting ad copy and creatives tailored for your brand"
      />

      <div className={layout.layout}>
        {/* Left Panel: Configuration */}
        <div className={layout.panel}>
          <h2 className={layout.panelTitle}>
            <Settings size={18} />
            Ad Settings
          </h2>

          <div className={layout.formGroup}>
            <label className={layout.label}>Product / Offer Name (Required)</label>
            <input
              type="text"
              className={layout.input}
              placeholder="e.g. Papers to Profits Course"
              value={formData.product}
              onChange={e => setFormData({ ...formData, product: e.target.value })}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Offer Details</label>
            <textarea
              className={layout.input}
              rows={3}
              placeholder="e.g. Complete paper crafting course - ₱2,997, includes 3 bonuses"
              value={formData.offer_details}
              onChange={e => setFormData({ ...formData, offer_details: e.target.value })}
            />
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Objective</label>
            <select
              className={layout.select}
              value={formData.objective}
              onChange={e => setFormData({ ...formData, objective: e.target.value as any })}
            >
              <option value="conversions">Conversions</option>
              <option value="awareness">Brand Awareness</option>
              <option value="traffic">Traffic</option>
            </select>
          </div>

          <div className={layout.formGroup}>
            <label className={layout.label}>Format</label>
            <select
              className={layout.select}
              value={formData.ad_format}
              onChange={e => setFormData({ ...formData, ad_format: e.target.value as any })}
            >
              <option value="static">Static Image</option>
              <option value="video_script">Video Script</option>
              <option value="carousel">Carousel</option>
            </select>
          </div>

          {formData.ad_format === 'carousel' && (
            <>
              <div className={layout.formGroup}>
                <label className={layout.label}>Slide Count</label>
                <select
                  className={layout.select}
                  value={carouselSlideCount}
                  onChange={e => setCarouselSlideCount(Number(e.target.value))}
                >
                  {[3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>{n} slides</option>
                  ))}
                </select>
              </div>

              <div className={layout.formGroup}>
                <label className={layout.label}>Carousel Style</label>
                <select
                  className={layout.select}
                  value={carouselStyle}
                  onChange={e => setCarouselStyle(e.target.value)}
                >
                  {CAROUSEL_STYLES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={layout.formGroup}>
            <label className={layout.label}>Platform</label>
            <select
              className={layout.select}
              value={formData.platform}
              onChange={e => setFormData({ ...formData, platform: e.target.value as any })}
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          <button
            className={layout.generateBtn}
            onClick={handleGenerate}
            disabled={loading || !formData.product}
          >
            {loading ? <RotateCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
            {loading ? 'Generating...' : formData.ad_format === 'carousel' ? 'Generate Carousel' : 'Generate Ad Variants'}
          </button>
        </div>

        {/* Center Panel: Variants */}
        <div className={layout.panel} style={{ padding: (result || carouselResult) ? 'var(--space-xl)' : 'var(--space-lg)' }}>
          {carouselResult ? (
            <div className={styles.variantsGrid}>
              <div className={styles.variantsHeader}>
                <h3 className={styles.variantsTitle}>
                  <Layers size={18} /> Carousel ({carouselResult.slides.length} slides)
                </h3>
                <span className={styles.provenanceMeta}>
                  Theme: {carouselResult.carousel_theme}
                </span>
              </div>

              <div className={styles.carouselStrip}>
                {carouselResult.slides.map((slide) => {
                  const roleColor = ROLE_COLORS[slide.role] || 'var(--color-text-muted)'
                  const imgUrl = slideImages[slide.slide_number]
                  const isGenImg = generatingSlide === slide.slide_number

                  return (
                    <div key={slide.slide_number} className={styles.slideCard}>
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

                      {imgUrl ? (
                        <div className={styles.slideImage}>
                          <img src={imgUrl} alt={`Slide ${slide.slide_number}`} />
                        </div>
                      ) : (
                        <div className={styles.slideImagePlaceholder}>
                          <ImageIcon size={24} style={{ color: 'var(--color-text-muted)' }} />
                          <button
                            onClick={() => handleGenerateSlideImage(slide)}
                            disabled={isGenImg || generatingAllImages}
                            className={styles.slideGenBtn}
                          >
                            {isGenImg ? <RotateCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                            {isGenImg ? 'Generating...' : 'Gen Image'}
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
                })}
              </div>

              {carouselResult.caption && (
                <div className={styles.carouselCaption}>
                  <h4>Caption</h4>
                  <p>{carouselResult.caption}</p>
                  {carouselResult.hashtags?.length > 0 && (
                    <p className={styles.hashtags}>{carouselResult.hashtags.map(h => `#${h}`).join(' ')}</p>
                  )}
                </div>
              )}

              {carouselResult.brand_voice_score !== undefined && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <QualityBadge score={{
                    composite: carouselResult.brand_voice_score > 1 ? carouselResult.brand_voice_score / 100 : carouselResult.brand_voice_score,
                    passed_gate: (carouselResult.brand_voice_score > 1 ? carouselResult.brand_voice_score / 100 : carouselResult.brand_voice_score) >= 0.8,
                    feedback: []
                  }} />
                </div>
              )}
            </div>
          ) : !result ? (
            <div className={layout.emptyState}>
              <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3>No Variants Generated</h3>
              <p>Fill out the settings on the left and click Generate to create ad variations backed by your brand guide.</p>
            </div>
          ) : (
            <div className={styles.variantsGrid}>
              <div className={styles.variantsHeader}>
                <h3 className={styles.variantsTitle}>Generated Variants ({result.variants.length})</h3>
                <span className={styles.provenanceMeta}>Model: {result.generation_provenance.model}</span>
              </div>

              <div className={styles.variantsGridInner}>
                {result.variants.map((variant) => {
                  const isSelected = selectedVariants.has(variant.id)
                  const imageUrl = generatedImages[variant.id]
                  const isGeneratingImg = isGeneratingImage[variant.id]
                  const fwColor = getFrameworkColor(variant.framework_used)
                  const normalizedScore = variant.brand_voice_score > 1
                    ? variant.brand_voice_score / 100
                    : variant.brand_voice_score

                  return (
                    <div
                      key={variant.id}
                      className={`${styles.adVariantCard} ${isSelected ? styles.selected : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.cardCheckbox}
                        checked={isSelected}
                        onChange={() => toggleVariantSelection(variant.id)}
                      />

                      <div className={styles.cardBadgeRow}>
                        <span
                          className={styles.frameworkBadge}
                          style={{
                            backgroundColor: `color-mix(in srgb, ${fwColor} 20%, transparent)`,
                            color: fwColor
                          }}
                        >
                          {variant.framework_used}
                        </span>
                        <QualityBadge score={{
                          composite: normalizedScore,
                          passed_gate: normalizedScore >= 0.8,
                          feedback: []
                        }} />
                      </div>

                      {imageUrl ? (
                        <div className={styles.imagePreview}>
                          <img src={imageUrl} alt={variant.headline} />
                        </div>
                      ) : (
                        <div className={styles.imagePlaceholder}>
                          <ImageIcon size={32} style={{ color: 'var(--color-text-muted)' }} />
                          <button
                            onClick={() => handleGenerateImage(variant)}
                            disabled={isGeneratingImg}
                            className={layout.actionBtn}
                            style={{ width: 'auto', padding: '6px 16px', margin: 0 }}
                          >
                            {isGeneratingImg ? <RotateCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            {isGeneratingImg ? 'Generating...' : 'Generate Image'}
                          </button>
                        </div>
                      )}

                      <h4 className={styles.adHeadline}>{variant.headline}</h4>
                      <p className={styles.adPrimaryText}>{variant.primary_text}</p>
                      <p className={styles.adDescription}>{variant.description}</p>

                      <div className={styles.ctaPreview}>
                        <span className={styles.ctaLabel}>{CTA_LABELS[variant.cta] ?? variant.cta}</span>
                        <span className={styles.ctaType}>Button CTA</span>
                      </div>

                      <div className={styles.cardActions}>
                        <button className={styles.cardActionBtn}>
                          <RotateCw size={14} /> Regenerate Copy
                        </button>
                        {imageUrl && (
                          <button
                            className={styles.cardActionBtn}
                            onClick={() => handleGenerateImage(variant)}
                            disabled={isGeneratingImg}
                          >
                            {isGeneratingImg
                              ? <RotateCw className="animate-spin" size={14} />
                              : <RotateCw size={14} />}
                            Regen Image
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
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
              disabled={(!result && !carouselResult) || loading}
            >
              <RotateCw size={16} />
              Regenerate All
            </button>

            {carouselResult && (
              <button
                className={layout.actionBtn}
                onClick={handleGenerateAllSlideImages}
                disabled={generatingAllImages}
              >
                {generatingAllImages ? <RotateCw className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                {generatingAllImages
                  ? `Generating slide ${generatingSlide || '...'}...`
                  : 'Generate All Images'}
              </button>
            )}

            <button
              className={layout.actionBtn}
              onClick={handleDownload}
              disabled={!result || selectedVariants.size === 0}
            >
              <Download size={16} />
              Download Selected
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
                disabled={!result || saving || selectedVariants.size === 0}
              >
                <CalendarPlus size={16} />
                {saving ? 'Saving...' : 'Add to Calendar'}
              </button>
              {result && selectedVariants.size === 0 && (
                <p className={styles.selectionHint}>Select at least one variant</p>
              )}
            </div>
          </div>

          <div className={layout.sidebarSection}>
            <h4>Knowledge Used</h4>
            {(result || carouselResult) ? (
              <ul className={layout.itemList}>
                {result && Array.from(new Set(result.variants.flatMap(v => v.knowledge_entries_used))).map((entry, i) => (
                  <li key={`entry-${i}`} className={layout.itemListItem}>
                    <BookOpen size={14} className={layout.knowledgeIconPurple} />
                    <span className={layout.knowledgeText}>{entry}</span>
                  </li>
                ))}
                {carouselResult?.techniques_used?.map((tech, i) => (
                  <li key={`tech-${i}`} className={layout.itemListItem}>
                    <BookOpen size={14} className={layout.knowledgeIconPurple} />
                    <span className={layout.knowledgeText}>{tech.entry_title} — {tech.how_applied}</span>
                  </li>
                ))}
                {result && result.variants.every(v => v.knowledge_entries_used.length === 0) && !carouselResult && (
                  <li className={`${layout.itemListItem} ${layout.textMuted}`}>
                    No specific KB entries referenced.
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
