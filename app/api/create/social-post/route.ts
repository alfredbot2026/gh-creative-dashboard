/**
 * POST /api/create/social-post
 * Generate a social media post (FB/IG feed caption + image prompt)
 * Lighter than a full script — caption + hashtags + image concept
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGenerationContext, getBrandContext } from '@/lib/create/kb-retriever'
import { generateJSON } from '@/lib/llm/client'
import type { BrandStyleGuide } from '@/lib/brand/types'

interface SocialPostRequest {
  topic?: string
  content_purpose?: string
  product_context?: { name: string; price?: string; offer_details?: string }
  platform: 'facebook' | 'instagram'
  selected_hook_id?: string
  selected_framework_id?: string
}

interface SocialPostResponse {
  caption: string
  hashtags: string[]
  image_concept: string
  image_prompt: string
  hook_used: string
  content_type: 'social-post'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || '00000000-0000-0000-0000-000000000000'

    const body: SocialPostRequest = await request.json()

    const { entries: kbEntries } = await getGenerationContext(
      'short-form',
      ['hook_library', 'scripting_framework', 'virality_science', 'platform_intelligence'],
      15
    )

    const brandRaw = await getBrandContext()
    if (!brandRaw) return NextResponse.json({ error: 'Brand not configured' }, { status: 400 })
    const brand = brandRaw as unknown as BrandStyleGuide

    const hooks = kbEntries.filter(e => e.category === 'hook_library').slice(0, 5)
    const platformIntel = kbEntries.filter(e => e.category === 'platform_intelligence').slice(0, 3)

    const prompt = `You are a social media copywriter for ${brand.creator_description || 'a Filipino creator'}.

## Brand Voice
- Tone: ${brand.voice_rubric.tone_descriptors.join(', ')}
- Language: Taglish (Filipino-English mix, ~${Math.round(brand.voice_rubric.taglish_ratio.target * 100)}% Filipino)
- NEVER use: ${brand.voice_rubric.banned_ai_words.join(', ')}

## Platform: ${body.platform === 'facebook' ? 'Facebook' : 'Instagram'} Feed Post
${body.platform === 'facebook' ? 'Facebook: longer captions OK, storytelling works, link previews.' : 'Instagram: 2200 char limit, first 125 chars must hook, strong CTA.'}

## Available Hooks (use one)
${hooks.map(h => `- **${h.title}**: ${h.content.slice(0, 120)}`).join('\n')}

## Platform Intelligence
${platformIntel.map(p => `- ${p.title}: ${p.content.slice(0, 100)}`).join('\n')}
${body.content_purpose ? `\n## Content Purpose: ${body.content_purpose.toUpperCase()}` : ''}
${body.product_context ? `\n## Product: ${body.product_context.name}${body.product_context.price ? ` — ${body.product_context.price}` : ''}
Offer: ${body.product_context.offer_details || 'See bio/link'}` : ''}
${body.topic ? `\n## Topic: ${body.topic}` : ''}

## Task
Create a ${body.platform} feed post. Return JSON:
{
  "caption": "Full post caption with emojis and line breaks, Taglish",
  "hashtags": ["list", "of", "hashtags", "no", "hash", "symbol"],
  "image_concept": "What the image should show (1 sentence)",
  "image_prompt": "Detailed Gemini image gen prompt with brand colors and style",
  "hook_used": "Name of the hook pattern used"
}

Rules:
- Caption should flow naturally, not feel like an ad
- First line MUST be a strong hook (use one from the list)
- Include 1-2 emojis per paragraph (not excessive)
- Hashtags: 5-10, mix of niche + broad
- Image concept should be specific and visual`

    const { data } = await generateJSON<SocialPostResponse>(
      'You are a social media copywriter that outputs JSON.',
      prompt
    )

    return NextResponse.json({
      ...data,
      content_type: 'social-post',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
