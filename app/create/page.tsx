'use client'

/**
 * Create Hub — Unified entry point for all content creation.
 * 
 * "What are you creating?" → type selection → routes to generator
 * Accepts ?topic and ?purpose query params to pre-fill from Today page suggestions.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PenTool, Megaphone, MessageCircle, Film, Sparkles } from 'lucide-react'
import styles from './create-hub.module.css'

const CONTENT_TYPES = [
  {
    id: 'short-form',
    label: 'Script',
    description: 'Short-form video scripts for Reels & TikTok',
    icon: PenTool,
    href: '/create/short-form',
    emoji: '📱',
  },
  {
    id: 'ads',
    label: 'Ad',
    description: 'Ad copy + images for Facebook & Instagram',
    icon: Megaphone,
    href: '/create/ads',
    emoji: '🎯',
  },
  {
    id: 'social-post',
    label: 'Social Post',
    description: 'Captions, hashtags & image concepts',
    icon: MessageCircle,
    href: '/create/social-post',
    emoji: '📸',
  },
  {
    id: 'youtube',
    label: 'YouTube Script',
    description: 'Full scripts with hooks, SEO tags & thumbnails',
    icon: Film,
    href: '/create/youtube',
    emoji: '🎬',
  },
]

function CreateHubInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topic = searchParams.get('topic') || ''
  const purpose = searchParams.get('purpose') || ''

  const handleSelect = (href: string) => {
    const params = new URLSearchParams()
    if (topic) params.set('topic', topic)
    if (purpose) params.set('purpose', purpose)
    const qs = params.toString()
    router.push(qs ? `${href}?${qs}` : href)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Sparkles size={24} strokeWidth={1.5} className={styles.headerIcon} />
        <h1 className={styles.title}>What are you creating?</h1>
        {topic && (
          <p className={styles.topicHint}>
            Idea: &ldquo;{topic}&rdquo;
          </p>
        )}
      </header>

      <div className={styles.grid}>
        {CONTENT_TYPES.map((type) => (
          <button
            key={type.id}
            className={styles.card}
            onClick={() => handleSelect(type.href)}
          >
            <span className={styles.cardEmoji}>{type.emoji}</span>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{type.label}</span>
              <span className={styles.cardDesc}>{type.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CreateHubPage() {
  return (
    <Suspense>
      <CreateHubInner />
    </Suspense>
  )
}
