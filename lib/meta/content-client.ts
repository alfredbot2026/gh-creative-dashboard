/**
 * Meta Graph API Client — Content Ingestion
 * 
 * Pulls Instagram + Facebook content with insights for the Learning Pipeline.
 * Rate limit: 200 calls/user/hour. Implements backoff + delay.
 */

const GRAPH_API_VERSION = 'v21.0'
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const CALL_DELAY_MS = 150  // 150ms between calls = ~400/min max (well under 200/hr)
const MAX_RETRIES = 5

interface IGMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  permalink: string
}

interface IGInsights {
  reach?: number
  impressions?: number
  engagement?: number
  saved?: number
  shares?: number
  likes?: number
  comments?: number
  plays?: number  // Reels
}

interface FBPost {
  id: string
  message?: string
  created_time: string
  permalink_url?: string
  type: string
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function graphFetch<T>(url: string, accessToken: string, retries = 0): Promise<T> {
  await delay(CALL_DELAY_MS)
  
  const separator = url.includes('?') ? '&' : '?'
  const fullUrl = `${url}${separator}access_token=${accessToken}`
  
  const res = await fetch(fullUrl)
  
  if (res.status === 429) {
    if (retries >= MAX_RETRIES) {
      throw new Error('Meta API rate limit exceeded after max retries')
    }
    const backoff = Math.min(1000 * Math.pow(2, retries), 30000)
    console.warn(`[Meta] Rate limited, backing off ${backoff}ms (retry ${retries + 1})`)
    await delay(backoff)
    return graphFetch(url, accessToken, retries + 1)
  }
  
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Meta API error ${res.status}: ${error}`)
  }
  
  return res.json()
}

/**
 * Fetch all Instagram media (paginated).
 * Returns all posts — may be 500+.
 */
export async function fetchAllInstagramMedia(
  accessToken: string,
  igUserId: string
): Promise<IGMedia[]> {
  const all: IGMedia[] = []
  let url = `${BASE_URL}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=100`
  
  while (url) {
    const data = await graphFetch<{ data: IGMedia[]; paging?: { next?: string } }>(url, accessToken)
    all.push(...data.data)
    url = data.paging?.next || ''
    
    // Strip access_token from next URL since graphFetch adds it
    if (url) {
      const parsed = new URL(url)
      parsed.searchParams.delete('access_token')
      url = parsed.toString()
    }
    
    console.log(`[Meta] Fetched ${all.length} Instagram posts so far...`)
  }
  
  return all
}

/**
 * Fetch insights for a single Instagram media item.
 * Returns null if insights aren't available (e.g., too old).
 */
export async function fetchMediaInsights(
  accessToken: string,
  mediaId: string,
  mediaType: string
): Promise<IGInsights | null> {
  try {
    // Different metrics for different media types
    let metrics: string
    if (mediaType === 'VIDEO' || mediaType === 'REEL') {
      metrics = 'plays,reach,likes,comments,shares,saved'
    } else {
      metrics = 'impressions,reach,engagement,saved'
    }
    
    const url = `${BASE_URL}/${mediaId}/insights?metric=${metrics}`
    const data = await graphFetch<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
      url, accessToken
    )
    
    const insights: IGInsights = {}
    for (const metric of data.data) {
      const value = metric.values?.[0]?.value ?? 0
      ;(insights as any)[metric.name] = value
    }
    
    return insights
  } catch (err: any) {
    // Insights unavailable for old posts — not an error
    if (err.message?.includes('400') || err.message?.includes('Not enough viewers')) {
      return null
    }
    console.warn(`[Meta] Insights unavailable for ${mediaId}:`, err.message)
    return null
  }
}

/**
 * Fetch all Facebook Page posts (paginated).
 */
export async function fetchFacebookPagePosts(
  accessToken: string,
  pageId: string
): Promise<FBPost[]> {
  const all: FBPost[] = []
  let url = `${BASE_URL}/${pageId}/posts?fields=id,message,created_time,permalink_url,type&limit=100`
  
  while (url) {
    const data = await graphFetch<{ data: FBPost[]; paging?: { next?: string } }>(url, accessToken)
    all.push(...data.data)
    url = data.paging?.next || ''
    
    if (url) {
      const parsed = new URL(url)
      parsed.searchParams.delete('access_token')
      url = parsed.toString()
    }
    
    console.log(`[Meta] Fetched ${all.length} Facebook posts so far...`)
  }
  
  return all
}

/**
 * Fetch insights for a Facebook Page post.
 */
export async function fetchFBPostInsights(
  accessToken: string,
  postId: string
): Promise<{ impressions?: number; engaged_users?: number; reactions?: number } | null> {
  try {
    const url = `${BASE_URL}/${postId}/insights?metric=post_impressions,post_engaged_users,post_reactions_by_type_total`
    const data = await graphFetch<{ data: Array<{ name: string; values: Array<{ value: any }> }> }>(
      url, accessToken
    )
    
    const result: any = {}
    for (const metric of data.data) {
      if (metric.name === 'post_impressions') result.impressions = metric.values?.[0]?.value ?? 0
      if (metric.name === 'post_engaged_users') result.engaged_users = metric.values?.[0]?.value ?? 0
      if (metric.name === 'post_reactions_by_type_total') {
        const reactions = metric.values?.[0]?.value
        result.reactions = reactions ? Object.values(reactions).reduce((a: number, b: any) => a + (b || 0), 0) : 0
      }
    }
    
    return result
  } catch {
    return null
  }
}
