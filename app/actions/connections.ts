'use server'

import { createClient } from '@/lib/supabase/server'

export async function getConnectionStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const status = {
    youtube: { connected: false, channel_title: null },
    meta: { connected: false, page_name: null, ig_username: null }
  }

  // Check YouTube
  const { data: ytData } = await supabase
    .from('youtube_tokens')
    .select('channel_title')
    .limit(1)
    .maybeSingle()

  if (ytData) {
    status.youtube = { connected: true, channel_title: ytData.channel_title }
  }

  // Check Meta
  const { data: metaData } = await supabase
    .from('meta_tokens')
    .select('page_name, ig_username')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (metaData) {
    status.meta = { connected: true, page_name: metaData.page_name, ig_username: metaData.ig_username }
  }

  return status
}
