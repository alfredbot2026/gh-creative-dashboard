/**
 * Ad Creative Factory
 * 
 * Generates ad copy + image prompts informed by ALL available context:
 * - Product catalog (price, USPs, offer details, target audience)
 * - Brand voice (Taglish ratio, tone, vocabulary)
 * - Ad performance data (which angles/hooks/frameworks actually convert)
 * - Competitor landscape (what others are doing, gaps to exploit)
 * - Market sentiment (trending topics, opportunities)
 * - Business economics (what "profitable" means for this product)
 * 
 * Output formats:
 * - Static image ad: headline + body + CTA + image generation prompt
 * - Carousel ad: multi-slide with per-slide copy + image prompts
 * - Video ad script: hook + body + CTA with scene directions
 * 
 * Has its own flow but inherits knowledge from the content system.
 */
import { generateJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'
import { loadBusinessContext, getThresholds } from './business-context'

// === TYPES ===

export type AdFormat = 'static_image' | 'carousel' | 'video_script'

export interface FactoryRequest {
  angle: string
  persona: string
  format: AdFormat
  framework?: string
  count?: number           // variants (default 3)
  userId: string
}

export interface StaticAdVariant {
  format: 'static_image'
  headline: string
  body_text: string
  cta_text: string
  link_description: string
  hook_type: string
  framework: string
  emotional_tone: string
  image_prompt: string
  compliance_flags: string[]
  compliance_clean: boolean
}

export interface CarouselAdVariant {
  format: 'carousel'
  headline: string
  slides: Array<{
    body_text: string
    image_prompt: string
  }>
  cta_text: string
  hook_type: string
  framework: string
  emotional_tone: string
  compliance_flags: string[]
  compliance_clean: boolean
}

export interface VideoAdVariant {
  format: 'video_script'
  headline: string
  hook: string              // First 3 seconds (critical)
  body_script: string       // Main content
  cta_script: string        // Closing CTA
  duration_seconds: number
  visual_directions: string
  hook_type: string
  framework: string
  emotional_tone: string
  compliance_flags: string[]
  compliance_clean: boolean
}

export type AdVariant = StaticAdVariant | CarouselAdVariant | VideoAdVariant

export interface FactoryResult {
  variants: AdVariant[]
  model: string
  context_used: string[]
  business: {
    product_name: string
    product_price: number
    winning_cpa: number
    target_audience: string
  }
}

// === COMPLIANCE ===

const PROHIBITED_PATTERNS = [
  { pattern: /guaranteed.*income/i, flag: 'income_guarantee' },
  { pattern: /earn.*₱?\d+.*per (day|week|month)/i, flag: 'income_claim' },
  { pattern: /risk.?free/i, flag: 'risk_free_claim' },
  { pattern: /limited.*spots?.*left/i, flag: 'false_scarcity' },
  { pattern: /act now.*or.*miss/i, flag: 'urgency_abuse' },
  { pattern: /100%.*guaranteed/i, flag: 'absolute_guarantee' },
  { pattern: /no.*experience.*needed.*earn/i, flag: 'misleading_ease' },
]

function checkCompliance(text: string): { flags: string[]; clean: boolean } {
  const flags: string[] = []
  for (const { pattern, flag } of PROHIBITED_PATTERNS) {
    if (pattern.test(text)) flags.push(flag)
  }
  return { flags, clean: flags.length === 0 }
}

// === PERSONA CONTEXT ===

const PERSONA_CONTEXT: Record<string, string> = {
  new_mom_curious: 'New moms exploring side income. Warm, encouraging. Pain: overwhelmed, time-poor. Avoid: pressure, complexity.',
  returning_buyer: 'Previous customers. Familiar tone. Focus: upgrades, loyalty, new features.',
  price_sensitive: 'Budget-conscious. Value-focused, transparent. Lead with ROI.',
  aspirational: 'Want lifestyle transformation. Inspiring, visual. Show the dream state.',
  skeptic: 'Doubtful, been burned before. Proof-heavy. Social proof, real results.',
  beginner: 'Complete beginners. Simple, encouraging. Break everything down.',
  advanced: 'Experienced users. Sophisticated. Pro tips, advanced features.',
  gift_buyer: 'Buying for someone else. Thoughtful, gift-focused.',
  busy_professional: 'Limited time. Efficient, value-dense. Lead with time savings.',
}

// === CONTEXT LOADERS ===

async function loadProductContext(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  const { data: products } = await supabase
    .from('product_catalog')
    .select('name, price, description, offer_details, target_audience, usps')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)

  return products?.[0] || null
}

async function loadBrandVoice(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  const { data: brand } = await supabase
    .from('brand_style_guide')
    .select('voice_rubric, caption_rules, creator_description')
    .limit(1)
    .single()

  return brand
}

async function loadTopPerformingAds(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  // Get the classified ads with best ROAS and most conversations
  const { data: topAds } = await supabase
    .from('ad_creatives')
    .select('angle, framework, hook_type, emotional_tone, body_text, video_transcription, avg_roas, total_spend, ad_status, campaign_objective, creative_format')
    .eq('user_id', userId)
    .eq('ad_status', 'winning')
    .order('total_spend', { ascending: false })
    .limit(10)

  return topAds || []
}

