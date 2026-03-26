import { NextResponse } from 'next/server'
import { generateCreativeJSON } from '@/lib/llm/client'
import { getContentTypeContext } from '@/lib/create/kb-retriever'
import { generateImage } from '@/lib/create/image-generator-api'
import { getOrCreateSession } from '@/lib/create/session-manager'
import { getAdPerformanceContext } from '@/lib/create/ad-performance-context'
import { createClient } from '@/lib/supabase/server'

interface GenerateRequest {
  platform: 'reels' | 'tiktok' | 'facebook-post' | 'facebook-ad' | 'youtube' | 'carousel' | 'static-image'
  contentType: 'educate' | 'story' | 'prove' | 'sell' | 'trend' | 'inspire' | 'debunk' | 'process' | 'journey' | 'announce'
  productId?: string
  topic?: string
  generateImages?: boolean
  variants?: number
  structure_slug?: string
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
  hasStructure = false,
) {
  const p = biz.profile
  const persona = biz.persona

  // Content type constraints — MUST constrain structure, tone, and what NOT to do
  const contentTypeRules: Record<string, string> = {
    educate: `CONTENT TYPE: TEACH SOMETHING
GOAL: Viewer learns ONE specific, actionable thing about paper crafting.
STRUCTURE: Hook with a surprising fact or "did you know" → Teach the thing step by step → Show the result → CTA
HOOK STYLE: Educational — "The #1 mistake...", "Here's what nobody tells you about...", "3 things you need to know..."
MUST: Include a specific technique, tool, or tip (e.g., "use 120gsm paper for stickers", "this Canva template trick")
MUST NOT: Tell a personal backstory (save that for 'journey'). Don't pitch products directly (save for 'sell').`,

    story: `CONTENT TYPE: TELL A STORY
GOAL: Viewer feels emotionally connected to Grace through a specific moment or narrative.
STRUCTURE: Set the scene (time, place, emotion) → Build tension or conflict → Resolution/realization → Takeaway
HOOK STYLE: Narrative — "Last Tuesday...", "I'll never forget the day...", "Nobody saw me crying in the kitchen that night..."
MUST: Include specific sensory details (what Grace saw, felt, heard). Use a concrete moment, not a summary of her life.
MUST NOT: Teach a technique (save for 'educate'). Don't use comparison hooks ("X vs Y"). Don't pitch products.`,

    prove: `CONTENT TYPE: SHOW PROOF
GOAL: Viewer sees EVIDENCE that paper crafting business actually works (not just claims).
STRUCTURE: Bold claim → Show the receipt/screenshot/result → Context of what it took → "You can do this too"
HOOK STYLE: Evidence-based — "Here's my actual Shopee dashboard...", "This journal sold 47 copies...", "Real numbers from last month..."
MUST: Reference specific numbers, results, student wins, or tangible outcomes. Be concrete, not vague.
MUST NOT: Tell a generic origin story. Don't teach how to do it (save for 'educate'). Don't be hypothetical.`,

    sell: `CONTENT TYPE: PROMOTE & SELL
GOAL: Viewer takes action — clicks, buys, DMs, or signs up.
STRUCTURE: Problem/pain point → Agitate → Present the solution (product) → Price anchor → Urgent CTA
HOOK STYLE: Objection-busting — "You think it's too expensive?", "But I don't have time...", "What if I told you..."
MUST: Name the specific product and price. Include a clear CTA (DM, link, comment keyword). Price anchor against something relatable.
MUST NOT: Be subtle about selling. Don't just educate — this is a sales post. Don't tell a long backstory.`,

    trend: `CONTENT TYPE: RIDE A TREND
GOAL: Use a trending format, sound, or topic to reach NEW viewers and tie it to paper crafting.
STRUCTURE: Trending format/hook → Unexpected paper crafting twist → "Bet you didn't expect that" → Follow CTA
HOOK STYLE: Trend-native — Use "POV:", "Things that just make sense:", "Tell me you're a ___ without telling me", "Day in my life as..."
MUST: The content must feel like it belongs on a For You page. Lead with the trend, THEN connect to paper crafting. Prioritize virality.
MUST NOT: Start with paper crafting directly. Don't be educational or preachy. Don't pitch products. Keep it light and fun.`,

    inspire: `CONTENT TYPE: INSPIRE & MOTIVATE
GOAL: Viewer feels "if she can do it, I can too" — emotional uplift, not information.
STRUCTURE: Relatable struggle → Mindset shift moment → Where Grace is now → Encouraging words for the viewer
HOOK STYLE: Motivational — "You don't need permission...", "Stop waiting for the perfect time...", "A year from now you'll wish you started today..."
MUST: Focus on FEELINGS and MINDSET, not business tactics. Speak directly to the viewer's self-doubt. End with empowerment.
MUST NOT: Teach techniques. Don't show receipts or numbers (save for 'prove'). Don't sell products. This is emotional, not transactional.`,

    debunk: `CONTENT TYPE: DEBUNK A MYTH
GOAL: Viewer has a belief SHATTERED — "wait, that's not true?"
STRUCTURE: State the myth confidently → "But here's what actually happens..." → The truth with evidence → New perspective
HOOK STYLE: Contrarian — "Stop believing this lie about...", "Everyone says X but actually...", "This 'common advice' is WRONG..."
MUST: Name the specific myth clearly. Provide a concrete counter-example from Grace's experience. Be bold and opinionated.
MUST NOT: Be wishy-washy. Don't say "well, it depends." Don't tell a personal journey (save for 'journey'). Take a strong stance.`,

    process: `CONTENT TYPE: SHOW THE PROCESS
GOAL: Viewer watches Grace DO the thing — satisfying, behind-the-scenes, ASMR-adjacent.
STRUCTURE: "Watch me..." intro → Step-by-step process → Satisfying reveal of finished product → "Want to learn how?"
HOOK STYLE: Process-driven — "Watch me turn ₱15 of paper into...", "The most satisfying part of my day...", "How I make 50 sticker sheets in one afternoon..."
MUST: Focus on VISUALS — hands working, printer running, cutting, packaging. Keep narration brief and casual but every block MUST have script_text (even short lines like "Watch this part..." or "This is where it gets good..."). Visual satisfaction is the star.
MUST NOT: Tell a story. Don't get emotional. Don't pitch products. Let the process speak for itself.`,

    journey: `CONTENT TYPE: SHARE MY JOURNEY
GOAL: Viewer feels like they KNOW Grace personally — raw, vulnerable, real.
STRUCTURE: "X years ago..." → Specific low moment → Turning point → Where I am now → What I learned
HOOK STYLE: Personal narrative — "3 years ago I was just a...", "I never planned to start a business...", "The moment everything changed was..."
MUST: Be deeply personal and specific. Name real dates, places, emotions. This is memoir-style, not motivational poster.
MUST NOT: Teach anything. Don't show numbers (save for 'prove'). Don't sell. Don't give advice. Just share the story authentically.`,

    announce: `CONTENT TYPE: ANNOUNCE SOMETHING
GOAL: Viewer feels FOMO — "I need to act NOW before I miss this."
STRUCTURE: Big reveal → What it is → Why it matters → Limited availability/deadline → How to get it
HOOK STYLE: Announcement — "It's finally here!", "I've been keeping a secret...", "Mark your calendars...", "Only X spots left..."
MUST: Create genuine urgency (date, limited quantity, or exclusive access). Be specific about what's being announced.
MUST NOT: Be vague. Don't bury the announcement in a story. Lead with the news. Keep it exciting and fast-paced.`,
  }

  let platformRules = ''
  switch (platform) {
    case 'reels':
    case 'tiktok':
      platformRules = `Format: Short-form video script (30-60 seconds).
Each variant must have a "hook" (the first thing said on camera) and a "content" object with a "scenes" array.
Each scene must use this EXACT format: { "block_id": "hook", "block_label": "HOOK", "timing": "0-3s", "script_text": "what Grace says (Taglish)", "visual_direction": "what the viewer sees", "on_screen_text": "text overlay (short, punchy)", "production_notes": "filming tips" }.
The scenes should follow a clear structure with labeled blocks (HOOK, SUPER HOOK, CONTEXT, VALUE, CTA, etc.).
Keep it 4-6 blocks max. Visual directions must be things Grace can actually film at home — her desk, her printer, her paper products, her kids nearby.`
      break
    case 'facebook-post':
      if (hasStructure) {
        platformRules = `Format: Facebook post with structure-aware blocks.
Each variant must have a "hook" and a "content" object with a "scenes" array.
Each scene must use this EXACT format: { "block_id": "section_id", "block_label": "SECTION NAME", "script_text": "the post text for this section (Taglish, conversational)", "visual_direction": "optional: what image/visual could accompany this" }.
The scenes should follow the selected structure's blocks with labeled sections.
Total post length: 150-400 words. Write like Grace is talking to a friend — casual, warm, real.`
      } else {
        platformRules = `Format: Facebook post.
Each variant must have a "hook" and a "content" object with "caption" (string) and "hashtags" (array).
Caption should be conversational Taglish — like Grace is talking to a friend. 150-300 words.`
      }
      break
    case 'facebook-ad':
      if (hasStructure) {
        platformRules = `Format: Facebook ad with structure-aware blocks.
Each variant must have a "hook" and a "content" object with a "scenes" array.
Each scene must use this EXACT format: { "block_id": "section_id", "block_label": "SECTION NAME", "script_text": "the ad copy for this section", "visual_direction": "what the ad image should show for this section" }.
The scenes should follow the selected structure's blocks (e.g., PASTOR = Problem, Amplify, Story, Transformation, Offer, Response).
Must include a clear CTA. Price anchoring encouraged. Keep total ad copy 100-250 words.`
      } else {
        platformRules = `Format: Facebook ad.
Each variant must have a "hook" and a "content" object with "headline" (short, punchy), "primaryText" (the ad body, 100-200 words), and "imagePrompt" (what the ad image should show).
Must include a clear CTA. Price anchoring encouraged.`
      }
      break
    case 'youtube':
      if (hasStructure) {
        platformRules = `Format: YouTube video script (5-8 minutes).
Each variant must have a "hook" (the opening line) and a "content" object with a "scenes" array.
Each scene must use this EXACT format: { "block_id": "hook", "block_label": "HOOK", "timing": "0:00-0:30", "script_text": "what Grace says (Taglish)", "visual_direction": "what the viewer sees", "on_screen_text": "text overlay", "production_notes": "filming tips" }.
The scenes should follow the selected structure's blocks with labeled sections.`
      } else {
        platformRules = `Format: YouTube video script.
Each variant must have a "hook" and a "content" object with a "sections" array.
Each section: { "timestamp": "0:00", "content": "what Grace says", "visual": "what the viewer sees" }.
Target 5-8 minutes. Include a strong intro hook, value delivery, and CTA.`
      }
      break
    case 'carousel':
      if (hasStructure) {
        platformRules = `Format: Instagram carousel with structure-aware slides (5-7 slides).
Each variant must have a "hook" and a "content" object with a "scenes" array.
Each scene represents ONE slide: { "block_id": "slide_id", "block_label": "SLIDE LABEL", "script_text": "the main text on this slide (short, punchy, 1-3 sentences max)", "visual_direction": "what the slide image should show", "on_screen_text": "the large display text for this slide" }.
Slide 1 = HOOK slide (pattern interrupt). Last slide = CTA slide. Middle slides follow the structure blocks.
Each slide should have enough text to fill ONE Instagram carousel card — not too long, not too short. Think: headline + 1-2 supporting sentences.`
      } else {
        platformRules = `Format: Instagram carousel (5-7 slides).
Each variant must have a "hook" and a "content" object with a "slides" array.
Each slide: { "slide_number": 1, "text": "the main text on this slide (short, punchy)", "subtext": "supporting detail (1 sentence)", "imagePrompt": "visual description for the slide background" }.
Slide 1 = hook (pattern interrupt). Last slide = CTA. Middle slides = value. Keep text SHORT — this is a visual format.`
      }
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
- Target audience: ${p?.target_audience || 'Filipino stay-at-home moms'}
- USPs: ${(p?.unique_selling_points || []).join('; ')}

YOUR BRAND VOICE:
${p?.brand_voice || 'Warm, encouraging, relatable, practical'}
${p?.notes || ''}

${contentTypeRules[contentType] || 'General brand content'}

YOUR PRODUCTS (reference naturally when appropriate):
${(biz.products || []).map(pr => `- ${pr.name} (${pr.price}) — ${pr.description}${pr.target_audience ? ` | For: ${pr.target_audience}` : ''}`).join('\n') || 'No products configured'}

YOUR UNIQUE SELLING POINTS:
${(p?.unique_selling_points || []).map((u: string) => `- ${u}`).join('\n')}

IMPORTANT RULES:
- Write as Grace — first person, warm, like talking to a kapwa mommy
- Use Taglish naturally (mix of Filipino and English, like real PH social media)
- Content must be about PAPER CRAFTING / PAPER PRODUCTS business specifically
- Visual directions must be things Grace can film at home (her desk, printer, paper products, journals, stickers)
- IMAGE PROMPT RULE: If generating an "imagePrompt", DO NOT describe Grace's face, body, or hair. Do not use words like "long hair", "ponytail", or "young girl". Just say "Grace" or "Filipino woman" and focus the prompt entirely on her ACTION (e.g., cutting stickers, packing orders) and the SETTING. The image generator has strict reference photos it will use for her identity.
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
    const { platform, contentType, productId, topic, generateImages = false, variants = 3, structure_slug } = body

    if (!platform || !contentType) {
      return NextResponse.json({ error: 'Missing platform or contentType' }, { status: 400 })
    }

    // Get user ID for image upload (optional — image gen works without auth for text-only)
    let userId: string | undefined
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch { /* no auth session — image gen will skip upload */ }

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

    // 1b. Pull additional KB intelligence for richer generation
    const supabaseKB = await createClient()
    
    // Virality science entries (what makes content go viral)
    const { data: viralityEntries } = await supabaseKB
      .from('knowledge_entries')
      .select('title, content')
      .eq('category', 'virality_science')
      .limit(5)
    
    // Angle shift techniques (how to find unique angles)
    const { data: angleEntries } = await supabaseKB
      .from('knowledge_entries')
      .select('title, content')
      .in('subcategory', ['angle_shifts', 'contrarian_reframe', 'contrarian_hook', 'contrarian_perspective'])
      .limit(4)

    // Recently generated scripts (for anti-repetition)
    const { data: recentScripts } = await supabaseKB
      .from('content_items')
      .select('hook, script_data')
      .eq('ai_generated', true)
      .order('created_at', { ascending: false })
      .limit(5)
    
    const recentHooks = (recentScripts || []).map(s => s.hook).filter(Boolean)
    const recentAngles = recentHooks.length > 0 
      ? `\nANTI-REPETITION: These hooks/angles were used in recent scripts. Do NOT reuse them — find a DIFFERENT angle:\n${recentHooks.map(h => `- "${h}"`).join('\n')}\n`
      : ''

    const viralityContext = (viralityEntries || []).length > 0
      ? `\nVIRALITY SCIENCE (apply these principles):\n${(viralityEntries || []).slice(0, 3).map(e => `- ${e.title}: ${(e.content || '').substring(0, 200)}`).join('\n')}\n`
      : ''

    const angleContext = (angleEntries || []).length > 0
      ? `\nANGLE TECHNIQUES (use these to find a UNIQUE perspective):\n${(angleEntries || []).map(e => `- ${e.title}: ${(e.content || '').substring(0, 200)}`).join('\n')}\n`
      : ''
    
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

    // 3b. Load structure if selected
    let structureContext = ''
    if (structure_slug) {
      const supabase = await createClient()
      const { data: structure } = await supabase
        .from('content_structures')
        .select('*')
        .eq('slug', structure_slug)
        .single()

      if (structure) {
        const blocks = (structure.blocks as any[]) || []
        structureContext = `\n\n=== SELECTED STRUCTURE: "${structure.name}" ===
Description: ${structure.description}

CRITICAL: Each block below has specific RULES and INSTRUCTIONS. You must follow them precisely — don't just label paragraphs with block names. Each block has a distinct PURPOSE and TECHNIQUE.

${blocks.map((b: any) => {
          const rules = (b.rules as string[] || []).map((r: string) => `    - ${r}`).join('\n')
          return `BLOCK: ${b.label} (${b.id})
  Timing: ${b.timing || 'flexible'}
  Purpose: ${b.instruction || b.purpose || ''}
  Rules:
${rules}
  Example: ${b.example || 'N/A'}
  Duration: ${b.duration_hint || 'see timing'}`
        }).join('\n\n')}

IMPORTANT RULES:
- Each block must serve its SPECIFIC purpose. A Hook is NOT just the first sentence — it's a pattern interrupt that stops the scroll.
- Do NOT write a regular script and then retrofit block labels onto it. Each block must follow its rules independently.
- Respect the timing. A 1-second hook should be 5-8 words max, not a full paragraph.
- Transitions between blocks should be intentional — each block builds on the previous one but has its own distinct energy and technique.

Each variant MUST include ALL blocks listed above — do NOT skip or merge blocks. Use the block_id and block_label from above for each scene.
The variant's "hook" field should be a short 1-line summary of the first block's text (for display as a title). The FULL hook text goes inside the first scene's script_text.
CRITICAL: You must generate a scene for EVERY block listed above. If the structure has 6 blocks, you must output 6 scenes. Never condense or merge blocks.`
      }
    }

    // 4. Build Prompts
    const systemPrompt = buildSystemPrompt(bizContext, platform, contentType, !!structure_slug)
    
    const topicContext = topic 
      ? `\nSPECIFIC TOPIC/IDEA (focus the content on this):\n${topic}\n`
      : ''

    const imageInstructions = generateImages
      ? `\nIMAGE GENERATION: For each variant, include an "imagePrompt" field in the content object. This should be a detailed visual description for AI image generation. Describe: the scene, Grace's appearance, products visible, lighting, composition. The image should feel like a real photo from Grace's home/studio.`
      : ''

    // Goal-appropriate CTA and product mention rules
    const goalCTARules: Record<string, string> = {
      sell: 'CTA RULES: Full product pitch with pricing. Name the product, state the price, include a clear CTA (comment keyword, link, DM). Price anchor against something relatable.',
      announce: 'CTA RULES: Full announcement with details. Can mention products and pricing. Create urgency with deadlines or limited availability.',
      prove: 'CTA RULES: Can reference products as the vehicle for results shown. Light CTA — "DM me if you want to know how" or "Follow for more results."',
      educate: 'CTA RULES: DO NOT mention any product names or pricing. End with "Follow for more tips" or "Save this for later" or a question to boost comments. This is pure education, not a sales funnel.',
      story: 'CTA RULES: DO NOT mention any product names, pricing, or offers. End with "Follow for more of my journey" or an emotional closing line. This is pure storytelling.',
      inspire: 'CTA RULES: DO NOT mention any product names or pricing. End with an empowering message directed at the viewer. No sales, no links, just encouragement.',
      journey: 'CTA RULES: DO NOT mention any product names or pricing. End authentically — what you learned, how you feel now. No sales pitch.',
      debunk: 'CTA RULES: DO NOT mention products. End with the truth and an invitation to discuss — "What do you think? Comment below" or "Follow for more myth-busting."',
      process: 'CTA RULES: DO NOT mention products by name or price. End with "Follow to see more" or "Which product should I make next?" Keep it casual.',
      trend: 'CTA RULES: DO NOT mention products. End with a trend-native CTA — "Follow for more paper crafting content" or a challenge/tag.',
    }

    // Only include product context for goals where selling is appropriate
    const sellGoals = ['sell', 'announce', 'prove']
    const filteredProductContext = sellGoals.includes(contentType) ? productContext : ''
    const ctaRule = goalCTARules[contentType] || goalCTARules.educate

    // 4.5 Load ad performance feedback (if available + relevant goal)
    let adPerformancePrompt = ''
    if (userId && ['sell', 'announce', 'prove'].includes(contentType)) {
      try {
        const adCtx = await getAdPerformanceContext(userId)
        if (adCtx.hasEnoughData) {
          adPerformancePrompt = '\n' + adCtx.promptFragment + '\n'
        }
      } catch { /* non-fatal */ }
    }

    const userPrompt = `Objective: Create "${contentType}" content for ${platform}. Follow the ${contentType.toUpperCase()} content type rules STRICTLY — the hook style, structure, MUST and MUST NOT constraints.

${ctaRule}
${topicContext}${adPerformancePrompt}
CONTENT FRAMEWORKS TO USE (choose the best structure for each variant):
${JSON.stringify(kbContext.entries.slice(0, 8).map(e => ({ title: e.title, content: e.content?.substring(0, 500) })))}

HOOK STYLES TO USE (each variant must use a DIFFERENT hook):
${JSON.stringify(kbContext.hooks.map(h => ({ title: h.title, content: h.content?.substring(0, 300) })))}
${filteredProductContext}${structureContext}${imageInstructions}

${viralityContext}${angleContext}${recentAngles}
Generate ${variants} distinct variants now. Each variant MUST take a DIFFERENT angle on the topic — don't just reword the same talking points. Find unique perspectives, unexpected comparisons, or fresh entry points. Remember: every variant must be specifically about PAPER CRAFTING business, reference real things Grace does, and sound like natural Taglish.`

    // 5. Generate via LLM
    const result = await generateCreativeJSON<any>(systemPrompt, userPrompt)

    if (!result.data || !result.data.variants) {
      throw new Error('LLM failed to return variants array')
    }

    let finalVariants = result.data.variants

    // Generate images if requested — use multi-turn session for consistency
    if (generateImages) {
      // Try multi-turn session first (all variants in same session = same identity)
      let session = null
      if (userId) {
        try {
          session = await getOrCreateSession(userId)
        } catch (sessionErr) {
          console.warn('[Generate API] Multi-turn session init failed, falling back to single-shot:', sessionErr)
        }
      }

      // Sequential generation — NOT parallel — to maintain multi-turn context
      for (let i = 0; i < finalVariants.length; i++) {
        const variant = finalVariants[i]
        const imagePrompt = variant.content?.imagePrompt
        if (!imagePrompt) continue

        try {
          if (session) {
            // Multi-turn: generate within session for consistency
            const imageBuffer = await session.generateScene(imagePrompt)
            const base64 = imageBuffer.toString('base64')
            finalVariants[i] = {
              ...variant,
              imageUrl: `data:image/png;base64,${base64}`,
              imageStoragePath: '',
            }
          } else {
            // Fallback: single-shot generation
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
            }, userId)

            finalVariants[i] = {
              ...variant,
              imageUrl: imageResult.image_url,
              imageStoragePath: imageResult.storage_path,
            }
          }
        } catch (imgErr) {
          console.error(`[Generate API] Image gen failed for variant ${variant.number}:`, imgErr)
          // Return variant without image — don't fail the whole request
        }
      }
    }

    return NextResponse.json({
      variants: finalVariants,
      platform,
      contentType,
      generatedAt: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
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
