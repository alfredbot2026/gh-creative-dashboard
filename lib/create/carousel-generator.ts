import { generateJSON } from '@/lib/llm/client'
import { getAdGenerationContext, getBrandContext } from './kb-retriever'
import { buildCarouselPrompt } from './carousel-prompt'
import type { CarouselGenerationRequest, CarouselGenerationResponse } from './carousel-types'
import type { BrandStyleGuide } from '@/lib/brand/types'
import { checkQualityGate } from '@/lib/eval/quality-gate'

export async function generateCarousel(
  request: CarouselGenerationRequest
): Promise<CarouselGenerationResponse> {
  // 1. Load brand style guide
  const brandRaw = await getBrandContext()
  if (!brandRaw) {
    throw new Error('Brand style guide not configured. Go to /settings first.')
  }
  const brand = brandRaw as unknown as BrandStyleGuide

  // 2. Retrieve KB entries
  const { entries: kbEntries, tier: kbTierUsed } = await getAdGenerationContext(25)

  // 3. Build Prompt
  const prompt = buildCarouselPrompt(request, kbEntries, brand)

  // 4. Call Gemini
  const { data: rawResponse, model } = await generateJSON<Omit<CarouselGenerationResponse, 'brand_voice_score' | 'generation_provenance'>>(
    "You are an expert direct response copywriter and media buyer that outputs STRICT JSON.",
    prompt
  )

  // 5. Score variant against brand voice rubric
  const allText = [
    rawResponse.caption,
    ...rawResponse.slides.map(s => `${s.headline}\n${s.body_text}\n${s.text_overlay}`)
  ].join('\n\n')

  const scoringPlatform = request.platform === 'facebook' ? 'ads' : request.platform

  let score = 0
  try {
    const gateResult = await checkQualityGate(allText, 'ad-copy', scoringPlatform)
    score = gateResult.scores.composite > 1 ? gateResult.scores.composite / 100 : gateResult.scores.composite
  } catch (err) {
    console.warn('Quality gate scoring failed for carousel:', err)
    score = 0
  }

  // 6. Return response
  return {
    ...rawResponse,
    brand_voice_score: Math.round(score * 100),
    generation_provenance: {
      model,
      entries_loaded: kbEntries.map(e => ({ id: e.id, title: e.title, category: e.category })),
      tier: kbTierUsed,
      total_loaded: kbEntries.length
    }
  }
}
