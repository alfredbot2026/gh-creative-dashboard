'use server'

import { createClient } from '@/lib/supabase/server'
import type { ShortFormPerformanceInsert } from '@/lib/create/performance-types'

export async function addPerformanceEntry(data: ShortFormPerformanceInsert) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: entry, error } = await supabase
    .from('shortform_performance')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return entry
}

export async function getPerformanceEntries(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shortform_performance')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function updatePerformanceEntry(
  id: string, 
  updates: Partial<ShortFormPerformanceInsert>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('shortform_performance')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
