import { checkQualityGate } from '@/lib/eval/quality-gate'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
const rateLimits = new Map<string, RateLimitEntry>()

function checkRateLimit(key: string) {
  const now = Date.now()
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  rateLimits.set(key, current)

  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count }
}

function pruneRateLimits() {
  const now = Date.now()
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetAt <= now) {
      rateLimits.delete(key)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    pruneRateLimits()

    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimit = checkRateLimit(authData.user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retry_after_ms: Math.max((rateLimit.resetAt || Date.now()) - Date.now(), 0),
        },
        { status: 429 }
      )
    }

    const body = await request.json() as {
      text?: unknown
      content_type?: unknown
      platform?: unknown
      threshold?: unknown
    }

    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const contentType = typeof body.content_type === 'string' ? body.content_type.trim() : ''
    const platform = typeof body.platform === 'string' ? body.platform.trim() : ''
    const threshold = typeof body.threshold === 'number' ? body.threshold : undefined

    if (!text || !contentType || !platform) {
      return NextResponse.json(
        { error: '`text`, `content_type`, and `platform` are required' },
        { status: 400 }
      )
    }

    const result = await checkQualityGate(text, contentType, platform, threshold)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to score brand voice' },
      { status: 500 }
    )
  }
}
