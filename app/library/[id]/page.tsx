/**
 * Library Item Detail — View a single creation.
 */
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy } from 'lucide-react'
import styles from './page.module.css'

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
  const hook = scriptData?.hook as string || scriptData?.headline as string || ''
  
  // Format content neatly based on what's available
  let contentNodes = []
  if (scriptData?.scenes) {
    contentNodes = (scriptData.scenes as Array<any>).map((s, i) => (
      <div key={i} className={styles.contentBlock}>
        <div className={styles.contentMeta}>Scene {s.sceneNumber}</div>
        <div className={styles.contentVisual}>[{s.visual}]</div>
        <div className={styles.contentAudio}>{s.voiceover}</div>
      </div>
    ))
  } else if (scriptData?.primaryText) {
    contentNodes = [
      <div key="1" className={styles.contentBlock}>
        <div className={styles.contentAudio}>{scriptData.primaryText as string}</div>
        <div className={styles.contentVisual}>[{scriptData.imagePrompt as string}]</div>
      </div>
    ]
  } else if (scriptData?.caption) {
    contentNodes = [
      <div key="1" className={styles.contentBlock}>
        <div className={styles.contentAudio}>{scriptData.caption as string}</div>
        <div className={styles.contentMeta}>{(scriptData.hashtags as string[])?.join(' ')}</div>
      </div>
    ]
  } else {
    contentNodes = [<p key="1">{JSON.stringify(scriptData, null, 2)}</p>]
  }

  return (
    <div className={styles.page}>
      <Link href="/library" className={styles.back}>
        <ArrowLeft size={16} />
        Back to Library
      </Link>

      <header className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.type}>{item.content_type}</span>
          {item.platform && <span className={styles.platform}>• {item.platform}</span>}
        </div>
        <h1 className={styles.title}>{hook || item.title || 'Untitled'}</h1>
        <span className={styles.date}>
          {new Date(item.created_at).toLocaleDateString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric' 
          })}
        </span>
      </header>

      <div className={styles.contentContainer}>
        {contentNodes}
      </div>

      <div className={styles.actions}>
        <button className={styles.btnOutline}>
          <Copy size={16} /> Copy
        </button>
      </div>
    </div>
  )
}
