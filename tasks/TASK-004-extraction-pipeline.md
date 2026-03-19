# Task: TASK-004 — NotebookLM Extraction Pipeline

> **Track:** FAST
> **Builder:** solo
> **Requires review:** No
> **Depends on:** TASK-001 (KB schema + types must exist)

## Pre-Task Learning
**Read `corrections.md` FIRST if it exists.**

## Context
**Read these FIRST before writing any code:**
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/PROJECT-SPEC.md` — sections 3b, 3d (KB categories, how knowledge gets populated)
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/lib/knowledge/types.ts` — TypeScript types + categories
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/app/actions/knowledge.ts` — server actions for creating entries
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/backend/main.py` — existing Python backend (for reference only — we're building the extraction in Node.js)
- [ ] `/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard/lib/llm/client.ts` — existing LLM client (Gemini)

## Background
The `nlm` CLI is installed at `/home/rob/.local/bin/nlm` and authenticated. It can:
- `nlm notebook list --json` — list all notebooks with IDs
- `nlm notebook query <notebook-id> "question" --json` — query a notebook
- `nlm source list <notebook-id> --json` — list sources in a notebook

The extraction pipeline queries each notebook with **category-specific structured prompts** to extract knowledge entries in JSON format. The LLM (Gemini) then structures the raw NotebookLM response into proper `KnowledgeEntry` objects.

**Key notebooks for content creation:**
| Notebook ID | Title | Sources |
|---|---|---|
| `3e7cf4a4-7e2a-4f8e-b7ec-32ca1246a69d` | Personal Brand Launch — Viral Breakdown Library | 273 |
| `691c5f7d-a39d-4658-956e-99db8dc121aa` | Chris Chung — Viral Breakdown Library | 154 |
| `c8607c1d-a873-4e0f-bdfa-40c8d66f8eaf` | Viral Video Anatomy — Research Library | 18 |
| `71c0525a-d8a8-4e1f-a99e-d0996c3eaa2a` | P2P Conversion Playbook | 12 |
| `2a4fc6bc-cd42-4a34-bd5c-910c5bf2d4a7` | P2P Competitor Swipefile — PH + Global | 12 |
| `d7c8be2a-5962-4119-a4e3-316b032c68f5` | Meta Ads Intelligence | 44 |
| `77341412-6eab-4336-8c16-04c1f65eec1c` | CRO Research | 53 |

## Objective
Build a Node.js extraction pipeline that queries NotebookLM notebooks with category-specific prompts and structures the responses into `KnowledgeEntry` objects. Expose as an API route + provide a UI for running extractions.

## Changes

### Wave 1: Extraction engine (server-side)

#### Task 1.1: NLM CLI wrapper
- **File:** `lib/knowledge/nlm.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * NotebookLM CLI wrapper
 * Executes `nlm` commands and parses JSON output.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const NLM_PATH = '/home/rob/.local/bin/nlm'

export interface NlmNotebook {
  id: string
  title: string
  source_count: number
  updated_at: string
}

export interface NlmQueryResult {
  answer: string
  conversation_id: string
  sources_used: string[]
}

/** List all notebooks */
export async function listNotebooks(): Promise<NlmNotebook[]> {
  const { stdout } = await execFileAsync(NLM_PATH, ['notebook', 'list', '--json'], {
    timeout: 30000,
  })
  return JSON.parse(stdout)
}

/** Query a notebook */
export async function queryNotebook(
  notebookId: string, 
  query: string,
  conversationId?: string
): Promise<NlmQueryResult> {
  const args = ['notebook', 'query', notebookId, query, '--json']
  if (conversationId) {
    args.push('--conversation-id', conversationId)
  }
  
  const { stdout } = await execFileAsync(NLM_PATH, args, {
    timeout: 120000, // 2 min timeout for complex queries
  })
  const result = JSON.parse(stdout)
  return result.value || result
}
```
- **Verify:** `npx tsc --noEmit`

#### Task 1.2: Extraction prompt templates
- **File:** `lib/knowledge/extraction-prompts.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * Category-specific extraction prompts for NotebookLM.
 * Each prompt asks for structured, specific knowledge — not generic summaries.
 * The response is then parsed by Gemini into KnowledgeEntry objects.
 */
import type { KnowledgeCategory, ContentLane } from './types'

export interface ExtractionPrompt {
  category: KnowledgeCategory
  query: string
  expectedLanes: ContentLane[]
  followUpQueries?: string[]  // optional deeper dives
}

export const EXTRACTION_PROMPTS: ExtractionPrompt[] = [
  {
    category: 'hook_library',
    query: `Extract every specific HOOK PATTERN or HOOK FRAMEWORK mentioned in this notebook. For each hook pattern:
1. Name it (e.g., "The Iceberg Effect", "Comparison Hook", "Ugly Hook")
2. Explain the structure/formula (how does it work?)
3. Give 2-3 EXACT examples of hooks using this pattern (word-for-word, not paraphrased)
4. Note which platforms it works best on
5. Note any data or evidence about its effectiveness

Format your response as a numbered list. Be exhaustive — include every distinct hook pattern, not just the top ones.`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
    followUpQueries: [
      'Are there any hook patterns specifically for ads or sales content? List them with examples.',
      'What are the "triple hook" rules — verbal, written, and visual hooks working together? Give specific examples.',
    ],
  },
  {
    category: 'scripting_framework',
    query: `Extract every SCRIPTING FRAMEWORK, SCRIPT STRUCTURE, or CONTENT FORMAT mentioned in this notebook. For each:
1. Name it (e.g., "Iverson Crossover", "Dance Method", "Hook-Hold-Reward")
2. Explain the step-by-step structure
3. Give a concrete example of a script following this framework
4. Note what content type it's best for (reel, YouTube, ad, etc.)
5. Note any effectiveness data

Be exhaustive — include every distinct framework.`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'content_funnel',
    query: `Extract every CONTENT STRATEGY FRAMEWORK mentioned — funnels (TOFU/MOFU/BOFU), posting frameworks (like 70/20/10), content pillar systems, series strategies, etc. For each:
1. Name it
2. Explain how it works in detail
3. Give specific examples of content for each stage/category
4. Note recommended ratios or posting frequencies
5. Note any evidence of effectiveness`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'virality_science',
    query: `Extract every VIRALITY PATTERN, SCIENTIFIC FINDING, or ALGORITHM INSIGHT mentioned. For each:
1. Name or describe the pattern (e.g., "5X Rule", "3-Second Rule", "STEPPS Framework", "Physiological Arousal Theory")
2. Explain the mechanism — why does this work?
3. Cite any specific data or research (percentages, study findings)
4. Note practical implications — how do you use this when creating content?
5. Note which platforms this applies to`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'ad_creative',
    query: `Extract every AD CREATIVE FRAMEWORK, AD COPY PATTERN, or ADVERTISING STRATEGY mentioned. For each:
1. Name it (e.g., "Angle Shifts", "Entity ID Trap", "Sell-by-Chat", "Creative as Targeting")
2. Explain how it works
3. Give specific examples of ad copy or creative approaches using this framework
4. Note any performance data (ROAS, CTR, conversion rates)
5. Note what ad format it's best for (static, video, carousel)`,
    expectedLanes: ['ads'],
    followUpQueries: [
      'What are the specific "angle shift" categories for ad creative? List each angle type with an example ad script.',
      'What objection-killing strategies are documented? List each with the exact objection and the counter-approach.',
    ],
  },
  {
    category: 'platform_intelligence',
    query: `Extract every PLATFORM-SPECIFIC INSIGHT about how algorithms work, what metrics matter, and what content performs best on each platform (Instagram, TikTok, YouTube, Facebook). For each:
1. Which platform
2. The specific insight or rule
3. Any data backing it up
4. Practical implication for content creators`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'competitor_intel',
    query: `Extract every COMPETITOR ANALYSIS, COMPETITIVE INSIGHT, or COMPETITIVE STRATEGY mentioned. For each:
1. Who is the competitor
2. What they do well / what their strategy is
3. What gaps or weaknesses exist
4. How to position against them
5. Any specific messaging hooks derived from competitive analysis`,
    expectedLanes: ['short-form', 'ads'],
  },
  {
    category: 'ai_prompting',
    query: `Extract every AI CONTENT CREATION WORKFLOW, PROMPTING TECHNIQUE, or AI-ASSISTED WRITING STRATEGY mentioned. For each:
1. Name it (e.g., "Brand Voice Injection", "Hook Architect", "Emotional Temperature Mapping")
2. Explain the step-by-step process
3. Give the exact prompt template or approach
4. Note what it's used for (hooks, scripts, carousel copy, etc.)
5. Note any "banned words" lists or quality checks mentioned`,
    expectedLanes: ['short-form', 'ads', 'youtube'],
  },
  {
    category: 'cro_patterns',
    query: `Extract every CONVERSION OPTIMIZATION PATTERN, LANDING PAGE TECHNIQUE, or CHECKOUT OPTIMIZATION mentioned. For each:
1. Name or describe the pattern
2. Explain how it works
3. Give specific examples
4. Note any conversion rate data
5. Note what type of product/service it's best for`,
    expectedLanes: ['ads'],
  },
]

