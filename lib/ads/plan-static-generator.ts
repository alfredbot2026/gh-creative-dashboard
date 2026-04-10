import { generateJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'
import { getAdGenerationContext, getBrandContext } from '@/lib/create/kb-retriever'
import type { VideoPlanInput } from './plan-video-generator'

export interface StaticHeadline {
  hook_text: string
  hook_type: string
}

export interface VisualConcept {
  concept_name: string
  description: string
  image_prompt: string
  suggested_text_overlay: string
}

export interface StaticAngleSection {
  angle_name: string
  hypothesis: string
  core_message: string
  headlines: StaticHeadline[]
  support_lines: string[]
  cta_variants: string[]
  visual_concepts: VisualConcept[]
  text_overlay_guidance: string
  performance_note: string
}

export interface StaticPlanOutput {
  plan_brief_id: string
  objective: string
  hypothesis: string
  global_rules: {
    tone: string
    layout: string
  }
  angles: StaticAngleSection[]
  expected_designs: number
  production_instructions: {
    headline_rules: string
    text_placement: string
    export_format: string
    variants_per_angle: number
  }
  confidence: 'high' | 'medium' | 'low'
  confidence_note: string
}

interface CreativeLearningRow {
  ad_creative_id: string | null
  format: string | null
  hook_primary: string | null
  hook_family: string | null
  hook_type: string | null
  body_summary: string | null
  belief_barrier: string | null
  cta_pattern: string | null
  visual_pattern: string | null
  emotional_tone: string | null
  inferred_mechanism: string | null
  mechanism_confidence: string | null
}

function inferConfidence(input: VideoPlanInput, learningCount: number): { confidence: 'high' | 'medium' | 'low'; confidence_note: string } {
  const winnerCount = input.evidence_summary.winners?.length || 0
  const gapCount = input.evidence_summary.gaps?.length || 0
  if (winnerCount >= 2 && learningCount >= 2) {
    return { confidence: 'high', confidence_note: `High confidence: static direction is anchored in ${winnerCount} winner signal(s) and ${learningCount} learning(s).` }
  }
  if (winnerCount + gapCount >= 2 || learningCount >= 1) {
    return { confidence: 'medium', confidence_note: 'Medium confidence: enough evidence exists to shape the static brief, but more live testing is still needed.' }
  }
  return { confidence: 'low', confidence_note: 'Low confidence: static brief is exploratory and should be treated as a first-pass test pack.' }
}

async function loadLearningContext(input: VideoPlanInput) {
  const supabase = await createClient()
  const ids = Array.from(new Set([
    ...(input.evidence_summary.winners || []).map(item => item.ad_id || item.id),
    ...(input.evidence_summary.fatigue || []).map(item => item.ad_id || item.id),
    ...(input.evidence_summary.losers || []).map(item => item.ad_id || item.id),
  ].filter(Boolean))) as string[]

  const [brandContext, kbContext, learningRes] = await Promise.all([
    getBrandContext(),
    getAdGenerationContext(12),
    ids.length > 0
      ? supabase
          .from('creative_learnings')
          .select('ad_creative_id, format, hook_primary, hook_family, hook_type, body_summary, belief_barrier, cta_pattern, visual_pattern, emotional_tone, inferred_mechanism, mechanism_confidence')
          .in('ad_creative_id', ids)
      : Promise.resolve({ data: [] as CreativeLearningRow[], error: null }),
  ])

  if (learningRes.error) throw new Error(learningRes.error.message)
  return {
    brandContext,
    kbEntries: kbContext.entries || [],
    learnings: (learningRes.data || []) as CreativeLearningRow[],
  }
}

export async function generateStaticPlan(input: VideoPlanInput): Promise<StaticPlanOutput> {
  const { brandContext, kbEntries, learnings } = await loadLearningContext(input)
  const confidenceMeta = inferConfidence(input, learnings.length)

  const winnerLines = (input.evidence_summary.winners || []).map(item => `- ${item.ad_name || item.ad_id || item.id || 'winner'} | headline family: ${item.hook_family || 'unknown'} | CTA: ${item.cta_pattern || 'n/a'} | format: ${item.format || 'unknown'}`).join('\n')
  const fatigueLines = (input.evidence_summary.fatigue || []).map(item => `- ${item.ad_name || item.ad_id || item.id || 'fatigue'} | reason: ${item.reason || 'declining efficiency'} | hook family: ${item.hook_family || 'unknown'}`).join('\n')
  const learningLines = learnings.slice(0, 8).map(item => `- format: ${item.format || 'unknown'} | hook primary: ${item.hook_primary || 'n/a'} | hook family: ${item.hook_family || item.hook_type || 'n/a'} | body summary: ${item.body_summary || 'n/a'} | CTA: ${item.cta_pattern || 'n/a'} | visual: ${item.visual_pattern || 'n/a'} | mechanism: ${item.inferred_mechanism || 'n/a'}`).join('\n')
  const kbLines = kbEntries.slice(0, 8).map(entry => `- [${entry.category}] ${entry.title}: ${(entry.content || '').slice(0, 220)}`).join('\n')

  const toneDescriptors = typeof brandContext?.tone_descriptors === 'string' ? brandContext.tone_descriptors : 'Warm, direct, practical Taglish'
  const vocabularyNotes = typeof brandContext?.vocabulary_notes === 'string' ? brandContext.vocabulary_notes : 'Keep headlines simple, clear, and human.'

  const { data } = await generateJSON<StaticPlanOutput>(
    `You create production-ready static ad briefs for designers.

Return valid JSON only.

Rules:
1. Up to 3 angles.
2. Exactly 5 headlines per angle.
3. 2-3 support_lines per angle.
4. 2-3 cta_variants per angle.
5. Exactly 3 visual_concepts per angle.
6. Natural Taglish only.
7. One belief per ad. Clear hierarchy. No emoji. No markdown.`,
    `Create a static ad production plan.

Plan metadata:
- plan_brief_id: ${input.plan_brief_id}
- plan_type: ${input.plan_type}
- objective: ${input.objective}
- hypothesis: ${input.hypothesis}
- target angle: ${input.target_angle}
- target persona: ${input.target_persona}
- requested formats: ${input.target_formats.join(', ') || 'static_image'}

Brand voice:
- Tone: ${toneDescriptors}
- Vocabulary notes: ${vocabularyNotes}

Evidence summary — winners:
${winnerLines || '- none'}

Evidence summary — fatigue / what to avoid:
${fatigueLines || '- none'}

Creative learnings:
${learningLines || '- none'}

Knowledge base context:
${kbLines || '- none'}

Suggested confidence: ${confidenceMeta.confidence}
Suggested confidence note: ${confidenceMeta.confidence_note}

JSON schema:
{
  "plan_brief_id": string,
  "objective": string,
  "hypothesis": string,
  "global_rules": {
    "tone": string,
    "layout": string
  },
  "angles": [
    {
      "angle_name": string,
      "hypothesis": string,
      "core_message": string,
      "headlines": [{ "hook_text": string, "hook_type": string }],
      "support_lines": string[],
      "cta_variants": string[],
      "visual_concepts": [{ "concept_name": string, "description": string, "image_prompt": string, "suggested_text_overlay": string }],
      "text_overlay_guidance": string,
      "performance_note": string
    }
  ],
  "expected_designs": number,
  "production_instructions": {
    "headline_rules": string,
    "text_placement": string,
    "export_format": string,
    "variants_per_angle": number
  },
  "confidence": "high" | "medium" | "low",
  "confidence_note": string
}`,
    { temperature: 0.55 },
  )

  return {
    ...data,
    plan_brief_id: data.plan_brief_id || input.plan_brief_id,
    objective: data.objective || input.objective,
    hypothesis: data.hypothesis || input.hypothesis,
    confidence: data.confidence || confidenceMeta.confidence,
    confidence_note: data.confidence_note || confidenceMeta.confidence_note,
  }
}
