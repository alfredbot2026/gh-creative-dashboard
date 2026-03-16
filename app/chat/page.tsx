/**
 * AI Chat Page — With Conversation History
 * Sidebar for browsing/switching conversations.
 * Messages loaded from DB, tools shown inline.
 */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import ChatSidebar from '@/components/chat/ChatSidebar'
import { Send, Bot, User, Loader2, Wrench, CheckCircle, XCircle } from 'lucide-react'
import styles from './page.module.css'

/* Tool call event from the API */
interface ToolCallEvent {
    toolName: string
    args: Record<string, unknown>
    result: unknown
}

/* Message with optional tool calls and metadata */
interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    provider?: string
    toolCalls?: ToolCallEvent[]
}

/* Friendly names for tools shown in UI */
const TOOL_LABELS: Record<string, string> = {
    create_content_item: '📝 Created content',
    update_content_item: '✏️ Updated content',
    delete_content_item: '🗑️ Deleted content',
    list_content_items: '📋 Listed calendar items',
    sync_meta_ads: '🔄 Synced Meta Ads',
    get_ad_performance: '📊 Checked ad performance',
    get_research_insights: '🔬 Retrieved research insights',
    trigger_research: '🧪 Ran research query',
    list_notebooks: '📚 Listed notebooks',
    update_business_profile: '⚙️ Updated business profile',
    generate_content_plan: '🗓️ Generated content plan',
}

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    /* Auto-scroll on new messages */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    /* Auto-focus input */
    useEffect(() => { inputRef.current?.focus() }, [conversationId])

    /* Load a conversation's messages from DB */
    const loadConversation = useCallback(async (id: string) => {
        setConversationId(id)
        setIsLoading(true)
        try {
            const res = await fetch(`/api/conversations/${id}`)
            const data = await res.json()

            if (data.messages) {
                // Map DB messages to our ChatMessage shape
                const mapped: ChatMessage[] = data.messages.map((m: {
                    role: string
                    content: string
                    metadata?: { provider?: string; tool_calls?: ToolCallEvent[] }
                }) => ({
                    role: m.role,
                    content: m.content,
                    provider: m.metadata?.provider,
                    toolCalls: m.metadata?.tool_calls,
                }))
                setMessages(mapped)
            }
        } catch (err) {
            console.error('Failed to load conversation:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /* Start a new conversation (clear messages, reset ID) */
    const handleNewConversation = useCallback(() => {
        setConversationId(null)
        setMessages([])
        inputRef.current?.focus()
    }, [])

    /* Send a message */
    const handleSend = useCallback(async () => {
        const trimmed = input.trim()
        if (!trimmed || isLoading) return

        const userMessage: ChatMessage = { role: 'user', content: trimmed }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    conversationId,
                }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Chat failed')

            // Update conversation ID if a new one was created
            if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId)
            }

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: data.reply,
                provider: data.provider,
                toolCalls: data.toolCalls,
            }
            setMessages(prev => [...prev, assistantMessage])
        } catch (err) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }, [input, isLoading, conversationId])

    /* Enter to send, Shift+Enter for newline */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <>
            <PageHeader
                title="AI Chat"
                subtitle="Mission Control agent — it can create content, sync ads, run research, and more"
            />

            <div className={styles.chatLayout}>
                {/* Sidebar — conversation history */}
                <ChatSidebar
                    activeConversationId={conversationId}
                    onSelectConversation={loadConversation}
                    onNewConversation={handleNewConversation}
                />

                {/* Main chat area */}
                <div className={styles.chatContainer}>
                    {/* Messages */}
                    <div className={styles.messages}>
                        {messages.length === 0 && (
                            <div className={styles.emptyState}>
                                <Bot size={40} />
                                <h3>Hey! I&apos;m your Mission Control AI.</h3>
                                <p>I don&apos;t just answer questions — I take action.</p>
                                <p>Try telling me:</p>
                                <div className={styles.suggestions}>
                                    {[
                                        'Create a reel about morning skincare for Monday',
                                        'Sync my Meta ads',
                                        'What content do we have this week?',
                                        'Generate a content plan for this week',
                                    ].map((suggestion, i) => (
                                        <button
                                            key={i}
                                            className={styles.suggestionChip}
                                            onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                                <div className={styles.messageIcon}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={styles.messageContent}>
                                    {/* Show tool calls before the response */}
                                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                                        <div className={styles.toolCallsContainer}>
                                            {msg.toolCalls.map((tc, j) => (
                                                <div key={j} className={styles.toolCall}>
                                                    <div className={styles.toolCallHeader}>
                                                        <Wrench size={12} />
                                                        <span>{TOOL_LABELS[tc.toolName] || tc.toolName}</span>
                                                        {typeof tc.result === 'object' && tc.result !== null && 'error' in (tc.result as Record<string, unknown>)
                                                            ? <XCircle size={12} className={styles.toolError} />
                                                            : <CheckCircle size={12} className={styles.toolSuccess} />
                                                        }
                                                    </div>
                                                    <div className={styles.toolCallResult}>
                                                        {formatToolResult(tc)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <pre className={styles.messageText}>{msg.content}</pre>
                                    {msg.provider && (
                                        <span className={styles.providerTag}>via {msg.provider}</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && messages.length > 0 && (
                            <div className={`${styles.message} ${styles.aiMessage}`}>
                                <div className={styles.messageIcon}><Bot size={16} /></div>
                                <div className={styles.messageContent}>
                                    <Loader2 size={16} className={styles.spinner} />
                                    <span className={styles.thinking}>Working on it...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className={styles.inputArea}>
                        <textarea
                            ref={inputRef}
                            className={styles.input}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Tell Mission Control what to do..."
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            className={styles.sendButton}
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

/* Format a tool result for display */
function formatToolResult(tc: ToolCallEvent): string {
    const result = tc.result
    if (typeof result === 'string') return result
    if (!result || typeof result !== 'object') return ''

    const r = result as Record<string, unknown>

    if (r.message) return r.message as string
    if (r.count !== undefined) return `${r.count} items found`
    if (r.synced !== undefined) return `${r.synced} campaigns synced`
    if (r.items && Array.isArray(r.items)) {
        return (r.items as Array<{ title?: string }>).map(i => i.title || 'Untitled').join(', ')
    }

    return JSON.stringify(result).slice(0, 100)
}
