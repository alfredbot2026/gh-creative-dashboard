/**
 * GET /api/calendar/suggest
 * Returns content mix analysis + suggestions for what to post next.
 * Based on recent content history and ideal 70/20/10 ratio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const IDEAL_MIX: Record<string, number> = {
  educate: 0.35,   // 35% educational
  story: 0.15,     // 15% founder stories
  sell: 0.20,      // 20% sales/promo
  prove: 0.15,     // 15% social proof
  trend: 0.10,     // 10% trending
  inspire: 0.05,   // 5% inspirational
}

const PURPOSE_LABELS: Record<string, string> = {
  educate: '📚 Educate',
  story: '📖 Story',
  sell: '🎯 Sell',
  prove: '🤝 Prove',
  trend: '🔥 Trend',
  inspire: '💡 Inspire',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  try {
    const supabase = await createClient()
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get recent content from both content_items and content_calendar
    const [{ data: items }, { data: calendar }] = await Promise.all([
      supabase
        .from('content_items')
        .select('content_type, scheduled_date')
        .gte('scheduled_date', since.toISOString().split('T')[0]),
      supabase
        .from('content_calendar')
        .select('content_purpose, scheduled_date, status')
        .gte('scheduled_date', since.toISOString().split('T')[0])
        .not('status', 'eq', 'skipped'),
    ])

    // Count by purpose
    const mix: Record<string, number> = {}
    const total = (calendar?.length || 0) + (items?.length || 0)

    for (const entry of (calendar || [])) {
      const purpose = entry.content_purpose || 'unset'
      mix[purpose] = (mix[purpose] || 0) + 1
    }

    // Map old content_items types to purposes
    for (const item of (items || [])) {
      const type = item.content_type || ''
      const purpose = type.includes('ad') ? 'sell' : 'educate'
      mix[purpose] = (mix[purpose] || 0) + 1
    }

    // Calculate gaps vs ideal mix
    const suggestions: { purpose: string; label: string; reason: string }[] = []
    for (const [purpose, idealRatio] of Object.entries(IDEAL_MIX)) {
      const actual = total > 0 ? (mix[purpose] || 0) / total : 0
      const gap = idealRatio - actual
      if (gap > 0.1 || (total > 0 && !mix[purpose])) {
        const daysSince = 'a while' // simplified
        suggestions.push({
          purpose,
          label: PURPOSE_LABELS[purpose] || purpose,
          reason: mix[purpose]
            ? `Only ${Math.round(actual * 100)}% of recent content (ideal: ${Math.round(idealRatio * 100)}%)`
            : `No ${PURPOSE_LABELS[purpose]?.split(' ')[1] || purpose} content in the last ${days} days`,
        })
      }
    }

    // Sort: biggest gaps first
    suggestions.sort((a, b) => {
      const gapA = IDEAL_MIX[a.purpose]! - ((mix[a.purpose] || 0) / Math.max(total, 1))
      const gapB = IDEAL_MIX[b.purpose]! - ((mix[b.purpose] || 0) / Math.max(total, 1))
      return gapB - gapA
    })

    return NextResponse.json({
      period_days: days,
      total_posts: total,
      mix,
      suggestions: suggestions.slice(0, 3), // top 3 suggestions
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
