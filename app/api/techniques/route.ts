import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  
  const category = searchParams.get('category')  // hook, retention, algorithm, production, strategy
  
  let query = supabase
    .from('technique_library')
    .select('*')
    .order('sort_order', { ascending: true })
  
  if (category) query = query.eq('category', category)
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
