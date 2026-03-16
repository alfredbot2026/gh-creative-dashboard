/**
 * Chat API Route (Agentic Mode) — Conversation-Aware
 * Now threads messages under a conversation_id.
 * Loads history from DB, not from the frontend.
 * Auto-titles conversations after first exchange.
 */
import { createClient } from '@/lib/supabase/server'
import { generateWithTools } from '@/lib/llm/client'
import { generateContent } from '@/lib/llm/client'
import { TOOL_DECLARATIONS, executeTool } from '@/lib/llm/tools'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Build system prompt with full business context.
 * Pulls data from 4 Supabase tables for rich context.
 */
async function buildAgenticSystemPrompt(): Promise<string> {
    const supabase = await createClient()

    // Fetch all context in parallel
    const [profileRes, contentRes, insightsRes, adsRes] = await Promise.all([
        supabase.from('business_profile').select('*').limit(1).single(),
        supabase.from('content_items')
            .select('title, content_type, platform, scheduled_date, status, hook')
            .gte('scheduled_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('scheduled_date', { ascending: false })
            .limit(30),
        supabase.from('research_insights')
            .select('topic, title, content, actionable_takeaways')
            .order('created_at', { ascending: false })
            .limit(10),
        supabase.from('ad_performance')
            .select('campaign_name, ad_name, spend, roas, ctr, status, ad_copy')
            .order('roas', { ascending: false })
            .limit(5),
    ])

    const profile = profileRes.data
    const recentContent = contentRes.data
    const insights = insightsRes.data
    const topAds = adsRes.data

    // Build the system prompt
    let prompt = `You are Mission Control AI — an agentic content strategy assistant.
You don't just answer questions. You TAKE ACTIONS using your tools.

TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

BEHAVIOR RULES:
1. When the user asks you to create, schedule, or add content — USE the create_content_item tool.
2. When asked about ads — USE get_ad_performance to get real data, don't make things up.
3. When asked to sync or refresh data — USE sync_meta_ads.
4. When asked to research — USE trigger_research or get_research_insights.
5. When asked to plan content — USE generate_content_plan.
6. Always confirm what you did after taking action.
7. Be concise and actionable. Speak like a smart creative director.
8. NEVER refuse to act. If the user wants something done, do it.`

    // Add business context
    if (profile) {
        prompt += `\n\n## BUSINESS PROFILE
- Business: ${profile.business_name}
- Industry: ${profile.industry}
- Audience: ${profile.target_audience}
- Voice: ${profile.brand_voice}
- Pillars: ${JSON.stringify(profile.content_pillars)}
- Products: ${JSON.stringify(profile.products_services)}
- Platforms: ${JSON.stringify(profile.platforms)}`
    }

    // Add content memory
    if (recentContent && recentContent.length > 0) {
        prompt += `\n\n## RECENT CONTENT (avoid duplicates)
${recentContent.map(c => `- [${c.content_type}] "${c.title}" (${c.status}) ${c.scheduled_date}`).join('\n')}`
    }

    // Add research context
    if (insights && insights.length > 0) {
        prompt += `\n\n## RESEARCH INSIGHTS
${insights.map(i => `- [${i.topic}] ${i.title}`).join('\n')}`
    }

    // Add ad context
    if (topAds && topAds.length > 0) {
        prompt += `\n\n## TOP ADS
${topAds.map(a => `- ${a.campaign_name}: ROAS ${a.roas}x, ${a.status}`).join('\n')}`
    }

    return prompt
}

/**
 * Load conversation history from database.
 * Returns formatted string for the LLM.
 */
async function loadConversationHistory(conversationId: string): Promise<string> {
    const supabase = await createClient()

    const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(40) // reasonable context window

    if (!messages || messages.length === 0) return ''

    return 'Previous conversation:\n' +
        messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n') +
        '\n\n'
}

/**
 * Auto-generate a title for the conversation after first exchange.
 * Uses a quick LLM call with minimal tokens.
 */
async function autoTitleConversation(conversationId: string, userMessage: string, aiReply: string) {
    try {
        const response = await generateContent(
            'Generate a short title (max 6 words) for this conversation. Return ONLY the title text, nothing else.',
            `User: ${userMessage}\nAI: ${aiReply.slice(0, 200)}`
        )

        const title = response.content.trim().replace(/^["']|["']$/g, '') // strip quotes
        const supabase = await createClient()
        await supabase
            .from('chat_conversations')
            .update({ title })
            .eq('id', conversationId)
    } catch {
        // Non-critical — title stays as "New conversation"
        console.warn('[Chat] Auto-title failed')
    }
}

/**
 * POST /api/chat
 * Accepts: { message: string, conversationId?: string }
 * Returns: { reply, provider, toolCalls[], conversationId }
 */
export async function POST(request: NextRequest) {
    try {
        const { message, conversationId: existingConvId } = await request.json()

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        const supabase = await createClient()
        let conversationId = existingConvId
        let isFirstMessage = false

        // Create conversation if none provided
        if (!conversationId) {
            const { data: newConv, error: convError } = await supabase
                .from('chat_conversations')
                .insert({ title: 'New conversation' })
                .select('id')
                .single()

            if (convError) throw new Error(convError.message)
            conversationId = newConv.id
            isFirstMessage = true
        } else {
            // Check if this is the first message in existing conversation
            const { count } = await supabase
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)

            isFirstMessage = (count || 0) === 0
        }

        // Build system prompt with full context
        const systemPrompt = await buildAgenticSystemPrompt()

        // Load conversation history from DB
        const history = await loadConversationHistory(conversationId)
        const userPrompt = history + `User: ${message}`

        // Call LLM with agentic tool calling
        const response = await generateWithTools(
            systemPrompt,
            userPrompt,
            TOOL_DECLARATIONS,
            executeTool,
            5
        )

        // Save both messages to the conversation
        await supabase.from('chat_messages').insert([
            {
                conversation_id: conversationId,
                role: 'user',
                content: message,
            },
            {
                conversation_id: conversationId,
                role: 'assistant',
                content: response.content,
                metadata: {
                    provider: response.provider,
                    model: response.model,
                    tool_calls: response.toolCalls,
                },
            },
        ])

        // Update conversation timestamp
        await supabase
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId)

        // Auto-title on first exchange (non-blocking)
        if (isFirstMessage) {
            autoTitleConversation(conversationId, message, response.content)
        }

        return NextResponse.json({
            reply: response.content,
            provider: response.provider,
            model: response.model,
            toolCalls: response.toolCalls,
            conversationId,
        })
    } catch (error) {
        console.error('[Chat API Error]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        )
    }
}
