const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('brand_style_guide').select('voice_rubric').single();
  if (error) console.error(error);
  
  console.log(JSON.stringify(data.voice_rubric, null, 2));
}
run();
