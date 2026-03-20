import { NextResponse } from 'next/server'
import { generateJSON } from '@/lib/llm/client'
import { getContentTypeContext } from '@/lib/create/kb-retriever'
import { generateImage } from '@/lib/create/image-generator-api'
import { createClient } from '@/lib/supabase/server'

interface GenerateRequest {
  platform: 'reels' | 'tiktok' | 'facebook-post' | 'facebook-ad' | 'youtube' | 'carousel' | 'static-image'
  contentType: 'educate' | 'story' | 'prove' | 'sell'
  productId?: string
  topic?: string
  generateImages?: boolean
  variants?: number
}

/**
 * Pull the FULL business context: profile + persona + products.
 * This is what tells Gemini WHAT to write about.
 */
async function getBusinessContext() {
  const supabase = await createClient()

  const [
    { data: profile },
    { data: persona },
    { data: products },
  ] = await Promise.all([
    supabase.from('business_profile').select('*').limit(1).single(),
    supabase.from('brand_persona').select('character_name, backstory, voice_preset, custom_voice_notes').limit(1).single(),
    supabase.from('product_catalog').select('name, price, description, target_audience').eq('is_active', true),
  ])

  return { profile, persona, products }
}

function buildSystemPrompt(
  biz: { profile: any; persona: any; products: any[] | null },
  platform: string,
  contentType: string,
) {
  const p = biz.profile
  const persona = biz.persona

  // Content pillar mapping — which pillar does this content type align with?
  const pillarMap: Record<string, string> = {
    educate: 'Education — how P2P works, how simple the tools are',
    story: 'Relatability — Grace\'s real home life, family, creative process',
    prove: 'Proof — student results, real receipts, real transformations',
    sell: 'Objection Busting + Education — addressing doubts and showing the path',
    trend: 'Trend Jacking — ride a trending audio, format, or topic and tie it back to paper crafting / P2P',
    inspire: 'Inspiration & Motivation — uplift fellow moms, share mindset shifts, celebrate small wins in the creative business journey',
  }

  let platformRules = ''
  switch (platform) {
    case 'reels':
    case 'tiktok':
      platformRules = `Format: Short-form video script (30-60 seconds).
Each variant must have a "hook" (the first thing said on camera) and a "content" object with a "scenes" array.
Each scene: { "sceneNumber": 1, "visual": "what the viewer sees", "voiceover": "what Grace says" }.
Keep it 3-4 scenes max. Visual directions must be things Grace can actually film at home — her desk, her printer, her paper products, her kids nearby.`
      break
    case 'facebook-post':
      platformRules = `Format: Facebook post.
Each variant must have a "hook" and a "content" object with "caption" (string) and "hashtags" (array).
Caption should be conversational Taglish — like Grace is talking to a friend. 150-300 words.`
      break
    case 'facebook-ad':
      platformRules = `Format: Facebook ad.
Each variant must have a "hook" and a "content" object with "headline" (short, punchy), "primaryText" (the ad body, 100-200 words), and "imagePrompt" (what the ad image should show).
Must include a clear CTA. Price anchoring encouraged.`
      break
    case 'youtube':
      platformRules = `Format: YouTube video script.
Each variant must have a "hook" and a "content" object with a "sections" array.
Each section: { "timestamp": "0:00", "content": "what Grace says", "visual": "what the viewer sees" }.
Target 5-8 minutes. Include a strong intro hook, value delivery, and CTA.`
      break
    case 'carousel':
      platformRules = `Format: Instagram carousel (5-7 slides).
Each variant must have a "hook" and a "content" object with a "slides" array.
Each slide: { "text": "the text on the slide", "imagePrompt": "visual description" }.
Slide 1 = hook. Last slide = CTA. Middle slides = value.`
      break
    case 'static-image':
      platformRules = `Format: Static image post.
Each variant must have a "hook" and a "content" object with "headline" (bold text overlay), "subtext" (supporting text), and "imagePrompt" (visual description).`
      break
  }

  return `You are ${persona?.character_name || 'Grace'}, the founder of ${p?.business_name || 'Graceful Homeschooling'}.

WHO YOU ARE:
${persona?.backstory || 'Filipino mompreneur who turned paper crafting into a home-based business.'}

YOUR BUSINESS:
- Business: ${p?.business_name || 'Graceful Homeschooling'}
- Industry: ${p?.industry || 'Home-based paper products business education'}
- What you sell: ${(p?.products_services || []).join('; ')}
- Target audience: ${p?.target_audience || 'Filipino stay-at-home moms'}

YOUR BRAND VOICE:
${p?.brand_voice || 'Warm, encouraging, relatable, practical'}
${p?.notes || ''}

YOUR CONTENT PILLAR FOR THIS POST:
${pillarMap[contentType] || 'General brand content'}

YOUR PRODUCTS (reference naturally, don't force):
${(biz.products || []).map(pr => `- ${pr.name} (${pr.price}) — ${pr.description}`).join('\n')}

YOUR UNIQUE SELLING POINTS:
${(p?.unique_selling_points || []).map((u: string) => `- ${u}`).join('\n')}

IMPORTANT RULES:
- Write as Grace — first person, warm, like talking to a kapwa mommy
- Use Taglish naturally (mix of Filipino and English, like real PH social media)
- Content must be about PAPER CRAFTING / PAPER PRODUCTS business specifically
- Visual directions must be things Grace can film at home (her desk, printer, paper products, journals, stickers)
- Never sound like a generic online business guru
- Never use "passive income" — this is ACTIVE, hands-on, creative work
- Reference real things: Canva, Shopee, her printer, ₱1,300 starter kit, actual paper products

${platformRules}

You will generate exactly 3 distinct content variants.
Each variant must use a DIFFERENT hook style drawn from the provided hook library.
Assign a "qualityScore" (0-100) based on brand fit, specificity to paper crafting, and Taglish naturalness.
Also assign a "number" (1, 2, 3) and a unique "id" (string) to each variant.

Return ONLY raw JSON matching this schema:
{
  "variants": [
    {
      "id": "uuid-string",
      "number": 1,
      "hook": "The attention-grabbing opener text",
      "content": { ...platform specific object... },
      "qualityScore": 95
    }
  ]
}
No markdown blocks, no extra text.`
}

