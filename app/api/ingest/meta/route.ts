/**
 * Meta Content Ingest API
 * POST /api/ingest/meta — Pull all IG + FB content into content_ingest table.
 * Body: { mode: 'full' | 'incremental' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidMetaToken } from '@/lib/meta/token-refresh'
import {
  fetchAllInstagramMedia,
  fetchMediaInsights,
  fetchFacebookPagePosts,
  fetchFBPostInsights,
} from '@/lib/meta/content-client'

export const maxDuration = 300  // 5 minute timeout for large ingests

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mode = 'full' } = await req.json().catch(() => ({}))

  // Get valid Meta token
  const accessToken = await getValidMetaToken(user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'Meta account not connected. Go to Settings to connect.' }, { status: 400 })
  }

  // Get IG user ID and page ID from meta_tokens
  const { data: tokenData } = await supabase
    .from('meta_tokens')
    .select('ig_user_id, page_id')
    .eq('user_id', user.id)
    .single()

  if (!tokenData?.ig_user_id) {
    return NextResponse.json({ error: 'Instagram Business Account not found in token data' }, { status: 400 })
  }

  let ingested = 0
  let updated = 0
  let errors = 0
  const errorMessages: string[] = []

  // --- Instagram ---
  try {
    console.log(`[Ingest] Starting Instagram ingest for user ${user.id} (mode: ${mode})`)
    const posts = await fetchAllInstagramMedia(accessToken, tokenData.ig_user_id)
    console.log(`[Ingest] Found ${posts.length} Instagram posts`)

    for (const post of posts) {
      try {
        // Fetch insights (may return null for old posts)
        const insights = await fetchMediaInsights(accessToken, post.id, post.media_type)

        const metrics = insights ? {
          reach: insights.reach || 0,
          impressions: insights.impressions || 0,
          engagement: insights.engagement || 0,
          saves: insights.saved || 0,
          shares: insights.shares || 0,
          likes: insights.likes || 0,
          comments: insights.comments || 0,
          plays: insights.plays || 0,
        } : {}

        // Extract hashtags from caption
        const hashtags = post.caption?.match(/#\w+/g)?.map(t => t.slice(1)) || []

        const record = {
          user_id: user.id,
          platform: 'instagram' as const,
          platform_id: post.id,
          platform_url: post.permalink,
          content_type: post.media_type.toLowerCase(),
          caption: post.caption || '',
          media_url: post.media_url || post.thumbnail_url || '',
          tags: hashtags,
          published_at: post.timestamp,
          metrics,
          metrics_updated_at: insights ? new Date().toISOString() : null,
          metrics_snapshot_count: insights ? 1 : 0,
        }

        const { error: upsertError } = await supabase
          .from('content_ingest')
          .upsert(record, { onConflict: 'user_id,platform,platform_id' })

        if (upsertError) {
          console.error(`[Ingest] Upsert error for IG ${post.id}:`, upsertError)
          errors++
          errorMessages.push(`IG ${post.id}: ${upsertError.message}`)
        } else {
          ingested++
        }
      } catch (err: any) {
        errors++
        errorMessages.push(`IG ${post.id}: ${err.message}`)
      }
    }
  } catch (err: any) {
    console.error('[Ingest] Instagram ingest failed:', err)
    errorMessages.push(`Instagram ingest failed: ${err.message}`)
  }

  // --- Facebook Page ---
  if (tokenData.page_id) {
    try {
      console.log(`[Ingest] Starting Facebook ingest for page ${tokenData.page_id}`)
      const posts = await fetchFacebookPagePosts(accessToken, tokenData.page_id)
      console.log(`[Ingest] Found ${posts.length} Facebook posts`)

      for (const post of posts) {
        try {
          const insights = await fetchFBPostInsights(accessToken, post.id)

          const metrics = insights ? {
            impressions: insights.impressions || 0,
            engaged_users: insights.engaged_users || 0,
            reactions: insights.reactions || 0,
          } : {}

          const record = {
            user_id: user.id,
            platform: 'facebook' as const,
            platform_id: post.id,
            platform_url: post.permalink_url || '',
            content_type: post.type || 'status',
            caption: post.message || '',
            published_at: post.created_time,
            metrics,
            metrics_updated_at: insights ? new Date().toISOString() : null,
            metrics_snapshot_count: insights ? 1 : 0,
          }

          const { error: upsertError } = await supabase
            .from('content_ingest')
            .upsert(record, { onConflict: 'user_id,platform,platform_id' })

          if (upsertError) {
            errors++
            errorMessages.push(`FB ${post.id}: ${upsertError.message}`)
          } else {
            ingested++
          }
        } catch (err: any) {
          errors++
          errorMessages.push(`FB ${post.id}: ${err.message}`)
        }
      }
    } catch (err: any) {
      console.error('[Ingest] Facebook ingest failed:', err)
      errorMessages.push(`Facebook ingest failed: ${err.message}`)
    }
  }

  return NextResponse.json({
    ingested,
    updated,
    errors,
    total: ingested + errors,
    error_details: errorMessages.slice(0, 10),  // Cap error details
  })
}
