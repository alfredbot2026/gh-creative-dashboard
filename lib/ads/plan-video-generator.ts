import { generateJSON } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'
import { getAdGenerationContext, getBrandContext } from '@/lib/create/kb-retriever'

export interface VideoPlanInput {
  plan_brief_id: string
  plan_type: 'scale' | 'refresh' | 'explore' | 'mixed'
  objective: string
  hypothesis: string
  evidence_summary: {
    winners?: Array<{ ad_id?: string; id?: string; ad_name?: string; hook_family?: string; body_summary?: string; cta_pattern?: string; format?: string; roas?: number }>
    fatigue?: Array<{ ad_id?: string; id?: string; ad_name?: string; reason?: string; trend_pct?: number; hook_family?: string; format?: string }>
    gaps?: Array<{ angle?: string; hook_family?: string; format?: string; mechanism?: string; cta_pattern?: string }>
    losers?: Array<{ ad_id?: string; id?: string; ad_name?: string; hook_family?: string; format?: string; roas?: number }>
  }
  target_angle: string
  target_persona: string
  target_formats: string[]
}

export interface VideoHook {
  hook_text: string
  hook_type: string
  take_count: number
  performance_note: string
}

export interface VideoAngleSection {
  angle_name: string
  hypothesis: string
  body_script: string
  body_script_take_count: number
  hooks: VideoHook[]
  cta_note: string
  visual_directions: string
  take_directions: {
    calm: string
    urgent: string
    personal: string
  }
  expected_raw_count: number
}

