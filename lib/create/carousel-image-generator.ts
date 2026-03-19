import { generateAdImage } from './image-generator'
import type { CarouselSlide } from './carousel-types'
import type { ImageGenerationRequest } from './image-types'

export interface CarouselImageRequest {
  slides: CarouselSlide[]
  carousel_theme: string
  userId: string
}

export interface CarouselImageResult {
  slide_number: number
  image_url: string | null
  storage_path: string | null
  error?: string
}

/**
 * Generate images for all carousel slides sequentially.
 * Each slide builds on the carousel theme for visual consistency.
 * Individual slide failures don't kill the batch.
 */
export async function generateCarouselImages(
  request: CarouselImageRequest
): Promise<CarouselImageResult[]> {
  const results: CarouselImageResult[] = []

  // Build a style consistency prefix from the carousel theme
  const consistencyPrefix = [
    `CAROUSEL THEME: "${request.carousel_theme}".`,
    'IMPORTANT: Maintain identical visual style, color palette, typography treatment, and mood across ALL slides in this carousel.',
    `This is a ${request.slides.length}-slide carousel. Keep backgrounds, lighting, and composition consistent.`,
  ].join(' ')

  for (const slide of request.slides) {
    try {
      // Combine consistency prefix with the slide's image prompt
      const fullPrompt = `${consistencyPrefix} Slide ${slide.slide_number} of ${request.slides.length} (${slide.role}): ${slide.image_prompt}`

      const imageRequest: ImageGenerationRequest = {
        prompt: fullPrompt,
        style: 'promotional', // carousel slides are promotional by nature
        aspect_ratio: '1:1',  // standard carousel aspect ratio
      }

      const result = await generateAdImage(imageRequest, request.userId)

      results.push({
        slide_number: slide.slide_number,
        image_url: result.image_url,
        storage_path: result.storage_path,
      })
    } catch (error) {
      console.error(`[carousel-images] Slide ${slide.slide_number} failed:`, error)
      results.push({
        slide_number: slide.slide_number,
        image_url: null,
        storage_path: null,
        error: error instanceof Error ? error.message : 'Image generation failed',
      })
    }
  }

  return results
}