/** Get extraction prompts relevant to a notebook based on its title/topic */
export function getPromptsForNotebook(notebookTitle: string): ExtractionPrompt[] {
  const title = notebookTitle.toLowerCase()
  
  // Content/viral notebooks get most categories
  if (title.includes('viral') || title.includes('personal brand') || title.includes('chris chung')) {
    return EXTRACTION_PROMPTS.filter(p => 
      ['hook_library', 'scripting_framework', 'content_funnel', 'virality_science', 
       'platform_intelligence', 'ai_prompting'].includes(p.category)
    )
  }
  
  // Ad-focused notebooks
  if (title.includes('ads') || title.includes('meta') || title.includes('conversion') || title.includes('p2p')) {
    return EXTRACTION_PROMPTS.filter(p =>
      ['ad_creative', 'platform_intelligence', 'cro_patterns'].includes(p.category)
    )
  }
  
  // Competitor notebooks
  if (title.includes('competitor') || title.includes('swipefile')) {
    return EXTRACTION_PROMPTS.filter(p =>
      ['competitor_intel', 'ad_creative'].includes(p.category)
    )
  }
  
  // CRO notebooks
  if (title.includes('cro')) {
    return EXTRACTION_PROMPTS.filter(p =>
      ['cro_patterns', 'ad_creative'].includes(p.category)
    )
  }
  
  // Default: all prompts
  return EXTRACTION_PROMPTS
}
```
- **Verify:** `npx tsc --noEmit`

#### Task 1.3: Extraction structuring (Gemini parses NLM output into KB entries)
- **File:** `lib/knowledge/extraction-structurer.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * Takes raw NotebookLM query responses and uses Gemini to structure them
 * into proper KnowledgeEntry objects.
 */
