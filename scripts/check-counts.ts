import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() {
  const { count: approvedCount } = await supabase
    .from('knowledge_entries')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'approved')
    
  const { count: candidateCount } = await supabase
    .from('knowledge_entries')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'candidate')

  console.log('Approved:', approvedCount)
  console.log('Candidate:', candidateCount)
}
run()