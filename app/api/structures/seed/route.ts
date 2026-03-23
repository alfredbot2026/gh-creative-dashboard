import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CONTENT_STRUCTURES, TECHNIQUE_LIBRARY } from '@/lib/structures/seed-data'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const results = { structures: 0, techniques: 0, errors: [] as string[] }
  
  // Seed content structures
  for (const structure of CONTENT_STRUCTURES) {
    const { error } = await supabase
      .from('content_structures')
      .upsert({
        ...structure,
        is_system: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' })
    
    if (error) {
      results.errors.push(`Structure ${structure.slug}: ${error.message}`)
    } else {
      results.structures++
    }
  }
  
  // Seed technique library
  for (const technique of TECHNIQUE_LIBRARY) {
    const { error } = await supabase
      .from('technique_library')
      .upsert(technique as any, { onConflict: 'slug' })
    
    if (error) {
      results.errors.push(`Technique ${technique.slug}: ${error.message}`)
    } else {
      results.techniques++
    }
  }
  
  return NextResponse.json(results)
}
