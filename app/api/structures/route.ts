import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  
  const type = searchParams.get('type')           // reel, youtube, ad, story
  const purpose = searchParams.get('purpose')       // educate, sell, inspire, story
  const difficulty = searchParams.get('difficulty') // beginner, intermediate, advanced
  const search = searchParams.get('search')
  
  let query = supabase
    .from('content_structures')
    .select('*')
    .order('sort_order', { ascending: true })
  
  if (type) query = query.eq('content_type', type)
  if (purpose) query = query.contains('purpose', [purpose])
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (search) query = query.ilike('name', `%${search}%`)
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
