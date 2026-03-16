/**
 * Settings Page
 * Business profile form for Grace's business details.
 * Client component for interactive form management.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { upsertBusinessProfile, getBusinessProfile, BusinessProfileData } from '@/app/actions/settings'
import PageHeader from '@/components/ui/PageHeader'
import { Save, Plus, X, CheckCircle, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

/* Default empty profile */
const EMPTY_PROFILE: BusinessProfileData = {
    business_name: '',
    industry: '',
    target_audience: '',
    brand_voice: '',
    products_services: [],
    unique_selling_points: [],
    content_pillars: [],
    platforms: [],
    competitors: [],
    notes: '',
}

export default function SettingsPage() {
    const [profile, setProfile] = useState<BusinessProfileData>(EMPTY_PROFILE)
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)

    /* Load existing profile on mount */
    useEffect(() => {
        async function load() {
            const existing = await getBusinessProfile()
            if (existing) setProfile(existing)
        }
        load()
    }, [])

    /* Update a text field */
    const updateField = (field: keyof BusinessProfileData, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }))
    }

    /* Add item to an array field */
    const addToList = (field: keyof BusinessProfileData) => {
        const current = profile[field] as string[]
        setProfile(prev => ({ ...prev, [field]: [...current, ''] }))
    }

    /* Update item in an array field */
    const updateListItem = (field: keyof BusinessProfileData, index: number, value: string) => {
        const current = [...(profile[field] as string[])]
        current[index] = value
        setProfile(prev => ({ ...prev, [field]: current }))
    }

    /* Remove item from an array field */
    const removeFromList = (field: keyof BusinessProfileData, index: number) => {
        const current = (profile[field] as string[]).filter((_, i) => i !== index)
        setProfile(prev => ({ ...prev, [field]: current }))
    }

    /* Save profile */
    const handleSave = useCallback(async () => {
        setStatus('saving')
        setError(null)

        try {
            // Filter out empty strings from lists before saving
            const cleaned: BusinessProfileData = {
                ...profile,
                products_services: profile.products_services.filter(Boolean),
                unique_selling_points: profile.unique_selling_points.filter(Boolean),
                content_pillars: profile.content_pillars.filter(Boolean),
                platforms: profile.platforms.filter(Boolean),
                competitors: profile.competitors.filter(Boolean),
            }
            await upsertBusinessProfile(cleaned)
            setStatus('saved')
            setTimeout(() => setStatus('idle'), 3000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
            setStatus('error')
        }
    }, [profile])

    return (
        <>
            <PageHeader
                title="Settings"
                subtitle="Business profile — this is how the AI understands Grace's brand"
                action={
                    <button className={styles.saveButton} onClick={handleSave} disabled={status === 'saving'}>
                        <Save size={16} />
                        {status === 'saving' ? 'Saving...' : 'Save Profile'}
                    </button>
                }
            />

            {/* Success / Error messages */}
            {status === 'saved' && (
                <div className={styles.successMsg}><CheckCircle size={16} /> Profile saved!</div>
            )}
            {error && (
                <div className={styles.errorMsg}><AlertCircle size={16} /> {error}</div>
            )}

            <div className={styles.formGrid}>
                {/* -- Basic Info -- */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Basic Info</h2>

                    <label className={styles.label}>
                        Business Name
                        <input
                            type="text"
                            className={styles.input}
                            value={profile.business_name}
                            onChange={e => updateField('business_name', e.target.value)}
                            placeholder="e.g. Grace Skin Studio"
                        />
                    </label>

                    <label className={styles.label}>
                        Industry
                        <input
                            type="text"
                            className={styles.input}
                            value={profile.industry}
                            onChange={e => updateField('industry', e.target.value)}
                            placeholder="e.g. Beauty & Skincare"
                        />
                    </label>
                </section>

                {/* -- Audience & Voice -- */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Audience & Voice</h2>

                    <label className={styles.label}>
                        Target Audience
                        <textarea
                            className={styles.textarea}
                            value={profile.target_audience}
                            onChange={e => updateField('target_audience', e.target.value)}
                            placeholder="Who buys from Grace? Age, interests, pain points..."
                            rows={3}
                        />
                    </label>

                    <label className={styles.label}>
                        Brand Voice
                        <textarea
                            className={styles.textarea}
                            value={profile.brand_voice}
                            onChange={e => updateField('brand_voice', e.target.value)}
                            placeholder="How Grace talks — casual, empowering, professional, friendly..."
                            rows={3}
                        />
                    </label>
                </section>

                {/* -- Dynamic Lists -- */}
                <ListSection
                    title="Products & Services"
                    items={profile.products_services}
                    field="products_services"
                    placeholder="e.g. Facial treatments, Skin consultations"
                    onAdd={addToList}
                    onUpdate={updateListItem}
                    onRemove={removeFromList}
                />

                <ListSection
                    title="Unique Selling Points"
                    items={profile.unique_selling_points}
                    field="unique_selling_points"
                    placeholder="e.g. 10 years of experience, organic products only"
                    onAdd={addToList}
                    onUpdate={updateListItem}
                    onRemove={removeFromList}
                />

                <ListSection
                    title="Content Pillars"
                    items={profile.content_pillars}
                    field="content_pillars"
                    placeholder="e.g. Skin tips, Behind the scenes, Client transformations"
                    onAdd={addToList}
                    onUpdate={updateListItem}
                    onRemove={removeFromList}
                />

                <ListSection
                    title="Platforms"
                    items={profile.platforms}
                    field="platforms"
                    placeholder="e.g. Instagram, YouTube, TikTok"
                    onAdd={addToList}
                    onUpdate={updateListItem}
                    onRemove={removeFromList}
                />

                <ListSection
                    title="Competitors to Watch"
                    items={profile.competitors}
                    field="competitors"
                    placeholder="e.g. @competitor_handle, Brand Name"
                    onAdd={addToList}
                    onUpdate={updateListItem}
                    onRemove={removeFromList}
                />

                {/* -- Notes -- */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Additional Notes</h2>
                    <textarea
                        className={styles.textarea}
                        value={profile.notes}
                        onChange={e => updateField('notes', e.target.value)}
                        placeholder="Anything else the AI should know about Grace's business..."
                        rows={4}
                    />
                </section>
            </div>
        </>
    )
}

/* -- Reusable list section component -- */
function ListSection({
    title, items, field, placeholder, onAdd, onUpdate, onRemove
}: {
    title: string
    items: string[]
    field: keyof BusinessProfileData
    placeholder: string
    onAdd: (field: keyof BusinessProfileData) => void
    onUpdate: (field: keyof BusinessProfileData, index: number, value: string) => void
    onRemove: (field: keyof BusinessProfileData, index: number) => void
}) {
    return (
        <section className={styles.section}>
            <div className={styles.listHeader}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <button className={styles.addButton} onClick={() => onAdd(field)}>
                    <Plus size={14} /> Add
                </button>
            </div>
            <div className={styles.listItems}>
                {items.map((item, i) => (
                    <div key={i} className={styles.listItem}>
                        <input
                            type="text"
                            className={styles.input}
                            value={item}
                            onChange={e => onUpdate(field, i, e.target.value)}
                            placeholder={placeholder}
                        />
                        <button className={styles.removeButton} onClick={() => onRemove(field, i)}>
                            <X size={14} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <span className={styles.emptyList}>No items yet. Click &quot;Add&quot; to start.</span>
                )}
            </div>
        </section>
    )
}
