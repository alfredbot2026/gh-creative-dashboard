# TASK-007 — Short-form Script Generation API (Phase 1a)

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** No

## Pre-Task Learning
**Read `corrections.md` FIRST.** Are any past corrections relevant to this task? If yes, note them and apply proactively.

## Context
**Read these FIRST before writing any code:**
- [ ] `references/ARCHITECTURE.md` — current codebase map
- [ ] `lib/knowledge/types.ts` — KB types (KnowledgeEntry, KnowledgeFilter, ContentLane, etc.)
- [ ] `lib/brand/types.ts` — VoiceRubric, BrandStyleGuide
- [ ] `lib/llm/client.ts` — existing Gemini LLM client
- [ ] `lib/eval/quality-gate.ts` — quality gate (from TASK-006, if exists)
- [ ] `app/api/knowledge/route.ts` — existing KB API patterns

## Objective
Build the API that generates research-backed short-form scripts by pulling relevant knowledge entries, injecting brand voice, and producing structured scene-by-scene scripts ready for shooting.

## Changes

### Wave 1: Types & KB retrieval helper

#### Task 1.1: Create script generation types
- **File:** `lib/create/types.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  export interface ScriptScene {
    scene_number: number
    duration_seconds: number
    visual_direction: string      // what's on screen
    script_text: string           // what's said/shown as text
    hook_type?: string            // if this scene uses a specific hook pattern
    b_roll_suggestion?: string
  }

  export interface ShortFormScript {
    title: string
    hook: string                  // the opening hook line
    scenes: ScriptScene[]
    total_duration_seconds: number
    content_type: 'short-form-script'
    lane: 'short-form'
    topic: string
    angle: string                 // the creative angle taken
    cta: string
    hashtags: string[]
    caption_draft: string
    knowledge_entries_used: string[]  // KB entry IDs that informed this
  }

  export interface GenerateShortFormRequest {
    topic: string
    angle?: string                // optional — AI picks if not provided
    platform: 'instagram-reels' | 'tiktok' | 'youtube-shorts'
    target_duration?: number      // seconds, default 30-60
    style?: 'tutorial' | 'storytelling' | 'proof' | 'mistake' | 'hook-first'
  }

  export interface GenerateShortFormResponse {
    script: ShortFormScript
    quality_score?: {
      composite: number
      passed_gate: boolean
      feedback: string[]
    }
    knowledge_context: {
      hooks_used: string[]        // KB entry titles used for hook patterns
      frameworks_used: string[]   // KB entry titles used for structure
    }
  }
  ```
- **Verify:** `npx tsc --noEmit`

#### Task 1.2: Create KB retrieval helper for generation
- **File:** `lib/create/kb-retriever.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import type { KnowledgeEntry } from '@/lib/knowledge/types'

  /**
   * Retrieve relevant KB entries for content generation.
   * Pulls: hooks, scripting frameworks, brand identity (mandatory first-read),
   * and any lane-specific entries sorted by effectiveness_score.
   */
  export async function getGenerationContext(
    lane: 'short-form' | 'ads' | 'youtube',
    categories: string[],
    limit: number = 15
  ): Promise<KnowledgeEntry[]> {
    const supabase = await createClient()

    // 1. Always get mandatory first-read entries (brand identity)
    const { data: mandatory } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('is_mandatory_first_read', true)
      .eq('review_status', 'approved')

    // 2. Get lane-specific entries by requested categories
    const { data: entries } = await supabase
      .from('knowledge_entries')
      .select('*')
      .in('category', categories)
      .contains('lanes', [lane])
      .eq('review_status', 'approved')
      .order('effectiveness_score', { ascending: false })
      .limit(limit)

    // Deduplicate (mandatory entries might overlap)
    const seen = new Set<string>()
    const result: KnowledgeEntry[] = []
    for (const entry of [...(mandatory || []), ...(entries || [])]) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id)
        result.push(entry)
      }
    }

    return result
  }

  /**
   * Get brand style guide for prompt injection.
   */
  export async function getBrandContext(): Promise<Record<string, unknown> | null> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('brand_style_guide')
      .select('*')
      .limit(1)
      .single()
    return data
  }
  ```
- **Verify:** `npx tsc --noEmit`

### Wave 2: Generation prompt & LLM call

