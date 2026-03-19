'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProductData {
  id?: string
  name: string
  description?: string
  price?: string
  currency?: string
  offer_details?: string
  product_type?: string
  target_audience?: string
  usps?: string[]
  is_active?: boolean
}

export async function listProducts(): Promise<ProductData[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function getProduct(id: string): Promise<ProductData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function upsertProduct(product: ProductData): Promise<ProductData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  const payload = {
    ...product,
    user_id: userId,
    usps: (product.usps || []).filter(Boolean),
    updated_at: new Date().toISOString(),
  }

  if (product.id) {
    const { data, error } = await supabase
      .from('product_catalog')
      .update(payload)
      .eq('id', product.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    revalidatePath('/settings')
    return data
  } else {
    const { id: _, ...insertPayload } = payload
    const { data, error } = await supabase
      .from('product_catalog')
      .insert(insertPayload)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    revalidatePath('/settings')
    return data
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_catalog')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
