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
import { generateShortFormScript } from '@/lib/create/shortform-generator'
import { getAdGenerationContext, getBrandContext } from '@/lib/create/kb-retriever'
import { checkQualityGate } from '@/lib/eval/quality-gate'
import type { KnowledgeEntry } from '@/lib/knowledge/types'

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
  llm_provider?: string
  llm_model?: string
}

export interface FormatExecution {
  format: string
  content: Record<string, unknown>
  llm_provider?: string
  llm_model?: string
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

/**
 * Query KB for scripting frameworks. Falls back to hardcoded map if KB empty.
 */
async function getFrameworks(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('knowledge_entries')
    .select('subcategory, title, content')
    .eq('category', 'scripting_framework')
    .contains('lanes', ['ads'])
    .in('review_status', ['approved', 'candidate'])
    .order('effectiveness_score', { ascending: false })
    .limit(15)

  if (data && data.length > 0) {
    const map: Record<string, string> = {}
    for (const e of data) {
      map[e.subcategory || e.title] = e.content
    }
    return map
  }
  // Fallback to hardcoded
  return FRAMEWORK_MAP_FALLBACK
}

// ─── Framework Map (Fallback) ───

const FRAMEWORK_MAP_FALLBACK: Record<string, string> = {
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

  // Load all context in parallel — including KB + brand voice + frameworks
  const [productRes, winningAdsRes, allAdsForAngleRes, compAdsRes, bizCtx, kbContext, brandContext, frameworksMap] = await Promise.all([
    supabase.from('product_catalog').select('name, price, description, offer_details, target_audience, usps').eq('is_active', true).limit(1).single(),
    supabase.from('ad_creatives').select('hook_type, framework, body_text, video_transcription, avg_roas, headline').eq('user_id', userId).eq('angle', angle).eq('ad_status', 'winning').order('avg_roas', { ascending: false }).limit(mode === 'scale' ? 10 : 5),
    mode === 'scale'
      ? supabase.from('ad_creatives').select('hook_type, avg_roas').eq('user_id', userId).eq('angle', angle).not('avg_roas', 'is', null).order('avg_roas', { ascending: false }).limit(20)
      : Promise.resolve({ data: null }),
    supabase.from('competitor_ads').select('angle, hook_type').eq('user_id', userId).eq('is_active', true),
    loadBusinessContext(supabase, userId),
    getAdGenerationContext(15),
    getBrandContext(),
    getFrameworks(),
  ])

  const product = productRes.data
  const winningAds = winningAdsRes.data || []
  const allAdsForAngle = allAdsForAngleRes.data || []
  const compAds = compAdsRes.data || []
  const thresholds = getThresholds(bizCtx)

  const compAngles = new Map<string, number>()
  for (const c of compAds) {
    if (c.angle) compAngles.set(c.angle, (compAngles.get(c.angle) || 0) + 1)
  }

  // Best framework for this angle (weighted by ROAS in scale mode)
  const frameworkCounts = new Map<string, number>()
  for (const ad of winningAds) {
    if (ad.framework) {
      const weight = mode === 'scale' ? (ad.avg_roas || 1) : 1
      frameworkCounts.set(ad.framework, (frameworkCounts.get(ad.framework) || 0) + weight)
    }
  }
  const bestFramework = [...frameworkCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || Object.keys(frameworksMap)[0] || 'PAS'

  // Winning patterns — more detail in scale mode
  const winPatterns = winningAds.slice(0, mode === 'scale' ? 5 : 3).map(ad => {
    const text = ad.video_transcription || ad.body_text || ''
    const headline = ad.headline ? ` | Headline: "${ad.headline}"` : ''
    return `[${ad.hook_type}/${ad.framework}, ${ad.avg_roas?.toFixed(1)}x ROAS${headline}] ${text.slice(0, 200)}`
  }).join('\n')

  // Scale mode: list all hook_types already tested so we create DIFFERENT hooks
  const testedHookTypes = mode === 'scale' && allAdsForAngle.length > 0
    ? `\nHook types ALREADY TESTED for this angle (avoid repeating, create genuinely new variations): ${[...new Set(allAdsForAngle.map(a => a.hook_type).filter(Boolean))].join(', ')}`
    : ''

  const proofPoints = product?.usps || []
  if (product?.offer_details) {
    const details = product.offer_details.split('\n').filter((l: string) => l.trim())
    proofPoints.push(...details)
  }

  const competitorSummary = compAngles.size > 0
    ? `Competitors use: ${[...compAngles.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', ')}. ${angle} is ${compAngles.has(angle) ? 'used by competitors — differentiate on execution' : 'NOT used by competitors — opportunity to stand out'}.`
    : 'No competitor data available.'

  const modeContext = mode === 'scale'
    ? `MODE: SCALE — This angle has winning ads. Goal is fresh creative variations that avoid fatigue. Study the winning patterns above and create NEW hooks that follow the same emotional logic but with different openings, proof points, and structure.${testedHookTypes}`
    : `MODE: EXPLORE — This angle is untested. Goal is to find what works. Be bold, test different hook types.`

  // Build KB context string for injection into prompts
  const kbEntries = kbContext.entries || []
  const kbSummary = kbEntries.length > 0
    ? kbEntries.slice(0, 8).map(e => `[${e.category}] ${e.title}: ${(e.content || '').substring(0, 300)}`).join('\n')
    : ''

  // Query KB for persona-tagged entries to enrich persona context
  let personaKBContext = ''
  try {
    const { data: personaKB } = await supabase
      .from('knowledge_entries')
      .select('content, tags')
      .eq('category', 'ad_creative')
      .contains('tags', [`persona:${persona}`])
      .in('review_status', ['approved', 'candidate'])
      .limit(5)
    if (personaKB && personaKB.length > 0) {
      personaKBContext = '\n\nKB Persona Insights:\n' + personaKB.map(e => `• ${e.content}`).join('\n')
    }
  } catch { /* KB persona query is non-fatal */ }

  // Brand voice from DB (overrides hardcoded tone)
  const brand = brandContext as Record<string, unknown> | null
  const brandTone = brand
    ? `${brand.tone_descriptors || 'Warm, encouraging'}. Taglish ratio: ${brand.taglish_ratio || '60/40 Filipino/English'}. ${brand.vocabulary_notes || ''}. BANNED words: ${brand.banned_words || 'AI slop, guaranteed income, passive income'}`.trim()
    : 'Warm, encouraging, Taglish (Filipino + English mix), natural and conversational'

  return {
    angle,
    persona,
    core_message: `${product?.name || 'Papers to Profits'} teaches ${PERSONA_MAP[persona]?.split('.')[0]?.toLowerCase() || 'beginners'} how to start a home-based printing business step-by-step`,
    product_name: product?.name || 'Papers to Profits',
    product_price: thresholds.productPrice,
    persona_context: (PERSONA_MAP[persona] || `Target: ${persona.replace(/_/g, ' ')}`) + personaKBContext,
    tone: brandTone,
    framework: bestFramework,
    proof_points: [...new Set(proofPoints)] as string[],
    competitor_context: competitorSummary,
    compliance_notes: 'No income guarantees, no false scarcity, no "guaranteed results", no specific earnings claims',
    winning_patterns: winPatterns
      ? `${modeContext}\n\nWINNING PATTERNS:\n${winPatterns}${kbSummary ? `\n\nKNOWLEDGE BASE (proven ad patterns, hooks, frameworks):\n${kbSummary}` : ''}`
      : `${modeContext}${kbSummary ? `\n\nKNOWLEDGE BASE (proven ad patterns, hooks, frameworks):\n${kbSummary}` : ''}`,
  }
}

// ─── Hook Variation Generator ───

export async function generateHookVariations(
  brief: ConceptBrief,
  count: number = 4,
  kbHooks?: string,
  frameworksMap?: Record<string, string>,
): Promise<HookVariation[]> {
  const kbHookSection = kbHooks
    ? `\n\nPROVEN HOOK PATTERNS FROM KNOWLEDGE BASE (adapt, don't copy verbatim):\n${kbHooks}`
    : ''

  const { data, provider: hookProvider, model: hookModel } = await generateJSON<{ hooks: HookVariation[] }>(
    `You generate hook variations for Meta ads. ALL hooks must serve the SAME concept — do not drift into other angles.

RULES:
1. Every hook must open with a different hook TYPE (question, how_to, social_proof, direct_benefit, story_opening, bold_claim, pain_call, curiosity_gap)
2. Every hook must be about the SAME core message: "${brief.core_message}"
3. Every hook must target the SAME persona: ${brief.persona_context}
4. Hooks must be in Taglish — ${brief.tone}
5. Each hook picks 2-3 proof points from the available list to highlight
6. DO NOT drift into other angles. The angle is "${brief.angle}" — every hook must be ${brief.angle}.
7. Hooks are the FIRST LINE the viewer reads/hears. Max 2 sentences. Must stop the scroll.
8. Study the proven hook patterns below — adapt the patterns to this specific concept.

COMPLIANCE: ${brief.compliance_notes}`,

    `Generate ${count} hook variations for this concept.

CONCEPT:
- Angle: ${brief.angle}
- Persona: ${brief.persona.replace(/_/g, ' ')}
- Core message: ${brief.core_message}
- Product: ${brief.product_name} (₱${brief.product_price})
- Framework: ${brief.framework} (${(frameworksMap || FRAMEWORK_MAP_FALLBACK)[brief.framework] || ''})
- Available proof points: ${brief.proof_points.join(' | ')}
${brief.winning_patterns ? `\nWINNING PATTERNS (reference, don't copy):\n${brief.winning_patterns}` : ''}
${brief.competitor_context ? `\nCOMPETITOR CONTEXT: ${brief.competitor_context}` : ''}${kbHookSection}

Return JSON: {"hooks": [{"hook_text": "the opening line in Taglish", "hook_type": "question|how_to|social_proof|direct_benefit|story_opening|bold_claim|pain_call|curiosity_gap", "proof_points_used": ["proof point 1", "proof point 2"]}]}`,
    { temperature: 0.8 },
  )

  return (data.hooks || []).map(h => ({ ...h, llm_provider: hookProvider, llm_model: hookModel }))
}

// ─── Format Expansion ───

/**
 * Generate a video script execution using the full KB-backed script pipeline.
 * Routes through generateShortFormScript with content_purpose='sell' so it uses:
 * - KB hook library (tested patterns)
 * - Scripting frameworks (PAS, AIDA, etc.)
 * - Virality science entries
 * - Platform intelligence
 * - Brand voice rubric (Taglish ratio, banned words, tone)
 * - Quality gate scoring
 */
async function expandVideoFormat(
  brief: ConceptBrief,
  hook: HookVariation,
  format: 'video_ugc' | 'video_hq',
): Promise<FormatExecution> {
  const platform = format === 'video_ugc' ? 'instagram-reels' : 'facebook-reels' as 'instagram-reels'
  const target_duration = format === 'video_ugc' ? 30 : 45

  const response = await generateShortFormScript({
    topic: `${brief.product_name} — ${brief.core_message}`,
    angle: `${brief.angle}: ${hook.hook_text}`,
    platform,
    target_duration,
    content_purpose: 'sell',
    style: format === 'video_ugc' ? 'hook-first' : 'storytelling',
    product_context: {
      name: brief.product_name,
      price: `₱${brief.product_price}`,
      offer_details: brief.proof_points.join(', '),
      target_audience: brief.persona_context,
      usps: brief.proof_points.slice(0, 5),
    },
  })

  const script = response.script
  const scenes = script.scenes || []

  // Map ShortFormScript → execution content
  // Hook = first scene, body = middle scenes joined, cta = last scene or script.cta
  const hookScene = scenes[0]
  const bodyScenes = scenes.slice(1, -1)
  const ctaScene = scenes[scenes.length - 1]

  const content: Record<string, unknown> = {
    hook_script: hookScene?.script_text || script.hook,
    body_script: bodyScenes.map(s => s.script_text).join('\n\n') || scenes.slice(1).map(s => s.script_text).join('\n\n'),
    cta_script: ctaScene?.script_text || script.cta,
    duration_seconds: script.total_duration_seconds,
    // Full scene breakdown for the UI
    scenes: scenes.map(s => ({
      scene_number: s.scene_number,
      duration_seconds: s.duration_seconds || 5,
      timing: s.timing || `${s.duration_seconds}s`,
      script_text: s.script_text,
      visual_direction: s.visual_direction,
      on_screen_text: s.on_screen_text,
      production_notes: s.production_notes,
      block_label: s.block_label,
    })),
    // Script metadata
    kb_hooks_used: response.knowledge_context?.hooks_used || [],
    kb_frameworks_used: response.knowledge_context?.frameworks_used || [],
    quality_score: response.quality_score?.composite,
    passed_quality_gate: response.quality_score?.passed_gate,
    quality_feedback: response.quality_score?.feedback,
    caption_draft: script.caption_draft,
    hashtags: script.hashtags,
  }

  if (format === 'video_ugc') {
    content.style_notes = `Selfie mode, natural lighting, authentic feel. Hook from KB: ${response.knowledge_context?.hooks_used?.[0] || 'hook-first'}. Framework: ${response.knowledge_context?.frameworks_used?.[0] || brief.framework}`
  } else {
    content.visual_directions = hookScene?.visual_direction || 'Professional setup: good lighting, clean background, product visible'
  }

  // Video scripts go through shortform generator which doesn't expose provider, but content has KB metadata
  return { format, content, llm_provider: 'shortform-pipeline', llm_model: 'kb-backed' }
}

export async function expandToFormats(
  brief: ConceptBrief,
  hook: HookVariation,
  formats: string[] = ['static_image', 'carousel', 'video_ugc'],
): Promise<FormatExecution[]> {
  // Separate video formats from static/carousel (different generation paths)
  const videoFormats = formats.filter(f => f === 'video_ugc' || f === 'video_hq')
  const staticFormats = formats.filter(f => f !== 'video_ugc' && f !== 'video_hq')

  const results: FormatExecution[] = []

  // Static/carousel formats: batch generation via single LLM call
  if (staticFormats.length > 0) {
    const formatInstructions = staticFormats.map(f => {
      switch (f) {
        case 'static_image': return `"static_image": {"headline": "under 40 chars", "body_text": "125-300 chars, Taglish, uses ${brief.framework} framework", "cta_text": "SIGN_UP|LEARN_MORE|SEND_MESSAGE", "link_description": "short preview", "image_prompt": "detailed image description: warm tones, Filipina mom, paper products, home setting"}`
        case 'carousel': return `"carousel": {"headline": "carousel title", "slides": [{"body_text": "slide text, max 100 chars", "image_prompt": "slide image description"}], "cta_text": "SIGN_UP|LEARN_MORE|SEND_MESSAGE"} — use 4-5 slides following ${brief.framework} structure`
        case 'ig_carousel': return `"ig_carousel": {"headline": "carousel title", "slides": [{"title": "bold title text", "body_text": "supporting text, 1-2 sentences"}]} — use 5-7 slides, educational swipe-through format`
        default: return ''
      }
    }).filter(Boolean).join('\n\n')

    const { data, provider: execProvider, model: execModel } = await generateJSON<{ executions: Array<{ format: string; content: Record<string, unknown> }> }>(
      `You expand a hook into format-specific ad executions. Stay EXACTLY on the concept.

CONCEPT: ${brief.core_message}
ANGLE: ${brief.angle} — do NOT drift to other angles
PERSONA: ${brief.persona_context}
BRAND VOICE: ${brief.tone}
COMPLIANCE: ${brief.compliance_notes}

Write all ad copy in the brand voice above. Natural Taglish. No AI slop. Sound like a real person talking to a friend.`,

      `Expand this hook into ${staticFormats.length} format-specific executions.

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

    // Quality gate on static/carousel formats (soft — log but don't block)
    for (const exec of (data.executions || [])) {
      const execWithMeta = { ...exec, llm_provider: execProvider, llm_model: execModel }
      try {
        const textToCheck = typeof exec.content === 'object'
          ? Object.values(exec.content).filter(v => typeof v === 'string').join(' ')
          : ''
        if (textToCheck.length > 20) {
          const qg = await checkQualityGate(textToCheck, 'ad-copy', 'facebook', 0.6)
          ;(execWithMeta.content as Record<string, unknown>).quality_score = qg?.scores ?? null
          ;(execWithMeta.content as Record<string, unknown>).passed_quality_gate = qg?.passed ?? null
          if (qg && !qg.passed) {
            console.warn(`[creative-engine] Quality gate SOFT FAIL for ${exec.format}:`, qg.feedback)
          }
        }
      } catch { /* quality gate is non-fatal */ }
      results.push(execWithMeta)
    }
  }

  // Video formats: route through full KB-backed script pipeline
  for (const vf of videoFormats) {
    const exec = await expandVideoFormat(brief, hook, vf as 'video_ugc' | 'video_hq')
    results.push(exec)
    await new Promise(r => setTimeout(r, 300))
  }

  return results
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

  // Step 1: Generate concept brief (loads KB + brand internally)
  const brief = await generateConceptBrief(angle, persona, userId, mode)

  // Step 2: Load KB hooks — angle/persona-aware, full content
  let kbHookContext: string | undefined
  try {
    const supabase = await createClient()
    
    // First: hooks matching this specific angle or persona
    const { data: matched } = await supabase
      .from('knowledge_entries')
      .select('subcategory, content, examples, effectiveness_score')
      .eq('category', 'hook_library')
      .contains('lanes', ['ads'])
      .in('review_status', ['approved', 'candidate'])
      .or(`tags.cs.{"angle:${angle}"},tags.cs.{"persona:${persona}"}`)
      .order('effectiveness_score', { ascending: false })
      .limit(10)

    const hookPool = (matched && matched.length >= 3) ? matched : null

    // Fallback: general hook_library if no angle/persona match
    if (!hookPool) {
      const { entries: kbEntries } = await getAdGenerationContext(15)
      const generalHooks = kbEntries.filter(e => e.category === 'hook_library').slice(0, 10)
      if (generalHooks.length > 0) {
        kbHookContext = generalHooks.map(e => {
          const examples = Array.isArray(e.examples) ? (e.examples as string[]).slice(0, 2).join('; ') : ''
          return `• [${e.subcategory}] ${e.content}${examples ? ` | Examples: ${examples}` : ''}`
        }).join('\n')
      }
    } else {
      kbHookContext = hookPool.map(e => {
        const examples = Array.isArray(e.examples) ? (e.examples as string[]).slice(0, 2).join('; ') : ''
        return `• [${e.subcategory}] ${e.content}${examples ? ` | Examples: ${examples}` : ''}`
      }).join('\n')
    }
  } catch { /* KB retrieval is non-fatal */ }

  // Load frameworks map for hook generation
  let frameworksMap: Record<string, string> = FRAMEWORK_MAP_FALLBACK
  try {
    frameworksMap = await getFrameworks()
  } catch { /* Frameworks fallback is non-fatal */ }

  // Step 3: Generate hook variations (pass frameworks map)
  const hooks = await generateHookVariations(brief, hookCount, kbHookContext, frameworksMap)

  // Step 4: Expand hooks into formats — parallel for non-video, sequential for video
  // Video uses KB pipeline (longer) so we don't want all to pile up at once
  const hasVideo = formats.some(f => f === 'video_ugc' || f === 'video_hq')
  
  let hooksWithExecutions
  if (hasVideo) {
    // Sequential for video to avoid KB pipeline overload
    hooksWithExecutions = []
    for (const hook of hooks) {
      const executions = await expandToFormats(brief, hook, formats)
      hooksWithExecutions.push({ ...hook, executions })
    }
  } else {
    // Parallel for static/carousel — much faster
    hooksWithExecutions = await Promise.all(
      hooks.map(async hook => {
        const executions = await expandToFormats(brief, hook, formats)
        return { ...hook, executions }
      })
    )
  }

  return { brief, hooks: hooksWithExecutions }
}