async function loadCompetitorAngles(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  const { data: compAds } = await supabase
    .from('competitor_ads')
    .select('angle, framework, hook_type, page_name, ad_body')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(20)

  return compAds || []
}

async function loadMarketSentiment(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: signals } = await supabase
    .from('market_sentiment')
    .select('query, score, summary')
    .eq('user_id', userId)
    .gte('signal_date', weekAgo)
    .lte('signal_date', today)
    .order('signal_date', { ascending: false })
    .limit(8)

  return signals || []
}

// === FORMAT-SPECIFIC PROMPTS ===

function getFormatInstructions(format: AdFormat, count: number): string {
  if (format === 'static_image') {
    return `Generate ${count} static image ad variants. Each variant needs:
{
  "format": "static_image",
  "headline": "punchy headline under 40 chars",
  "body_text": "primary ad text, 125-300 chars, Taglish",
  "cta_text": "SIGN_UP|LEARN_MORE|SEND_MESSAGE|SHOP_NOW",
  "link_description": "short link preview",
  "hook_type": "question|bold_claim|story_opening|curiosity_gap|pain_call|social_proof_lead|direct_benefit|how_to",
  "framework": "PAS|AIDA|before_after|testimonial|urgency|FAB|storytelling|direct_offer",
  "emotional_tone": "warm|urgent|educational|aspirational|empowering|playful",
  "image_prompt": "detailed image prompt: subject, composition, colors, mood, text overlay suggestions. For Graceful Homeschooling: warm tones, Filipina mom, paper products, home office setting."
}`
  }

  if (format === 'carousel') {
    return `Generate ${count} carousel ad variants. Each variant needs:
{
  "format": "carousel",
  "headline": "carousel title",
  "slides": [
    {"body_text": "slide 1: hook/problem (max 100 chars)", "image_prompt": "slide 1 image description"},
    {"body_text": "slide 2: agitate/story", "image_prompt": "..."},
    {"body_text": "slide 3: solution/proof", "image_prompt": "..."},
    {"body_text": "slide 4: offer/CTA", "image_prompt": "..."}
  ],
  "cta_text": "SIGN_UP|LEARN_MORE|SEND_MESSAGE",
  "hook_type": "...", "framework": "...", "emotional_tone": "..."
}
Use 4-6 slides per carousel. Each slide tells one part of the story.`
  }

  // video_script
  return `Generate ${count} video ad script variants. Each variant needs:
{
  "format": "video_script",
  "headline": "video title/hook text",
  "hook": "EXACT words to say in first 3 seconds. This is the most critical part. Must stop the scroll.",
  "body_script": "Full script for the middle section (15-45 seconds). Written as spoken word, Taglish.",
  "cta_script": "Closing 5-10 seconds. Clear call to action.",
  "duration_seconds": 30-60,
  "visual_directions": "What to show on screen: B-roll suggestions, product shots, text overlays",
  "hook_type": "...", "framework": "...", "emotional_tone": "..."
}
Scripts should feel natural spoken in Taglish by a Filipina mom entrepreneur.`
}

// === MAIN GENERATOR ===

