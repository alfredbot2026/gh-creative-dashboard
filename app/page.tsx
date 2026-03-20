import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
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
  'short-form': { icon: '📱', label: 'Script', href: '/create?type=script' },
  'ad': { icon: '🎯', label: 'Ad', href: '/create?type=ad' },
  'social-post': { icon: '📸', label: 'Post', href: '/create?type=post' },
  'youtube': { icon: '🎬', label: 'YouTube', href: '/create?type=youtube' },
}

export default async function TodayPage() {
  const supabase = await createClient()

  // Grace explicitly, not Graceful
  const userName = 'Grace'

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

  // Build smart suggestions
  const suggestions = buildSuggestions(calendarSuggestions, todayItems, products)

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <header className={styles.greeting}>
        <h1 className={styles.greetingText}>
          {getGreeting()}, {userName}
        </h1>
        <p className={styles.date}>{getFormattedDate()}</p>
      </header>

      {/* Today's Content Suggestions */}
      <section className={styles.suggestions}>
        <h2 className={styles.sectionLabel}>Suggested for you</h2>
        
        {suggestions.length > 0 ? (
          <div className={styles.suggestionCards}>
            {suggestions.map((s, i) => (
              <Link
                key={i}
                href={s.href}
                className={styles.suggestionCard}
              >
                <p className={styles.suggestionTitle}>{s.topic}</p>
                <div className={styles.suggestionMeta}>
                  <span className={styles.suggestionType}>{s.typeLabel}</span>
                  {s.platform && <span className={styles.platformChip}>• {s.platform}</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptySuggestions}>
            <h3>Ready when you are</h3>
            <p>Hit Create below and start making content.</p>
          </div>
        )}
      </section>

      {/* This Week */}
      {totalWeek > 0 && (
        <section className={styles.weekSection}>
          <h2 className={styles.sectionLabel}>This week</h2>
          <div className={styles.weekStats}>
            <span className={styles.statText}>{publishedCount} published</span>
            <span className={styles.statDivider}>·</span>
            <span className={styles.statText}>{draftCount} drafts</span>
          </div>
        </section>
      )}

      {/* Create button */}
      <section className={styles.createSection}>
        <Link href="/create" className={styles.createBtn}>
          Create something new <ArrowRight size={16} />
        </Link>
      </section>

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
        href: '/create',
        platform: s.platform,
      })
    }
  }

  if (suggestions.length === 0 && products && products.length > 0) {
    const product = products[0]
    suggestions.push({
      topic: `Share a tip about ${product.name}`,
      purpose: 'educate',
      purposeLabel: 'Educate',
      icon: '📱',
      typeLabel: 'Script',
      href: '/create',
      platform: 'Instagram',
    })
    suggestions.push({
      topic: `Weekend promo for ${product.name}`,
      purpose: 'sell',
      purposeLabel: 'Sell',
      icon: '🎯',
      typeLabel: 'Ad',
      href: '/create',
      platform: 'Facebook',
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      topic: 'Share your creative process',
      purpose: 'story',
      purposeLabel: 'Story',
      icon: '📱',
      typeLabel: 'Script',
      href: '/create',
    })
  }

  return suggestions
}
