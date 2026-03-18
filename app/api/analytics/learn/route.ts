import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeAdPerformance } from '@/lib/analytics/learning-engine'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || '00000000-0000-0000-0000-000000000000'

  try {
    const body = await request.json().catch(() => ({}))
    const periodDays = body.period_days || 30

    if (periodDays < 1 || periodDays > 365) {
      return NextResponse.json(
        { error: 'period_days must be between 1 and 365' },
        { status: 400 }
      )
    }

    const result = await analyzeAdPerformance(userId, periodDays)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Learning analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
