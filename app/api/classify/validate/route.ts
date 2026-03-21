/**
 * Classification Validation Endpoint
 * POST /api/classify/validate — Runs gold set validation to test prompt quality.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GOLD_SET, GOLD_SET_MIN_AGREEMENT } from '@/lib/pipeline/gold-set'
import { buildClassificationPrompt, getKBVocabulary } from '@/lib/pipeline/classification-prompt'
import { validateClassification } from '@/lib/pipeline/classification-validator'
import type { ContentClassification } from '@/lib/pipeline/classification-types'
import { generateContent } from '@/lib/llm/client'

export const maxDuration = 120  // 2 minute timeout

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get KB vocabulary for classification prompt
    const { hookTypes, frameworks } = await getKBVocabulary()

    // Classify each gold set entry
    const aiResults: ContentClassification[] = []

    for (const entry of GOLD_SET) {
      const prompt = buildClassificationPrompt(
        entry.caption,
        entry.content_type,
        entry.platform,
        hookTypes,
        frameworks
      )

      try {
        const response = await generateContent(
          'You are a content classification AI. Respond with ONLY valid JSON, no markdown.',
          prompt
        )

        // Parse JSON from response (strip markdown code blocks if present)
        let jsonStr = response.content.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }

        const classification = JSON.parse(jsonStr) as ContentClassification
        aiResults.push(classification)
      } catch (err: any) {
        console.error(`[Validate] Failed to classify entry:`, err.message)
        // Push empty classification to maintain alignment
        aiResults.push({
          hook_type: '',
          hook_confidence: 0,
          structure: '',
          structure_confidence: 0,
          topic_category: '',
          content_purpose: 'educate',
          visual_style: 'mixed',
          text_overlay_style: 'none',
          production_quality: 'phone_casual',
          cta_type: '',
          emotional_tone: 'warm_personal',
          taglish_ratio: '',
          key_elements: [],
        })
      }
    }

    // Validate against gold set
    const result = validateClassification(GOLD_SET, aiResults)

    return NextResponse.json({
      ...result,
      gold_set_size: GOLD_SET.length,
      min_agreement_required: GOLD_SET_MIN_AGREEMENT,
      ai_responses: aiResults,  // Include for debugging
    })
  } catch (err: any) {
    console.error('[Validate] Validation failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