import { generateJSON } from '@/lib/llm/client'
import type { KnowledgeCategory, ContentLane, KnowledgeEntryInsert } from './types'

interface StructuredExtraction {
  entries: Array<{
    title: string
    subcategory: string
    content: string
    examples: string[]
    lanes: ContentLane[]
    tags: string[]
  }>
}

/**
 * Structure a raw NLM response into KnowledgeEntry objects.
 * Uses Gemini to parse the unstructured text into structured JSON.
 */
export async function structureExtraction(
  rawResponse: string,
  category: KnowledgeCategory,
  expectedLanes: ContentLane[],
  notebookTitle: string,
  notebookId: string,
  extractionVersion: string
): Promise<KnowledgeEntryInsert[]> {
  const systemPrompt = `You are a knowledge base structurer. You take raw research text and extract individual knowledge entries from it.

Each entry should be:
- ATOMIC: one concept, framework, or pattern per entry
- SPECIFIC: include exact examples, not vague descriptions  
- ACTIONABLE: someone should be able to use this entry to create content

Output valid JSON matching this schema:
{
  "entries": [
    {
      "title": "Human-readable name (e.g., 'The Iceberg Effect Hook')",
      "subcategory": "snake_case identifier (e.g., 'iceberg_effect')",
      "content": "Detailed explanation with structure/formula. Be thorough.",
      "examples": ["Exact example 1 (word-for-word)", "Exact example 2"],
      "lanes": ${JSON.stringify(expectedLanes)},
      "tags": ["relevant", "tags"]
    }
  ]
}

Rules:
- Extract EVERY distinct concept. Don't merge different frameworks into one entry.
- Examples must be SPECIFIC and EXACT — copy from the source, don't paraphrase.
- If the source mentions effectiveness data (percentages, metrics), include it in the content field.
- Subcategory should be a unique snake_case identifier for this specific concept.
- Tags should include: the category area, any platform names, any format types mentioned.`

  const userPrompt = `Category: ${category}
Source notebook: "${notebookTitle}"

Raw research text to structure:
---
${rawResponse}
---

Extract all distinct knowledge entries from this text. Be exhaustive.`

  const { data } = await generateJSON<StructuredExtraction>(systemPrompt, userPrompt)

  // Convert to KnowledgeEntryInsert objects
  return data.entries.map(entry => ({
    category,
    subcategory: entry.subcategory,
    lanes: entry.lanes.length > 0 ? entry.lanes : expectedLanes,
    title: entry.title,
    content: entry.content,
    examples: entry.examples,
    source: 'notebooklm' as const,
    source_detail: `${notebookTitle} (${notebookId})`,
    source_confidence: 'notebooklm_extracted' as const,
    extraction_version: extractionVersion,
    review_status: 'candidate' as const,
    reviewed_by: null,
    reviewed_at: null,
    min_sample_gate: expectedLanes.includes('youtube') ? 1 : expectedLanes.includes('ads') ? 2 : 3,
    tags: entry.tags,
    is_mandatory_first_read: false,
  }))
}
```
- **Verify:** `npx tsc --noEmit`

### Wave 2: API route + UI

#### Task 2.1: Extraction API route
- **File:** `app/api/knowledge/extract/route.ts`
- **Action:** Create
- **What to do:**
```typescript
/**
 * NotebookLM Extraction API
 * POST /api/knowledge/extract — run extraction on a notebook
 * GET /api/knowledge/extract/notebooks — list available notebooks
 */
