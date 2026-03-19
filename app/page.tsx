/**
 * Today Page — Grace's Creative Hub
 * 
 * Answers one question: "What should I create right now?"
 * Shows: greeting, today's suggestions, this week's progress, quick create.
 */
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Calendar,
  PenTool,
  Megaphone,
  MessageCircle,
  Film,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import styles from './page.module.css'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

const CONTENT_TYPE_ICONS: Record<string, { icon: string; label: string; href: string }> = {
  'short-form': { icon: '📱', label: 'Script', href: '/create/short-form' },
  'ad': { icon: '🎯', label: 'Ad', href: '/create/ads' },
  'social-post': { icon: '📸', label: 'Post', href: '/create/social-post' },
  'youtube': { icon: '🎬', label: 'YouTube', href: '/create/youtube' },
}

const QUICK_CREATE = [
  { icon: PenTool, label: 'Script', href: '/create/short-form', color: 'var(--color-reel)' },
  { icon: Megaphone, label: 'Ad', href: '/create/ads', color: 'var(--color-primary)' },
  { icon: MessageCircle, label: 'Post', href: '/create/social-post', color: 'var(--color-success)' },
  { icon: Film, label: 'YouTube', href: '/create/youtube', color: 'var(--color-danger)' },
]

export default async function TodayPage() {
  const supabase = await createClient()

  // Get user's name from business profile
  const { data: profile } = await supabase
    .from('business_profile')
    .select('*')
    .limit(1)
    .single()

  const userName = (profile as any)?.owner_name?.split(' ')[0]
    || profile?.business_name?.split(' ')[0]
    || 'there'

  // Get today's calendar items
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: todayItems } = await supabase
    .from('content_items')
    .select('*')
    .eq('scheduled_date', todayStr)
    .order('created_at', { ascending: true })

  // Get calendar suggestions for content gaps
  const { data: calendarSuggestions } = await supabase
    .from('content_calendar')
    .select('*')
    .gte('suggested_date', todayStr)
    .order('suggested_date', { ascending: true })
    .limit(3)

  // Get this week's content stats
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const { data: weekItems } = await supabase
    .from('content_items')
    .select('*')
    .gte('scheduled_date', weekStart.toISOString().split('T')[0])
    .lte('scheduled_date', weekEnd.toISOString().split('T')[0])

  const publishedCount = weekItems?.filter(i => i.status === 'published').length || 0
  const draftCount = weekItems?.filter(i => i.status === 'draft').length || 0
  const totalWeek = weekItems?.length || 0

  // Get products for suggestion context
  const { data: products } = await supabase
    .from('product_catalog')
    .select('name, price')
    .eq('is_active', true)
    .limit(3)

  // Build smart suggestions (combining calendar + AI recommendations)
  const suggestions = buildSuggestions(calendarSuggestions, todayItems, products)

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <header className={styles.greeting}>
        <h1 className={styles.greetingText}>
          {getGreeting()}, {userName} <span className={styles.wave}>👋</span>
        </h1>
        <p className={styles.date}>{getFormattedDate()}</p>
      </header>

      {/* Today's Content Suggestions */}
      <section className={styles.suggestions}>
        <h2 className={styles.sectionLabel}>Today&apos;s content</h2>
        
        {suggestions.length > 0 ? (
          <div className={styles.suggestionCards}>
            {suggestions.map((s, i) => (
              <Link
                key={i}
                href={`${s.href}?topic=${encodeURIComponent(s.topic)}&purpose=${s.purpose}`}
                className={styles.suggestionCard}
              >
                <div className={styles.suggestionTop}>
                  <span className={styles.suggestionIcon}>{s.icon}</span>
                  <span className={styles.suggestionType}>{s.typeLabel}</span>
                </div>
                <p className={styles.suggestionTitle}>{s.topic}</p>
                <div className={styles.suggestionMeta}>
                  <span className={styles.purposeChip}>{s.purposeLabel}</span>
                  {s.platform && <span className={styles.platformChip}>{s.platform}</span>}
                </div>
                <div className={styles.createPrompt}>
                  <Sparkles size={14} />
                  <span>Create this</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptySuggestions}>
            <Sparkles size={32} strokeWidth={1.5} />
            <h3>Ready when you are</h3>
            <p>
              Pick a content type below and start creating.
              It takes less than 30 seconds.
            </p>
          </div>
        )}
      </section>

      {/* Quick Create */}
      <section className={styles.quickCreate}>
        <h2 className={styles.sectionLabel}>Quick create</h2>
        <div className={styles.quickGrid}>
          {QUICK_CREATE.map((item) => (
            <Link key={item.label} href={item.href} className={styles.quickCard}>
              <item.icon size={20} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* This Week */}
      {totalWeek > 0 && (
        <section className={styles.weekSection}>
          <h2 className={styles.sectionLabel}>This week</h2>
          <div className={styles.weekCard}>
            <div className={styles.weekStats}>
              <div className={styles.weekStat}>
                <CheckCircle2 size={16} className={styles.iconSuccess} />
                <span className={styles.weekNumber}>{publishedCount}</span>
                <span className={styles.weekLabel}>published</span>
              </div>
              <div className={styles.weekDivider} />
              <div className={styles.weekStat}>
                <Calendar size={16} className={styles.iconMuted} />
                <span className={styles.weekNumber}>{draftCount}</span>
                <span className={styles.weekLabel}>drafts</span>
              </div>
              <div className={styles.weekDivider} />
              <div className={styles.weekStat}>
                <TrendingUp size={16} className={styles.iconPrimary} />
                <span className={styles.weekNumber}>{totalWeek}</span>
                <span className={styles.weekLabel}>total</span>
              </div>
            </div>
            <Link href="/calendar" className={styles.weekLink}>
              View calendar <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Today's scheduled items */}
      {todayItems && todayItems.length > 0 && (
        <section className={styles.todayItems}>
          <h2 className={styles.sectionLabel}>Scheduled for today</h2>
          <div className={styles.itemsList}>
            {todayItems.map((item) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemMeta}>
                    {item.platform} • {item.content_type}
                  </span>
                </div>
                <span className={`${styles.statusDot} ${item.status === 'published' ? styles.statusPublished : styles.statusDraft}`} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface Suggestion {
  topic: string
  purpose: string
  purposeLabel: string
  icon: string
  typeLabel: string
  href: string
  platform?: string
}

function buildSuggestions(
  calendarSuggestions: any[] | null,
  todayItems: any[] | null,
  products: any[] | null
): Suggestion[] {
  const suggestions: Suggestion[] = []

  // From calendar suggestions
  if (calendarSuggestions) {
    for (const s of calendarSuggestions.slice(0, 2)) {
      const type = s.content_type || 'short-form'
      const info = CONTENT_TYPE_ICONS[type] || CONTENT_TYPE_ICONS['short-form']
      suggestions.push({
        topic: s.suggested_topic || s.title || 'Content idea',
        purpose: s.purpose || 'educate',
        purposeLabel: (s.purpose || 'educate').charAt(0).toUpperCase() + (s.purpose || 'educate').slice(1),
        icon: info.icon,
        typeLabel: info.label,
        href: info.href,
        platform: s.platform,
      })
    }
  }

  // If no calendar suggestions, generate default ones based on products
  if (suggestions.length === 0 && products && products.length > 0) {
    const product = products[0]
    suggestions.push({
      topic: `Share a tip about ${product.name}`,
      purpose: 'educate',
      purposeLabel: 'Educate',
      icon: '📱',
      typeLabel: 'Script',
      href: '/create/short-form',
      platform: 'Instagram',
    })
    suggestions.push({
      topic: `Weekend promo for ${product.name}`,
      purpose: 'sell',
      purposeLabel: 'Sell',
      icon: '🎯',
      typeLabel: 'Ad',
      href: '/create/ads',
      platform: 'Facebook',
    })
  }

  // If still nothing, give generic starters
  if (suggestions.length === 0) {
    suggestions.push({
      topic: 'Share your creative process',
      purpose: 'story',
      purposeLabel: 'Story',
      icon: '📱',
      typeLabel: 'Script',
      href: '/create/short-form',
    })
  }

  return suggestions
}
