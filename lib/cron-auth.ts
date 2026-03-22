/**
 * Cron authentication helper.
 * Allows API routes to be called either with user auth (browser) or CRON_SECRET (cron jobs).
 * When called with CRON_SECRET, uses service role client to bypass RLS.
 */
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const KNOWN_USER_ID = 'a13b38f0-a445-4048-99e9-b0c92eb0c782' // Grace

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseClient(url, serviceKey)
}

export async function getCronOrUserAuth(req: NextRequest): Promise<{
  userId: string | null
  supabase: any
  isCron: boolean
}> {
  // Check for cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Use service role client — bypasses RLS
    const supabase = createServiceClient()
    return { userId: KNOWN_USER_ID, supabase, isCron: true }
  }

  // Fall back to user auth (browser session with cookies)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { userId: user?.id || null, supabase, isCron: false }
}