export async function POST(req: Request) {
  try {
    const body: GenerateRequest = await req.json()
    const { platform, contentType, productId, topic, generateImages = false, variants = 3 } = body

    if (!platform || !contentType) {
      return NextResponse.json({ error: 'Missing platform or contentType' }, { status: 400 })
    }

    // 1. Get KB context (frameworks + hooks — the HOW)
    const laneMap: Record<string, 'short-form' | 'ads' | 'youtube' | 'social_media'> = {
      'reels': 'short-form',
      'tiktok': 'short-form',
      'facebook-post': 'social_media',
      'facebook-ad': 'ads',
      'youtube': 'youtube',
      'carousel': 'social_media',
      'static-image': 'ads',
    }
    
    const kbContext = await getContentTypeContext(laneMap[platform], contentType, 15)
    
    // 2. Get Business context (profile + persona + products — the WHAT)
    const bizContext = await getBusinessContext()

    // 3. Get specific Product (if sell mode with selection)
    let productContext = ''
    if (productId) {
      const supabase = await createClient()
      const { data: product } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('id', productId)
        .single()
      
      if (product) {
        productContext = `\nFEATURED PRODUCT (make this the focus):\nName: ${product.name}\nPrice: ${product.price}\nDescription: ${product.description || ''}\nTarget Audience: ${product.target_audience || ''}`
      }
    }

    // 4. Build Prompts
    const systemPrompt = buildSystemPrompt(bizContext, platform, contentType)
    
    const topicContext = topic 
      ? `\nSPECIFIC TOPIC/IDEA (focus the content on this):\n${topic}\n`
      : ''

    const imageInstructions = generateImages
      ? `\nIMAGE GENERATION: For each variant, include an "imagePrompt" field in the content object. This should be a detailed visual description for AI image generation. Describe: the scene, Grace's appearance, products visible, lighting, composition. The image should feel like a real photo from Grace's home/studio.`
      : ''

    const userPrompt = `Objective: Create ${contentType} content for ${platform}.
${topicContext}
CONTENT FRAMEWORKS TO USE (choose the best structure for each variant):
${JSON.stringify(kbContext.entries.slice(0, 8).map(e => ({ title: e.title, content: e.content?.substring(0, 500) })))}

HOOK STYLES TO USE (each variant must use a DIFFERENT hook):
${JSON.stringify(kbContext.hooks.map(h => ({ title: h.title, content: h.content?.substring(0, 300) })))}
${productContext}${imageInstructions}

Generate ${variants} distinct variants now. Remember: every variant must be specifically about PAPER CRAFTING business, reference real things Grace does, and sound like natural Taglish.`

    // 5. Generate via LLM
    const result = await generateJSON<any>(systemPrompt, userPrompt)

    if (!result.data || !result.data.variants) {
      throw new Error('LLM failed to return variants array')
    }

    let finalVariants = result.data.variants

    // Generate images if requested
    if (generateImages) {
      const imagePromises = finalVariants.map(async (variant: any) => {
        const imagePrompt = variant.content?.imagePrompt
        if (!imagePrompt) return variant

        try {
          // Determine aspect ratio based on platform
          const aspectMap: Record<string, '1:1' | '4:5' | '16:9' | '9:16'> = {
            'facebook-ad': '1:1',
            'static-image': '1:1',
            'carousel': '1:1',
            'facebook-post': '4:5',
          }

          const imageResult = await generateImage({
            prompt: imagePrompt,
            style: 'creator_featured',
            aspect_ratio: aspectMap[platform] || '1:1',
          })

          return {
            ...variant,
            imageUrl: imageResult.image_url,
            imageStoragePath: imageResult.storage_path,
          }
        } catch (imgErr) {
          console.error(`[Generate API] Image gen failed for variant ${variant.number}:`, imgErr)
          // Return variant without image — don't fail the whole request
          return variant
        }
      })

      finalVariants = await Promise.all(imagePromises)
    }

    return NextResponse.json({
      variants: finalVariants,
      platform,
      contentType,
      generatedAt: new Date().toISOString(),
      kbEntriesUsed: kbContext.entries.length,
      hooksUsed: kbContext.hooks.length,
    })

  } catch (err) {
    console.error('[Generate API] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
