/**
 * Batch Content Classifier
 * 
 * Classifies ingested content using AI, storing results in content_analysis.
 * Uses Gemini Flash for cheap, fast classification.
 */
import { createClient } from '@/lib/supabase/server'
import { generateContent } from '@/lib/llm/client'
import { buildClassificationPrompt, getKBVocabulary } from './classification-prompt'
import type { ContentClassification } from './classification-types'

const CALL_DELAY_MS = 300  // 300ms between LLM calls
const MAX_RETRIES = 3
const POSTS_PER_LLM_CALL = 10  // Classify 10 posts per single LLM call

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse a classification response, handling markdown code blocks and JSON.
 */
function parseClassification(raw: string): ContentClassification {
  let jsonStr = raw.trim()
  
  // Strip markdown code blocks
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  
  return JSON.parse(jsonStr)
}

/**
 * Calculate average confidence from a classification.
 */
function calcConfidenceAvg(classification: ContentClassification): number {
  const confidences = [
    classification.hook_confidence || 0,
    classification.structure_confidence || 0,
  ]
  return confidences.reduce((a, b) => a + b, 0) / confidences.length
}

interface IngestItem {
  id: string
  caption: string | null
  description: string | null
  content_type: string
  platform: string
}

/**
 * Classify a batch of posts in a single LLM call (10 posts per call).
 */
async function classifyMulti(
  items: IngestItem[],
  hookTypes: string[],
  frameworks: string[]
): Promise<Map<string, ContentClassification>> {
  const postsBlock = items.map((item, i) => {
    const text = item.platform === 'youtube'
      ? `${item.caption || ''}\n${item.description || ''}`.slice(0, 600)
      : (item.caption || '').slice(0, 400)
    return `POST_${i + 1} [id:${item.id}] [platform:${item.platform}] [type:${item.content_type}]:\n${text}`
  }).join('\n\n---\n\n')

  const hookList = hookTypes.slice(0, 15).join(', ')
  const frameworkList = frameworks.slice(0, 10).join(', ')

  const systemPrompt = `You are a social media content classifier. Classify each post and respond with ONLY a JSON array — no markdown, no explanation.`

  const userPrompt = `Classify each post below. Return a JSON array with one object per post in this exact format:
[
  {
    "post_id": "the id from [id:xxx]",
    "content_purpose": "educate|story|sell|inspire|prove|trend",
    "hook_type": "one of: ${hookList}",
    "hook_confidence": 0.0-1.0,
    "structure_type": "one of: ${frameworkList}",
    "structure_confidence": 0.0-1.0,
    "visual_style": "Talking Head|B-Roll Heavy|Text Overlay|Product Demo|Voiceover|Other",
    "emotional_tone": "Warm/Personal|Professional|Excited|Calm|Humorous|Inspirational",
    "cta_type": "Follow|Save|Comment|Link in Bio|Subscribe|None",
    "taglish_ratio": "English Only|80% English / 20% Filipino|50/50|Filipino Heavy",
    "topics": ["topic1", "topic2"]
  }
]

POSTS TO CLASSIFY:
${postsBlock}`

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await generateContent(systemPrompt, userPrompt)
      let jsonStr = response.content.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      const results: Array<ContentClassification & { post_id: string }> = JSON.parse(jsonStr)
      const map = new Map<string, ContentClassification>()
      for (const r of results) {
        const { post_id, ...classification } = r
        map.set(post_id, classification as ContentClassification)
      }
      return map
    } catch (err: any) {
      if (attempt === MAX_RETRIES - 1) throw err
      console.warn(`[Classifier] Retry ${attempt + 1}:`, err.message)
      await delay(1000 * (attempt + 1))
    }
  }
  throw new Error('Multi-classification failed after max retries')
}

export interface BatchResult {
  classified: number
  skipped: number
  errors: string[]
  remaining: number
}

/**
 * Classify a batch of unclassified ingested content.
 */
