import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('content_structures')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error || !data) {
    return NextResponse.json({ error: 'Structure not found' }, { status: 404 })
  }
  
  // Also fetch related techniques
  const { data: techniques } = await supabase
    .from('technique_library')
    .select('*')
    .order('sort_order', { ascending: true })
  
  return NextResponse.json({ structure: data, techniques: techniques || [] })
}
