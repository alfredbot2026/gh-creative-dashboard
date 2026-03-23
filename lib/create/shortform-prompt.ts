import type { KnowledgeEntry } from '@/lib/knowledge/types'
import type { BrandStyleGuide } from '@/lib/brand/types'
import type { GenerateShortFormRequest } from './types'

export function buildShortFormPrompt(
  request: GenerateShortFormRequest,
  kbEntries: KnowledgeEntry[],
  brand: BrandStyleGuide,
  pinnedHook?: KnowledgeEntry,
  pinnedFramework?: KnowledgeEntry
): string {
  const hookEntries = kbEntries.filter(e => e.category === 'hook_library' && e.id !== pinnedHook?.id)
  const frameworks = kbEntries.filter(e => e.category === 'scripting_framework' && e.id !== pinnedFramework?.id)
  const viralityEntries = kbEntries.filter(e => e.category === 'virality_science')
  const funnelEntries = kbEntries.filter(e => e.category === 'content_funnel')
  const platformEntries = kbEntries.filter(e => e.category === 'platform_intelligence')

  const hookSection = pinnedHook
    ? `## REQUIRED HOOK — You MUST use this exact pattern (Grace selected it)
- **${pinnedHook.title}**: ${pinnedHook.content}
${Array.isArray(pinnedHook.examples) && pinnedHook.examples.length > 0 ? `  Examples: ${pinnedHook.examples.slice(0, 3).join('; ')}` : ''}

## Other Available Hook Patterns (secondary reference only)
${hookEntries.slice(0, 3).map(h => {
  const examples = typeof h.examples === 'string' ? JSON.parse(h.examples) : (h.examples || [])
  return `- **${h.title}**: ${h.content.slice(0, 120)}...`
}).join('\n')}`
    : `## Available Hook Patterns (USE ONE — do not invent generic hooks)
${hookEntries.map(h => {
  const examples = typeof h.examples === 'string' ? JSON.parse(h.examples) : (h.examples || [])
  return `- **${h.title}**: ${h.content}${examples.length > 0 ? `\n  Examples: ${examples.slice(0, 2).join('; ')}` : ''}`
}).join('\n')}`

  const frameworkSection = pinnedFramework
    ? `## REQUIRED FRAMEWORK — You MUST follow this structure (Grace selected it)
- **${pinnedFramework.title}**: ${pinnedFramework.content}

## Other Scripting Frameworks (secondary reference only)
${frameworks.slice(0, 2).map(f => `- **${f.title}**: ${f.content.slice(0, 100)}...`).join('\n')}`
    : `## Scripting Frameworks
${frameworks.map(f => `- **${f.title}**: ${f.content}`).join('\n')}`

  return `You are a content strategist for ${brand.creator_description || 'a creator'}.
${request.content_purpose ? `\nContent Purpose: ${request.content_purpose.toUpperCase()} — optimize for this intent.\n` : ''}
## Brand Voice Rules (MANDATORY)
- Tone: ${brand.voice_rubric.tone_descriptors.join(', ')}
- Language: Taglish (Filipino-English mix, ~${Math.round(brand.voice_rubric.taglish_ratio.target * 100)}% Filipino)
- Formality: ${brand.voice_rubric.formality_levels[request.platform] || 'conversational'}
- NEVER use these words: ${brand.voice_rubric.banned_ai_words.join(', ')}
- Example phrases that match the voice: ${brand.voice_rubric.example_phrases.slice(0, 5).join(' | ')}

${hookSection}

${frameworkSection}

## Virality Patterns (apply where relevant)
${viralityEntries.map(v => `- **${v.title}**: ${v.content}`).join('\n')}

## Content Funnel Context
${funnelEntries.map(f => `- **${f.title}**: ${f.content}`).join('\n')}

## Platform Intelligence (${request.platform})
${platformEntries.map(p => `- **${p.title}**: ${p.content}`).join('\n')}

${request.product_context ? `## Product Context
Product: ${request.product_context.name}
${request.product_context.price ? `Price: ${request.product_context.price}` : ''}
${request.product_context.offer_details ? `What's included: ${request.product_context.offer_details}` : ''}
${request.product_context.target_audience ? `Target customer: ${request.product_context.target_audience}` : ''}
${request.product_context.usps?.length ? `Key selling points: ${request.product_context.usps.join(', ')}` : ''}

Incorporate this product naturally. ${request.content_purpose === 'sell' ? 'This is a sales-focused piece — highlight the offer.' : "Don't make it a hard sell unless the purpose is 'sell'."}
` : ''}
## Task
${request.topic
  ? `Create a short-form script for: "${request.topic}"`
  : `Create a short-form script. Pick the best topic for this creator based on their brand, products, and the ${request.content_purpose || 'educational'} purpose. Use their product/service knowledge to choose a highly relevant topic.`}
${request.angle ? `Angle: ${request.angle}` : 'Pick the most compelling angle.'}
${request.style ? `Style: ${request.style}` : ''}
Platform: ${request.platform}
Target duration: ${request.target_duration || 45} seconds

## Output Format (JSON)
Return valid JSON matching this structure:
{
  "title": "...",
  "hook": "the opening line (must use one of the hook patterns above)",
  "scenes": [
    {
      "scene_number": 1,
      "duration_seconds": 5,
      "visual_direction": "what's shown on screen",
      "script_text": "what's said or shown as text overlay",
      "hook_type": "name of hook pattern used (if applicable)",
      "b_roll_suggestion": "optional B-roll idea"
    }
  ],
  "total_duration_seconds": 45,
  "topic": "${request.topic}",
  "angle": "the creative angle",
  "cta": "call to action",
  "hashtags": ["relevant", "hashtags"],
  "caption_draft": "ready-to-post caption in Taglish"
}

Rules:
- Hook MUST reference a real pattern from the list above
- Total duration should be ${request.target_duration || '30-60'} seconds
- Each scene must have visual direction (this is a shooting script, not just text)
- Caption must follow brand voice rules
- Use Taglish naturally — not forced`
}

