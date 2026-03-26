/**
 * Creative Factory — generates ad copy variants for a given angle + persona.
 * 
 * Uses existing generation infrastructure (Gemini) with ad-specific context:
 * - AD-FRAMEWORKS.md for structural guidance
 * - Brand style guide for voice/tone
 * - Ad performance data for what converts
 * - Persona context for targeting
 * 
 * Compliance: All generated copy scanned against prohibited patterns.
 * Diversity: Each variant must use a different hook + framework.
 */
import fs from 'fs'
import path from 'path'
import { generateJSON } from '@/lib/llm/client'
import { getBrandContext } from '@/lib/create/kb-retriever'
import { getAdPerformanceContext } from '@/lib/create/ad-performance-context'
import type { BrandStyleGuide } from '@/lib/brand/types'

// === TYPES ===

export interface FactoryRequest {
  angle: string
  persona: string
  framework?: string        // optional — AI picks if not specified
  offer?: string           // optional
  count?: number           // default 3
  userId: string
}

export interface FactoryVariant {
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

export interface FactoryResult {
  variants: FactoryVariant[]
  model: string
  context_used: string[]
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
  const combined = text.toLowerCase()
  for (const { pattern, flag } of PROHIBITED_PATTERNS) {
    if (pattern.test(combined)) flags.push(flag)
  }
  return { flags, clean: flags.length === 0 }
}

// === PERSONA CONTEXT ===

const PERSONA_CONTEXT: Record<string, string> = {
  new_mom_curious: 'Target: New moms exploring side income. Tone: warm, encouraging, relatable. Pain: overwhelmed, time-poor, unsure where to start. Avoid: pressure, complexity, jargon.',
  returning_buyer: 'Target: Previous customers. Tone: familiar, appreciative. They know the product. Focus: new features, upgrades, loyalty rewards.',
  price_sensitive: 'Target: Budget-conscious buyers. Tone: value-focused, transparent. Lead with ROI and cost-per-use. Avoid: luxury positioning.',
  aspirational: 'Target: People who want lifestyle transformation. Tone: inspiring, visual. Show the dream state. Use before/after narratives.',
  skeptic: 'Target: Doubtful prospects who\'ve been burned before. Tone: proof-heavy, transparent. Lead with social proof, guarantees, real results.',
  beginner: 'Target: Complete beginners. Tone: simple, encouraging. Break everything down. Avoid assumptions about knowledge.',
  advanced: 'Target: Experienced users. Tone: sophisticated, technical depth OK. Focus on efficiency, pro tips, advanced features.',
  gift_buyer: 'Target: People buying for someone else. Tone: thoughtful, gift-focused. Emphasize packaging, personalization, occasion.',
  busy_professional: 'Target: Working professionals with limited time. Tone: efficient, value-dense. Lead with time savings and convenience.',
}

// === GENERATOR ===

export async function generateAdVariants(req: FactoryRequest): Promise<FactoryResult> {
  const count = req.count || 3

  // Load brand context
  const brandRaw = await getBrandContext()
  const brand = brandRaw as unknown as BrandStyleGuide | null

  // Load AD-FRAMEWORKS.md
  let frameworksRef = ''
  try {
    frameworksRef = fs.readFileSync(path.join(process.cwd(), 'references/AD-FRAMEWORKS.md'), 'utf-8')
  } catch {
    frameworksRef = 'Use standard frameworks: PAS, AIDA, Before/After, Social Proof, Urgency, FAB.'
  }

  // Load ad performance context
  let adPerfContext = ''
  const contextUsed: string[] = ['AD-FRAMEWORKS.md']
  try {
    const adCtx = await getAdPerformanceContext(req.userId)
    if (adCtx.hasEnoughData) {
      adPerfContext = adCtx.promptFragment
      contextUsed.push('ad_performance_data')
    }
  } catch { /* non-fatal */ }

  const personaCtx = PERSONA_CONTEXT[req.persona] || `Target: ${req.persona.replace(/_/g, ' ')}`
  contextUsed.push('persona_context')
  if (brand) contextUsed.push('brand_style_guide')

  const systemPrompt = `You are an expert Direct Response Copywriter and Meta Ads specialist.
You create high-converting ad copy variants for Facebook and Instagram.

RULES:
1. Every variant MUST use a DIFFERENT hook type and framework combination.
2. No two variants can start with the same first 5 words.
3. All copy must be Taglish (mix of English and Filipino) matching the brand voice.
4. Headlines must be under 40 characters. Body text 125-500 characters.
5. CTA must be specific and action-oriented.
6. image_prompt must be detailed enough for AI image generation — include composition, colors, mood, subjects.

PROHIBITED (will be flagged):
- Income guarantees ("guaranteed income", "earn ₱X per day")
- False scarcity ("limited spots left" unless truly limited)
- Risk-free claims
- Urgency abuse ("act now or miss out")

Output ONLY valid JSON. No markdown wrapping.`

  const userPrompt = `Generate ${count} distinct ad copy variants.

STRATEGY:
- Angle: ${req.angle.replace(/_/g, ' ')}
- Target Persona: ${personaCtx}
${req.framework ? `- Required Framework: ${req.framework}` : '- Framework: AI choice (use different frameworks per variant)'}
${req.offer ? `- Offer: ${req.offer}` : ''}

BRAND VOICE:
${brand ? `Colors: ${JSON.stringify(brand.color_palette)}\nPhotography: ${brand.photography_style}\nVoice: ${JSON.stringify(brand.voice_rubric)}` : 'Warm, Taglish, Filipino female entrepreneur voice.'}

AD FRAMEWORKS REFERENCE:
${frameworksRef.slice(0, 2000)}

${adPerfContext}

Return a JSON object:
{
  "variants": [
    {
      "headline": "short punchy headline (under 40 chars)",
      "body_text": "primary ad text (125-500 chars, Taglish)",
      "cta_text": "SHOP_NOW or LEARN_MORE or SIGN_UP or SEND_MESSAGE or GET_OFFER",
      "link_description": "short link preview text",
      "hook_type": "question|bold_claim|statistic|story_opening|curiosity_gap|pain_call|social_proof_lead|direct_benefit|controversy|how_to",
      "framework": "PAS|AIDA|before_after|testimonial|urgency|FAB|comparison|storytelling|listicle|direct_offer",
      "emotional_tone": "warm|urgent|educational|aspirational|fear|empowering|playful|authoritative",
      "image_prompt": "detailed image generation prompt including composition, subjects, colors, mood, brand elements"
    }
  ]
}`

  const { data, model } = await generateJSON<{ variants: Array<{
    headline: string
    body_text: string
    cta_text: string
    link_description?: string
    hook_type: string
    framework: string
    emotional_tone: string
    image_prompt: string
  }> }>(
    systemPrompt,
    userPrompt,
  )

  // Post-process: compliance check + diversity validation
  const variants: FactoryVariant[] = (data.variants || []).map(v => {
    const fullText = `${v.headline} ${v.body_text} ${v.link_description || ''}`
    const { flags, clean } = checkCompliance(fullText)

    return {
      headline: v.headline || '',
      body_text: v.body_text || '',
      cta_text: v.cta_text || 'LEARN_MORE',
      link_description: v.link_description || '',
      hook_type: v.hook_type || 'direct_benefit',
      framework: v.framework || 'PAS',
      emotional_tone: v.emotional_tone || 'warm',
      image_prompt: v.image_prompt || '',
      compliance_flags: flags,
      compliance_clean: clean,
    }
  })

  return { variants, model, context_used: contextUsed }
}
