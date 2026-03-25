import { NextResponse } from 'next/server'
import { generateCreativeJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'

/**
 * Generate carousel slide text — short headlines + sublines, NOT paragraphs.
 * Each slide = one point. Slide 1 = hook, last slide = CTA.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { topic, slideCount = 7, goal = 'educate' } = await request.json()

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Get business context
    const { data: profile } = await supabase
      .from('business_profile')
      .select('business_name, target_audience, brand_voice, notes')
      .limit(1)
      .single()

    const systemPrompt = `You are a carousel content writer for "${profile?.business_name || 'Graceful Homeschooling'}".
Audience: ${profile?.target_audience || 'Filipino stay-at-home moms'}
Voice: ${profile?.brand_voice || 'Warm, encouraging, Taglish'}

CAROUSEL RULES:
- Each slide has ONE headline (5-10 words max, punchy) and ONE subline (1 sentence max, supporting detail)
- Slide 1 is always the HOOK — a question, bold claim, or pattern interrupt that stops the scroll
- Last slide is always the CTA — what to do next
- Middle slides each deliver ONE distinct point — no repetition between slides
- Write in natural Taglish (Filipino-English mix)
- Headlines should be readable in 2 seconds — NO paragraphs
- Think of each slide as a billboard, not a blog post`

    const userPrompt = `Create a ${slideCount}-slide Instagram carousel about: "${topic}"
Goal: ${goal}

Return JSON:
{
  "slides": [
    { "slideNumber": 1, "role": "hook", "headline": "short punchy headline", "subline": "one supporting sentence" },
    { "slideNumber": 2, "role": "point", "headline": "...", "subline": "..." },
    ...
    { "slideNumber": ${slideCount}, "role": "cta", "headline": "CTA headline", "subline": "what to do next" }
  ]
}`

    const result = await generateCreativeJSON<{ slides: any[] }>(systemPrompt, userPrompt)

    return NextResponse.json({
      slides: result.data.slides || [],
      topic,
      slideCount,
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    console.error('[carousel-text]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate carousel text' },
      { status: 500 }
    )
  }
}
