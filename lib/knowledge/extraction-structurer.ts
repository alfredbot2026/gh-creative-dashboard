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
