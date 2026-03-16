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
