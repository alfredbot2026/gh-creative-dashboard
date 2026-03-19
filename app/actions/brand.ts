'use server'

import { createClient } from '@/lib/supabase/server'
import type { BrandStyleGuide, VoiceRubric } from '@/lib/brand/types'
import { revalidatePath } from 'next/cache'

export async function getBrandStyleGuide(): Promise<BrandStyleGuide | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brand_style_guide')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to get brand style guide:', error)
    return null
  }

  return data as BrandStyleGuide | null
}

export async function upsertBrandStyleGuide(data: Partial<BrandStyleGuide>) {
  const supabase = await createClient()
  
  // Get existing to find ID if not provided
  const existing = await getBrandStyleGuide()
  
  const payload = {
    ...data,
    ...(existing?.id ? { id: existing.id } : {}),
    updated_at: new Date().toISOString()
  }

  const { data: updated, error } = await supabase
    .from('brand_style_guide')
    .upsert(payload)
    .select()
    .single()

  if (error) {
    console.error('Failed to upsert brand style guide:', error)
    throw new Error('Failed to save brand style guide')
  }

  revalidatePath('/settings')
  return updated as BrandStyleGuide
}

export async function getVoiceRubricForGeneration(): Promise<{
  voice_rubric: VoiceRubric | null
}> {
  const guide = await getBrandStyleGuide()
  return {
    voice_rubric: guide?.voice_rubric || null
  }
}
