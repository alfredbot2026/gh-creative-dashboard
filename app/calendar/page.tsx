/**
 * Content Calendar Page (Interactive)
 * Two-week view with CRUD operations and script detail view.
 * Click card title → view full script. Click empty area → add new item.
 */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import ContentForm from '@/components/calendar/ContentForm'
import PlanPreview from '@/components/calendar/PlanPreview'
import ScriptDetail from '@/components/calendar/ScriptDetail'
import {
    createContentItem,
    updateContentItem,
    deleteContentItem,
} from '@/app/actions/content'
import { Calendar as CalendarIcon, Plus, Trash2, Sparkles, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './page.module.css'

/* Map content types to CSS class names */
const typeColorMap: Record<string, string> = {
    reel: 'typeReel',
    youtube: 'typeYoutube',
    youtube_long: 'typeYoutube',
    youtube_short: 'typeYoutube',
    ad: 'typeAd',
    ad_creative: 'typeAd',
    story: 'typeReel',
    carousel: 'typeAd',
    post: 'typeReel',
}

/* Day labels */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* Status cycle for quick toggle */
const STATUS_CYCLE = ['planned', 'in_progress', 'created', 'published']

/* Content item type from DB */
interface ContentItem {
    id: string
    title: string
    content_type: string
    platform?: string
    scheduled_date: string
    status: string
    hook?: string
    cta?: string
    notes?: string
    script_data?: {
        format?: string
        length?: string
        scene_brief?: {
            visual_goal?: string
            setting?: string
            camera?: string
            first_frame?: string
            lighting?: string
            avoid?: string
            mood_ref?: string
        }
        script?: Array<{
            time: string
            visual: string
            says: string
            text_overlay: string
        }>
    }
    generation_reasoning?: string
    research_refs?: string[]
}

export default function CalendarPage() {
    const [items, setItems] = useState<ContentItem[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
    const [prefillDate, setPrefillDate] = useState('')
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null) // for ScriptDetail
    // Content plan generation state
    const [generating, setGenerating] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [generatedPlan, setGeneratedPlan] = useState<any>(null)
    const [planProvider, setPlanProvider] = useState('')
    const [saving, setSaving] = useState(false)
    // Week navigation offset (0 = current two weeks, -1 = previous, +1 = next)
    const [weekOffset, setWeekOffset] = useState(0)

    /* Supabase browser client */
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    /* Calculate two-week boundaries based on offset */
    const today = new Date()
    const periodStart = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() - d.getDay() + (weekOffset * 14))
        d.setHours(0, 0, 0, 0)
        return d
    }, [weekOffset])

    const periodEnd = useMemo(() => {
        const d = new Date(periodStart)
        d.setDate(d.getDate() + 13) // 14 days total
        return d
    }, [periodStart])

    /* Fetch content items for the 14-day range */
    const fetchItems = useCallback(async () => {
        const { data } = await supabase
            .from('content_items')
            .select('*')
            .gte('scheduled_date', periodStart.toISOString().split('T')[0])
            .lte('scheduled_date', periodEnd.toISOString().split('T')[0])
            .order('scheduled_date', { ascending: true })

        if (data) setItems(data)
    }, [periodStart.toISOString(), periodEnd.toISOString()]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchItems() }, [fetchItems])

    /* Group items by their date string */
    const itemsByDate: Record<string, ContentItem[]> = {}
    items.forEach((item) => {
        if (!itemsByDate[item.scheduled_date]) itemsByDate[item.scheduled_date] = []
        itemsByDate[item.scheduled_date]!.push(item)
    })

    /* Handle creating a new item */
    const handleCreate = async (data: {
        title: string; content_type: string; platform: string;
        scheduled_date: string; status: string; hook?: string; cta?: string; notes?: string
    }) => {
        await createContentItem(data)
        await fetchItems()
    }

    /* Handle editing an item */
    const handleUpdate = async (data: {
        title: string; content_type: string; platform: string;
        scheduled_date: string; status: string; hook?: string; cta?: string; notes?: string
    }) => {
        if (!editingItem) return
        await updateContentItem(editingItem.id, data)
        setEditingItem(null)
        await fetchItems()
    }

    /* Handle deleting an item */
    const handleDelete = async (id: string) => {
        await deleteContentItem(id)
        await fetchItems()
    }

    /* Quick status cycle toggle */
    const handleStatusToggle = async (item: ContentItem) => {
        const currentIndex = STATUS_CYCLE.indexOf(item.status)
        const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]
        await updateContentItem(item.id, { ...item, status: nextStatus })
        await fetchItems()
    }

    /* Open form for adding new item on a specific date */
    const openAddForm = (dateStr: string) => {
        setPrefillDate(dateStr)
        setEditingItem(null)
        setShowForm(true)
    }

    /* Open form for editing an existing item */
    const openEditForm = (item: ContentItem) => {
        setEditingItem(item)
        setShowForm(true)
    }

    /* Open script detail view for an item */
    const openScriptDetail = (item: ContentItem) => {
        setSelectedItem(item)
    }

    /* Navigate weeks */
    const goToPreviousWeeks = () => setWeekOffset(prev => prev - 1)
    const goToNextWeeks = () => setWeekOffset(prev => prev + 1)
    const goToCurrentWeeks = () => setWeekOffset(0)

    /* Generate a content plan for the first week */
    const handleGenerate = async () => {
        setGenerating(true)
        try {
            const res = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart: periodStart.toISOString().split('T')[0], save: false }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Generation failed')
            setGeneratedPlan(data.plan)
            setPlanProvider(data.provider || 'AI')
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to generate')
        } finally {
            setGenerating(false)
        }
    }

    /* Save generated plan to calendar */
    const handleSavePlan = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart: periodStart.toISOString().split('T')[0], save: true }),
            })
            if (!res.ok) throw new Error('Save failed')
            setGeneratedPlan(null)
            await fetchItems()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    /* Build week 1 and week 2 date arrays */
    const weeks = [0, 1].map(weekNum => {
        return DAYS.map((day, dayIndex) => {
            const date = new Date(periodStart)
            date.setDate(periodStart.getDate() + (weekNum * 7) + dayIndex)
            const dateStr = date.toISOString().split('T')[0]
            return { day, date, dateStr, isToday: date.toDateString() === today.toDateString(), items: itemsByDate[dateStr] || [] }
        })
    })

    /* Format week label */
    const formatWeekLabel = (weekIndex: number) => {
        const firstDay = weeks[weekIndex]![0]!.date
        return `Week of ${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }

    /* Period label for header */
    const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — ${periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    return (
        <>
            <PageHeader
                title="Content Calendar"
                subtitle={periodLabel}
                action={
                    <div className={styles.headerActions}>
                        {/* Week navigation */}
                        <div className={styles.weekNav}>
                            <button className={styles.navButton} onClick={goToPreviousWeeks} title="Previous 2 weeks">
                                <ChevronLeft size={16} />
                            </button>
                            <button className={styles.todayButton} onClick={goToCurrentWeeks}>
                                Today
                            </button>
                            <button className={styles.navButton} onClick={goToNextWeeks} title="Next 2 weeks">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className={styles.legend}>
                            <span className={`${styles.legendDot} ${styles.dotReel}`} /> Reels
                            <span className={`${styles.legendDot} ${styles.dotYoutube}`} /> YouTube
                            <span className={`${styles.legendDot} ${styles.dotAd}`} /> Ads
                        </div>
                        <button className={styles.generateButton} onClick={handleGenerate} disabled={generating}>
                            {generating ? <Loader2 size={16} className={styles.spinner} /> : <Sparkles size={16} />}
                            {generating ? 'Generating...' : 'Generate Week'}
                        </button>
                        <button className={styles.addButton} onClick={() => { setPrefillDate(''); setEditingItem(null); setShowForm(true) }}>
                            <Plus size={16} /> New Item
                        </button>
                    </div>
                }
            />

            {/* Two-week grid */}
            {weeks.map((weekDays, weekIndex) => (
                <div key={weekIndex}>
                    {/* Week label */}
                    <div className={styles.weekLabel}>
                        {formatWeekLabel(weekIndex)}
                    </div>

                    {/* 7-day grid */}
                    <div className={styles.weekGrid}>
                        {weekDays.map(({ day, date, dateStr, isToday, items: dayItems }) => (
                            <div key={dateStr} className={`${styles.dayColumn} ${isToday ? styles.today : ''}`}>
                                {/* Day header */}
                                <div className={styles.dayHeader}>
                                    <span className={styles.dayName}>{day}</span>
                                    <div className={styles.dayHeaderRight}>
                                        <span className={`${styles.dayNumber} ${isToday ? styles.todayNumber : ''}`}>
                                            {date.getDate()}
                                        </span>
                                        <button
                                            className={styles.dayAddButton}
                                            onClick={() => openAddForm(dateStr)}
                                            title="Add content"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Content items for this day */}
                                <div className={styles.dayItems}>
                                    {dayItems.length > 0 ? (
                                        dayItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`${styles.contentCard} ${styles[typeColorMap[item.content_type] || '']}`}
                                            >
                                                {/* Click title to view script */}
                                                <span
                                                    className={styles.cardTitle}
                                                    onClick={() => openScriptDetail(item)}
                                                >
                                                    {item.title}
                                                </span>
                                                <div className={styles.cardMeta}>
                                                    {/* Click status badge to cycle */}
                                                    <div onClick={() => handleStatusToggle(item)} style={{ cursor: 'pointer' }}>
                                                        <StatusBadge status={item.status} size="sm" />
                                                    </div>
                                                    {/* Delete button */}
                                                    <button
                                                        className={styles.deleteButton}
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                                {item.hook && (
                                                    <p className={styles.cardHook}>&ldquo;{item.hook}&rdquo;</p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <span className={styles.emptyDay}>—</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Totals summary */}
            <div className={styles.summary}>
                <CalendarIcon size={16} />
                <span>{items.length} items across 2 weeks</span>
            </div>

            {/* Script Detail Modal — opens when clicking a card */}
            {selectedItem && (
                <ScriptDetail
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onEdit={() => { setSelectedItem(null); openEditForm(selectedItem) }}
                />
            )}

            {/* Content Form Modal */}
            {showForm && (
                <ContentForm
                    initialData={editingItem ? {
                        id: editingItem.id,
                        title: editingItem.title,
                        content_type: editingItem.content_type,
                        platform: editingItem.platform || 'instagram',
                        scheduled_date: editingItem.scheduled_date,
                        status: editingItem.status,
                        hook: editingItem.hook,
                        cta: editingItem.cta,
                        notes: editingItem.notes,
                    } : prefillDate ? {
                        title: '',
                        content_type: 'reel',
                        platform: 'instagram',
                        scheduled_date: prefillDate,
                        status: 'planned',
                    } : undefined}
                    onClose={() => { setShowForm(false); setEditingItem(null) }}
                    onSave={editingItem ? handleUpdate : handleCreate}
                />
            )}

            {/* Generated Plan Preview Modal */}
            {generatedPlan && (
                <PlanPreview
                    plan={generatedPlan}
                    provider={planProvider}
                    onSave={handleSavePlan}
                    onClose={() => setGeneratedPlan(null)}
                    saving={saving}
                />
            )}
        </>
    )
}
