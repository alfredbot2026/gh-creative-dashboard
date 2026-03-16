/**
 * Agentic Tool Definitions
 * Defines what actions the AI can take via Gemini function calling.
 * Each tool has: declaration (schema for the LLM) + executor (server-side logic).
 */

import { createClient } from '@/lib/supabase/server'
import {
    createContentItem,
    updateContentItem,
    deleteContentItem,
} from '@/app/actions/content'
import { upsertBusinessProfile } from '@/app/actions/settings'
import { fetchCampaignInsights, fetchAdCreatives, parseROAS, parseConversions } from '@/lib/meta/client'

/* ========================================================
   TOOL DECLARATIONS — JSON schemas for Gemini
   ======================================================== */

export const TOOL_DECLARATIONS = [
    {
        name: 'create_content_item',
        description: 'Create a new content item on the calendar. Use when the user asks to add, schedule, or create new content.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the content' },
                content_type: { type: 'string', enum: ['reel', 'youtube', 'ad', 'story', 'carousel', 'post'], description: 'Type of content' },
                platform: { type: 'string', enum: ['instagram', 'youtube', 'tiktok', 'facebook'], description: 'Platform to post on' },
                scheduled_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                hook: { type: 'string', description: 'Opening hook for the content' },
                cta: { type: 'string', description: 'Call to action' },
                notes: { type: 'string', description: 'Additional notes' },
            },
            required: ['title', 'content_type', 'platform', 'scheduled_date'],
        },
    },
    {
        name: 'update_content_item',
        description: 'Edit an existing content item. Use when the user asks to change, update, or modify content.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'ID of the content item to update' },
                title: { type: 'string' },
                content_type: { type: 'string', enum: ['reel', 'youtube', 'ad', 'story', 'carousel', 'post'] },
                platform: { type: 'string', enum: ['instagram', 'youtube', 'tiktok', 'facebook'] },
                scheduled_date: { type: 'string' },
                status: { type: 'string', enum: ['planned', 'in_progress', 'created', 'published'] },
                hook: { type: 'string' },
                cta: { type: 'string' },
                notes: { type: 'string' },
            },
            required: ['id'],
        },
    },
    {
        name: 'delete_content_item',
        description: 'Delete a content item from the calendar.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'ID of the content item to delete' },
            },
            required: ['id'],
        },
    },
    {
        name: 'list_content_items',
        description: 'List content items on the calendar. Use to see what is scheduled.',
        parameters: {
            type: 'object',
            properties: {
                start_date: { type: 'string', description: 'Start date (YYYY-MM-DD). Defaults to start of current week.' },
                end_date: { type: 'string', description: 'End date (YYYY-MM-DD). Defaults to end of current week.' },
            },
        },
    },
    {
        name: 'sync_meta_ads',
        description: 'Pull the latest ad performance data from Meta/Facebook Ads. Use when the user asks to sync, refresh, or update ad data.',
        parameters: {
            type: 'object',
            properties: {
                date_preset: { type: 'string', enum: ['last_7d', 'last_14d', 'last_30d', 'this_month'], description: 'Time range for ad data. Defaults to last_7d.' },
            },
        },
    },
    {
        name: 'get_ad_performance',
        description: 'Get ad performance data. Use when the user asks about ads, ROAS, CTR, conversions, or spend.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Max number of ads to return. Defaults to 10.' },
                sort_by: { type: 'string', enum: ['roas', 'spend', 'ctr', 'conversions'], description: 'Sort by metric. Defaults to roas.' },
            },
        },
    },
    {
        name: 'get_research_insights',
        description: 'Get research insights from the database. Use when the user asks about research, insights, or findings.',
        parameters: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'Filter by topic (optional)' },
                limit: { type: 'number', description: 'Max results. Defaults to 10.' },
            },
        },
    },
    {
        name: 'trigger_research',
        description: 'Run a research query via NotebookLM. Use when the user asks to research a topic, analyze competitors, or find best practices. Always list_notebooks first to find available notebooks.',
        parameters: {
            type: 'object',
            properties: {
                notebook_id: { type: 'string', description: 'Name or ID of the notebook to query (e.g. "P2P Conversion Playbook"). Optional — uses first notebook if not specified.' },
                query: { type: 'string', description: 'Research question to ask' },
            },
            required: ['query'],
        },
    },
    {
        name: 'list_notebooks',
        description: 'List available NotebookLM notebooks. Use when the user asks what notebooks or research sources are available.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'update_business_profile',
        description: 'Update the business profile settings. Use when the user asks to change business info, target audience, brand voice, etc.',
        parameters: {
            type: 'object',
            properties: {
                business_name: { type: 'string' },
                industry: { type: 'string' },
                target_audience: { type: 'string' },
                brand_voice: { type: 'string' },
                products_services: { type: 'array', items: { type: 'string' } },
                unique_selling_points: { type: 'array', items: { type: 'string' } },
                content_pillars: { type: 'array', items: { type: 'string' } },
                platforms: { type: 'array', items: { type: 'string' } },
                competitors: { type: 'array', items: { type: 'string' } },
                notes: { type: 'string' },
            },
        },
    },
    {
        name: 'generate_content_plan',
        description: 'Generate a full weekly content plan using AI. Items are research-backed. Use when the user asks to plan content for the week.',
        parameters: {
            type: 'object',
            properties: {
                week_start: { type: 'string', description: 'Week start date (YYYY-MM-DD). Defaults to current week.' },
                save: { type: 'boolean', description: 'Whether to save items to the calendar. Defaults to false (preview only).' },
            },
        },
    },
]

