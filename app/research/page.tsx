/**
 * Research Hub Page — Interactive
 * Browse notebooks, run research queries, save insights.
 * Client component with full CRUD on research data.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PageHeader from '@/components/ui/PageHeader'
import { BookOpen, Tag, Search, Send, Save, Loader2, ChevronDown, Trash2 } from 'lucide-react'
import styles from './page.module.css'

/* Notebook shape from Python backend */
interface Notebook {
    id: string
    title: string
}

/* Insight shape from Supabase */
interface Insight {
    id: string
    topic: string
    title: string
    content: string
    source?: string
    actionable_takeaways?: string[]
    tags?: string[]
    created_at: string
}

export default function ResearchPage() {
    // Notebooks + query state
    const [notebooks, setNotebooks] = useState<Notebook[]>([])
    const [selectedNotebook, setSelectedNotebook] = useState('')
    const [query, setQuery] = useState('')
    const [querying, setQuerying] = useState(false)
    const [queryResult, setQueryResult] = useState<string | null>(null)

    // Save-to-insight state
    const [savingInsight, setSavingInsight] = useState(false)
    const [savedMessage, setSavedMessage] = useState<string | null>(null)

    // Insights list
    const [insights, setInsights] = useState<Insight[]>([])
    const [activeFilter, setActiveFilter] = useState('all')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    /* Fetch notebooks from Python backend */
    const fetchNotebooks = useCallback(async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_RESEARCH_BACKEND_URL || 'http://localhost:8000'
            const res = await fetch(`${backendUrl}/notebooks`)
            if (!res.ok) return
            const data = await res.json()
            setNotebooks(data.notebooks || [])
        } catch {
            // Backend not running — that's ok
            console.warn('Research backend not available')
        }
    }, [])

    /* Fetch insights from Supabase */
    const fetchInsights = useCallback(async () => {
        const { data } = await supabase
            .from('research_insights')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setInsights(data)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchNotebooks()
        fetchInsights()
    }, [fetchNotebooks, fetchInsights])

    /* Run a research query against a notebook */
    const handleQuery = async () => {
        if (!query.trim()) return
        setQuerying(true)
        setQueryResult(null)
        setSavedMessage(null)

        try {
            const backendUrl = process.env.NEXT_PUBLIC_RESEARCH_BACKEND_URL || 'http://localhost:8000'
            const res = await fetch(`${backendUrl}/research/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notebook_id: selectedNotebook || undefined,
                    query: query.trim(),
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Query failed')
            }

            const data = await res.json()
            setQueryResult(data.response)
        } catch (err) {
            setQueryResult(`Error: ${err instanceof Error ? err.message : 'Query failed'}`)
        } finally {
            setQuerying(false)
        }
    }

    /* Save current query result as a research insight */
    const handleSaveInsight = async () => {
        if (!queryResult || !query) return
        setSavingInsight(true)

        try {
            const { error } = await supabase
                .from('research_insights')
                .insert({
                    topic: 'research',
                    title: query.slice(0, 100),
                    content: queryResult,
                    source: selectedNotebook
                        ? notebooks.find(n => n.id === selectedNotebook)?.title || 'NotebookLM'
                        : 'NotebookLM',
                    actionable_takeaways: [],
                })

            if (error) throw new Error(error.message)
            setSavedMessage('✅ Saved to insights!')
            await fetchInsights()
        } catch (err) {
            setSavedMessage(`❌ ${err instanceof Error ? err.message : 'Save failed'}`)
        } finally {
            setSavingInsight(false)
        }
    }

    /* Filter insights by topic */
    const filteredInsights = activeFilter === 'all'
        ? insights
        : insights.filter(i => i.topic === activeFilter)

    /* Delete an insight */
    const handleDeleteInsight = async (id: string) => {
        const { error } = await supabase
            .from('research_insights')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Failed to delete insight')
            return
        }
        await fetchInsights()
    }

    /* Get unique topics for filter pills */
    const topicCounts: Record<string, number> = {}
    insights.forEach(i => {
        topicCounts[i.topic] = (topicCounts[i.topic] || 0) + 1
    })
    const topics = ['all', ...Object.keys(topicCounts)]

    return (
        <>
            <PageHeader
                title="Research Hub"
                subtitle="Query NotebookLM notebooks and manage research insights"
            />

            {/* Research Query Section */}
            <div className={styles.querySection}>
                <div className={styles.queryHeader}>
                    <Search size={16} />
                    <span>Run Research Query</span>
                </div>

                <div className={styles.queryForm}>
                    {/* Notebook selector */}
                    <div className={styles.selectWrapper}>
                        <select
                            className={styles.notebookSelect}
                            value={selectedNotebook}
                            onChange={e => setSelectedNotebook(e.target.value)}
                        >
                            <option value="">All Notebooks (auto)</option>
                            {notebooks.map(nb => (
                                <option key={nb.id} value={nb.id}>{nb.title || 'Untitled'}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className={styles.selectIcon} />
                    </div>

                    {/* Query input + send */}
                    <div className={styles.queryInputRow}>
                        <input
                            className={styles.queryInput}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleQuery()}
                            placeholder="What do you want to research?"
                            disabled={querying}
                        />
                        <button
                            className={styles.queryButton}
                            onClick={handleQuery}
                            disabled={querying || !query.trim()}
                        >
                            {querying ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
                        </button>
                    </div>
                </div>

                {/* Query result */}
                {queryResult && (
                    <div className={styles.queryResult}>
                        <pre className={styles.resultText}>{queryResult}</pre>
                        <div className={styles.resultActions}>
                            {savedMessage && <span className={styles.savedMsg}>{savedMessage}</span>}
                            <button
                                className={styles.saveButton}
                                onClick={handleSaveInsight}
                                disabled={savingInsight}
                            >
                                {savingInsight ? <Loader2 size={12} className={styles.spinner} /> : <Save size={12} />}
                                Save as Insight
                            </button>
                        </div>
                    </div>
                )}

                {notebooks.length === 0 && (
                    <p className={styles.backendWarning}>
                        ⚠️ Research backend not connected. Start it: <code>cd backend && python main.py</code>
                    </p>
                )}
            </div>

            {/* Topic filter pills */}
            <div className={styles.filters}>
                {topics.map(topic => (
                    <button
                        key={topic}
                        className={`${styles.filterPill} ${topic === activeFilter ? styles.activeFilter : ''}`}
                        onClick={() => setActiveFilter(topic)}
                    >
                        {topic === 'all' ? 'All' : topic}
                        {topic !== 'all' && topicCounts[topic] && (
                            <span className={styles.filterCount}>{topicCounts[topic]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Insights list */}
            {filteredInsights.length > 0 ? (
                <div className={styles.insightsGrid}>
                    {filteredInsights.map(insight => (
                        <article key={insight.id} className={styles.insightCard}>
                            <div className={styles.cardTop}>
                                <span className={styles.topicTag}>
                                    <Tag size={12} />
                                    {insight.topic}
                                </span>
                                <div className={styles.cardTopRight}>
                                    <time className={styles.date}>
                                        {new Date(insight.created_at).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric'
                                        })}
                                    </time>
                                    <button
                                        className={styles.deleteInsight}
                                        onClick={() => handleDeleteInsight(insight.id)}
                                        title="Delete insight"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            <h3 className={styles.insightTitle}>{insight.title}</h3>
                            <p className={styles.insightContent}>{insight.content}</p>

                            {insight.source && (
                                <span className={styles.source}>Source: {insight.source}</span>
                            )}

                            {insight.actionable_takeaways && insight.actionable_takeaways.length > 0 && (
                                <div className={styles.takeaways}>
                                    <span className={styles.takeawaysLabel}>Key Takeaways</span>
                                    <ul className={styles.takeawaysList}>
                                        {insight.actionable_takeaways.map((t, i) => (
                                            <li key={i}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {insight.tags && insight.tags.length > 0 && (
                                <div className={styles.tags}>
                                    {insight.tags.map((tag, i) => (
                                        <span key={i} className={styles.tag}>{tag}</span>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <BookOpen size={40} />
                    <p>No research insights yet.</p>
                    <p>Use the query tool above to research from your NotebookLM notebooks.</p>
                </div>
            )}
        </>
    )
}
