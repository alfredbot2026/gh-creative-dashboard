'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CalendarEntry {
  id?: string
  title: string
  content_purpose?: string
  content_lane?: string
  platform?: string
  product_id?: string | null
  scheduled_date?: string
  scheduled_time?: string
  status?: string
  generated_content?: Record<string, unknown> | null
  notes?: string
}

export async function listCalendarEntries(
  startDate?: string,
  endDate?: string
): Promise<CalendarEntry[]> {
  const supabase = await createClient()
  let query = supabase
    .from('content_calendar')
    .select('*, product_catalog(name, price)')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (startDate) query = query.gte('scheduled_date', startDate)
  if (endDate) query = query.lte('scheduled_date', endDate)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertCalendarEntry(entry: CalendarEntry): Promise<CalendarEntry> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    ...entry,
    user_id: user?.id || null,
    updated_at: new Date().toISOString(),
  }

  if (entry.id) {
    const { data, error } = await supabase
      .from('content_calendar')
      .update(payload)
      .eq('id', entry.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    revalidatePath('/calendar')
    return data
  } else {
    const { id: _, ...insertPayload } = payload
    const { data, error } = await supabase
      .from('content_calendar')
      .insert(insertPayload)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    revalidatePath('/calendar')
    return data
  }
}

export async function deleteCalendarEntry(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('content_calendar')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/calendar')
}

export async function getContentMixStats(days: number = 7): Promise<Record<string, number>> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('content_calendar')
    .select('content_purpose')
    .gte('scheduled_date', since.toISOString().split('T')[0])
    .not('status', 'eq', 'skipped')

  if (error || !data) return {}

  const mix: Record<string, number> = {}
  for (const entry of data) {
    const purpose = entry.content_purpose || 'unset'
    mix[purpose] = (mix[purpose] || 0) + 1
  }
  return mix
}
