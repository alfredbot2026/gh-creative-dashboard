/**
 * Chat Sidebar — Conversation History
 * Lists past conversations like ChatGPT/Gemini.
 * Supports new chat, switching, and deleting conversations.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import styles from './ChatSidebar.module.css'

/* Conversation shape from the API */
interface Conversation {
    id: string
    title: string
    summary: string | null
    created_at: string
    updated_at: string
}

interface ChatSidebarProps {
    activeConversationId: string | null
    onSelectConversation: (id: string) => void
    onNewConversation: () => void
}

export default function ChatSidebar({
    activeConversationId,
    onSelectConversation,
    onNewConversation,
}: ChatSidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)

    /* Fetch conversations from API */
    const loadConversations = useCallback(async () => {
        try {
            const res = await fetch('/api/conversations')
            const data = await res.json()
            setConversations(data.conversations || [])
        } catch (err) {
            console.error('Failed to load conversations:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    /* Load on mount and when active conversation changes */
    useEffect(() => {
        loadConversations()
    }, [loadConversations, activeConversationId])

    /* Delete a conversation */
    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation() // don't trigger select
        if (!confirm('Delete this conversation?')) return

        try {
            await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
            setConversations(prev => prev.filter(c => c.id !== id))
            // If we just deleted the active one, trigger new chat
            if (id === activeConversationId) {
                onNewConversation()
            }
        } catch (err) {
            console.error('Failed to delete:', err)
        }
    }

    /* Format relative time (e.g., "2h ago", "Yesterday") */
    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        if (days === 1) return 'Yesterday'
        if (days < 7) return `${days}d ago`
        return new Date(dateStr).toLocaleDateString()
    }

    return (
        <div className={styles.sidebar}>
            {/* New Chat button */}
            <button className={styles.newChatButton} onClick={onNewConversation}>
                <Plus size={16} />
                New Chat
            </button>

            {/* Conversation list */}
            <div className={styles.conversationList}>
                {loading ? (
                    <div className={styles.loadingState}>Loading...</div>
                ) : conversations.length === 0 ? (
                    <div className={styles.emptyState}>No conversations yet</div>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`${styles.conversationItem} ${conv.id === activeConversationId ? styles.active : ''}`}
                            onClick={() => onSelectConversation(conv.id)}
                        >
                            <MessageSquare size={14} className={styles.convIcon} />
                            <div className={styles.convInfo}>
                                <span className={styles.convTitle}>{conv.title}</span>
                                <span className={styles.convTime}>{formatTime(conv.updated_at)}</span>
                            </div>
                            <button
                                className={styles.deleteButton}
                                onClick={(e) => handleDelete(e, conv.id)}
                                title="Delete conversation"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
