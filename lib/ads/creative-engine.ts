/**
 * Creative Testing Engine V2
 * 
 * Concept → Hook Variations → Format Expansions
 * 
 * All variations stay on-concept. The engine enforces this by:
 * 1. Generating a concept brief first (the anchor)
 * 2. Constraining hooks to serve the brief
 * 3. Expanding each hook into format-specific executions
 */
import { generateJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'
import { loadBusinessContext, getThresholds } from './business-context'

// ─── Types ───

export interface ConceptBrief {
  angle: string
  persona: string
  core_message: string
  product_name: string
  product_price: number
  persona_context: string
  tone: string
  framework: string
  proof_points: string[]
  competitor_context: string
  compliance_notes: string
  winning_patterns: string
}

export interface HookVariation {
  hook_text: string
  hook_type: string
  proof_points_used: string[]
}

export interface FormatExecution {
  format: string
  content: Record<string, unknown>
}

// ─── Persona Map ───

const PERSONA_MAP: Record<string, string> = {
  new_mom_curious: 'Moms 25-45, time-poor, wants income from home, overwhelmed by options, needs simple guidance. Warm, encouraging tone.',
  returning_buyer: 'Previous customers or followers. Already knows Grace. Focus on new value, upgrades, deeper results.',
  price_sensitive: 'Budget-conscious. Needs to see ROI clearly. Lead with value-for-money, payment ease.',
  aspirational: 'Wants lifestyle transformation. Show the dream: working from home, freedom, family time. Visual, inspiring.',
  skeptic: 'Has been burned by online courses. Needs real proof — screenshots, specific numbers, testimonials. Transparent.',
  beginner: 'Complete beginners, zero business experience. Everything must be broken down simply. No jargon.',
  advanced: 'Already has a small business. Looking for growth, efficiency, next-level techniques.',
  gift_buyer: 'Buying for a daughter, friend, or family member who wants a side business.',
  busy_professional: 'Working full-time. Needs something she can do in 30 min/day. Time is the main constraint.',
}

// ─── Framework Map ───

const FRAMEWORK_MAP: Record<string, string> = {
  PAS: 'Problem → Agitate → Solution. Start with the pain, make it vivid, present the product as the answer.',
  AIDA: 'Attention → Interest → Desire → Action. Hook, educate, create want, then CTA.',
  before_after: 'Show the before state (struggle), the after state (success), and the product as the bridge.',
  testimonial: 'Lead with a real result or student story. Make it relatable. End with "kaya mo rin."',
  urgency: 'Time or quantity constraint. What they miss if they wait. Direct CTA.',
  FAB: 'Feature → Advantage → Benefit. What it is, why it matters, what it does for their life.',
}

// ─── Concept Brief Generator ───

export async function generateConceptBrief(
  angle: string,
  persona: string,
  userId: string,
  mode: 'explore' | 'scale' = 'explore',
): Promise<ConceptBrief> {
  const supabase = await createClient()

  // Load product
  const { data: product } = await supabase
    .from('product_catalog')
    .select('name, price, description, offer_details, target_audience, usps')
    .eq('is_active', true)
    .limit(1)
    .single()

  // Load winning ads for this angle
  const { data: winningAds } = await supabase
    .from('ad_creatives')
    .select('hook_type, framework, body_text, video_transcription, avg_roas')
    .eq('user_id', userId)
    .eq('angle', angle)
    .eq('ad_status', 'winning')
    .order('avg_roas', { ascending: false })
    .limit(5)

  // Load competitor angles
  const { data: compAds } = await supabase
    .from('competitor_ads')
    .select('angle, hook_type')
    .eq('user_id', userId)
    .eq('is_active', true)

  const compAngles = new Map<string, number>()
  for (const c of compAds || []) {
    if (c.angle) compAngles.set(c.angle, (compAngles.get(c.angle) || 0) + 1)
  }

  // Business context
  const bizCtx = await loadBusinessContext(supabase, userId)
  const thresholds = getThresholds(bizCtx)

  // Best framework for this angle
  const frameworkCounts = new Map<string, number>()
  for (const ad of winningAds || []) {
    if (ad.framework) frameworkCounts.set(ad.framework, (frameworkCounts.get(ad.framework) || 0) + 1)
  }
  const bestFramework = [...frameworkCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'PAS'

  // Winning patterns summary
  const winPatterns = (winningAds || []).slice(0, 3).map(ad => {
    const text = ad.video_transcription || ad.body_text || ''
    return `[${ad.hook_type}/${ad.framework}, ${ad.avg_roas?.toFixed(1)}x ROAS] ${text.slice(0, 150)}`
  }).join('\n')

  const proofPoints = product?.usps || []
  if (product?.offer_details) {
    const details = product.offer_details.split('\n').filter((l: string) => l.trim())
    proofPoints.push(...details)
  }

  const competitorSummary = compAngles.size > 0
    ? `Competitors use: ${[...compAngles.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')}. ${angle} is ${compAngles.has(angle) ? 'used by competitors — differentiate on execution' : 'NOT used by competitors — opportunity to stand out'}.`
    : 'No competitor data available.'

  return {
    angle,
    persona,
    core_message: `${product?.name || 'Papers to Profits'} teaches ${PERSONA_MAP[persona]?.split('.')[0]?.toLowerCase() || 'beginners'} how to start a home-based printing business step-by-step`,
    product_name: product?.name || 'Papers to Profits',
    product_price: thresholds.productPrice,
    persona_context: PERSONA_MAP[persona] || `Target: ${persona.replace(/_/g, ' ')}`,
    tone: 'Warm, encouraging, Taglish (Filipino + English mix), natural and conversational',
    framework: bestFramework,
    proof_points: [...new Set(proofPoints)] as string[],
    competitor_context: competitorSummary,
    compliance_notes: 'No income guarantees, no false scarcity, no "guaranteed results", no specific earnings claims',
    winning_patterns: winPatterns || 'No winning ad data for this angle yet — this is an exploration test.',
  }
}

// ─── Hook Variation Generator ───

export async function generateHookVariations(
  brief: ConceptBrief,
  count: number = 4,
): Promise<HookVariation[]> {
  const { data } = await generateJSON<{ hooks: HookVariation[] }>(
    `You generate hook variations for Meta ads. ALL hooks must serve the SAME concept — do not drift into other angles.

RULES:
1. Every hook must open with a different hook TYPE (question, how_to, social_proof, direct_benefit, story_opening, bold_claim, pain_call, curiosity_gap)
2. Every hook must be about the SAME core message: "${brief.core_message}"
3. Every hook must target the SAME persona: ${brief.persona_context}
4. Hooks must be in Taglish (Filipino + English mix), natural and conversational
5. Each hook picks 2-3 proof points from the available list to highlight
6. DO NOT drift into other angles. The angle is "${brief.angle}" — every hook must be ${brief.angle}.
7. Hooks are the FIRST LINE the viewer reads/hears. Max 2 sentences. Must stop the scroll.

COMPLIANCE: ${brief.compliance_notes}`,

    `Generate ${count} hook variations for this concept.

CONCEPT:
- Angle: ${brief.angle}
- Persona: ${brief.persona.replace(/_/g, ' ')}
- Core message: ${brief.core_message}
- Product: ${brief.product_name} (₱${brief.product_price})
- Framework: ${brief.framework} (${FRAMEWORK_MAP[brief.framework] || ''})
- Available proof points: ${brief.proof_points.join(' | ')}
${brief.winning_patterns ? `\nWINNING PATTERNS (reference, don't copy):\n${brief.winning_patterns}` : ''}
${brief.competitor_context ? `\nCOMPETITOR CONTEXT: ${brief.competitor_context}` : ''}

Return JSON: {"hooks": [{"hook_text": "the opening line in Taglish", "hook_type": "question|how_to|social_proof|direct_benefit|story_opening|bold_claim|pain_call|curiosity_gap", "proof_points_used": ["proof point 1", "proof point 2"]}]}`,
    { temperature: 0.8 },
  )

  return data.hooks || []
}

// ─── Format Expansion ───

export async function expandToFormats(
  brief: ConceptBrief,
  hook: HookVariation,
  formats: string[] = ['static_image', 'carousel', 'video_ugc'],
): Promise<FormatExecution[]> {
  const formatInstructions = formats.map(f => {
    switch (f) {
      case 'static_image': return `"static_image": {"headline": "under 40 chars", "body_text": "125-300 chars, Taglish, uses ${brief.framework} framework", "cta_text": "SIGN_UP|LEARN_MORE|SEND_MESSAGE", "link_description": "short preview", "image_prompt": "detailed image description: warm tones, Filipina mom, paper products, home setting"}`
      case 'carousel': return `"carousel": {"slides": [{"body_text": "slide text, max 100 chars", "image_prompt": "slide image description"}], "cta_text": "SIGN_UP|LEARN_MORE|SEND_MESSAGE"} — use 4-5 slides following ${brief.framework} structure`
      case 'video_hq': return `"video_hq": {"hook_script": "first 3 seconds, spoken word", "body_script": "main content 20-40 seconds, spoken word in Taglish, follows ${brief.framework}", "cta_script": "closing 5-10 seconds", "duration_seconds": 30-60, "visual_directions": "professional setup: good lighting, clean background, product visible"}`
      case 'video_ugc': return `"video_ugc": {"hook_script": "first 3 seconds, casual spoken word", "body_script": "main content 10-25 seconds, phone selfie energy, Taglish, follows ${brief.framework}", "cta_script": "closing 3-5 seconds", "duration_seconds": 15-30, "style_notes": "selfie mode, natural lighting, authentic feel, 'Hey momshie!' energy"}`
      case 'ig_carousel': return `"ig_carousel": {"slides": [{"title": "bold title text", "body_text": "supporting text, 1-2 sentences"}]} — use 5-7 slides, educational swipe-through format`
      default: return ''
    }
  }).filter(Boolean).join('\n\n')

  const { data } = await generateJSON<{ executions: Array<{ format: string; content: Record<string, unknown> }> }>(
    `You expand a hook into format-specific ad executions. Stay EXACTLY on the concept.

CONCEPT: ${brief.core_message}
ANGLE: ${brief.angle} — do NOT drift to other angles
PERSONA: ${brief.persona_context}
TONE: ${brief.tone}
COMPLIANCE: ${brief.compliance_notes}`,

    `Expand this hook into ${formats.length} format-specific executions.

HOOK: "${hook.hook_text}" (${hook.hook_type})
PROOF POINTS TO USE: ${hook.proof_points_used.join(', ')}
PRODUCT: ${brief.product_name} (₱${brief.product_price})
FRAMEWORK: ${brief.framework}

Generate one execution per format. Return JSON:
{"executions": [{"format": "format_name", "content": {format-specific fields}}]}

Format specifications:
${formatInstructions}`,
    { temperature: 0.7 },
  )

  return data.executions || []
}

// ─── Full Creative Tree Generator ───

export async function generateCreativeTree(
  angle: string,
  persona: string,
  userId: string,
  options: {
    mode?: 'explore' | 'scale'
    hookCount?: number
    formats?: string[]
  } = {},
): Promise<{
  brief: ConceptBrief
  hooks: Array<HookVariation & { executions: FormatExecution[] }>
}> {
  const mode = options.mode || 'explore'
  const hookCount = options.hookCount || 3
  const formats = options.formats || ['static_image', 'carousel', 'video_ugc']

  // Step 1: Generate concept brief
  const brief = await generateConceptBrief(angle, persona, userId, mode)

  // Step 2: Generate hook variations
  const hooks = await generateHookVariations(brief, hookCount)

  // Step 3: Expand each hook into formats
  const hooksWithExecutions = []
  for (const hook of hooks) {
    const executions = await expandToFormats(brief, hook, formats)
    hooksWithExecutions.push({ ...hook, executions })
    // Rate limit between expansions
    await new Promise(r => setTimeout(r, 300))
  }

  return { brief, hooks: hooksWithExecutions }
}