export interface VideoPlanOutput {
  plan_brief_id: string
  objective: string
  hypothesis: string
  global_rules: {
    tone: string
    clip_length: string
    takes_per_hook: number
    improvisation_rule: string
  }
  angles: VideoAngleSection[]
  expected_total_raw: number
  editing_instructions: {
    pairing_rule: string
    output_count: number
    naming_convention: string
    export_notes: string
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

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function normalizePersona(value: string) {
  return titleCase(value || 'general audience')
}

function inferConfidence(input: VideoPlanInput, learningCount: number): { confidence: 'high' | 'medium' | 'low'; confidence_note: string } {
  const winnerCount = input.evidence_summary.winners?.length || 0
  const fatigueCount = input.evidence_summary.fatigue?.length || 0
  const gapCount = input.evidence_summary.gaps?.length || 0

  if (winnerCount >= 2 && learningCount >= 2) {
    return {
      confidence: 'high',
      confidence_note: `High confidence: ${winnerCount} winner signal(s) and ${learningCount} extracted creative learning(s) support this plan.`,
    }
  }

  if (winnerCount + fatigueCount + gapCount >= 2 || learningCount >= 1) {
    return {
      confidence: 'medium',
      confidence_note: `Medium confidence: useful evidence exists, but the sample size is still limited.`,
    }
  }

  return {
    confidence: 'low',
    confidence_note: 'Low confidence: this plan is based on light evidence and should be treated as an exploratory production brief.',
  }
}

async function loadLearningContext(input: VideoPlanInput) {
  const supabase = await createClient()
  const winnerIds = (input.evidence_summary.winners || []).map(item => item.ad_id || item.id).filter(Boolean) as string[]
  const fatigueIds = (input.evidence_summary.fatigue || []).map(item => item.ad_id || item.id).filter(Boolean) as string[]
  const loserIds = (input.evidence_summary.losers || []).map(item => item.ad_id || item.id).filter(Boolean) as string[]
  const creativeIds = Array.from(new Set([...winnerIds, ...fatigueIds, ...loserIds]))

  const [brandContext, kbContext, learningRes] = await Promise.all([
    getBrandContext(),
    getAdGenerationContext(12),
    creativeIds.length > 0
      ? supabase
          .from('creative_learnings')
          .select('ad_creative_id, format, hook_primary, hook_family, hook_type, body_summary, belief_barrier, cta_pattern, visual_pattern, emotional_tone, inferred_mechanism, mechanism_confidence')
          .in('ad_creative_id', creativeIds)
      : Promise.resolve({ data: [] as CreativeLearningRow[], error: null }),
  ])

  if (learningRes.error) throw new Error(learningRes.error.message)

  return {
    brandContext,
    kbEntries: kbContext.entries || [],
    learnings: (learningRes.data || []) as CreativeLearningRow[],
  }
}

export async function generateVideoPlan(input: VideoPlanInput): Promise<VideoPlanOutput> {
  const { brandContext, kbEntries, learnings } = await loadLearningContext(input)
  const confidenceMeta = inferConfidence(input, learnings.length)

  const winnerLines = (input.evidence_summary.winners || []).map(item => {
    const learning = learnings.find(entry => entry.ad_creative_id === (item.ad_id || item.id))
    return `- ${item.ad_name || item.ad_id || item.id || 'winner'} | hook family: ${item.hook_family || learning?.hook_family || 'unknown'} | body: ${item.body_summary || learning?.body_summary || 'n/a'} | CTA: ${item.cta_pattern || learning?.cta_pattern || 'n/a'} | format: ${item.format || learning?.format || 'unknown'} | ROAS: ${typeof item.roas === 'number' ? item.roas : 'n/a'}`
  }).join('\n')

  const fatigueLines = (input.evidence_summary.fatigue || []).map(item => `- ${item.ad_name || item.ad_id || item.id || 'fatiguing ad'} | reason: ${item.reason || 'declining efficiency'} | hook family: ${item.hook_family || 'unknown'} | format: ${item.format || 'unknown'}`).join('\n')
  const gapLines = (input.evidence_summary.gaps || []).map(item => `- angle: ${item.angle || input.target_angle} | hook family: ${item.hook_family || 'open'} | format: ${item.format || 'video_ugc'} | mechanism: ${item.mechanism || 'n/a'} | CTA: ${item.cta_pattern || 'n/a'}`).join('\n')

  const learningLines = learnings.slice(0, 8).map(item => `- format: ${item.format || 'unknown'} | hook primary: ${item.hook_primary || 'n/a'} | hook family: ${item.hook_family || item.hook_type || 'n/a'} | body summary: ${item.body_summary || 'n/a'} | CTA: ${item.cta_pattern || 'n/a'} | visual: ${item.visual_pattern || 'n/a'} | mechanism: ${item.inferred_mechanism || 'n/a'} | confidence: ${item.mechanism_confidence || 'n/a'}`).join('\n')
  const kbLines = kbEntries.slice(0, 8).map(entry => `- [${entry.category}] ${entry.title}: ${(entry.content || '').slice(0, 220)}`).join('\n')

  const toneDescriptors = typeof brandContext?.tone_descriptors === 'string' ? brandContext.tone_descriptors : 'Warm, natural, Taglish'
  const vocabularyNotes = typeof brandContext?.vocabulary_notes === 'string' ? brandContext.vocabulary_notes : 'Sound like Grace talking to a real customer, not a copywriter.'
  const taglishRatio = typeof brandContext?.taglish_ratio === 'string' ? brandContext.taglish_ratio : '60/40 Filipino/English'
  const bannedWords = typeof brandContext?.banned_words === 'string' ? brandContext.banned_words : 'guaranteed income, passive income, fake urgency'

  const { data } = await generateJSON<VideoPlanOutput>(
    `You create production-ready short-form video shoot briefs for Meta ad production.

Return valid JSON only.

You are writing for Grace, who will actually record these clips. The plan must be practical, crisp, and ready to shoot.

Rules:
1. Use plain, natural Taglish.
2. Up to 3 angles total.
3. Exactly 5 hooks per angle.
4. One reusable body script per angle.
5. body_script_take_count should be 1.
6. Each hook take_count should be 3 (calm, urgent, personal).
7. expected_raw_count per angle = body_script_take_count + sum(hook.take_count).
8. Give take directions that are distinct and actionable.
9. Reuse winner patterns when evidence is strong; avoid fatigued patterns.
10. Keep clip logic optimized for selfie-style or simple talking-head production.
11. No emojis. No markdown. No commentary outside JSON.

Brand voice:
- Tone: ${toneDescriptors}
- Taglish ratio: ${taglishRatio}
- Vocabulary notes: ${vocabularyNotes}
- Avoid: ${bannedWords}`,
    `Create a video production plan.

Plan metadata:
- plan_brief_id: ${input.plan_brief_id}
- plan_type: ${input.plan_type}
- objective: ${input.objective}
- hypothesis: ${input.hypothesis}
- target angle: ${input.target_angle}
- target persona: ${normalizePersona(input.target_persona)}
- requested formats: ${input.target_formats.join(', ') || 'video_ugc'}

Evidence summary — winners:
${winnerLines || '- none'}

Evidence summary — fatigue / what to avoid:
${fatigueLines || '- none'}

Evidence summary — gaps / open territory:
${gapLines || '- none'}

Creative learnings:
${learningLines || '- none'}

Knowledge base context:
${kbLines || '- none'}

Confidence guidance:
- suggested confidence: ${confidenceMeta.confidence}
- confidence note: ${confidenceMeta.confidence_note}

JSON schema:
{
  "plan_brief_id": string,
  "objective": string,
  "hypothesis": string,
  "global_rules": {
    "tone": string,
    "clip_length": string,
    "takes_per_hook": number,
    "improvisation_rule": string
  },
  "angles": [
    {
      "angle_name": string,
      "hypothesis": string,
      "body_script": string,
      "body_script_take_count": number,
      "hooks": [
        {
          "hook_text": string,
          "hook_type": string,
          "take_count": number,
          "performance_note": string
        }
      ],
      "cta_note": string,
      "visual_directions": string,
      "take_directions": {
        "calm": string,
        "urgent": string,
        "personal": string
      },
      "expected_raw_count": number
    }
  ],
  "expected_total_raw": number,
  "editing_instructions": {
    "pairing_rule": string,
    "output_count": number,
    "naming_convention": string,
    "export_notes": string
  },
  "confidence": "high" | "medium" | "low",
  "confidence_note": string
}

Keep it grounded in the evidence. If evidence is sparse, still produce a usable brief, but say so in confidence_note.`,
    { temperature: 0.5 },
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
