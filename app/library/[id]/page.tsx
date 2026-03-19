/**
 * Library Item Detail — View a single creation.
 */
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, Calendar } from 'lucide-react'
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
  const content = scriptData?.caption as string || 
    (scriptData?.scenes as Array<{ voiceover: string }>)?.map(s => s.voiceover).join('\n\n') || 
    scriptData?.primary_text as string || 
    JSON.stringify(scriptData, null, 2)

  return (
    <div className={styles.page}>
      <Link href="/library" className={styles.back}>
        <ArrowLeft size={16} />
        Library
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{item.title || hook || 'Untitled'}</h1>
        <div className={styles.meta}>
          <span className={styles.type}>{item.content_type}</span>
          {item.platform && <span className={styles.platform}>{item.platform}</span>}
          <span className={styles.date}>
            {new Date(item.created_at).toLocaleDateString('en-US', { 
              month: 'long', day: 'numeric', year: 'numeric' 
            })}
          </span>
        </div>
      </header>

      {hook && hook !== item.title && (
        <div className={styles.hook}>
          {hook}
        </div>
      )}

      <div className={styles.content}>
        {content.split('\n\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  )
}
