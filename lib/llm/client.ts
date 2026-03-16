/**
 * Unified LLM Client
 * Fallback chain: Gemini → Moonshot → ZAI → DeepSeek
 * 
 * Gemini uses @google/genai SDK.
 * Moonshot, ZAI, DeepSeek use OpenAI-compatible REST endpoints.
 */

import { GoogleGenAI } from '@google/genai'

/* -- Provider configuration -- */
interface LLMProvider {
    name: string
    envKey: string
    endpoint?: string     // for OpenAI-compatible providers
    model: string
}

/* Ordered fallback chain */
const PROVIDERS: LLMProvider[] = [
    {
        name: 'Gemini',
        envKey: 'GEMINI_API_KEY',
        model: 'gemini-3-flash-preview',
    },
    {
        name: 'Moonshot',
        envKey: 'MOONSHOT_API_KEY',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'moonshot-v1-8k',
    },
    {
        name: 'ZAI',
        envKey: 'ZAI_API_KEY',
        endpoint: 'https://api.z.ai/v1/chat/completions',
        model: 'glm-5',
    },
    {
        name: 'DeepSeek',
        envKey: 'DEEPSEEK_API_KEY',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
    },
]

/* -- Response type -- */
export interface LLMResponse {
    content: string
    provider: string
    model: string
}

/**
 * Call Gemini via @google/genai SDK.
 */
async function callGemini(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    model: string
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
        },
    })

    const text = response.text
    if (!text) throw new Error('Gemini returned empty response')
    return text
}

/**
 * Call OpenAI-compatible provider (Moonshot, ZAI, DeepSeek).
 */
async function callOpenAICompatible(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    endpoint: string,
    model: string
): Promise<string> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Provider returned empty response')
    return content
}

/**
 * Generate content using the LLM fallback chain.
 * Tries each provider in order until one succeeds.
 */
export async function generateContent(
    systemPrompt: string,
    userPrompt: string
): Promise<LLMResponse> {
    const errors: string[] = []

    for (const provider of PROVIDERS) {
        const apiKey = process.env[provider.envKey]

        // Skip if no API key configured
        if (!apiKey) {
            errors.push(`${provider.name}: no API key (${provider.envKey})`)
            continue
        }

        try {
            let content: string

            if (provider.name === 'Gemini') {
                // Use Gemini SDK
                content = await callGemini(systemPrompt, userPrompt, apiKey, provider.model)
            } else {
                // Use OpenAI-compatible REST
                content = await callOpenAICompatible(
                    systemPrompt,
                    userPrompt,
                    apiKey,
                    provider.endpoint!,
                    provider.model
                )
            }

            // Success — return result
            return {
                content,
                provider: provider.name,
                model: provider.model,
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`${provider.name}: ${msg}`)
            // Continue to next provider
            console.warn(`[LLM] ${provider.name} failed: ${msg}`)
        }
    }

    // All providers failed
    throw new Error(`All LLM providers failed:\n${errors.join('\n')}`)
}

/**
 * Generate content and parse as JSON.
 * Strips markdown code fences if present.
 */
export async function generateJSON<T>(
    systemPrompt: string,
    userPrompt: string
): Promise<{ data: T; provider: string; model: string }> {
    const response = await generateContent(systemPrompt, userPrompt)

    // Strip markdown code fences (```json ... ```)
    let cleaned = response.content.trim()
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
    }

    try {
        const data = JSON.parse(cleaned) as T
        return { data, provider: response.provider, model: response.model }
    } catch {
        throw new Error(`Failed to parse LLM response as JSON: ${cleaned.slice(0, 200)}...`)
    }
}

/* ========================================================
   AGENTIC MODE — Gemini Function Calling
   ======================================================== */

/* Tool call result for the conversation */
export interface ToolCallEvent {
    toolName: string
    args: Record<string, unknown>
    result: unknown
}

/* Agentic response includes text + tool calls made */
export interface AgenticResponse {
    content: string
    provider: string
    model: string
    toolCalls: ToolCallEvent[]
}

/**
 * Generate with tool calling (Gemini only).
 * Handles the agentic loop: LLM requests tool → execute → return result → repeat.
 * Falls back to plain text generation if Gemini is unavailable.
 * 
 * @param systemPrompt - System context for the AI
 * @param userPrompt - User's message (with conversation history)
 * @param toolDeclarations - Tool schemas for Gemini
 * @param toolExecutor - Function that executes tool calls
 * @param maxIterations - Max tool call rounds (prevent infinite loops)
 */
export async function generateWithTools(
    systemPrompt: string,
    userPrompt: string,
    toolDeclarations: Array<{ name: string; description: string; parameters: Record<string, unknown> }>,
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>,
    maxIterations: number = 5
): Promise<AgenticResponse> {
    const apiKey = process.env.GEMINI_API_KEY
    const toolCalls: ToolCallEvent[] = []

    // If no Gemini key, fall back to plain text
    if (!apiKey) {
        const response = await generateContent(systemPrompt, userPrompt)
        return { ...response, toolCalls: [] }
    }

    const ai = new GoogleGenAI({ apiKey })

    // Build Gemini tools format
    const tools = [{
        functionDeclarations: toolDeclarations.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        })),
    }]

    // Build contents array with conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contents: any[] = [
        { role: 'user', parts: [{ text: userPrompt }] },
    ]

    // Agentic loop — LLM may request tools multiple times
    for (let i = 0; i < maxIterations; i++) {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                tools,
            },
        })

        const candidate = response.candidates?.[0]
        if (!candidate) throw new Error('Gemini returned no candidates')

        const parts = candidate.content?.parts || []

        // Check if the model wants to call functions
        const functionCalls = parts.filter(
            (p: { functionCall?: unknown }) => p.functionCall
        )

        // If no function calls, extract final text and return
        if (functionCalls.length === 0) {
            const textParts = parts
                .filter((p: { text?: string }) => p.text)
                .map((p: { text?: string }) => p.text)
                .join('')

            return {
                content: textParts || 'Done!',
                provider: 'Gemini',
                model: 'gemini-3-flash-preview',
                toolCalls,
            }
        }

        // Execute each function call
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const functionResponses: any[] = []

        for (const part of functionCalls) {
            const fc = part.functionCall as { name: string; args: Record<string, unknown> }
            const toolName = fc.name
            const toolArgs = fc.args || {}

            // Execute the tool
            const result = await toolExecutor(toolName, toolArgs)

            // Track the tool call
            toolCalls.push({ toolName, args: toolArgs, result: result.data || result.error })

            // Build function response for Gemini
            functionResponses.push({
                functionResponse: {
                    name: toolName,
                    response: result,
                },
            })
        }

        // Add model's response (with function calls) and our function responses to history
        contents.push({ role: 'model', parts })
        contents.push({ role: 'user', parts: functionResponses })
    }

    // Max iterations reached — return what we have
    return {
        content: 'I completed the actions above. Let me know if you need anything else!',
        provider: 'Gemini',
        model: 'gemini-3-flash-preview',
        toolCalls,
    }
}