/* ========================================================
   TOOL EXECUTORS — Server-side logic for each tool
   ======================================================== */

// Result type for all tool executions
export interface ToolResult {
    success: boolean
    data?: unknown
    error?: string
}

/**
 * Execute a tool by name with given arguments.
 * Returns structured result for the LLM to interpret.
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
        switch (name) {

            case 'create_content_item': {
                await createContentItem({
                    title: args.title as string,
                    content_type: args.content_type as string,
                    platform: args.platform as string,
                    scheduled_date: args.scheduled_date as string,
                    status: 'planned',
                    hook: args.hook as string | undefined,
                    cta: args.cta as string | undefined,
                    notes: args.notes as string | undefined,
                })
                return { success: true, data: { message: `Created "${args.title}" on ${args.scheduled_date}` } }
            }

            case 'update_content_item': {
                const { id, ...updates } = args
                await updateContentItem(id as string, updates)
                return { success: true, data: { message: `Updated content item` } }
            }

            case 'delete_content_item': {
                await deleteContentItem(args.id as string)
                return { success: true, data: { message: `Deleted content item` } }
            }

            case 'list_content_items': {
                const supabase = await createClient()
                // Default to current week
                const today = new Date()
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - today.getDay())
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)

                const startDate = (args.start_date as string) || weekStart.toISOString().split('T')[0]
                const endDate = (args.end_date as string) || weekEnd.toISOString().split('T')[0]

                const { data, error } = await supabase
                    .from('content_items')
                    .select('id, title, content_type, platform, scheduled_date, status, hook, cta')
                    .gte('scheduled_date', startDate)
                    .lte('scheduled_date', endDate)
                    .order('scheduled_date', { ascending: true })

                if (error) throw new Error(error.message)
                return { success: true, data: { items: data, count: data?.length || 0, range: `${startDate} to ${endDate}` } }
            }

            case 'sync_meta_ads': {
                const datePreset = (args.date_preset as string) || 'last_7d'
                const [insights, creatives] = await Promise.all([
                    fetchCampaignInsights(datePreset),
                    fetchAdCreatives(),
                ])

                // Upsert into Supabase
                const supabase = await createClient()
                let synced = 0
                const creativeMap = new Map(creatives.map(c => [c.name || '', c]))

                for (const insight of insights) {
                    const roas = parseROAS(insight.purchase_roas)
                    const conversions = parseConversions(insight.actions)
                    const creative = creativeMap.get(insight.ad_name || '')

                    await supabase.from('ad_performance').upsert({
                        campaign_name: insight.campaign_name,
                        ad_name: insight.ad_name || 'Unknown',
                        spend: parseFloat(insight.spend),
                        roas,
                        ctr: parseFloat(insight.ctr),
                        conversions,
                        impressions: parseInt(insight.impressions),
                        clicks: parseInt(insight.clicks),
                        status: roas >= 3 ? 'scaling' : roas >= 1.5 ? 'active' : 'monitoring',
                        creative_type: creative?.video_id ? 'video' : creative?.image_url ? 'image' : null,
                        ad_copy: creative?.body || null,
                        headline: creative?.title || null,
                        cta_type: creative?.call_to_action_type || null,
                    }, { onConflict: 'campaign_name,ad_name' })
                    synced++
                }

                return { success: true, data: { synced, creatives: creatives.length, date_preset: datePreset } }
            }

            case 'get_ad_performance': {
                const supabase = await createClient()
                const limit = (args.limit as number) || 10
                const sortBy = (args.sort_by as string) || 'roas'

                const { data, error } = await supabase
                    .from('ad_performance')
                    .select('campaign_name, ad_name, spend, roas, ctr, conversions, status, ad_copy, headline, cta_type, creative_type')
                    .order(sortBy, { ascending: false })
                    .limit(limit)

                if (error) throw new Error(error.message)
                return { success: true, data: { ads: data, count: data?.length || 0 } }
            }

            case 'get_research_insights': {
                const supabase = await createClient()
                const limit = (args.limit as number) || 10

                let query = supabase
                    .from('research_insights')
                    .select('topic, title, content, actionable_takeaways, created_at')
                    .order('created_at', { ascending: false })
                    .limit(limit)

                if (args.topic) {
                    query = query.eq('topic', args.topic as string)
                }

                const { data, error } = await query
                if (error) throw new Error(error.message)
                return { success: true, data: { insights: data, count: data?.length || 0 } }
            }

            case 'trigger_research': {
                // Proxy to local Python backend
                const backendUrl = process.env.RESEARCH_BACKEND_URL || 'http://localhost:8000'
                const response = await fetch(`${backendUrl}/research/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook_id: args.notebook_id,
                        query: args.query,
                    }),
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    return { success: false, error: `Research backend error: ${errorText}` }
                }

                const result = await response.json()
                return { success: true, data: result }
            }

            case 'list_notebooks': {
                const backendUrl = process.env.RESEARCH_BACKEND_URL || 'http://localhost:8000'
                const response = await fetch(`${backendUrl}/notebooks`)

                if (!response.ok) {
                    return { success: false, error: 'Research backend not running. Start it with: cd backend && python main.py' }
                }

                const result = await response.json()
                return { success: true, data: result }
            }

            case 'update_business_profile': {
                // Fetch current profile, merge updates
                const supabase = await createClient()
                const { data: current } = await supabase
                    .from('business_profile')
                    .select('*')
                    .limit(1)
                    .single()

                const merged = {
                    business_name: (args.business_name as string) || current?.business_name || '',
                    industry: (args.industry as string) || current?.industry || '',
                    target_audience: (args.target_audience as string) || current?.target_audience || '',
                    brand_voice: (args.brand_voice as string) || current?.brand_voice || '',
                    products_services: (args.products_services as string[]) || current?.products_services || [],
                    unique_selling_points: (args.unique_selling_points as string[]) || current?.unique_selling_points || [],
                    content_pillars: (args.content_pillars as string[]) || current?.content_pillars || [],
                    platforms: (args.platforms as string[]) || current?.platforms || [],
                    competitors: (args.competitors as string[]) || current?.competitors || [],
                    notes: (args.notes as string) || current?.notes || '',
                }

                await upsertBusinessProfile(merged)
                return { success: true, data: { message: 'Business profile updated' } }
            }

            case 'generate_content_plan': {
                // Call the generate-plan pipeline internally
                const { buildContentPlanPrompt } = await import('@/lib/llm/prompts')
                const { generateJSON } = await import('@/lib/llm/client')

                const today = new Date()
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - today.getDay())
                const weekStartStr = (args.week_start as string) || weekStart.toISOString().split('T')[0]

                const { systemPrompt, userPrompt } = await buildContentPlanPrompt(weekStartStr)

                // Use a simple inline type for the plan shape
                interface PlanResult { week_summary: string; items: Array<{ title: string; content_type: string; platform: string; hook: string; cta: string; scheduled_date: string; reasoning: string; research_refs: string[] }> }
                const { data: plan } = await generateJSON<PlanResult>(systemPrompt, userPrompt)

                // Auto-save if requested
                if (args.save && plan.items) {
                    const supabase = await createClient()
                    const { data: planRecord } = await supabase
                        .from('content_plans')
                        .insert({ week_start: weekStartStr, status: 'draft' })
                        .select('id')
                        .single()

                    if (planRecord) {
                        const items = plan.items.map(item => ({
                            plan_id: planRecord.id,
                            title: item.title,
                            content_type: item.content_type,
                            platform: item.platform,
                            scheduled_date: item.scheduled_date,
                            status: 'planned',
                            hook: item.hook,
                            cta: item.cta,
                            ai_generated: true,
                            generation_reasoning: item.reasoning,
                        }))
                        await supabase.from('content_items').insert(items)
                    }
                }

                return { success: true, data: plan }
            }

            default:
                return { success: false, error: `Unknown tool: ${name}` }
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Tool Error] ${name}:`, msg)
        return { success: false, error: msg }
    }
}