export async function generateAdVariants(req: FactoryRequest): Promise<FactoryResult> {
  const count = req.count || 3
  const supabase = await createClient()
  const contextUsed: string[] = []

  // Load ALL context in parallel
  const [product, brand, topAds, competitors, sentiment, businessCtx] = await Promise.all([
    loadProductContext(supabase),
    loadBrandVoice(supabase),
    loadTopPerformingAds(supabase, req.userId),
    loadCompetitorAngles(supabase, req.userId),
    loadMarketSentiment(supabase, req.userId),
    loadBusinessContext(supabase, req.userId),
  ])

  const thresholds = getThresholds(businessCtx)

  // Build context sections
  let productContext = ''
  if (product) {
    productContext = `
PRODUCT:
- Name: ${product.name}
- Price: ${product.price}
- Description: ${product.description}
- Offer: ${product.offer_details}
- Target: ${product.target_audience}
- USPs: ${(product.usps || []).join(', ')}
- Winning CPA: under ${thresholds.winningCPA} PHP (2x return at ${thresholds.productPrice} PHP product price)`
    contextUsed.push('product_catalog')
  }

  let brandContext = ''
  if (brand) {
    const rubric = brand.voice_rubric as Record<string, unknown> || {}
    brandContext = `
BRAND VOICE:
- Creator: ${brand.creator_description || 'Filipina mom entrepreneur'}
- Tone: ${JSON.stringify((rubric as Record<string, unknown>).tone_descriptors || ['warm', 'empowering'])}
- Taglish ratio: ${JSON.stringify((rubric as Record<string, unknown>).taglish_ratio || { target: 0.5 })}
- Banned words: ${JSON.stringify((rubric as Record<string, unknown>).banned_ai_words || [])}
- Caption rules: ${JSON.stringify(brand.caption_rules || {})}`
    contextUsed.push('brand_voice')
  }

  let performanceContext = ''
  if (topAds.length > 0) {
    const angleCounts: Record<string, number> = {}
    const frameworkCounts: Record<string, number> = {}
    const hookCounts: Record<string, number> = {}
    for (const ad of topAds) {
      if (ad.angle) angleCounts[ad.angle] = (angleCounts[ad.angle] || 0) + 1
      if (ad.framework) frameworkCounts[ad.framework] = (frameworkCounts[ad.framework] || 0) + 1
      if (ad.hook_type) hookCounts[ad.hook_type] = (hookCounts[ad.hook_type] || 0) + 1
    }
    performanceContext = `
WINNING AD PATTERNS (from real data — these actually convert):
- Top angles: ${Object.entries(angleCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')}
- Top frameworks: ${Object.entries(frameworkCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')}
- Top hooks: ${Object.entries(hookCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')}

Example winning ad copy:
${topAds.slice(0, 3).map(ad => {
  const text = ad.video_transcription || ad.body_text || ''
  return `[${ad.angle}/${ad.framework}/${ad.hook_type}] ${text.slice(0, 200)}`
}).join('\n')}`
    contextUsed.push('ad_performance_data')
  }

  let competitorContext = ''
  if (competitors.length > 0) {
    const compAngles: Record<string, number> = {}
    for (const c of competitors) {
      if (c.angle) compAngles[c.angle] = (compAngles[c.angle] || 0) + 1
    }
    competitorContext = `
COMPETITOR LANDSCAPE:
- ${competitors.length} competitor ads tracked
- Their angles: ${Object.entries(compAngles).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')}
- Differentiation opportunity: competitors are heavy on ${Object.entries(compAngles).sort((a, b) => b[1] - a[1])[0]?.[0] || 'pain_point'}. Consider angles they're NOT using.
- Example competitor copy: "${competitors[0]?.ad_body?.slice(0, 150) || ''}"`
    contextUsed.push('competitor_intelligence')
  }

  let sentimentContext = ''
  if (sentiment.length > 0) {
    const avgScore = Math.round(sentiment.reduce((s, sig) => s + (sig.score || 0), 0) / sentiment.length)
    sentimentContext = `
MARKET SENTIMENT (last 7 days):
- Overall: ${avgScore > 20 ? 'Positive' : avgScore < -20 ? 'Negative' : 'Neutral'} (score: ${avgScore})
${sentiment.slice(0, 3).map(s => `- "${s.query}": ${s.summary?.slice(0, 100) || 'no summary'}`).join('\n')}`
    contextUsed.push('market_sentiment')
  }

  const personaCtx = PERSONA_CONTEXT[req.persona] || `Target: ${req.persona.replace(/_/g, ' ')}`
  contextUsed.push('persona_context')

  const formatInstr = getFormatInstructions(req.format, count)

  const systemPrompt = `You are an expert Meta Ads copywriter for a Filipino home-based business course.
You create high-converting ad variants that drive either direct purchases or Messenger conversations.

CRITICAL RULES:
1. Every variant MUST use a DIFFERENT hook type and framework combination.
2. No two variants can start with the same opening words.
3. Copy must be Taglish (Filipino + English mix) — natural, not forced.
4. Match the brand voice: warm, empowering, relatable Filipina mom entrepreneur.
5. CTA must align with the campaign objective.

PROHIBITED (Meta will reject):
- Income guarantees, earnings claims with specific amounts
- False scarcity, risk-free claims, urgency abuse
- Before/after health claims

Output ONLY valid JSON: {"variants": [...]}. No markdown.`

  const userPrompt = `Generate ads for this strategy:

ANGLE: ${req.angle.replace(/_/g, ' ')}
TARGET PERSONA: ${personaCtx}
${req.framework ? `REQUIRED FRAMEWORK: ${req.framework}` : 'FRAMEWORK: AI picks (different per variant)'}
${productContext}
${brandContext}
${performanceContext}
${competitorContext}
${sentimentContext}

${formatInstr}`

  // Generate
  const { data, model } = await generateJSON<{ variants: AdVariant[] }>(
    systemPrompt,
    userPrompt,
  )

  // Post-process: compliance + format tagging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variants: AdVariant[] = (data.variants || []).map((v: any) => {
    const allText = [
      'headline' in v ? v.headline : '',
      'body_text' in v ? v.body_text : '',
      'hook' in v ? v.hook : '',
      'body_script' in v ? v.body_script : '',
      'cta_script' in v ? v.cta_script : '',
      'link_description' in v ? v.link_description : '',
    ].join(' ')
    const { flags, clean } = checkCompliance(allText)

    return { ...v, format: req.format, compliance_flags: flags, compliance_clean: clean }
  })

  return {
    variants,
    model,
    context_used: contextUsed,
    business: {
      product_name: product?.name || 'Papers to Profits',
      product_price: thresholds.productPrice,
      winning_cpa: thresholds.winningCPA,
      target_audience: product?.target_audience || 'Filipina moms',
    },
  }
}
