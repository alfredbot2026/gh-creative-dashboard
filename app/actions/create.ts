'use server'

import { createClient } from '@/lib/supabase/server'
import type { ShortFormScript } from '@/lib/create/types'
import type { AdVariant } from '@/lib/create/ad-types'

export async function addScriptToCalendar(
  script: ShortFormScript,
  scheduledDate?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check if content_items table exists by trying to insert into it.
  // If it doesn't exist, we will catch the error.
  const { data: item, error } = await supabase
    .from('content_items')
    .insert({
      title: script.title,
      tenant_id: user.id,
      user_id: user.id,
      content_type: 'short-form',
      platform: script.lane || 'short-form',
      script_data: script as any, // Cast to any to bypass strict JSONB type check if necessary
      status: 'draft',
      scheduled_date: scheduledDate || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert content item:', error)
    throw new Error(`Failed to save to calendar: ${error.message}. (Table might be missing)`)
  }

  // Record provenance
  if (item && script.knowledge_entries_used.length > 0) {
    const { error: provError } = await supabase.from('generation_provenance').insert({
      content_item_id: item.id,
      lane: 'short-form',
      primary_entries: script.knowledge_entries_used,
      auxiliary_entries: [],
      generation_params: { topic: script.topic, angle: script.angle },
      pipeline_steps: [{ step: 'shortform-generator', model: 'gemini' }],
    })
    
    if (provError) {
      console.warn('Failed to record provenance, but content was saved:', provError)
    }
  }

  return item
}

export async function saveYouTubeScript(
  scriptResult: {
    title_options: string[]
    description: string
    tags: string[]
    thumbnail_concept: string
    total_duration_estimate: string
    sections: Array<{
      name: string
      duration: string
      speaking_lines: string
      visual_notes: string
      tips?: string
    }>
    knowledge_used?: Array<{ title: string; category: string }>
  },
  selectedTitle: string,
  params: {
    content_purpose?: string
    product_name?: string
    video_type?: string
    target_length?: string
    topic?: string
  },
  thumbnailUrl?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: item, error } = await supabase
    .from('content_items')
    .insert({
      title: selectedTitle,
      tenant_id: user.id,
      user_id: user.id,
      content_type: 'youtube',
      platform: 'youtube',
      script_data: {
        ...scriptResult,
        selected_title: selectedTitle,
        thumbnail_url: thumbnailUrl || null,
        generation_params: params,
      } as any,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert YouTube script:', error)
    throw new Error(`Failed to save to library: ${error.message}`)
  }

  // Record provenance
  if (item && scriptResult.knowledge_used?.length) {
    const { error: provError } = await supabase.from('generation_provenance').insert({
      content_item_id: item.id,
      lane: 'youtube',
      primary_entries: scriptResult.knowledge_used.map(k => k.title),
      auxiliary_entries: [],
      generation_params: params,
      pipeline_steps: [{ step: 'youtube-script-generator', model: 'gemini' }],
    })

    if (provError) {
      console.warn('Failed to record provenance, but content was saved:', provError)
    }
  }

  return item
}

export async function addAdToCalendar(
  variant: AdVariant,
  imageUrl: string | undefined,
  scheduledDate?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: item, error } = await supabase
    .from('content_items')
    .insert({
      title: variant.headline || 'Ad Variant',
      tenant_id: user.id,
      user_id: user.id,
      content_type: 'ad',
      platform: 'facebook',
      script_data: { ...variant, image_url: imageUrl } as any,
      status: 'draft',
      scheduled_date: scheduledDate || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert content item:', error)
    throw new Error(`Failed to save to calendar: ${error.message}.`)
  }

  // Record provenance
  if (item && variant.knowledge_entries_used?.length > 0) {
    const { error: provError } = await supabase.from('generation_provenance').insert({
      content_item_id: item.id,
      lane: 'ad',
      primary_entries: variant.knowledge_entries_used,
      auxiliary_entries: [],
      generation_params: { variantId: variant.id },
      pipeline_steps: [{ step: 'ad-generator', model: 'gemini' }],
    })
    
    if (provError) {
      console.warn('Failed to record provenance, but content was saved:', provError)
    }
  }

  return item
}
