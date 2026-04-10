export interface LearnableCreative {
  id: string
  angle: string | null
  persona?: string | null
  creative_format: string | null
  body_text: string | null
  headline: string | null
  hook_type: string | null
  emotional_tone: string | null
  cta_text: string | null
  link_description: string | null
  frame_descriptions?: Array<{ timestamp_s?: number; description?: string | null }> | null
}

export interface CreativeLearningExtract {
  format: string | null
  hook_primary: string | null
  hook_family: string | null
  hook_type: string | null
  body_summary: string | null
  belief_barrier: string | null
  cta_pattern: string | null
  visual_pattern: string | null
  emotional_tone: string | null
  inferred_mechanism: string
  mechanism_confidence: 'high' | 'medium' | 'low'
  extraction_source: Record<string, unknown>
  extraction_confidence: number
}

function cleanWhitespace(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function firstSentence(value?: string | null) {
  const cleaned = cleanWhitespace(value)
  if (!cleaned) return ''
  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/)
  return (match?.[1] || cleaned).trim()
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
}

function inferHookFamily(text?: string | null): string | null {
  const value = cleanWhitespace(text).toLowerCase()
  if (!value) return null
  if (value.includes('?')) return 'question'
  if (/\bhow to\b|\bhere's how\b/.test(value)) return 'how_to'
  if (/\bwhy\b|\bsecret\b|\btruth\b|\bwhat if\b/.test(value)) return 'curiosity_gap'
  if (/\bstruggling\b|\btired of\b|\bstop\b|\bproblem\b|\bpain\b/.test(value)) return 'pain_call'
  if (/\bresults\b|\bproved\b|\btestimonial\b|\bthousands\b/.test(value)) return 'social_proof_lead'
  if (/\bget\b|\bboost\b|\bimprove\b|\bbenefit\b|\bunlock\b/.test(value)) return 'direct_benefit'
  if (/\bnever\b|\bshocking\b|\bfinally\b/.test(value)) return 'bold_claim'
  return 'story_opening'
}

function inferCtaPattern(cta?: string | null, linkDescription?: string | null): string | null {
  const value = `${cleanWhitespace(cta)} ${cleanWhitespace(linkDescription)}`.toLowerCase().trim()
  if (!value) return null
  if (/(comment|type|reply).*\bhow\b/.test(value)) return 'comment_HOW'
  if (/(send message|message now|dm|inbox|chat)/.test(value)) return 'send_message'
  if (/(shop now|buy now|order now)/.test(value)) return 'shop_now'
  if (/(learn more|discover|see more|read more)/.test(value)) return 'learn_more'
  if (/(click|tap|visit|link)/.test(value)) return 'link_click'
  return 'generic_cta'
}

function inferVisualPattern(format?: string | null, frames?: Array<{ description?: string | null }> | null): string | null {
  const joined = (frames || []).map(frame => cleanWhitespace(frame.description)).join(' ').toLowerCase()
  const base = format || null
  if (!base) return joined ? 'unknown_visual' : null

  if (base === 'video') {
    if (/talking head|speaker|person speaking|face to camera/.test(joined)) return 'video:talking_head'
    if (/demo|showing|product in use|hands/.test(joined)) return 'video:product_demo'
    if (/text overlay|caption|subtitle/.test(joined)) return 'video:text_overlay'
    return 'video:general'
  }

  if (base === 'carousel') return joined ? 'carousel:multi_panel' : 'carousel:standard'
  if (/text overlay|headline/.test(joined)) return `${base}:text_overlay`
  if (/comparison|before and after/.test(joined)) return `${base}:comparison`
  return `${base}:standard`
}

function inferBeliefBarrier(angle?: string | null): string | null {
  switch (angle) {
    case 'pain_point': return "I can't solve this / it's too hard to start"
    case 'aspiration': return "I'm not sure I can become that version of myself"
    case 'comparison': return 'I need proof this is better than the alternatives'
    case 'education': return "I don't understand enough to trust this yet"
    case 'urgency': return 'I can wait; this is not urgent yet'
    case 'social_proof': return 'People like me probably are not doing this'
    case 'fear': return 'The downside feels vague or avoidable'
    case 'transformation': return 'I doubt the outcome is realistic for me'
    case 'authority': return 'I need expert proof before I believe it'
    case 'curiosity': return 'I do not feel compelled to learn more yet'
    default: return null
  }
}

export function extractLearningsFromCreative(creative: LearnableCreative): CreativeLearningExtract | null {
  const hookPrimary = truncate(firstSentence(creative.body_text) || cleanWhitespace(creative.headline), 100) || null
  const bodySummary = truncate(cleanWhitespace(creative.body_text), 150) || null
  const hookFamily = creative.hook_type || inferHookFamily(hookPrimary)
  const ctaPattern = inferCtaPattern(creative.cta_text, creative.link_description)
  const visualPattern = inferVisualPattern(creative.creative_format, creative.frame_descriptions)
  const beliefBarrier = inferBeliefBarrier(creative.angle)
  const emotionalTone = cleanWhitespace(creative.emotional_tone) || null
  const format = creative.creative_format || null

  if (!hookPrimary && !bodySummary && !visualPattern) {
    return null
  }

  const populatedCount = [hookPrimary, hookFamily, bodySummary, ctaPattern, visualPattern, emotionalTone, format, beliefBarrier].filter(Boolean).length
  const extractionConfidence = populatedCount >= 5 ? 0.8 : populatedCount >= 3 ? 0.6 : 0.4
  const mechanismConfidence: 'high' | 'medium' | 'low' = extractionConfidence >= 0.8 ? 'high' : extractionConfidence >= 0.6 ? 'medium' : 'low'

  const inferredMechanism = hookPrimary && hookFamily && (emotionalTone || ctaPattern || creative.angle)
    ? `${hookFamily.replace(/_/g, ' ')} hook (“${truncate(hookPrimary, 40)}”)${emotionalTone ? ` with ${emotionalTone} tone` : ''}${ctaPattern ? ` and ${ctaPattern} CTA` : ''}${creative.angle ? ` helped the ${creative.angle.replace(/_/g, ' ')} angle land more clearly` : ''}`
    : 'Likely successful due to strong hook and clear offer, but insufficient data for precise mechanism analysis'

  return {
    format,
    hook_primary: hookPrimary,
    hook_family: hookFamily,
    hook_type: creative.hook_type || hookFamily,
    body_summary: bodySummary,
    belief_barrier: beliefBarrier,
    cta_pattern: ctaPattern,
    visual_pattern: visualPattern,
    emotional_tone: emotionalTone,
    inferred_mechanism: inferredMechanism,
    mechanism_confidence: mechanismConfidence,
    extraction_source: {
      transcription_available: Boolean(cleanWhitespace(creative.body_text)),
      headline_available: Boolean(cleanWhitespace(creative.headline)),
      frame_count: creative.frame_descriptions?.length || 0,
      source_creative_id: creative.id,
    },
    extraction_confidence: extractionConfidence,
  }
}
