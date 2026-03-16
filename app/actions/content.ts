/**
 * Content Item Server Actions
 * CRUD operations for content calendar items.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/* Content item data shape for create/update */
export interface ContentItemData {
    title: string
    content_type: string    // 'reel', 'youtube', 'ad', 'story', 'carousel'
    platform: string        // 'instagram', 'youtube', 'tiktok', 'facebook'
    scheduled_date: string  // YYYY-MM-DD
    status: string          // 'planned', 'in_progress', 'created', 'published'
    hook?: string
    cta?: string
    notes?: string
    ai_generated?: boolean
    generation_reasoning?: string
    research_refs?: string[]
}

/**
 * Create a new content item.
 */
export async function createContentItem(data: ContentItemData) {
    const supabase = await createClient()

    // Get the current content plan (or create one)
    const { data: plan } = await supabase
        .from('content_plans')
        .select('id')
        .limit(1)
        .single()

    const planId = plan?.id

    const { error } = await supabase
        .from('content_items')
        .insert({
            ...(planId && { plan_id: planId }),
            ...data,
        })

    if (error) throw new Error(error.message)

    revalidatePath('/calendar')
    return { success: true }
}

/**
 * Update an existing content item.
 */
export async function updateContentItem(id: string, data: Partial<ContentItemData>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('content_items')
        .update(data)
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/calendar')
    return { success: true }
}

/**
 * Quick status update for a content item.
 */
export async function updateContentStatus(id: string, status: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('content_items')
        .update({ status })
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/calendar')
    return { success: true }
}

/**
 * Delete a content item.
 */
export async function deleteContentItem(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/calendar')
    return { success: true }
}
