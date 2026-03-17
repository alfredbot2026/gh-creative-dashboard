import { generateJSON } from '@/lib/llm/client'
import { getGenerationContext, getBrandContext } from './kb-retriever'
import { buildShortFormPrompt } from './shortform-prompt'
import type { GenerateShortFormRequest, GenerateShortFormResponse, ShortFormScript } from './types'
import type { BrandStyleGuide } from '@/lib/brand/types'

export async function generateShortFormScript(
  request: GenerateShortFormRequest
): Promise<GenerateShortFormResponse> {
  // 1. Retrieve KB context
  const kbEntries = await getGenerationContext('short-form', [
    'hook_library',
    'scripting_framework',
    'virality_science',
    'brand_identity',
  ])

  // 2. Get brand style guide
  const brandRaw = await getBrandContext()
  if (!brandRaw) throw new Error('Brand style guide not configured. Go to /settings first.')
  const brand = brandRaw as unknown as BrandStyleGuide

  // 3. Build prompt
  const prompt = buildShortFormPrompt(request, kbEntries, brand)

  // 4. Call LLM with JSON mode
  // Using systemPrompt and userPrompt as expected by generateJSON
  const result = await generateJSON<Omit<ShortFormScript, 'content_type' | 'lane' | 'knowledge_entries_used'>>(
    prompt,
    'Please generate the short-form script as JSON based on the instructions above.'
  )

  // 5. Parse response
  const script: ShortFormScript = {
    ...result.data,
    content_type: 'short-form-script',
    lane: 'short-form',
    knowledge_entries_used: kbEntries.map(e => e.id),
  }

  // 6. Quality gate (if eval module exists)
  let quality_score = undefined
  try {
    const { checkQualityGate } = await import('@/lib/eval/quality-gate')
    const gateResult = await checkQualityGate(
      script.scenes.map(s => s.script_text).join('\n'),
      'short-form-script',
      request.platform
    )
    quality_score = {
      composite: gateResult.scores.composite,
      passed_gate: gateResult.passed,
      feedback: gateResult.feedback,
    }
  } catch {
    // Eval module not yet available — skip quality gate
  }

  return {
    script,
    quality_score,
    knowledge_context: {
      hooks_used: kbEntries
        .filter(e => e.category === 'hook_library')
        .map(e => e.title),
      frameworks_used: kbEntries
        .filter(e => e.category === 'scripting_framework')
        .map(e => e.title),
    },
  }
}
