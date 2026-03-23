import { generateJSON } from '@/lib/llm/client'
import { getGenerationContext, getContextWithPinnedSelections, getBrandContext } from './kb-retriever'
import { buildShortFormPrompt, buildStructureAwareShortFormPrompt } from './shortform-prompt'
import { buildStructurePromptSection, buildStructureOutputHint } from './structure-prompt'
import type { GenerateShortFormRequest, GenerateShortFormResponse, ShortFormScript } from './types'
import type { BrandStyleGuide } from '@/lib/brand/types'
import { createClient } from '@supabase/supabase-js'

async function fetchStructure(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('content_structures')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function generateShortFormScript(
  request: GenerateShortFormRequest
): Promise<GenerateShortFormResponse> {
  // 1. If structure_slug provided, fetch structure for structure-aware generation
  const structure = request.structure_slug ? await fetchStructure(request.structure_slug) : null

  // 2. Retrieve KB context — with pinned selections if provided
  const hasPinned = request.selected_hook_id || request.selected_framework_id
  const { entries: kbEntries, pinnedHook, pinnedFramework } = hasPinned
    ? await getContextWithPinnedSelections(
        'short-form',
        ['hook_library', 'scripting_framework', 'virality_science', 'content_funnel', 'platform_intelligence'],
        request.selected_hook_id,
        request.selected_framework_id,
      )
    : { ...(await getGenerationContext('short-form', ['hook_library', 'scripting_framework', 'virality_science', 'content_funnel', 'platform_intelligence'])), pinnedHook: undefined, pinnedFramework: undefined }

  // 3. Get brand style guide
  const brandRaw = await getBrandContext()
  if (!brandRaw) throw new Error('Brand style guide not configured. Go to /settings first.')
  const brand = brandRaw as unknown as BrandStyleGuide

  // 4. Build prompt — structure-aware if structure provided
  let prompt: string
  if (structure) {
    const structureSection = buildStructurePromptSection(structure)
    const outputHint = buildStructureOutputHint(structure)
    prompt = buildStructureAwareShortFormPrompt(request, kbEntries, brand, structureSection, outputHint)
  } else {
    prompt = buildShortFormPrompt(request, kbEntries, brand, pinnedHook, pinnedFramework)
  }

  // 4. Call Gemini with JSON mode
  // Note: generateJSON handles stripping markdown fences and parsing
  const { data: rawScript } = await generateJSON<Omit<ShortFormScript, 'content_type' | 'lane' | 'knowledge_entries_used'>>(
    "You are a helpful content strategist that outputs JSON.",
    prompt
  )

  // 5. Build final script object
  const script: ShortFormScript = {
    ...rawScript,
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
  } catch (err) {
    console.warn('Quality gate check failed or module not available:', err)
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
