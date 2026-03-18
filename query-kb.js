const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('knowledge_entries').select('category, lanes');
  if (error) console.error(error);
  
  const categories = new Set(data.map(d => d.category));
  const lanes = new Set(data.flatMap(d => d.lanes));
  
  console.log("Categories:", Array.from(categories));
  console.log("Lanes:", Array.from(lanes));
}
run();
