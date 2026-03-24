import { NextResponse } from 'next/server'
import { generateJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'

/**
 * Topic Decomposition Engine
 * Takes a main topic and generates 10-15 unique sub-topics with different angles.
 * Uses: content pillars, Grace's top-performing topics, competitive intelligence, KB techniques.
 */
export async function POST(request: Request) {
  try {
    const { mainTopic, platform, contentType } = await request.json()

    const supabase = await createClient()

    // 1. Get Grace's content pillars
    const { data: profile } = await supabase
      .from('business_profile')
      .select('content_pillars, niche, target_audience')
      .limit(1)
      .single()

    // 2. Get top-performing topics from Grace's analyzed content
    const { data: topTopics } = await supabase
      .from('topic_clusters')
      .select('topic, post_count, avg_views')
      .order('avg_views', { ascending: false })
      .limit(10)

    // 3. Get competitive intelligence — trending topics in the niche
    const { data: competitorTrends } = await supabase
      .from('competitor_videos')
      .select('topic')
      .not('topic', 'is', null)
      .limit(20)

    const trendingTopics = [...new Set((competitorTrends || []).map(v => v.topic).filter(Boolean))].slice(0, 8)

    // 4. Get recently generated content (for anti-repetition)
    const { data: recentContent } = await supabase
      .from('content_items')
      .select('title, hook')
      .eq('ai_generated', true)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentTitles = (recentContent || []).map(c => c.title || c.hook).filter(Boolean)

    // 5. Get angle techniques from KB
    const { data: angleTechniques } = await supabase
      .from('knowledge_entries')
      .select('title, content')
      .in('subcategory', ['angle_shifts', 'contrarian_reframe', 'contrarian_perspective'])
      .limit(3)

    const systemPrompt = `You are a content strategist for a Filipino paper crafting / stationery business (Graceful Homeschooling). You generate sub-topic ideas that are specific, unique, and content-ready.

Your audience: Filipino stay-at-home moms who want to start or grow a paper/sticker business from home.
Content pillars: ${JSON.stringify(profile?.content_pillars || ['paper crafting', 'home business', 'mompreneur life'])}
Niche: ${profile?.niche || 'paper crafting, stickers, planners, journals'}

RULES:
- Each sub-topic must be SPECIFIC enough to write a complete script about (not generic like "business tips")
- Sub-topics should cover DIFFERENT angles — not just rewording the same idea
- Mix practical (how-to), emotional (story), contrarian (myth-busting), and timely (seasonal/trending) angles
- Include at least 2 sub-topics that are UNEXPECTED or contrarian
- Every sub-topic should be relevant to the main topic but approach it from a unique direction`

    const userPrompt = `Main topic: "${mainTopic || 'paper crafting business'}"
Platform: ${platform || 'reels'}
Content type: ${contentType || 'educate'}

${topTopics?.length ? `Grace's top-performing topics (generate related but DIFFERENT sub-topics):\n${topTopics.map(t => `- ${t.topic} (${t.avg_views} avg views)`).join('\n')}` : ''}

${trendingTopics.length ? `Trending in the niche (competitors are posting about):\n${trendingTopics.map(t => `- ${t}`).join('\n')}` : ''}

${recentTitles.length ? `AVOID these — recently generated:\n${recentTitles.map(t => `- ${t}`).join('\n')}` : ''}

${angleTechniques?.length ? `Angle techniques to apply:\n${angleTechniques.map(a => `- ${a.title}: ${(a.content || '').substring(0, 150)}`).join('\n')}` : ''}

Generate 12-15 sub-topics. Return as JSON:
{
  "subtopics": [
    {
      "title": "specific sub-topic title",
      "angle": "what makes this angle unique (1 sentence)",
      "category": "practical" | "emotional" | "contrarian" | "trending" | "seasonal" | "behind-the-scenes",
      "hook_idea": "a sample hook for this sub-topic (1 sentence)",
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ]
}`

    const result = await generateJSON<{ subtopics: any[] }>(systemPrompt, userPrompt)

    return NextResponse.json({
      mainTopic: mainTopic || 'paper crafting business',
      subtopics: result.data.subtopics || [],
      sources: {
        topPerformers: topTopics?.length || 0,
        competitorTrends: trendingTopics.length,
        recentlyGenerated: recentTitles.length,
      },
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    console.error('[Topic Engine]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Topic generation failed' },
      { status: 500 }
    )
  }
}
