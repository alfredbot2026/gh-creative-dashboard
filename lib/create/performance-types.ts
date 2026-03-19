export interface ShortFormPerformance {
  id: string
  content_item_id: string | null
  platform: 'instagram-reels' | 'tiktok' | 'youtube-shorts'
  post_url: string | null
  posted_at: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  follows_gained: number
  reach: number
  engagement_rate: number
  notes: string
  created_at: string
  updated_at: string
}

export type ShortFormPerformanceInsert = Omit<ShortFormPerformance, 
  'id' | 'created_at' | 'updated_at' | 'engagement_rate'
>
