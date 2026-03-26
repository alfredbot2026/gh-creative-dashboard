import { NextResponse } from 'next/server'
import { generateJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'

/**
 * Topic Suggestions — Cache-first with LLM fallback.
 * 
 * 1. Check topic_bank for unseen topics matching this combo
 * 2. If enough exist → serve instantly (no LLM call)
 * 3. If not enough → generate 20 via LLM, store in bank, serve 8
 * 4. "More ideas" requests always hit this same endpoint
 * 
 * Temperature: 1.1 for diversity. Exclusion list prevents repeats.
 */

const SERVE_COUNT = 8
const GENERATE_COUNT = 20
const MIN_BANK_THRESHOLD = 8

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { platform = 'reel', contentType = 'educate', forceRefresh = false } = await request.json()

    const userId = user.id

    // 1. Check bank for unseen topics
    if (!forceRefresh) {
      const { data: banked, count } = await supabase
        .from('topic_bank')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('goal', contentType)
        .eq('shown', false)
        .order('created_at', { ascending: false })
        .limit(SERVE_COUNT)

      if (banked && banked.length >= MIN_BANK_THRESHOLD) {
        // Mark as shown
        const ids = banked.map(t => t.id)
        await supabase
          .from('topic_bank')
          .update({ shown: true, shown_at: new Date().toISOString() })
          .in('id', ids)

        return NextResponse.json({
          subtopics: banked.map(t => ({
            title: t.title,
            angle: t.angle,
            category: t.category,
            hook_idea: t.hook_idea,
            source: t.source,
            evidence: t.evidence,
          })),
          cached: true,
          remaining: (count || 0) - banked.length,
        })
      }
    }

    // 2. Not enough in bank — generate via LLM
    // Get context for generation
    const { data: profile } = await supabase
      .from('business_profile')
      .select('business_name, content_pillars, niche, target_audience, brand_voice')
      .limit(1)
      .single()

    // Get top-performing topics
    const { data: topTopics } = await supabase
      .from('topic_clusters')
      .select('topic, post_count, avg_views')
      .order('avg_views', { ascending: false })
      .limit(10)

    // Get competitor trends
    const { data: competitorTrends } = await supabase
      .from('competitor_videos')
      .select('topic')
      .not('topic', 'is', null)
      .limit(20)

    const trendingTopics = [...new Set((competitorTrends || []).map(v => v.topic).filter(Boolean))].slice(0, 8)

    // Get recently used/shown topics (exclusion list)
    const { data: recentTopics } = await supabase
      .from('topic_bank')
      .select('title')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('goal', contentType)
      .order('created_at', { ascending: false })
      .limit(40)

    const excludeList = (recentTopics || []).map(t => t.title)

    // Get recent content titles too
    const { data: recentContent } = await supabase
      .from('content_items')
      .select('title, hook')
      .eq('ai_generated', true)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentTitles = (recentContent || []).map(c => c.title || c.hook).filter(Boolean)

    const systemPrompt = `You are a content strategist for "${profile?.business_name || 'Graceful Homeschooling'}" — a Filipino paper crafting / stationery business.
Audience: ${profile?.target_audience || 'Filipino stay-at-home moms who want to start or grow a paper/sticker business from home'}
Voice: ${profile?.brand_voice || 'Warm, encouraging, Taglish'}
Pillars: ${JSON.stringify(profile?.content_pillars || ['paper crafting', 'home business', 'mompreneur life'])}
Niche: ${profile?.niche || 'paper crafting, stickers, planners, journals'}

RULES:
- Generate ${GENERATE_COUNT} unique sub-topics — each one specific enough to write a complete script about
- Cover DIFFERENT angles — practical, emotional, contrarian, behind-the-scenes, trending, seasonal
- At least 3 should be UNEXPECTED or contrarian (myth-busting, hot takes)
- At least 2 should be seasonal/timely for the Philippines (current month: ${new Date().toLocaleString('en-PH', { month: 'long', year: 'numeric' })})
- NO generic topics like "business tips" — every topic must be immediately scriptable
- Write hook ideas in natural Taglish (Filipino-English mix)
- IMPORTANT: Do NOT repeat or rephrase any topic from the exclusion list below`

    const userPrompt = `Platform: ${platform}
Content goal: ${contentType}

${topTopics?.length ? `Grace's top-performing topics (create RELATED but DIFFERENT topics):\n${topTopics.map(t => `- ${t.topic} (${t.avg_views} avg views)`).join('\n')}` : ''}

${trendingTopics.length ? `Trending in niche (competitors posting about):\n${trendingTopics.map(t => `- ${t}`).join('\n')}` : ''}

${excludeList.length ? `🚫 EXCLUSION LIST — Do NOT generate anything similar to these:\n${excludeList.slice(0, 20).map(t => `- ${t}`).join('\n')}` : ''}

${recentTitles.length ? `Also avoid (recently generated content):\n${recentTitles.map(t => `- ${t}`).join('\n')}` : ''}

Generate ${GENERATE_COUNT} sub-topics as JSON:
{
  "subtopics": [
    {
      "title": "specific sub-topic title",
      "angle": "what makes this angle unique (1 sentence)",
      "category": "practical" | "emotional" | "contrarian" | "trending" | "seasonal" | "behind-the-scenes",
      "hook_idea": "a sample Taglish hook for this sub-topic (1 sentence)"
    }
  ]
}`

    const result = await generateJSON<{ subtopics: any[] }>(systemPrompt, userPrompt, { temperature: 1.1 })

    const generated = result.data.subtopics || []

    // 3. Store ALL generated topics in the bank
    if (generated.length > 0) {
      const rows = generated.map(t => ({
        user_id: userId,
        platform,
        goal: contentType,
        title: t.title,
        angle: t.angle,
        category: t.category,
        hook_idea: t.hook_idea,
        source: 'llm',
        shown: false,
      }))

      await supabase.from('topic_bank').insert(rows)
    }

    // 4. Serve first batch and mark as shown
    const toServe = generated.slice(0, SERVE_COUNT)

    // Mark served ones as shown (fetch them from DB to get IDs)
    if (toServe.length > 0) {
      const { data: inserted } = await supabase
        .from('topic_bank')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('goal', contentType)
        .eq('shown', false)
        .order('created_at', { ascending: false })
        .limit(SERVE_COUNT)

      if (inserted) {
        await supabase
          .from('topic_bank')
          .update({ shown: true, shown_at: new Date().toISOString() })
          .in('id', inserted.map(r => r.id))
      }
    }

    return NextResponse.json({
      subtopics: toServe.map(t => ({
        title: t.title,
        angle: t.angle,
        category: t.category,
        hook_idea: t.hook_idea,
        source: 'llm',
      })),
      cached: false,
      remaining: Math.max(0, generated.length - SERVE_COUNT),
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    console.error('[Topics]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Topic generation failed' },
      { status: 500 }
    )
  }
}