/**
 * Structure-aware prompt builder.
 * When a structure is selected, it REPLACES the generic framework section
 * and forces the AI to output scenes matching the structure's blocks.
 */
export function buildStructureAwareShortFormPrompt(
  request: GenerateShortFormRequest,
  kbEntries: KnowledgeEntry[],
  brand: BrandStyleGuide,
  structureSection: string,
  outputHint: string
): string {
  const viralityEntries = kbEntries.filter(e => e.category === 'virality_science')
  const funnelEntries = kbEntries.filter(e => e.category === 'content_funnel')

  return `You are a content strategist for ${brand.creator_description || 'a creator'}.
${request.content_purpose ? `\nContent Purpose: ${request.content_purpose.toUpperCase()} — optimize for this intent.\n` : ''}
## Brand Voice Rules (MANDATORY)
- Tone: ${brand.voice_rubric.tone_descriptors.join(', ')}
- Language: Taglish (Filipino-English mix, ~${Math.round(brand.voice_rubric.taglish_ratio.target * 100)}% Filipino)
- Formality: ${brand.voice_rubric.formality_levels[request.platform] || 'conversational'}
- NEVER use these words: ${brand.voice_rubric.banned_ai_words.join(', ')}
- Example phrases that match the voice: ${brand.voice_rubric.example_phrases.slice(0, 5).join(' | ')}

${structureSection}

## Virality Patterns (apply where relevant)
${viralityEntries.map(v => `- **${v.title}**: ${v.content}`).join('\n')}

## Content Funnel Context
${funnelEntries.map(f => `- **${f.title}**: ${f.content}`).join('\n')}

${request.product_context ? `## Product Context
- Product: ${request.product_context.name}
- Description: ${request.product_context.description || 'N/A'}
- Price: ${request.product_context.price || 'N/A'}
- Offer: ${request.product_context.offer_details || 'N/A'}
- Target audience: ${request.product_context.target_audience || 'N/A'}
- USPs: ${request.product_context.usps?.join(', ') || 'N/A'}` : ''}

## Task
Create a ${request.platform} script about: "${request.topic}"
${request.angle ? `Creative angle: ${request.angle}` : ''}

## Output — JSON with structure-mapped scenes
${outputHint}

Return a JSON object with:
{
  "title": "video title",
  "scenes": [
    {
      "block_id": "the structure block id",
      "block_label": "the structure block label",
      "timing": "the block timing",
      "script_text": "what's said/shown — the actual content for this block",
      "visual_direction": "camera angle, movement, b-roll notes",
      "on_screen_text": "text overlay for this block (if applicable)",
      "production_notes": "editing/production notes"
    }
  ],
  "total_duration_seconds": ${request.target_duration || 45},
  "topic": "${request.topic}",
  "angle": "the creative angle",
  "cta": "call to action",
  "hashtags": [],
  "caption_draft": "ready-to-post caption in Taglish",
  "structure_used": "name of the structure"
}

Rules:
- Follow the structure EXACTLY — one scene per block, in order
- Total duration should match structure's ideal length
- Each scene must have visual direction (this is a shooting script)
- Caption must follow brand voice rules
- Use Taglish naturally — not forced
- Apply virality patterns where they naturally fit within the structure`
}
