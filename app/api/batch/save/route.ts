/**
 * POST /api/batch/save — Save approved batch items to calendar
 * 
 * Creates content_items for all approved batch items.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BatchItem {
  lane: string
  content_type: string
  platform: string
  scheduled_date: string
  title: string
  hook?: string
  content?: Record<string, unknown>
  purpose?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { items, weekStart } = await req.json().catch(() => ({}))
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items to save' }, { status: 400 })
  }

  try {
    const toInsert = items.map((item: BatchItem) => ({
      user_id: user.id,
      title: item.title,
      content_type: item.content_type,
      platform: item.platform,
      scheduled_date: item.scheduled_date,
      status: 'planned',
      hook: item.hook,
      script_data: item.content,
      generation_reasoning: `Batch generated for week of ${weekStart}`,
    }))

    const { data: saved, error } = await supabase
      .from('content_items')
      .insert(toInsert)
      .select('id')

    if (error) throw error

    return NextResponse.json({
      success: true,
      saved: saved?.length || 0,
      weekStart,
    })

  } catch (err: any) {
    console.error('[Batch Save] Failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}