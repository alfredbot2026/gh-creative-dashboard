import { NextResponse } from 'next/server'
import { generateJSON } from '@/lib/llm/client'
import { getContentTypeContext, getBrandContext } from '@/lib/create/kb-retriever'
import { createClient } from '@/lib/supabase/server'

interface GenerateRequest {
  platform: 'reels' | 'tiktok' | 'facebook-post' | 'facebook-ad' | 'youtube' | 'carousel' | 'static-image'
  contentType: 'educate' | 'story' | 'prove' | 'sell'
  productId?: string
  variants?: number
}

function getSystemPrompt(brandContext: any, platform: string) {
  let platformRules = ''
  switch (platform) {
    case 'reels':
    case 'tiktok':
      platformRules = 'Format each variant as short-form video. Each variant must have a "hook" and a "content" object with a "scenes" array (sceneNumber, visual, voiceover).'
      break
    case 'facebook-post':
      platformRules = 'Format each variant as a social media post. Each variant must have a "hook" and a "content" object with a "caption" string and "hashtags" array.'
      break
    case 'facebook-ad':
      platformRules = 'Format each variant as an ad. Each variant must have a "hook" and a "content" object with "headline", "primaryText", and "imagePrompt" strings.'
      break
    case 'youtube':
      platformRules = 'Format each variant as a YouTube video script. Each variant must have a "hook" and a "content" object with a "sections" array (timestamp, content, visual).'
      break
    case 'carousel':
      platformRules = 'Format each variant as a carousel. Each variant must have a "hook" and a "content" object with a "slides" array (text, imagePrompt).'
      break
    case 'static-image':
      platformRules = 'Format each variant as a static image. Each variant must have a "hook" and a "content" object with "headline", "subtext", and "imagePrompt" strings.'
      break
  }

  return `You are Grace, an expert content creator and copywriter for Graceful Homeschooling.
Brand Guidelines:
${brandContext?.core_identity ? JSON.stringify(brandContext.core_identity) : 'Maintain a warm, nurturing, and helpful tone. Never sound corporate or overly salesy.'}
${brandContext?.copywriting_rules ? JSON.stringify(brandContext.copywriting_rules) : ''}

You will generate exactly 3 distinct content variants.
Each variant must use a DIFFERENT hook style drawn from the provided hook library.
Assign a "qualityScore" (0-100) to each variant based on how well it fits the brand and the objective.
Also assign a "number" (1, 2, 3) and a unique "id" (string) to each variant.

${platformRules}

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
    const { platform, contentType, productId, variants = 3 } = body

    if (!platform || !contentType) {
      return NextResponse.json({ error: 'Missing platform or contentType' }, { status: 400 })
    }

    // 1. Get KB context
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
    
    // 2. Get Brand context
    const brandContext = await getBrandContext()

    // 3. Get Product (if applicable)
    let productContext = ''
    if (productId) {
      const supabase = await createClient()
      const { data: product } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('id', productId)
        .single()
      
      if (product) {
        productContext = `Product Context:\nName: ${product.name}\nPrice: ${product.price}\nDescription: ${product.description || ''}\nTarget Audience: ${product.target_audience || ''}`
      }
    }

    // 4. Build Prompt
    const systemPrompt = getSystemPrompt(brandContext, platform)
    
    const userPrompt = `
Objective: Create content to ${contentType}.
Platform: ${platform}

Knowledge Base Frameworks & Inspiration:
${JSON.stringify(kbContext.entries.map(e => ({ title: e.title, content: e.content })))}

Available Hooks to Use (Choose 3 different ones for the 3 variants):
${JSON.stringify(kbContext.hooks.map(h => ({ title: h.title, content: h.content })))}

${productContext}

Generate ${variants} distinct variants now in the requested JSON format.
`

    // 5. Generate via LLM
    const result = await generateJSON<any>(systemPrompt, userPrompt)

    if (!result.data || !result.data.variants) {
      throw new Error('LLM failed to return variants array')
    }

    return NextResponse.json({
      variants: result.data.variants,
      platform,
      contentType,
      generatedAt: new Date().toISOString()
    })

  } catch (err) {
    console.error('[Generate API] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