export async function classifyBatch(
  userId: string,
  batchSize: number = 20
): Promise<BatchResult> {
  const supabase = await createClient()
  
  // Get KB vocabulary once for the whole batch
  const { hookTypes, frameworks } = await getKBVocabulary()
  
  // Get IDs of already-classified items (fetch up to 5000 — covers Grace's full library)
  const { data: existingAnalysis } = await supabase
    .from('content_analysis')
    .select('ingest_id')
    .eq('user_id', userId)
    .limit(5000)

  const classifiedIds = new Set((existingAnalysis || []).map(e => e.ingest_id))

  // Fetch unclassified items only — paginate past classified ones
  const { data: allIngest } = await supabase
    .from('content_ingest')
    .select('id, caption, description, content_type, platform')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })
    .limit(5000)  // Fetch all, then filter — for Grace's ~1800 posts this is fine

  if (!allIngest || allIngest.length === 0) {
    return { classified: 0, skipped: 0, errors: [], remaining: 0 }
  }

  const unclassified = allIngest.filter(i => !classifiedIds.has(i.id)).slice(0, batchSize)

  if (unclassified.length === 0) {
    return { classified: 0, skipped: 0, errors: [], remaining: 0 }
  }

  let classified = 0
  const errors: string[] = []

  // Process in chunks of POSTS_PER_LLM_CALL — 1 LLM call per chunk
  for (let i = 0; i < unclassified.length; i += POSTS_PER_LLM_CALL) {
    const chunk = unclassified.slice(i, i + POSTS_PER_LLM_CALL)
    await delay(CALL_DELAY_MS)

    try {
      const classificationMap = await classifyMulti(chunk, hookTypes, frameworks)

      // Insert all results from this chunk
      const rows = chunk.map(item => {
        const classification = classificationMap.get(item.id)
        if (!classification) return null
        return {
          user_id: userId,
          ingest_id: item.id,
          classification,
          model_used: 'gemini-3-flash-preview',
          classification_version: 1,
          confidence_avg: calcConfidenceAvg(classification),
        }
      }).filter(Boolean)

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from('content_analysis')
          .insert(rows)

        if (insertError) {
          errors.push(`Chunk ${i}-${i + chunk.length}: DB insert failed — ${insertError.message}`)
        } else {
          classified += rows.length
        }
      }

      const missed = chunk.length - rows.length
      if (missed > 0) {
        errors.push(`Chunk ${i}: ${missed} posts not returned by LLM`)
      }
    } catch (err: any) {
      errors.push(`Chunk ${i}-${i + chunk.length}: ${err.message}`)
    }
  }

  // Count total remaining
  const { count: totalIngest } = await supabase
    .from('content_ingest')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { count: totalClassified } = await supabase
    .from('content_analysis')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const remaining = (totalIngest || 0) - (totalClassified || 0) - classified

  return { classified, skipped: 0, errors, remaining: Math.max(0, remaining) }
}

/**
 * Classify all unclassified content for a user.
 * Processes in batches with progress callbacks.
 */
export async function classifyAll(
  userId: string,
  batchSize: number = 20,
  onProgress?: (classified: number, total: number) => void
): Promise<{ total_classified: number; total_errors: number; duration_seconds: number }> {
  const start = Date.now()
  let totalClassified = 0
  let totalErrors = 0

  while (true) {
    const result = await classifyBatch(userId, batchSize)
    totalClassified += result.classified
    totalErrors += result.errors.length

    if (onProgress) {
      onProgress(totalClassified, totalClassified + result.remaining)
    }

    console.log(`[Classifier] Batch done: +${result.classified}, remaining: ${result.remaining}, errors: ${result.errors.length}`)

    // Stop if no more to classify or nothing was classified this batch
    if (result.remaining === 0 || result.classified === 0) break
  }

  return {
    total_classified: totalClassified,
    total_errors: totalErrors,
    duration_seconds: Math.round((Date.now() - start) / 1000),
  }
}
