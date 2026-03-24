/**
 * Competitive Intelligence — Video Analyzer
 * Classifies competitor videos using same framework as Grace's content
 */

import { generateJSON } from '@/lib/llm/client'

export interface CompetitorVideoAnalysis {
  hook_type: string
  hook_text: string
  structure: string
  topic_category: string
  content_purpose: 'educate' | 'story' | 'sell' | 'prove' | 'inspire' | 'trend'
  emotional_tone: string
  visual_style: string
  cta_type: string
  key_techniques: string[]
  why_it_works: string
  engagement_score: number // 1-10 estimate based on title/tags
}

export async function analyzeCompetitorVideo(video: {
  videoId: string
  title: string
  description: string
  tags: string[]
  viewCount: number
  likeCount: number
  durationSeconds: number
}): Promise<CompetitorVideoAnalysis | null> {
  const engagementRate = video.viewCount > 0
    ? Math.min(10, Math.round((video.likeCount / video.viewCount) * 1000))
    : 5

  const systemPrompt = `You are a content strategy expert analyzing YouTube videos in the paper crafting, stationery, and home business niche. 
Analyze the video based on its title, description, and tags. Infer the content structure and techniques used.
Be precise. Use specific names from content strategy (e.g., "Curiosity Gap hook", "PAS structure", "Tutorial format").`

  const userPrompt = `Analyze this YouTube video:

Title: ${video.title}
Description: ${video.description.substring(0, 400)}
Tags: ${video.tags.slice(0, 15).join(', ')}
Views: ${video.viewCount.toLocaleString()}
Likes: ${video.likeCount.toLocaleString()}
Duration: ${Math.round(video.durationSeconds / 60)} minutes

Return a JSON object with:
{
  "hook_type": "the hook technique used (Curiosity Gap | Question | Bold Claim | Comparison | Story Lead | Statistic | Labeling | Before/After)",
  "hook_text": "the likely opening line or hook (inferred from title)",
  "structure": "the content structure used (Tutorial | Story Arc | Listicle | Comparison | Problem-Solution | Transformation | FAQ | Behind the Scenes | Day in the Life | Product Demo)",
  "topic_category": "specific topic (e.g., 'Journal Binding', 'Canva Templates', 'Business Tips', 'Product Showcase')",
  "content_purpose": "one of: educate | story | sell | prove | inspire | trend",
  "emotional_tone": "Warm/Personal | Professional/Educational | Excited/Energetic | Calm/Aesthetic | Humorous",
  "visual_style": "Talking Head | B-Roll Heavy | Screen Recording | Product Demo | Aesthetic/Cinematic | Text Overlay",
  "cta_type": "Follow | Subscribe | Comment | Buy | DM | Save | Link in Bio | None",
  "key_techniques": ["array", "of", "2-4", "specific", "techniques", "used"],
  "why_it_works": "1-2 sentence explanation of why this video likely performs well",
  "engagement_score": ${engagementRate}
}`

  try {
    const result = await generateJSON<CompetitorVideoAnalysis>(systemPrompt, userPrompt)
    return result.data || null
  } catch (e) {
    console.warn(`[Competitor Analyzer] Failed for ${video.videoId}:`, e)
    return null
  }
}

/**
 * Aggregate competitor video analyses into niche trends.
 */
export function aggregateNicheTrends(videos: {
  analysis: CompetitorVideoAnalysis | null
  viewCount: number
}[]): {
  topHooks: { hook_type: string; frequency: number; avg_views: number }[]
  topStructures: { structure: string; frequency: number; avg_views: number }[]
  topTopics: { topic: string; frequency: number; total_views: number }[]
  topPurposes: { purpose: string; frequency: number; pct: number }[]
} {
  const analyzed = videos.filter(v => v.analysis !== null)
  if (!analyzed.length) return { topHooks: [], topStructures: [], topTopics: [], topPurposes: [] }

  // Aggregate hooks
  const hookMap = new Map<string, { count: number; totalViews: number }>()
  const structMap = new Map<string, { count: number; totalViews: number }>()
  const topicMap = new Map<string, { count: number; totalViews: number }>()
  const purposeMap = new Map<string, number>()

  for (const v of analyzed) {
    const a = v.analysis!
    const views = v.viewCount

    // Hooks
    const h = hookMap.get(a.hook_type) || { count: 0, totalViews: 0 }
    hookMap.set(a.hook_type, { count: h.count + 1, totalViews: h.totalViews + views })

    // Structures
    const s = structMap.get(a.structure) || { count: 0, totalViews: 0 }
    structMap.set(a.structure, { count: s.count + 1, totalViews: s.totalViews + views })

    // Topics
    const t = topicMap.get(a.topic_category) || { count: 0, totalViews: 0 }
    topicMap.set(a.topic_category, { count: t.count + 1, totalViews: t.totalViews + views })

    // Purposes
    purposeMap.set(a.content_purpose, (purposeMap.get(a.content_purpose) || 0) + 1)
  }

  const topHooks = Array.from(hookMap.entries())
    .map(([hook_type, { count, totalViews }]) => ({ hook_type, frequency: count, avg_views: Math.round(totalViews / count) }))
    .sort((a, b) => b.avg_views - a.avg_views)
    .slice(0, 10)

  const topStructures = Array.from(structMap.entries())
    .map(([structure, { count, totalViews }]) => ({ structure, frequency: count, avg_views: Math.round(totalViews / count) }))
    .sort((a, b) => b.avg_views - a.avg_views)
    .slice(0, 10)

  const topTopics = Array.from(topicMap.entries())
    .map(([topic, { count, totalViews }]) => ({ topic, frequency: count, total_views: totalViews }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 15)

  const total = analyzed.length
  const topPurposes = Array.from(purposeMap.entries())
    .map(([purpose, count]) => ({ purpose, frequency: count, pct: Math.round(count / total * 100) }))
    .sort((a, b) => b.frequency - a.frequency)

  return { topHooks, topStructures, topTopics, topPurposes }
}
