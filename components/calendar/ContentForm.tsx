/**
 * ContentForm Component
 * Modal form for creating and editing content items.
 * Used on the Calendar page.
 */
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import styles from './ContentForm.module.css'

/* Props shape */
interface ContentFormProps {
    initialData?: {
        id?: string
        title: string
        content_type: string
        platform: string
        scheduled_date: string
        status: string
        hook?: string
        cta?: string
        notes?: string
    }
    onClose: () => void
    onSave: (data: {
        title: string
        content_type: string
        platform: string
        scheduled_date: string
        status: string
        hook?: string
        cta?: string
        notes?: string
    }) => Promise<void>
}

/* Dropdown options */
const CONTENT_TYPES = ['reel', 'youtube', 'ad', 'story', 'carousel', 'post']
const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'facebook']
const STATUSES = ['planned', 'in_progress', 'created', 'published']

export default function ContentForm({ initialData, onClose, onSave }: ContentFormProps) {
    const isEditing = !!initialData?.id

    const [title, setTitle] = useState(initialData?.title || '')
    const [contentType, setContentType] = useState(initialData?.content_type || 'reel')
    const [platform, setPlatform] = useState(initialData?.platform || 'instagram')
    const [scheduledDate, setScheduledDate] = useState(initialData?.scheduled_date || '')
    const [status, setStatus] = useState(initialData?.status || 'planned')
    const [hook, setHook] = useState(initialData?.hook || '')
    const [cta, setCta] = useState(initialData?.cta || '')
    const [notes, setNotes] = useState(initialData?.notes || '')
    const [isSaving, setIsSaving] = useState(false)

    /* Handle form submit */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            await onSave({
                title,
                content_type: contentType,
                platform,
                scheduled_date: scheduledDate,
                status,
                hook: hook || undefined,
                cta: cta || undefined,
                notes: notes || undefined,
            })
            onClose()
        } catch (err) {
            console.error('Save failed:', err)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2>{isEditing ? 'Edit Content' : 'New Content'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Title */}
                    <label className={styles.label}>
                        Title *
                        <input
                            type="text"
                            className={styles.input}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Content title..."
                            required
                        />
                    </label>

                    {/* 2-column row for type + platform */}
                    <div className={styles.row}>
                        <label className={styles.label}>
                            Type
                            <select className={styles.select} value={contentType} onChange={e => setContentType(e.target.value)}>
                                {CONTENT_TYPES.map(t => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.label}>
                            Platform
                            <select className={styles.select} value={platform} onChange={e => setPlatform(e.target.value)}>
                                {PLATFORMS.map(p => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* 2-column row for date + status */}
                    <div className={styles.row}>
                        <label className={styles.label}>
                            Scheduled Date *
                            <input
                                type="date"
                                className={styles.input}
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                required
                            />
                        </label>
                        <label className={styles.label}>
                            Status
                            <select className={styles.select} value={status} onChange={e => setStatus(e.target.value)}>
                                {STATUSES.map(s => (
                                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Hook */}
                    <label className={styles.label}>
                        Hook
                        <input
                            type="text"
                            className={styles.input}
                            value={hook}
                            onChange={e => setHook(e.target.value)}
                            placeholder="Opening hook for the content..."
                        />
                    </label>

                    {/* CTA */}
                    <label className={styles.label}>
                        Call to Action
                        <input
                            type="text"
                            className={styles.input}
                            value={cta}
                            onChange={e => setCta(e.target.value)}
                            placeholder="What should the viewer do next?"
                        />
                    </label>

                    {/* Notes */}
                    <label className={styles.label}>
                        Notes
                        <textarea
                            className={styles.textarea}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={3}
                        />
                    </label>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.saveButton} disabled={isSaving}>
                            {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