#### Task 2.1: Create short-form generation prompt
- **File:** `lib/create/shortform-prompt.ts`
- **Action:** Create
- **What to do:**
  Build the generation prompt that:
  1. Injects brand voice rubric as system context
  2. Includes relevant KB entries (hooks, frameworks) as reference material
  3. Requests structured JSON output matching `ShortFormScript`
  4. Enforces: each scene has duration, visual direction, script text
  5. Enforces: hook must reference a real hook pattern from KB (not generic)
  6. Enforces: Taglish language (Filipino-English mix per rubric ratio)
  7. Includes platform-specific rules (IG Reels vs TikTok vs YT Shorts)

  ```typescript
  import type { KnowledgeEntry } from '@/lib/knowledge/types'
  import type { BrandStyleGuide } from '@/lib/brand/types'
  import type { GenerateShortFormRequest } from './types'

  export function buildShortFormPrompt(
    request: GenerateShortFormRequest,
    kbEntries: KnowledgeEntry[],
    brand: BrandStyleGuide
  ): string {
    const hookEntries = kbEntries.filter(e => e.category === 'hook_library')
    const frameworks = kbEntries.filter(e => e.category === 'scripting_framework')
    const brandEntries = kbEntries.filter(e => e.is_mandatory_first_read)

    return `You are a content strategist for ${brand.creator_description || 'a creator'}.

## Brand Voice Rules (MANDATORY)
- Tone: ${brand.voice_rubric.tone_descriptors.join(', ')}
- Language: Taglish (Filipino-English mix, ~${Math.round(brand.voice_rubric.taglish_ratio.target * 100)}% Filipino)
- Formality: ${brand.voice_rubric.formality_levels[request.platform] || 'conversational'}
- NEVER use these words: ${brand.voice_rubric.banned_ai_words.join(', ')}
- Example phrases that match the voice: ${brand.voice_rubric.example_phrases.slice(0, 5).join(' | ')}

## Available Hook Patterns (USE ONE — do not invent generic hooks)
${hookEntries.map(h => `- **${h.title}**: ${h.content}\n  Examples: ${h.examples.slice(0, 2).join('; ')}`).join('\n')}

## Scripting Frameworks
${frameworks.map(f => `- **${f.title}**: ${f.content}`).join('\n')}

## Task
Create a short-form script for: "${request.topic}"
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
  ```
- **Verify:** `npx tsc --noEmit`

#### Task 2.2: Create short-form generator function
- **File:** `lib/create/shortform-generator.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  import { generateContent } from '@/lib/llm/client'
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

    // 4. Call Gemini with JSON mode
    const result = await generateContent(prompt, {
      responseMimeType: 'application/json',
    })

    // 5. Parse response
    const script: ShortFormScript = {
      ...JSON.parse(result),
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
  ```
- **Verify:** `npx tsc --noEmit`

### Wave 3: API route

#### Task 3.1: Create API route
- **File:** `app/api/create/short-form/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server'
  import { createClient } from '@/lib/supabase/server'
  import { generateShortFormScript } from '@/lib/create/shortform-generator'
  import type { GenerateShortFormRequest } from '@/lib/create/types'

  export async function POST(request: NextRequest) {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const body: GenerateShortFormRequest = await request.json()

      // Validate required fields
      if (!body.topic || !body.platform) {
        return NextResponse.json(
          { error: 'topic and platform are required' },
          { status: 400 }
        )
      }

      // Validate platform
      const validPlatforms = ['instagram-reels', 'tiktok', 'youtube-shorts']
      if (!validPlatforms.includes(body.platform)) {
        return NextResponse.json(
          { error: `platform must be one of: ${validPlatforms.join(', ')}` },
          { status: 400 }
        )
      }

      const result = await generateShortFormScript(body)
      return NextResponse.json(result)
    } catch (error) {
      console.error('Short-form generation error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Generation failed' },
        { status: 500 }
      )
    }
  }
  ```
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run build
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
# Must all pass before reporting done — paste ACTUAL OUTPUT in build report
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat: add short-form script generation API (Phase 1a)"
```

## Build Report (5-point handoff — ALL required)
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-007.md`:
1. **What was done** — summary of changes
2. **Where artifacts are** — exact file paths
3. **How to verify** — commands + curl example
4. **Known issues** — anything incomplete
5. **What's next** — "Ready for Bruce QA"

## Post-Task Reflection
If you received corrections or caught mistakes during this task:
- Append to `corrections.md`: `CONTEXT: | MISS: | FIX: | DATE:`

## Output
- Branch: `feat/shortform-generation`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-007.md`
- Notify: Dr. Strange via sessions_send (1-line: ✅ status + report path)
