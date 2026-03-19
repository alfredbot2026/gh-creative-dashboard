/**
 * Library — Past creations archive.
 * Searchable, filterable list of everything Grace has created.
 */
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Search,
  PenTool,
  Megaphone,
  MessageCircle,
  Film,
  Copy,
  Sparkles,
} from 'lucide-react'
import styles from './page.module.css'

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  'short-form': { icon: '📱', label: 'Script', color: 'var(--color-reel)' },
  'ads': { icon: '🎯', label: 'Ad', color: 'var(--color-primary)' },
  'ad': { icon: '🎯', label: 'Ad', color: 'var(--color-primary)' },
  'social-post': { icon: '📸', label: 'Post', color: 'var(--color-success)' },
  'youtube': { icon: '🎬', label: 'YouTube', color: 'var(--color-danger)' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        <p className={styles.subtitle}>{items?.length || 0} creations</p>
      </header>

      {items && items.length > 0 ? (
        <div className={styles.list}>
          {items.map((item) => {
            const meta = TYPE_META[item.content_type] || TYPE_META['short-form']
            const scriptData = item.script_data as any
            const preview = scriptData?.hook || scriptData?.headline || scriptData?.caption || item.title || 'Untitled'

            return (
              <Link key={item.id} href={`/library/${item.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.typeIcon}>{meta.icon}</span>
                  <span className={styles.typeLabel}>{meta.label}</span>
                  <span className={styles.date}>{formatDate(item.created_at)}</span>
                </div>
                <p className={styles.preview}>{preview}</p>
                <div className={styles.cardBottom}>
                  {item.platform && (
                    <span className={styles.chip}>{item.platform}</span>
                  )}
                  <span className={`${styles.statusDot} ${item.status === 'published' ? styles.published : ''}`} />
                  <span className={styles.statusText}>{item.status || 'draft'}</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Sparkles size={32} strokeWidth={1.5} />
          <h3>No creations yet</h3>
          <p>Everything you create will appear here. Start by creating your first post!</p>
          <Link href="/create" className={styles.emptyBtn}>
            ✨ Create something
          </Link>
        </div>
      )}
    </div>
  )
}
