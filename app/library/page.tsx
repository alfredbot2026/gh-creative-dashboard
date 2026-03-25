/**
 * My Content — Unified content hub.
 * Replaces separate Calendar + Library with one feed.
 * Sections: Drafts → Upcoming → Published
 */
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar, List, Sparkles } from 'lucide-react'
import styles from './page.module.css'
import ContentFeed from '@/components/content/ContentFeed'

export default async function MyContentPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch all content items
  const { data: allItems } = await supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const items = allItems || []

  // Split into sections
  const drafts = items.filter(i => !i.scheduled_date || i.status === 'draft')
  const upcoming = items.filter(i => i.scheduled_date && i.scheduled_date >= today && i.status !== 'draft' && i.status !== 'published')
  const published = items.filter(i => i.status === 'published' || (i.published_at))
  // Recently created but not yet scheduled/published
  const created = items.filter(i => i.status === 'created' && !i.published_at)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Content</h1>
          <p className={styles.subtitle}>{items.length} total · {drafts.length} drafts · {upcoming.length} upcoming</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/create" className={styles.createBtn}>
            <Plus size={16} /> Create
          </Link>
        </div>
      </header>

      <ContentFeed
        drafts={drafts}
        upcoming={upcoming}
        created={created}
        published={published}
      />
    </div>
  )
}
