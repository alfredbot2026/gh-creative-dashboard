/**
 * YouTube Content Client — Content Ingestion
 * 
 * Pulls all videos + analytics for the Learning Pipeline.
 * 
 * QUOTA AWARENESS:
 * - YouTube Data API: 10,000 units/day
 * - search.list = 100 units (NEVER use in recurring jobs!)
 * - channels.list = 1 unit
 * - playlistItems.list = 1 unit per call
 * - videos.list = 1 unit per call (up to 50 IDs)
 * 
 * Strategy: Use uploads playlist (cheap) instead of search.list (expensive)
 */

const YT_DATA_URL = 'https://www.googleapis.com/youtube/v3'
const YT_ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports'

interface VideoBasic {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
  tags: string[]
}

interface VideoStats {
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string  // ISO 8601 duration
}

interface VideoAnalytics {
  views: number
  estimatedMinutesWatched: number
  averageViewDuration: number
  averageViewPercentage: number
  subscribersGained: number
  likes: number
  comments: number
  shares: number
  impressions: number
  impressionClickThroughRate: number
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
  tags: string[]
  stats: VideoStats
  analytics?: VideoAnalytics
}

async function ytFetch<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  
  if (res.status === 403) {
    const error = await res.json()
    if (error.error?.errors?.[0]?.reason === 'quotaExceeded') {
      throw new Error('QUOTA_EXCEEDED: YouTube API daily quota exhausted')
    }
    throw new Error(`YouTube API 403: ${JSON.stringify(error)}`)
  }
  
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${error}`)
  }
  
  return res.json()
}

/**
 * Get the uploads playlist ID for a channel.
 * Cost: 1 unit (channels.list)
 */
async function getUploadsPlaylistId(accessToken: string): Promise<{ playlistId: string; channelId: string }> {
  const data = await ytFetch<any>(
    `${YT_DATA_URL}/channels?part=contentDetails,snippet&mine=true`,
    accessToken
  )
  
  const channel = data.items?.[0]
  if (!channel) throw new Error('No YouTube channel found')
  
  return {
    playlistId: channel.contentDetails.relatedPlaylists.uploads,
    channelId: channel.id,
  }
}

/**
 * Get all video IDs from uploads playlist.
 * Cost: 1 unit per 50 videos
 */
async function getAllVideoIds(accessToken: string, playlistId: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken = ''
  
  do {
    const url = `${YT_DATA_URL}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`
    const data = await ytFetch<any>(url, accessToken)
    
    for (const item of data.items || []) {
      ids.push(item.contentDetails.videoId)
    }
    
    pageToken = data.nextPageToken || ''
    console.log(`[YouTube] Fetched ${ids.length} video IDs...`)
  } while (pageToken)
  
  return ids
}

/**
 * Fetch video details in batches of 50.
 * Cost: 1 unit per batch
 */
async function fetchVideoDetailsBatch(
  accessToken: string,
  videoIds: string[]
): Promise<Array<VideoBasic & { stats: VideoStats }>> {
  const results: Array<VideoBasic & { stats: VideoStats }> = []
  
  // Process in batches of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const ids = batch.join(',')
    
    const data = await ytFetch<any>(
      `${YT_DATA_URL}/videos?part=snippet,statistics,contentDetails&id=${ids}`,
      accessToken
    )
    
    for (const item of data.items || []) {
      results.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
        tags: item.snippet.tags || [],
        stats: {
          viewCount: parseInt(item.statistics.viewCount || '0'),
          likeCount: parseInt(item.statistics.likeCount || '0'),
          commentCount: parseInt(item.statistics.commentCount || '0'),
          duration: item.contentDetails.duration,
        },
      })
    }
    
    console.log(`[YouTube] Fetched details for ${results.length}/${videoIds.length} videos...`)
  }
  
  return results
}

/**
 * Fetch analytics for a single video.
 * Uses YouTube Analytics API (separate quota: 200 req/day).
 * Returns null if analytics not available.
 */
async function fetchVideoAnalytics(
  accessToken: string,
  videoId: string,
  publishedAt: string
): Promise<VideoAnalytics | null> {
  try {
    const startDate = publishedAt.split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]
    
    const params = new URLSearchParams({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares',
      dimensions: 'video',
      filters: `video==${videoId}`,
    })
    
    const data = await ytFetch<any>(
      `${YT_ANALYTICS_URL}?${params.toString()}`,
      accessToken
    )
    
    const row = data.rows?.[0]
    if (!row) return null
    
    // Also try to get impressions data (may not be available)
    let impressions = 0
    let ctr = 0
    try {
      const impParams = new URLSearchParams({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,impressions,impressionClickThroughRate',
        dimensions: 'video',
        filters: `video==${videoId}`,
      })
      const impData = await ytFetch<any>(
        `${YT_ANALYTICS_URL}?${impParams.toString()}`,
        accessToken
      )
      if (impData.rows?.[0]) {
        impressions = impData.rows[0][1] || 0
        ctr = impData.rows[0][2] || 0
      }
    } catch {
      // Impressions data may not be available for older videos
    }
    
    return {
      views: row[1] || 0,
      estimatedMinutesWatched: row[2] || 0,
      averageViewDuration: row[3] || 0,
      averageViewPercentage: row[4] || 0,
      subscribersGained: row[5] || 0,
      likes: row[6] || 0,
      comments: row[7] || 0,
      shares: row[8] || 0,
      impressions,
      impressionClickThroughRate: ctr,
    }
  } catch (err: any) {
    if (err.message?.includes('QUOTA_EXCEEDED')) throw err  // re-throw quota errors
    console.warn(`[YouTube] Analytics unavailable for ${videoId}:`, err.message)
    return null
  }
}

/**
 * Refresh a YouTube access token using the refresh token.
 */
export async function refreshYouTubeToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('YouTube OAuth credentials not configured')
  }
  
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`YouTube token refresh failed: ${error}`)
  }
  
  return res.json()
}

/**
 * Main entry point: fetch all videos with optional analytics.
 * 
 * Quota estimate for ~100 videos:
 * - channels.list: 1 unit
 * - playlistItems.list: ~2 calls = 2 units
 * - videos.list: ~2 calls = 2 units  
 * - Total Data API: ~5 units (very efficient!)
 * - Analytics API: ~100-200 calls (separate quota, 200/day)
 */
export async function fetchAllChannelVideos(
  accessToken: string,
  options?: { includeAnalytics?: boolean; analyticsQuotaLimit?: number }
): Promise<{ videos: YouTubeVideo[]; quotaUsed: { dataApi: number; analyticsApi: number } }> {
  const quota = { dataApi: 0, analyticsApi: 0 }
  
  // Step 1: Get uploads playlist (1 unit)
  const { playlistId } = await getUploadsPlaylistId(accessToken)
  quota.dataApi += 1
  
  // Step 2: Get all video IDs (~1 unit per 50 videos)
  const videoIds = await getAllVideoIds(accessToken, playlistId)
  quota.dataApi += Math.ceil(videoIds.length / 50)
  
  // Step 3: Fetch video details in batches (~1 unit per 50)
  const details = await fetchVideoDetailsBatch(accessToken, videoIds)
  quota.dataApi += Math.ceil(videoIds.length / 50)
  
  // Step 4: Optionally fetch analytics (1 call per video, separate quota)
  const videos: YouTubeVideo[] = []
  const analyticsLimit = options?.analyticsQuotaLimit ?? 180  // Leave 20 buffer of 200/day
  
  for (const video of details) {
    let analytics: VideoAnalytics | undefined
    
    if (options?.includeAnalytics && quota.analyticsApi < analyticsLimit) {
      try {
        const result = await fetchVideoAnalytics(accessToken, video.id, video.publishedAt)
        if (result) analytics = result
        quota.analyticsApi += 2  // 2 calls per video (main + impressions)
      } catch (err: any) {
        if (err.message?.includes('QUOTA_EXCEEDED')) {
          console.warn('[YouTube] Analytics quota exhausted, skipping remaining')
          break
        }
      }
    }
    
    videos.push({ ...video, analytics })
  }
  
  console.log(`[YouTube] Fetched ${videos.length} videos. Quota: Data=${quota.dataApi}, Analytics=${quota.analyticsApi}`)
  
  return { videos, quotaUsed: quota }
}
