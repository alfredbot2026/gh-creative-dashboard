import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeAdPerformance } from '@/lib/analytics/learning-engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const periodDays = body.period_days || 30

    const result = await analyzeAdPerformance(user.id, periodDays)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API] /analytics/learn error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
