import type { VoiceRubric } from '@/lib/brand/types'
import type { AutoScores } from '@/lib/eval/types'
import { generateJSON } from '@/lib/llm/client'

interface LLMVoiceAssessment {
  tone_match: number
  formality_match: number
  tone_notes?: string
  formality_notes?: string
}

const FILIPINO_MARKERS = new Set([
  'ang', 'sa', 'ng', 'mga', 'para', 'pero', 'dahil', 'kahit', 'lang', 'naman',
  'talaga', 'dito', 'iyan', 'ito', 'yan', 'yung', 'kung', 'kapag', 'paano',
  'bakit', 'ano', 'saan', 'gusto', 'pwede', 'puwede', 'kita', 'kumita', 'negosyo',
  'puhunan', 'benta', 'bisyo', 'buhay', 'bahay', 'trabaho', 'madali', 'hirap',
  'tipid', 'tuloy', 'step', 'mommy', 'ate', 'kuya', 'natin', 'namin', 'nyo',
  'niyo', 'ako', 'ikaw', 'siya', 'sila', 'tayo', 'kami', 'kayo', 'mo', 'ko',
  'po', 'opo', 'ba', 'na', 'pa', 'din', 'rin', 'kasi', 'wala', 'meron',
])

function clamp(value: number, min: number = 0, max: number = 1) {
  return Math.min(max, Math.max(min, value))
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string) {
  return normalizeText(text)
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean)
}

function countPhraseOccurrences(text: string, phrase: string) {
  const normalizedText = ` ${normalizeText(text)} `
  const normalizedPhrase = normalizeText(phrase)

  if (!normalizedPhrase) return 0

  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'gu')
  return [...normalizedText.matchAll(pattern)].length
}

function getVocabularyScore(text: string, rubric: VoiceRubric) {
  const tokens = tokenize(text)
  const wordCount = Math.max(tokens.length, 1)

  const whitelistHits = rubric.vocabulary_whitelist.reduce((sum, word) => {
    return sum + countPhraseOccurrences(text, word)
  }, 0)

  const blacklistHits = rubric.vocabulary_blacklist.reduce((sum, word) => {
    return sum + countPhraseOccurrences(text, word)
  }, 0)

  const expectedDensity = Math.min(
    Math.max(Math.ceil(wordCount / 35), 1),
    Math.max(rubric.vocabulary_whitelist.length, 1)
  )

  const baseScore = clamp(whitelistHits / expectedDensity)
  const blacklistPenalty = clamp(blacklistHits * 0.2)

  return clamp(baseScore - blacklistPenalty)
}

function getTaglishScore(text: string, rubric: VoiceRubric) {
  const tokens = tokenize(text)
  if (tokens.length === 0) return 0

  const rubricMarkers = new Set(
    [...rubric.vocabulary_whitelist, ...rubric.example_phrases]
      .flatMap(entry => tokenize(entry))
  )

  const filipinoCount = tokens.reduce((sum, token) => {
    return sum + (FILIPINO_MARKERS.has(token) || rubricMarkers.has(token) ? 1 : 0)
  }, 0)

  const ratio = filipinoCount / tokens.length
  const { target, min, max } = rubric.taglish_ratio
  const normalizationWindow = Math.max(
    Math.abs(target - min),
    Math.abs(max - target),
    0.25
  )

  return clamp(1 - Math.abs(ratio - target) / normalizationWindow)
}

function getBannedWordsScore(text: string, rubric: VoiceRubric) {
  const hasBannedWord = rubric.banned_ai_words.some(word => countPhraseOccurrences(text, word) > 0)
  return hasBannedWord ? 0 : 1
}

async function getLLMVoiceAssessment(
  text: string,
  platform: string,
  rubric: VoiceRubric
): Promise<LLMVoiceAssessment> {
  const expectedFormality = rubric.formality_levels[platform] || rubric.formality_levels.default || 'conversational'

  const systemPrompt = `
You score brand voice fit for marketing copy.
Return JSON only.
Score conservatively.
`

  const userPrompt = `
Evaluate this text against the brand voice rubric and return JSON:
{
  "tone_match": number,
  "formality_match": number,
  "tone_notes": string,
  "formality_notes": string
}

Rules:
- Both scores must be between 0 and 1.
- "tone_match" measures alignment to these descriptors: ${rubric.tone_descriptors.join(', ') || 'n/a'}.
- "formality_match" measures alignment to the expected platform formality: ${expectedFormality}.
- Consider these example phrases as positive voice anchors: ${rubric.example_phrases.join(' | ') || 'n/a'}.
- Keep notes short.

Platform: ${platform}
Text:
"""
${text}
"""
`

  const { data } = await generateJSON<LLMVoiceAssessment>(systemPrompt, userPrompt)

  return {
    tone_match: clamp(Number(data.tone_match) || 0),
    formality_match: clamp(Number(data.formality_match) || 0),
    tone_notes: data.tone_notes,
    formality_notes: data.formality_notes,
  }
}

export async function scoreBrandVoice(
  text: string,
  platform: string,
  rubric: VoiceRubric
): Promise<AutoScores> {
  const trimmedText = text.trim()
  if (!trimmedText) {
    return {
      tone_match: 0,
      vocabulary_match: 0,
      taglish_ratio: 0,
      formality_match: 0,
      banned_words_clean: 1,
      composite: 0,
    }
  }

  const [llmScores, vocabularyMatch, taglishRatio, bannedWordsClean] = await Promise.all([
    getLLMVoiceAssessment(trimmedText, platform, rubric),
    Promise.resolve(getVocabularyScore(trimmedText, rubric)),
    Promise.resolve(getTaglishScore(trimmedText, rubric)),
    Promise.resolve(getBannedWordsScore(trimmedText, rubric)),
  ])

  const weights = rubric.scoring_weights
  const totalWeight = weights.tone + weights.vocabulary + weights.taglish + weights.formality + weights.banned_words

  const composite = totalWeight > 0
    ? clamp(
        (
          llmScores.tone_match * weights.tone +
          vocabularyMatch * weights.vocabulary +
          taglishRatio * weights.taglish +
          llmScores.formality_match * weights.formality +
          bannedWordsClean * weights.banned_words
        ) / totalWeight
      )
    : 0

  return {
    tone_match: llmScores.tone_match,
    vocabulary_match: vocabularyMatch,
    taglish_ratio: taglishRatio,
    formality_match: llmScores.formality_match,
    banned_words_clean: bannedWordsClean,
    composite,
  }
}
