import type { KnowledgeEntry } from '@/lib/knowledge/types'
import type { BrandStyleGuide } from '@/lib/brand/types'
import type { CarouselGenerationRequest } from './carousel-types'

export function buildCarouselPrompt(
  request: CarouselGenerationRequest,
  kbEntries: KnowledgeEntry[],
  brand: BrandStyleGuide
): string {
  const hookEntries = kbEntries.filter(e => e.category === 'hook_library')
  const frameworks = kbEntries.filter(e => e.category === 'scripting_framework' || e.category === 'cro_patterns' || e.category === 'ad_creative')
  const viralityEntries = kbEntries.filter(e => e.category === 'virality_science')
  const funnelEntries = kbEntries.filter(e => e.category === 'content_funnel')
  const platformEntries = kbEntries.filter(e => e.category === 'platform_intelligence')
  const brandEntries = kbEntries.filter(e => e.is_mandatory_first_read)

  const slideRoles = getSlideRoles(request.slide_count)

  return `You are a direct response copywriter and social media strategist for ${brand.creator_description || 'a creator'}.

## Brand Voice Rules (MANDATORY)
- Tone: ${brand.voice_rubric.tone_descriptors.join(', ')}
- Language: Taglish (Filipino-English mix, ~${Math.round(brand.voice_rubric.taglish_ratio.target * 100)}% Filipino)
- Formality: ${brand.voice_rubric.formality_levels[request.platform] || 'conversational'}
- NEVER use these words: ${brand.voice_rubric.banned_ai_words.join(', ')}
- Example phrases that match the voice: ${brand.voice_rubric.example_phrases.slice(0, 5).join(' | ')}

## Visual Brand Guide (Include in image prompts)
- Colors: ${brand.color_palette.map(c => `${c.name} (${c.hex})`).join(', ')}
- Photography: ${brand.photography_style}
- Styling: ${brand.product_styling_rules}

## Available Hooks
${hookEntries.map(h => `- [ID: ${h.id}] **${h.title}**: ${h.content}`).join('\n')}

## Copywriting & Ad Frameworks
${frameworks.map(f => `- [ID: ${f.id}] **${f.title}**: ${f.content}`).join('\n')}

## Virality & Funnel Context
${[...viralityEntries, ...funnelEntries].map(e => `- [ID: ${e.id}] **${e.title}**: ${e.content}`).join('\n')}

## Task
Create a ${request.slide_count}-slide carousel ad.
Product: "${request.product_name}"
Offer Details: "${request.offer_details || 'N/A'}"
Objective: ${request.objective}
Platform: ${request.platform}
Style: ${request.style} (Focus: ${getStyleFocus(request.style)})

## Narrative Arc Rules
Your carousel MUST follow this specific slide progression for ${request.slide_count} slides:
${slideRoles.map((role, i) => `Slide ${i + 1}: ${role}`).join('\n')}

## Output Format (STRICT JSON)
Return valid JSON matching this schema exactly. No markdown, no commentary.
{
  "carousel_theme": "Overall visual theme/concept to tie slides together",
  "caption": "Post caption in Taglish with a CTA",
  "hashtags": ["tag1", "tag2"],
  "slides": [
    {
      "slide_number": 1,
      "role": "hook", // must match the narrative arc rule above
      "headline": "Short, punchy text for the image",
      "body_text": "Supporting text or context",
      "visual_description": "What happens visually on the slide",
      "image_prompt": "Detailed Midjourney/StableDiffusion prompt. MUST include: [carousel_theme], [brand colors: ${brand.color_palette.map(c => c.name).join(', ')}], 'maintain consistent visual style across all slides', and specific slide visual.",
      "text_overlay": "Exact text to overlay on the image",
      "cta_text": "Optional button or swipe prompt"
    }
  ],
  "techniques_used": [
    {
      "entry_id": "UUID from the KB context above",
      "entry_title": "Title of the KB entry",
      "category": "Category of the KB entry",
      "how_applied": "1 sentence explaining how this was used in the carousel"
    }
  ]
}`
}

function getStyleFocus(style: string): string {
  switch (style) {
    case 'educational': return 'Data-heavy, teaching a concept'
    case 'storytelling': return 'First-person narrative or customer journey'
    case 'product-showcase': return 'Feature-focused, highlighting benefits'
    case 'testimonial': return 'Social proof heavy, relying on reviews/results'
    default: return 'Balanced'
  }
}

function getSlideRoles(count: number): string[] {
  switch (count) {
    case 3: return ['hook', 'solution', 'cta']
    case 4: return ['hook', 'problem', 'solution', 'cta']
    case 5: return ['hook', 'problem', 'agitate', 'solution', 'cta']
    case 6: return ['hook', 'problem', 'agitate', 'solution', 'proof', 'cta']
    case 7: return ['hook', 'problem', 'agitate', 'solution', 'proof', 'proof', 'cta']
    default:
      // Fallback 5
      return ['hook', 'problem', 'agitate', 'solution', 'cta']
  }
}
