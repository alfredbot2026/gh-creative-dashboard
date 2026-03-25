'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, List, ChevronRight, MoreHorizontal, Trash2, CalendarPlus, ExternalLink } from 'lucide-react'
import styles from './ContentFeed.module.css'

interface ContentItem {
  id: string
  title: string
  content_type: string
  platform: string
  scheduled_date: string | null
  status: string
  hook: string | null
  created_at: string
  published_at: string | null
  script_data: any
  ai_generated: boolean
}

interface ContentFeedProps {
  drafts: ContentItem[]
  upcoming: ContentItem[]
  created: ContentItem[]
  published: ContentItem[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#94a3b8' },
  planned: { label: 'Planned', color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  created: { label: 'Ready', color: '#22c55e' },
  published: { label: 'Published', color: '#8b5cf6' },
}

const TYPE_LABELS: Record<string, string> = {
  'short-form': 'Reel',
  reel: 'Reel',
  youtube: 'YouTube',
  'facebook-post': 'FB Post',
  'facebook-ad': 'FB Ad',
  ad: 'Ad',
  carousel: 'Carousel',
  story: 'Story',
  post: 'Post',
  educate: 'Educate',
  sell: 'Sell',
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function ContentCard({ item }: { item: ContentItem }) {
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.draft
  const typeLabel = TYPE_LABELS[item.content_type] || item.content_type
  const preview = item.hook || item.title || 'Untitled'
  const score = item.script_data?.qualityScore

  return (
    <Link href={`/library/${item.id}`} className={styles.card}>
      <div className={styles.cardMain}>
        <div className={styles.cardMeta}>
          <span className={styles.typeTag}>{typeLabel}</span>
          {item.platform && <span className={styles.platformTag}>{item.platform}</span>}
          <span className={styles.statusDot} style={{ background: status.color }} title={status.label} />
          <span className={styles.statusText} style={{ color: status.color }}>{status.label}</span>
        </div>
        <p className={styles.cardTitle}>{preview}</p>
        <div className={styles.cardFooter}>
          {item.scheduled_date && (
            <span className={styles.dateText}>
              <Calendar size={12} /> {formatFullDate(item.scheduled_date)}
            </span>
          )}
          {!item.scheduled_date && (
            <span className={styles.dateText}>
              Created {formatDate(item.created_at)}
            </span>
          )}
          {score && <span className={styles.score}>{score}/10</span>}
        </div>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </Link>
  )
}

function Section({ title, count, items, emptyText }: { title: string; count: number; items: ContentItem[]; emptyText: string }) {
  if (items.length === 0) return null

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionCount}>{count}</span>
      </div>
      <div className={styles.cardList}>
        {items.map(item => <ContentCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}

export default function ContentFeed({ drafts, upcoming, created, published }: ContentFeedProps) {
  const totalItems = drafts.length + upcoming.length + created.length + published.length

  if (totalItems === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No content yet</p>
        <p className={styles.emptyText}>Everything you create will appear here.</p>
        <Link href="/create" className={styles.emptyBtn}>Create your first content</Link>
      </div>
    )
  }

  return (
    <div className={styles.feed}>
      <Section title="Drafts" count={drafts.length} items={drafts.slice(0, 10)} emptyText="No drafts" />
      <Section title="Ready to Post" count={created.length} items={created.slice(0, 10)} emptyText="Nothing ready" />
      <Section title="Upcoming" count={upcoming.length} items={upcoming.slice(0, 10)} emptyText="Nothing scheduled" />
      <Section title="Published" count={published.length} items={published.slice(0, 20)} emptyText="Nothing published yet" />
    </div>
  )
}
