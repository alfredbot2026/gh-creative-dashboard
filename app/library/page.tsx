/**
 * Library — Past creations archive.
 */
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, Library as LibraryIcon } from 'lucide-react'
import styles from './page.module.css'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function LibraryPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Library</h1>
        <p className={styles.subtitle}>{items?.length || 0} creations saved</p>
      </header>

      {items && items.length > 0 ? (
        <div className={styles.list}>
          {items.map((item) => {
            const scriptData = item.script_data as any
            const preview = scriptData?.hook || scriptData?.headline || scriptData?.caption || item.title || 'Untitled'
            const score = scriptData?.qualityScore || 85

            return (
              <Link key={item.id} href={`/library/${item.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.typeLabel}>{item.content_type}</span>
                  <span className={styles.date}>{formatDate(item.created_at)}</span>
                </div>
                <h3 className={styles.preview}>{preview}</h3>
                <div className={styles.cardBottom}>
                  {item.platform && (
                    <span className={styles.platform}>{item.platform}</span>
                  )}
                  <div className={styles.scoreBadge}>
                    <Sparkles size={12} />
                    {score}%
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <LibraryIcon size={32} strokeWidth={1.5} className={styles.emptyIcon} />
          <h3>No creations yet</h3>
          <p>Everything you save will safely live here.</p>
          <Link href="/create" className={styles.emptyBtn}>
            Create something
          </Link>
        </div>
      )}
    </div>
  )
}
