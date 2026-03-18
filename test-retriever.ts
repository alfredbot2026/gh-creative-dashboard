import { getAdGenerationContext } from './lib/create/kb-retriever';
import { createClient } from '@supabase/supabase-js';

// We need to mock createClient because it uses next/headers cookies
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}));

async function run() {
  const result = await getAdGenerationContext();
  console.log("Count:", result.length);
}
run();
