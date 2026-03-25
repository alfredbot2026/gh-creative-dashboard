/**
 * Library Item Detail — View a single creation with properly formatted content.
 */
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import styles from './page.module.css'
import DetailActions from './DetailActions'

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) return notFound()

  const scriptData = item.script_data as Record<string, unknown> | null
  const hook = item.hook || scriptData?.hook as string || scriptData?.headline as string || item.title || ''
  // Scenes can be at scriptData.scenes OR scriptData.content.scenes (varies by save format)
  const contentObj = scriptData?.content as Record<string, unknown> | undefined
  const scenes = (scriptData?.scenes as any[]) || (contentObj?.scenes as any[]) || []
  const slides = (scriptData?.slides as any[]) || (contentObj?.slides as any[]) || []
  const qualityScore = (scriptData?.qualityScore as number) || null

  return (
    <div className={styles.page}>
      <Link href="/library" className={styles.back}>
        <ArrowLeft size={16} />
        Back to My Content
      </Link>

      <header className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.type}>{item.content_type}</span>
          {item.platform && <span className={styles.platform}>{item.platform}</span>}
          {item.status && <span className={styles.status}>{item.status}</span>}
          {qualityScore && <span className={styles.score}>{qualityScore}/10</span>}
        </div>
        <h1 className={styles.title}>{hook}</h1>
        <span className={styles.date}>
          Created {new Date(item.created_at).toLocaleDateString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric' 
          })}
          {item.scheduled_date && ` · Scheduled for ${new Date(item.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </span>
      </header>

      <div className={styles.contentContainer}>
        {/* Structure-aware scenes (new format with block_label) */}
        {scenes.length > 0 && scenes[0]?.block_label ? (
          <div className={styles.blockList}>
            {scenes.map((s: any, i: number) => (
              <div key={i} className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={styles.blockLabel}>{s.block_label}</span>
                  {s.timing && <span className={styles.blockTiming}>{s.timing}</span>}
                </div>
                <p className={styles.blockText}>{s.script_text || s.voiceover || ''}</p>
                {(s.visual_direction || s.visual) && (
                  <p className={styles.blockVisual}>Visual: {s.visual_direction || s.visual}</p>
                )}
                {s.on_screen_text && (
                  <p className={styles.blockOnScreen}>On-screen: {s.on_screen_text}</p>
                )}
                {s.production_notes && (
                  <p className={styles.blockNotes}>Notes: {s.production_notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : scenes.length > 0 ? (
          /* Old format scenes */
          <div className={styles.blockList}>
            {scenes.map((s: any, i: number) => (
              <div key={i} className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={styles.blockLabel}>Scene {s.sceneNumber || i + 1}</span>
                </div>
                <p className={styles.blockText}>{s.voiceover || s.script_text || ''}</p>
                {(s.visual || s.visual_direction) && (
                  <p className={styles.blockVisual}>Visual: {s.visual || s.visual_direction}</p>
                )}
              </div>
            ))}
          </div>
        ) : slides.length > 0 ? (
          /* Carousel slides */
          <div className={styles.slideGrid}>
            {slides.map((s: any, i: number) => (
              <div key={i} className={styles.slide}>
                <span className={styles.slideNum}>Slide {s.slide_number || i + 1}</span>
                <p className={styles.slideText}>{s.text}</p>
                {s.subtext && <p className={styles.slideSubtext}>{s.subtext}</p>}
              </div>
            ))}
          </div>
        ) : scriptData?.headline ? (
          /* Ad format */
          <div className={styles.adContent}>
            <h3 className={styles.adHeadline}>{scriptData.headline as string}</h3>
            <p className={styles.adBody}>{String(scriptData.primaryText || scriptData.body || '')}</p>
            {typeof scriptData.imagePrompt === 'string' && (
              <p className={styles.blockVisual}>Image: {scriptData.imagePrompt}</p>
            )}
          </div>
        ) : scriptData?.caption ? (
          /* Caption format */
          <div className={styles.captionContent}>
            <p className={styles.captionText}>{scriptData.caption as string}</p>
            {(scriptData.hashtags as string[])?.length > 0 && (
              <p className={styles.hashtags}>{(scriptData.hashtags as string[]).map(h => `#${h.replace('#','')}`).join(' ')}</p>
            )}
          </div>
        ) : scriptData ? (
          /* Fallback: pretty-print JSON */
          <pre className={styles.rawJson}>{JSON.stringify(scriptData, null, 2)}</pre>
        ) : (
          <p className={styles.emptyContent}>No content data available</p>
        )}
      </div>

      {/* Notes */}
      {item.notes && (
        <div className={styles.notesSection}>
          <h3 className={styles.notesTitle}>Notes</h3>
          <p className={styles.notesText}>{item.notes}</p>
        </div>
      )}

      <DetailActions item={item} />
    </div>
  )
}
