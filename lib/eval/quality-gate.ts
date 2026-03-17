import type { VoiceRubric } from '@/lib/brand/types'
import type { AutoScores } from '@/lib/eval/types'
import { scoreBrandVoice } from '@/lib/eval/brand-voice-scorer'
import { createClient } from '@/lib/supabase/server'

interface QualityGateResult {
  passed: boolean
  scores: AutoScores
  feedback: string[]
}

function getExpectedFormality(platform: string, rubric: VoiceRubric) {
  return rubric.formality_levels[platform] || rubric.formality_levels.default || 'the configured level'
}

function buildFeedback(scores: AutoScores, rubric: VoiceRubric, platform: string) {
  const feedback: string[] = []

  if (scores.tone_match < 0.7) {
    feedback.push(`Tone is off-brand. Push harder toward: ${rubric.tone_descriptors.join(', ') || 'the configured descriptors'}.`)
  }

  if (scores.vocabulary_match < 0.7) {
    feedback.push(`Use more brand vocabulary like ${rubric.vocabulary_whitelist.slice(0, 5).join(', ') || 'the approved whitelist'} and avoid stiff phrasing.`)
  }

  if (scores.taglish_ratio < 0.7) {
    feedback.push(`Adjust the Taglish mix toward the target ratio of ${Math.round(rubric.taglish_ratio.target * 100)}% Filipino words.`)
  }

  if (scores.formality_match < 0.7) {
    feedback.push(`Match the expected ${platform} formality level more closely: ${getExpectedFormality(platform, rubric)}.`)
  }

  if (scores.banned_words_clean < 1) {
    feedback.push(`Remove banned AI-sounding words: ${rubric.banned_ai_words.slice(0, 5).join(', ') || 'the banned list'}.`)
  }

  if (feedback.length === 0) {
    feedback.push('Brand voice checks passed.')
  }

  return feedback
}

async function loadVoiceRubric() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brand_style_guide')
    .select('voice_rubric')
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Failed to load brand voice rubric: ${error.message}`)
  }

  if (!data?.voice_rubric) {
    throw new Error('Brand voice rubric is not configured')
  }

  return data.voice_rubric as VoiceRubric
}

export async function checkQualityGate(
  text: string,
  contentType: string,
  platform: string,
  threshold: number = 0.7
): Promise<QualityGateResult> {
  const rubric = await loadVoiceRubric()
  const scores = await scoreBrandVoice(text, platform, rubric)
  const effectiveThreshold = Math.min(1, Math.max(0, threshold))
  const feedback = buildFeedback(scores, rubric, platform)

  if (!feedback.includes('Brand voice checks passed.') && contentType === 'ad-copy' && scores.formality_match < 0.7) {
    feedback.push('Ad copy should stay sharper and more direct than long-form educational content.')
  }

  return {
    passed: scores.composite >= effectiveThreshold,
    scores,
    feedback,
  }
}
