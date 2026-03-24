/**
 * Competitive Intelligence — Discovery Engine
 * Finds top creators in Grace's niche via YouTube Data API v3
 */

const YT_DATA_URL = 'https://www.googleapis.com/youtube/v3'
const API_KEY = process.env.YOUTUBE_API_KEY!

// Niche keywords for discovery — paper crafting, planning, stationery
const NICHE_KEYWORDS = [
  'paper crafting business',
  'handmade planner',
  'stationery business philippines',
  'journal making tutorial',
  'notebook business',
  'bullet journal creator',
  'washi tape crafts',
  'planner philippines',
  'papel negosyo',
  'DIY planner business',
]

// Minimum thresholds for a "top creator"
const MIN_SUBSCRIBERS = 1_000
const MAX_CHANNELS_TO_TRACK = 30

export interface ChannelInfo {
  channelId: string
  channelTitle: string
  channelDescription: string
  subscriberCount: number
  videoCount: number
  nicheTag: string
}

/**
 * Search YouTube for channels matching a keyword.
 * Cost: 100 units per call — use sparingly (monthly discovery only).
 */
async function searchChannelsByKeyword(keyword: string, maxResults = 10): Promise<ChannelInfo[]> {
  const url = `${YT_DATA_URL}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=channel&order=relevance&maxResults=${maxResults}&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`)
  const data = await res.json()

  const channelIds = (data.items || [])
    .map((item: any) => item.id?.channelId)
    .filter(Boolean)

  if (!channelIds.length) return []

  // Get detailed stats for each channel (1 unit per call)
  const statsUrl = `${YT_DATA_URL}/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${API_KEY}`
  const statsRes = await fetch(statsUrl)
  if (!statsRes.ok) return []
  const statsData = await statsRes.json()

  return (statsData.items || []).map((ch: any) => ({
    channelId: ch.id,
    channelTitle: ch.snippet?.title || '',
    channelDescription: ch.snippet?.description || '',
    subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
    videoCount: parseInt(ch.statistics?.videoCount || '0'),
    nicheTag: keyword,
  }))
}

/**
 * Get top videos for a channel by view count.
 * Uses uploads playlist (1 unit) + playlistItems (1 unit per 50 results).
 */
export async function getTopVideosForChannel(
  channelId: string,
  maxVideos = 20
): Promise<{
  videoId: string
  title: string
  description: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  durationSeconds: number
  thumbnailUrl: string
  tags: string[]
}[]> {
  // Step 1: Get uploads playlist ID
  const chUrl = `${YT_DATA_URL}/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
  const chRes = await fetch(chUrl)
  if (!chRes.ok) return []
  const chData = await chRes.json()
  const playlistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!playlistId) return []

  // Step 2: Get recent videos from uploads playlist
  const plUrl = `${YT_DATA_URL}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}`
  const plRes = await fetch(plUrl)
  if (!plRes.ok) return []
  const plData = await plRes.json()
  const videoIds = (plData.items || [])
    .map((item: any) => item.snippet?.resourceId?.videoId)
    .filter(Boolean)

  if (!videoIds.length) return []

  // Step 3: Get detailed stats for all videos
  const vidUrl = `${YT_DATA_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`
  const vidRes = await fetch(vidUrl)
  if (!vidRes.ok) return []
  const vidData = await vidRes.json()

  const videos = (vidData.items || []).map((v: any) => ({
    videoId: v.id,
    title: v.snippet?.title || '',
    description: (v.snippet?.description || '').substring(0, 500),
    publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
    viewCount: parseInt(v.statistics?.viewCount || '0'),
    likeCount: parseInt(v.statistics?.likeCount || '0'),
    commentCount: parseInt(v.statistics?.commentCount || '0'),
    durationSeconds: parseDuration(v.contentDetails?.duration || 'PT0S'),
    thumbnailUrl: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url || '',
    tags: v.snippet?.tags || [],
  }))

  // Sort by view count and return top N
  return videos.sort((a: { viewCount: number }, b: { viewCount: number }) => b.viewCount - a.viewCount).slice(0, maxVideos)
}

/**
 * Parse ISO 8601 duration to seconds (PT4M13S → 253)
 */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  const s = parseInt(match[3] || '0')
  return h * 3600 + m * 60 + s
}

/**
 * Run the full discovery process.
 * Searches all niche keywords, deduplicates channels, ranks by subscriber count.
 * Call once monthly — expensive (100 units per keyword search).
 */
export async function discoverTopCreators(): Promise<{
  discovered: number
  channels: ChannelInfo[]
  skipped: number
  errors: string[]
}> {
  const channelMap = new Map<string, ChannelInfo>()
  const errors: string[] = []

  for (const keyword of NICHE_KEYWORDS) {
    try {
      console.log(`[Discovery] Searching: "${keyword}"`)
      const channels = await searchChannelsByKeyword(keyword, 10)

      for (const ch of channels) {
        if (ch.subscriberCount < MIN_SUBSCRIBERS) continue
        if (!channelMap.has(ch.channelId)) {
          channelMap.set(ch.channelId, ch)
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200))
    } catch (e: any) {
      errors.push(`${keyword}: ${e.message}`)
    }
  }

  // Sort by subscriber count, take top N
  const allChannels = Array.from(channelMap.values())
    .sort((a, b) => b.subscriberCount - a.subscriberCount)
    .slice(0, MAX_CHANNELS_TO_TRACK)

  return {
    discovered: allChannels.length,
    channels: allChannels,
    skipped: channelMap.size - allChannels.length,
    errors,
  }
}

/**
 * Get Grace's own channel ID to exclude from competitor list.
 */
export const GRACE_CHANNEL_ID = 'UC-yMXCe2DoWPSFRb0L02_fw'
