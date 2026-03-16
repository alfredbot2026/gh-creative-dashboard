/**
 * Generate Content Plan API Route
 * 
 * Pipeline:
 * 1. Optionally fetch fresh research from NotebookLM (viral hooks, strategy)
 * 2. Build prompt with full context (profile, past content, research, ads)
 * 3. LLM generates research-backed plan
 * 4. Preview or save to DB
 */
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/llm/client'
import { buildContentPlanPrompt, GeneratedPlan } from '@/lib/llm/prompts'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/generate-plan
 * Accepts: { weekStart?: string, save?: boolean }
 * Returns: generated plan with items
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}))

        // Default to current week's Sunday
        const today = new Date()
        const dayOfWeek = today.getDay()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - dayOfWeek)
        const weekStartStr = body.weekStart || weekStart.toISOString().split('T')[0]

        // -- Step 1: Pull fresh research from NotebookLM if available --
        let freshResearch: string | null = null
        try {
            const backendUrl = process.env.RESEARCH_BACKEND_URL || 'http://localhost:8000'

            // Query key notebooks for content-relevant insights
            // These are the notebooks that matter for content strategy
            const researchQueries = [
                { query: 'What are the top 5 viral content hooks and patterns right now?' },
                { query: 'What content formats and strategies drive the highest engagement?' },
            ]

            // Fire research queries in parallel — but don't block on failure
            const results = await Promise.allSettled(
                researchQueries.map(rq =>
                    fetch(`${backendUrl}/research/query`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(rq),
                        signal: AbortSignal.timeout(30000), // 30s timeout
                    }).then(r => r.ok ? r.json() : null)
                )
            )

            // Collect successful responses
            const researchTexts = results
                .filter((r): r is PromiseFulfilledResult<{ response: string }> =>
                    r.status === 'fulfilled' && r.value?.response
                )
                .map(r => r.value.response)

            if (researchTexts.length > 0) {
                freshResearch = researchTexts.join('\n\n---\n\n')
            }
        } catch {
            // NotebookLM not available — that's ok, we'll use saved insights
            console.log('[Generate Plan] NotebookLM not available, using saved insights only')
        }

        // -- Step 2: Build prompts with full context --
        const { systemPrompt, userPrompt } = await buildContentPlanPrompt(weekStartStr, freshResearch)

        // -- Step 3: Call LLM with fallback chain --
        const { data: plan, provider, model } = await generateJSON<GeneratedPlan>(
            systemPrompt,
            userPrompt
        )

        // Validate the response has items
        if (!plan.items || plan.items.length === 0) {
            return NextResponse.json(
                { error: 'LLM returned empty plan' },
                { status: 500 }
            )
        }

        // -- Step 4: Optionally save to database --
        if (body.save) {
            const supabase = await createClient()

            // Calculate week end
            const weekEndDate = new Date(weekStartStr)
            weekEndDate.setDate(weekEndDate.getDate() + 6)

            // Create content plan record (only columns that exist in schema)
            const { data: planRecord, error: planError } = await supabase
                .from('content_plans')
                .insert({
                    week_start: weekStartStr,
                    week_end: weekEndDate.toISOString().split('T')[0],
                    status: 'draft',
                })
                .select('id')
                .single()

            if (planError) throw new Error(planError.message)

            // Insert all content items with research refs
            const itemsToInsert = plan.items.map(item => ({
                plan_id: planRecord.id,
                title: item.title,
                content_type: item.content_type,
                platform: item.platform,
                scheduled_date: item.scheduled_date,
                status: 'planned',
                hook: item.hook,
                cta: item.cta,
                notes: item.reasoning,
                research_refs: item.research_refs, // jsonb column in DB
                ai_generated: true,
                generation_reasoning: item.reasoning,
                script_data: item.script_data || null, // production script (jsonb)
            }))

            const { error: itemsError } = await supabase
                .from('content_items')
                .insert(itemsToInsert)

            if (itemsError) throw new Error(itemsError.message)
        }

        return NextResponse.json({
            success: true,
            plan,
            provider,
            model,
            saved: body.save || false,
            usedFreshResearch: !!freshResearch,
        })
    } catch (error) {
        console.error('[Generate Plan Error]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Plan generation failed' },
            { status: 500 }
        )
    }
}
