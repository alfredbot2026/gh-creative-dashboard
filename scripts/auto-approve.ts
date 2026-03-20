import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .update({ review_status: 'approved' })
    .eq('review_status', 'candidate')
    
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success:', data)
  }
}
run()