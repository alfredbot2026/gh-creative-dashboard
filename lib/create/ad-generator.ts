import fs from 'fs'
import path from 'path'
import { generateJSON } from '@/lib/llm/client'
import { getAdGenerationContext, getContextWithPinnedSelections, getBrandContext } from './kb-retriever'
import type { AdGenerationRequest, AdGenerationResponse, AdVariant, AdFramework } from './ad-types'
import type { BrandStyleGuide } from '@/lib/brand/types'
import { checkQualityGate } from '@/lib/eval/quality-gate'

interface RawAdVariant {
  headline: string
  primary_text: string
  description: string
  cta: string
  framework_used: AdFramework
  framework_explanation: string
  image_prompt: string
}

interface RawAdGenerationResponse {
  variants: RawAdVariant[]
}

function buildAdPrompt(
  request: AdGenerationRequest,
  kbEntries: any[],
  brand: BrandStyleGuide,
  frameworksContent: string,
  pinnedHook?: any,
  pinnedFramework?: any
): string {
  return `
You are an expert Direct Response Copywriter. Generate 3-5 distinct ad copy variants for the following request.

## Request Details
- Product: ${request.product}
- Offer Details: ${request.offer_details}
- Objective: ${request.objective}
- Format: ${request.ad_format}
- Platform: ${request.platform}
${request.tone_override ? `- Tone Override: ${request.tone_override}` : ''}

## Brand Style Guide
Color Palette: ${JSON.stringify(brand.color_palette)}
Photography Style: ${brand.photography_style}
Product Styling Rules: ${brand.product_styling_rules}
Voice Rubric: ${JSON.stringify(brand.voice_rubric)}

## Ad Frameworks Available
${frameworksContent}

\n${request.content_purpose ? `Content Purpose: ${request.content_purpose.toUpperCase()} — optimize for this intent.\n` : ''}\n${pinnedHook ? `## REQUIRED HOOK (must use this exact pattern)\n- ${pinnedHook.title}: ${pinnedHook.content}\nExamples: ${pinnedHook.examples?.join('; ') || ''}` : ''}\n${pinnedFramework ? `## REQUIRED FRAMEWORK (must use this structure)\n- ${pinnedFramework.title}: ${pinnedFramework.content}` : ''}\n## Knowledge Base Context
${kbEntries.map((e, i) => `[Entry ${i+1}] ${e.title}\n${e.content}`).join('\n\n')}

## Instructions
1. Output **exactly 3 to 5** ad copy variants.
2. Each variant MUST use a DIFFERENT framework_used value from the available list.
3. Incorporate the Taglish ratio and brand voice as specified in the brand style guide.
4. image_prompt should be a detailed prompt for a text-to-image AI. It MUST include brand rules (colors, photography style, product styling) inside the prompt to ensure consistency.

## Output format (STRICT)
Return **ONLY** valid JSON. No markdown. No commentary.

Schema:
{
  "variants": [
    {
      "headline": "string",
      "primary_text": "string",
      "description": "string",
      "cta": "string",
      "framework_used": "PAS" | "AIDA" | "before_after" | "social_proof" | "urgency" | "FAB",
      "framework_explanation": "string",
      "image_prompt": "string"
    }
  ]
}

Rules:
- Every field is REQUIRED and must be a non-empty string.
- Do NOT output null/undefined.
- Keep headline short.
- Make primary_text platform-appropriate.
`
}

export async function generateAdCopy(
  request: AdGenerationRequest
): Promise<AdGenerationResponse> {
  // 1. Load brand style guide
  const brandRaw = await getBrandContext()
  if (!brandRaw) {
    throw new Error('Brand style guide not configured. Go to /settings first.')
  }
  const brand = brandRaw as unknown as BrandStyleGuide

  // 2. Load AD-FRAMEWORKS.md reference content
  const frameworksPath = path.join(process.cwd(), 'references/AD-FRAMEWORKS.md')
  let frameworksContent = ''
  try {
    frameworksContent = fs.readFileSync(frameworksPath, 'utf-8')
  } catch (error) {
    console.warn('Could not read AD-FRAMEWORKS.md reference file:', error)
    frameworksContent = 'Use standard copywriting frameworks: PAS, AIDA, Before/After, Social Proof, Urgency, FAB.'
  }

  // 3. Retrieve KB entries for ads
  const hasPinned = request.selected_hook_id || request.selected_framework_id;
  const { entries: kbEntries, pinnedHook, pinnedFramework, tier: kbTierUsed } = hasPinned
    ? await getContextWithPinnedSelections(
        'ads',
        ['ad_creative', 'hook_library', 'cro_patterns', 'content_funnel', 'virality_science', 'platform_intelligence'],
        request.selected_hook_id,
        request.selected_framework_id,
        15
      )
    : { ...(await getAdGenerationContext(15)), pinnedHook: undefined, pinnedFramework: undefined }

  // 4. Build Prompt
  const prompt = buildAdPrompt(request, kbEntries, brand, frameworksContent, pinnedHook, pinnedFramework)

  // 5. Call Gemini
  const { data: rawResponse, model } = await generateJSON<RawAdGenerationResponse>(
    "You are an expert direct response copywriter and media buyer that outputs JSON.",
    prompt
  )

  const categoryIcons: Record<string, string> = {
    'ad_creative': '🖼️',
    'hook_library': '🪝',
    'cro_patterns': '📈',
    'brand_identity': '✨',
    'scripting_framework': '📜'
  }
  const kbEntryTitles = kbEntries.map(e => {
    const icon = categoryIcons[e.category] || '📘'
    return `${icon} ${e.title} (${e.category})`
  })

  // 6 & 7. Parse and Score variants
  const variants: AdVariant[] = []
  
  for (const raw of rawResponse.variants) {
    // Validate required fields (avoid silently returning broken variants)
    const required: Array<keyof RawAdVariant> = [
      'headline',
      'primary_text',
      'description',
      'cta',
      'framework_used',
      'framework_explanation',
      'image_prompt',
    ]

    for (const k of required) {
      const v = raw[k]
      if (typeof v !== 'string' || v.trim().length === 0) {
        throw new Error(`LLM returned invalid ad variant: missing/empty ${String(k)}`)
      }
    }

    // Score variant against brand voice rubric
    const combinedText = [raw.headline, raw.primary_text, raw.description, raw.cta].join('\n\n')

    // Map ad platforms to the rubric/scorer expectations
    const scoringPlatform = request.platform === 'facebook' ? 'ads' : request.platform

    let score = 0
    try {
      const gateResult = await checkQualityGate(combinedText, 'ad-copy', scoringPlatform)
      score = Math.round(gateResult.scores.composite * 100)
    } catch (err) {
      console.warn('Quality gate scoring failed for ad variant:', err)
      score = 0
    }

    variants.push({
      id: crypto.randomUUID(),
      headline: raw.headline,
      primary_text: raw.primary_text,
      description: raw.description,
      cta: raw.cta,
      framework_used: raw.framework_used,
      framework_explanation: raw.framework_explanation,
      image_prompt: raw.image_prompt,
      brand_voice_score: score,
      knowledge_entries_used: kbEntryTitles
    })
  }

  // 8. Return response
  return {
    variants,
    generation_provenance: {
      model,
      kb_entries_loaded: kbEntries.length,
      brand_guide_version: brand.updated_at || new Date().toISOString(),
      kb_tier_used: kbTierUsed
    }
  }
}
