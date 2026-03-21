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

const CALL_DELAY_MS = 200  // 200ms between classification calls
const MAX_RETRIES = 3

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

/**
 * Classify a single content item with retries.
 */
async function classifySingle(
  caption: string,
  contentType: string,
  platform: string,
  hookTypes: string[],
  frameworks: string[]
): Promise<ContentClassification> {
  const prompt = buildClassificationPrompt(caption, contentType, platform, hookTypes, frameworks)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await generateContent(
        'You are a content classification AI. Respond with ONLY valid JSON, no markdown, no explanation.',
        prompt
      )
      return parseClassification(response.content)
    } catch (err: any) {
      if (attempt === MAX_RETRIES - 1) throw err
      console.warn(`[Classifier] Retry ${attempt + 1} for classification:`, err.message)
      await delay(1000 * (attempt + 1))  // Backoff
    }
  }

  throw new Error('Classification failed after max retries')
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
  
  // Find unclassified items
  // Get all ingest IDs, then filter out those already in content_analysis
  const { data: allIngest } = await supabase
    .from('content_ingest')
    .select('id, caption, description, content_type, platform')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })
    .limit(batchSize * 2)  // Fetch extra to account for already-classified

  if (!allIngest || allIngest.length === 0) {
    return { classified: 0, skipped: 0, errors: [], remaining: 0 }
  }

  // Check which are already classified
  const ingestIds = allIngest.map(i => i.id)
  const { data: existing } = await supabase
    .from('content_analysis')
    .select('ingest_id')
    .in('ingest_id', ingestIds)

  const classifiedIds = new Set((existing || []).map(e => e.ingest_id))
  const unclassified = allIngest.filter(i => !classifiedIds.has(i.id)).slice(0, batchSize)

  if (unclassified.length === 0) {
    return { classified: 0, skipped: 0, errors: [], remaining: 0 }
  }

  let classified = 0
  const errors: string[] = []

  for (const item of unclassified) {
    try {
      await delay(CALL_DELAY_MS)

      // Use caption for IG/FB, title (caption field) + description for YouTube
      const textToClassify = item.platform === 'youtube'
        ? `${item.caption || ''}\n\n${item.description || ''}`
        : item.caption || ''

      const classification = await classifySingle(
        textToClassify,
        item.content_type,
        item.platform,
        hookTypes,
        frameworks
      )

      const confidenceAvg = calcConfidenceAvg(classification)

      const { error: insertError } = await supabase
        .from('content_analysis')
        .insert({
          user_id: userId,
          ingest_id: item.id,
          classification,
          model_used: 'gemini-3-flash-preview',
          classification_version: 1,
          confidence_avg: confidenceAvg,
        })

      if (insertError) {
        errors.push(`${item.id}: DB insert failed — ${insertError.message}`)
      } else {
        classified++
      }
    } catch (err: any) {
      errors.push(`${item.id}: ${err.message}`)
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