import { NextRequest, NextResponse } from 'next/server'
import { listNotebooks, queryNotebook } from '@/lib/knowledge/nlm'
import { getPromptsForNotebook } from '@/lib/knowledge/extraction-prompts'
import { structureExtraction } from '@/lib/knowledge/extraction-structurer'
import { createKnowledgeEntry } from '@/app/actions/knowledge'
import type { KnowledgeCategory } from '@/lib/knowledge/types'

/** GET — list available notebooks */
export async function GET() {
  try {
    const notebooks = await listNotebooks()
    // Add suggested extraction categories per notebook
    const enriched = notebooks.map(nb => ({
      ...nb,
      suggestedPrompts: getPromptsForNotebook(nb.title).map(p => p.category),
    }))
    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list notebooks' },
      { status: 500 }
    )
  }
}

/** POST — run extraction */
export async function POST(request: NextRequest) {
  try {
    const { notebookId, notebookTitle, categories } = await request.json() as {
      notebookId: string
      notebookTitle: string
      categories: KnowledgeCategory[]
    }

    if (!notebookId || !categories || categories.length === 0) {
      return NextResponse.json(
        { error: 'notebookId and categories[] required' },
        { status: 400 }
      )
    }

    const extractionVersion = `extract_${Date.now()}`
    const prompts = getPromptsForNotebook(notebookTitle)
      .filter(p => categories.includes(p.category))

    const results: { category: string; entriesCreated: number; error?: string }[] = []

    // Process each category sequentially (to avoid overwhelming NLM)
    for (const prompt of prompts) {
      try {
        // Main query
        const response = await queryNotebook(notebookId, prompt.query)
        let fullResponse = response.answer

        // Follow-up queries if defined
        if (prompt.followUpQueries) {
          for (const followUp of prompt.followUpQueries) {
            try {
              const followUpResponse = await queryNotebook(
                notebookId, followUp, response.conversation_id
              )
              fullResponse += '\n\n---\n\n' + followUpResponse.answer
            } catch {
              // Follow-ups are optional — don't fail the whole extraction
              console.warn(`[Extract] Follow-up failed for ${prompt.category}`)
            }
          }
        }

        // Structure into KB entries via Gemini
        const entries = await structureExtraction(
          fullResponse,
          prompt.category,
          prompt.expectedLanes,
          notebookTitle,
          notebookId,
          extractionVersion
        )

        // Save all entries as candidates
        let created = 0
        for (const entry of entries) {
          try {
            await createKnowledgeEntry(entry)
            created++
          } catch (err) {
            console.warn(`[Extract] Failed to save entry: ${err}`)
          }
        }

        results.push({ category: prompt.category, entriesCreated: created })
      } catch (err) {
        results.push({ 
          category: prompt.category, 
          entriesCreated: 0, 
          error: err instanceof Error ? err.message : 'Extraction failed' 
        })
      }
    }

    return NextResponse.json({
      extractionVersion,
      notebookId,
      notebookTitle,
      results,
      totalCreated: results.reduce((sum, r) => sum + r.entriesCreated, 0),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    )
  }
}
```
- **Verify:** `npx tsc --noEmit`

#### Task 2.2: Extraction UI page
- **File:** `app/knowledge/extract/page.tsx`
- **Action:** Create
- **What to do:** Create a client component page for running extractions:
  1. **PageHeader**: title "Extract Knowledge", subtitle "Pull structured knowledge from NotebookLM notebooks"
  2. **Notebook list**: Fetch from `/api/knowledge/extract` (GET). Show each notebook as a card with title, source count, last updated, and suggested categories (chips).
  3. **Category selector**: For each notebook, checkboxes for which categories to extract. Pre-check the suggested ones.
  4. **Extract button**: POST to `/api/knowledge/extract` with selected notebook + categories. Show progress indicator.
  5. **Results panel**: After extraction, show: entries created per category, any errors, link to /knowledge to review candidates.
  6. **Warning banner**: "Extracted entries start as CANDIDATES. Review and approve them on the Knowledge Base page before they influence content generation."
  
  Match existing dashboard styling. Use the same patterns as other pages (createBrowserClient, useState, etc.).
- **Verify:** Page renders at `/knowledge/extract` without errors

#### Task 2.3: Extraction page styles
- **File:** `app/knowledge/extract/page.module.css`
- **Action:** Create
- **What to do:** CSS modules for the extraction page. Match dashboard aesthetic. Include styles for: notebook cards, category checkboxes, progress indicator, results panel, warning banner.
- **Verify:** Styles render correctly

#### Task 2.4: Add extraction link to sidebar + knowledge page
- **File:** `components/layout/Sidebar.tsx`
- **Action:** Modify
- **What to do:** Add "Extract Knowledge" as a sub-link under "Knowledge Base" in the sidebar nav. Use a Download or Sparkles icon from lucide-react.
- **Verify:** Link appears in sidebar

## Final Verification (EVIDENCE REQUIRED)
```bash
npx tsc --noEmit       # zero type errors — paste output
ls lib/knowledge/nlm.ts lib/knowledge/extraction-prompts.ts lib/knowledge/extraction-structurer.ts
ls app/api/knowledge/extract/route.ts app/knowledge/extract/page.tsx
```
⚠️ **"Build passes" without pasted output = rejected.**

## Commit
```bash
git add -A
git commit -m "feat(knowledge): add NotebookLM extraction pipeline with category-specific prompts"
```

## Build Report (5-point handoff — ALL required)
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-004.md`

## Output
- Branch: `feat/knowledge-base-schema` (same branch)
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-004.md`
- Notify: Dr. Strange via sessions_send (1-line: ✅ status + report path)
