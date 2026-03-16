/**
 * Settings Server Actions
 * Handles business profile CRUD operations.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/* Business profile data shape */
export interface BusinessProfileData {
    business_name: string
    industry: string
    target_audience: string
    brand_voice: string
    products_services: string[]
    unique_selling_points: string[]
    content_pillars: string[]
    platforms: string[]
    competitors: string[]
    notes: string
}

/**
 * Upsert business profile.
 * If a profile exists, update it. If not, create one.
 */
export async function upsertBusinessProfile(data: BusinessProfileData) {
    const supabase = await createClient()

    // Check if a profile already exists
    const { data: existing } = await supabase
        .from('business_profile')
        .select('id')
        .limit(1)
        .single()

    if (existing) {
        // Update existing profile
        const { error } = await supabase
            .from('business_profile')
            .update({
                ...data,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

        if (error) throw new Error(error.message)
    } else {
        // Create new profile
        const { error } = await supabase
            .from('business_profile')
            .insert(data)

        if (error) throw new Error(error.message)
    }

    // Revalidate settings page cache
    revalidatePath('/settings')
    return { success: true }
}

/**
 * Fetch the current business profile.
 */
export async function getBusinessProfile(): Promise<BusinessProfileData | null> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('business_profile')
        .select('*')
        .limit(1)
        .single()

    return data || null
}
