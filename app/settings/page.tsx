/**
 * Settings Page
 * Business profile and Brand Style Guide forms.
 * Client component for interactive form management.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { upsertBusinessProfile, getBusinessProfile, BusinessProfileData } from '@/app/actions/settings'
import { upsertBrandStyleGuide, getBrandStyleGuide } from '@/app/actions/brand'
import type { BrandStyleGuide, VoiceRubric, CaptionRules } from '@/lib/brand/types'
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

/* Default empty brand style guide */
const EMPTY_BRAND_STYLE: Partial<BrandStyleGuide> = {
    color_palette: [],
    typography: { heading_font: '', body_font: '', caption_font: '' },
    photography_style: '',
    product_styling_rules: '',
    voice_rubric: {
        tone_descriptors: [],
        taglish_ratio: { target: 0.5, min: 0.0, max: 1.0 },
        formality_levels: {},
        vocabulary_whitelist: [],
        vocabulary_blacklist: [],
        banned_ai_words: [],
        example_phrases: [],
        scoring_weights: { tone: 0.3, vocabulary: 0.2, taglish: 0.2, formality: 0.15, banned_words: 0.15 }
    },
    caption_rules: {},
    creator_description: '',
    wardrobe_notes: '',
    avoid_list: [],
    reference_images: [],
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'business' | 'brand'>('business')

    const [profile, setProfile] = useState<BusinessProfileData>(EMPTY_PROFILE)
    const [brandStyle, setBrandStyle] = useState<Partial<BrandStyleGuide>>(EMPTY_BRAND_STYLE)

    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)

    /* Load existing data on mount */
    useEffect(() => {
        async function load() {
            try {
                const [existingProfile, existingBrand] = await Promise.all([
                    getBusinessProfile(),
                    getBrandStyleGuide().catch(() => null)
                ])
                if (existingProfile) setProfile(existingProfile)
                if (existingBrand) {
                    // merge in case of missing nested keys
                    setBrandStyle({
                        ...EMPTY_BRAND_STYLE,
                        ...existingBrand,
                        voice_rubric: { ...EMPTY_BRAND_STYLE.voice_rubric, ...(existingBrand.voice_rubric || {}) } as VoiceRubric
                    })
                }
            } catch (err) {
                console.error("Failed to load settings:", err)
            }
        }
        load()
    }, [])

    /* ---- PROFILE HELPERS ---- */
    const updateProfileField = (field: keyof BusinessProfileData, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }))
    }
    const addToList = (field: keyof BusinessProfileData) => {
        const current = profile[field] as string[]
        setProfile(prev => ({ ...prev, [field]: [...current, ''] }))
    }
    const updateListItem = (field: keyof BusinessProfileData, index: number, value: string) => {
        const current = [...(profile[field] as string[])]
        current[index] = value
        setProfile(prev => ({ ...prev, [field]: current }))
    }
    const removeFromList = (field: keyof BusinessProfileData, index: number) => {
        const current = (profile[field] as string[]).filter((_, i) => i !== index)
        setProfile(prev => ({ ...prev, [field]: current }))
    }

    /* ---- BRAND STYLE HELPERS ---- */
    const updateBrandField = (field: keyof BrandStyleGuide, value: any) => {
        setBrandStyle(prev => ({ ...prev, [field]: value }))
    }
    const updateVoiceRubric = (field: keyof VoiceRubric, value: any) => {
        setBrandStyle(prev => ({
            ...prev,
            voice_rubric: { ...prev.voice_rubric!, [field]: value }
        }))
    }
    const addToVoiceList = (field: keyof VoiceRubric) => {
        const current = (brandStyle.voice_rubric as any)[field] as string[]
        updateVoiceRubric(field, [...(current || []), ''])
    }
    const updateVoiceListItem = (field: keyof VoiceRubric, index: number, value: string) => {
        const current = [...((brandStyle.voice_rubric as any)[field] as string[])]
        current[index] = value
        updateVoiceRubric(field, current)
    }
    const removeFromVoiceList = (field: keyof VoiceRubric, index: number) => {
        const current = ((brandStyle.voice_rubric as any)[field] as string[]).filter((_, i) => i !== index)
        updateVoiceRubric(field, current)
    }

    const addToAvoidList = () => {
        updateBrandField('avoid_list', [...(brandStyle.avoid_list || []), ''])
    }
    const updateAvoidListItem = (index: number, value: string) => {
        const current = [...(brandStyle.avoid_list || [])]
        current[index] = value
        updateBrandField('avoid_list', current)
    }
    const removeFromAvoidList = (index: number) => {
        const current = (brandStyle.avoid_list || []).filter((_, i) => i !== index)
        updateBrandField('avoid_list', current)
    }

    /* Save profile */
    const handleSave = useCallback(async () => {
        setStatus('saving')
        setError(null)

        try {
            if (activeTab === 'business') {
                const cleaned: BusinessProfileData = {
                    ...profile,
                    products_services: profile.products_services.filter(Boolean),
                    unique_selling_points: profile.unique_selling_points.filter(Boolean),
                    content_pillars: profile.content_pillars.filter(Boolean),
                    platforms: profile.platforms.filter(Boolean),
                    competitors: profile.competitors.filter(Boolean),
                }
                await upsertBusinessProfile(cleaned)
            } else {
                const cleanedBrand: Partial<BrandStyleGuide> = {
                    ...brandStyle,
                    voice_rubric: {
                        ...brandStyle.voice_rubric!,
                        tone_descriptors: brandStyle.voice_rubric?.tone_descriptors?.filter(Boolean) || [],
                        vocabulary_whitelist: brandStyle.voice_rubric?.vocabulary_whitelist?.filter(Boolean) || [],
                        vocabulary_blacklist: brandStyle.voice_rubric?.vocabulary_blacklist?.filter(Boolean) || [],
                        banned_ai_words: brandStyle.voice_rubric?.banned_ai_words?.filter(Boolean) || [],
                        example_phrases: brandStyle.voice_rubric?.example_phrases?.filter(Boolean) || [],
                    },
                    avoid_list: brandStyle.avoid_list?.filter(Boolean) || [],
                }
                await upsertBrandStyleGuide(cleanedBrand)
            }

            setStatus('saved')
            setTimeout(() => setStatus('idle'), 3000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
            setStatus('error')
        }
    }, [activeTab, profile, brandStyle])

    return (
        <>
            <PageHeader
                title="Settings"
                subtitle="Business profile and Brand Style Guide"
                action={
                    <button className={styles.saveButton} onClick={handleSave} disabled={status === 'saving'}>
                        <Save size={16} />
                        {status === 'saving' ? 'Saving...' : 'Save Profile'}
                    </button>
                }
            />

            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'business' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('business')}
                >
                    Business Profile
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'brand' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('brand')}
                >
                    Brand Style Guide
                </button>
            </div>

            {/* Success / Error messages */}
            {status === 'saved' && (
                <div className={styles.successMsg}><CheckCircle size={16} /> Saved successfully!</div>
            )}
            {error && (
                <div className={styles.errorMsg}><AlertCircle size={16} /> {error}</div>
            )}

            {activeTab === 'business' && (
                <div className={styles.formGrid}>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Basic Info</h2>
                        <label className={styles.label}>
                            Business Name
                            <input type="text" className={styles.input} value={profile.business_name} onChange={e => updateProfileField('business_name', e.target.value)} placeholder="e.g. Grace Skin Studio" />
                        </label>
                        <label className={styles.label}>
                            Industry
                            <input type="text" className={styles.input} value={profile.industry} onChange={e => updateProfileField('industry', e.target.value)} placeholder="e.g. Beauty & Skincare" />
                        </label>
                    </section>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Audience & Voice</h2>
                        <label className={styles.label}>
                            Target Audience
                            <textarea className={styles.textarea} value={profile.target_audience} onChange={e => updateProfileField('target_audience', e.target.value)} rows={3} />
                        </label>
                        <label className={styles.label}>
                            Brand Voice
                            <textarea className={styles.textarea} value={profile.brand_voice} onChange={e => updateProfileField('brand_voice', e.target.value)} rows={3} />
                        </label>
                    </section>
                    <ListSection title="Products & Services" items={profile.products_services} field="products_services" placeholder="e.g. Facial treatments" onAdd={addToList} onUpdate={updateListItem} onRemove={removeFromList} />
                    <ListSection title="Unique Selling Points" items={profile.unique_selling_points} field="unique_selling_points" placeholder="e.g. 10 years experience" onAdd={addToList} onUpdate={updateListItem} onRemove={removeFromList} />
                    <ListSection title="Content Pillars" items={profile.content_pillars} field="content_pillars" placeholder="e.g. Skin tips" onAdd={addToList} onUpdate={updateListItem} onRemove={removeFromList} />
                    <ListSection title="Platforms" items={profile.platforms} field="platforms" placeholder="e.g. Instagram" onAdd={addToList} onUpdate={updateListItem} onRemove={removeFromList} />
                    <ListSection title="Competitors" items={profile.competitors} field="competitors" placeholder="e.g. @competitor" onAdd={addToList} onUpdate={updateListItem} onRemove={removeFromList} />
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Additional Notes</h2>
                        <textarea className={styles.textarea} value={profile.notes} onChange={e => updateProfileField('notes', e.target.value)} rows={4} />
                    </section>
                </div>
            )}

            {activeTab === 'brand' && (
                <div className={styles.formGrid}>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Voice Rubric</h2>
                        <GenericListSection 
                            title="Tone Descriptors" items={brandStyle.voice_rubric?.tone_descriptors || []} 
                            placeholder="e.g. warm, empowering" 
                            onAdd={() => addToVoiceList('tone_descriptors')} 
                            onUpdate={(i, v) => updateVoiceListItem('tone_descriptors', i, v)} 
                            onRemove={(i) => removeFromVoiceList('tone_descriptors', i)} 
                        />
                        <div style={{ marginTop: '1rem' }}>
                            <label className={styles.label}>
                                Taglish Ratio (0.0 to 1.0)
                                <input type="number" step="0.1" min="0" max="1" className={styles.input} 
                                    value={brandStyle.voice_rubric?.taglish_ratio?.target || 0} 
                                    onChange={e => updateVoiceRubric('taglish_ratio', { ...brandStyle.voice_rubric?.taglish_ratio, target: parseFloat(e.target.value) })} 
                                />
                            </label>
                        </div>
                        <GenericListSection 
                            title="Vocabulary Whitelist" items={brandStyle.voice_rubric?.vocabulary_whitelist || []} 
                            placeholder="e.g. mommy, puhunan" 
                            onAdd={() => addToVoiceList('vocabulary_whitelist')} 
                            onUpdate={(i, v) => updateVoiceListItem('vocabulary_whitelist', i, v)} 
                            onRemove={(i) => removeFromVoiceList('vocabulary_whitelist', i)} 
                        />
                        <GenericListSection 
                            title="Vocabulary Blacklist" items={brandStyle.voice_rubric?.vocabulary_blacklist || []} 
                            placeholder="e.g. leverage, utilize" 
                            onAdd={() => addToVoiceList('vocabulary_blacklist')} 
                            onUpdate={(i, v) => updateVoiceListItem('vocabulary_blacklist', i, v)} 
                            onRemove={(i) => removeFromVoiceList('vocabulary_blacklist', i)} 
                        />
                        <GenericListSection 
                            title="Banned AI Words" items={brandStyle.voice_rubric?.banned_ai_words || []} 
                            placeholder="e.g. delve, tapestry" 
                            onAdd={() => addToVoiceList('banned_ai_words')} 
                            onUpdate={(i, v) => updateVoiceListItem('banned_ai_words', i, v)} 
                            onRemove={(i) => removeFromVoiceList('banned_ai_words', i)} 
                        />
                        <GenericListSection 
                            title="Example Phrases" items={brandStyle.voice_rubric?.example_phrases || []} 
                            placeholder="e.g. Kalma lang, Mommy" 
                            onAdd={() => addToVoiceList('example_phrases')} 
                            onUpdate={(i, v) => updateVoiceListItem('example_phrases', i, v)} 
                            onRemove={(i) => removeFromVoiceList('example_phrases', i)} 
                        />
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Visual Identity</h2>
                        <label className={styles.label}>
                            Photography Style
                            <textarea className={styles.textarea} value={brandStyle.photography_style || ''} onChange={e => updateBrandField('photography_style', e.target.value)} rows={3} />
                        </label>
                        <label className={styles.label}>
                            Product Styling Rules
                            <textarea className={styles.textarea} value={brandStyle.product_styling_rules || ''} onChange={e => updateBrandField('product_styling_rules', e.target.value)} rows={3} />
                        </label>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Creator Identity</h2>
                        <label className={styles.label}>
                            Creator Description (for AI Images)
                            <textarea className={styles.textarea} value={brandStyle.creator_description || ''} onChange={e => updateBrandField('creator_description', e.target.value)} rows={3} />
                        </label>
                        <label className={styles.label}>
                            Wardrobe Notes
                            <textarea className={styles.textarea} value={brandStyle.wardrobe_notes || ''} onChange={e => updateBrandField('wardrobe_notes', e.target.value)} rows={2} />
                        </label>
                        <GenericListSection 
                            title="Avoid List" items={brandStyle.avoid_list || []} 
                            placeholder="e.g. corporate stock photo style" 
                            onAdd={addToAvoidList} 
                            onUpdate={updateAvoidListItem} 
                            onRemove={removeFromAvoidList} 
                        />
                    </section>
                </div>
            )}
        </>
    )
}

function ListSection({
    title, items, field, placeholder, onAdd, onUpdate, onRemove
}: {
    title: string; items: string[]; field: keyof BusinessProfileData; placeholder: string;
    onAdd: (f: keyof BusinessProfileData) => void;
    onUpdate: (f: keyof BusinessProfileData, i: number, v: string) => void;
    onRemove: (f: keyof BusinessProfileData, i: number) => void;
}) {
    return (
        <section className={styles.section}>
            <div className={styles.listHeader}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <button className={styles.addButton} onClick={() => onAdd(field)}><Plus size={14} /> Add</button>
            </div>
            <div className={styles.listItems}>
                {items.map((item, i) => (
                    <div key={i} className={styles.listItem}>
                        <input type="text" className={styles.input} value={item} onChange={e => onUpdate(field, i, e.target.value)} placeholder={placeholder} />
                        <button className={styles.removeButton} onClick={() => onRemove(field, i)}><X size={14} /></button>
                    </div>
                ))}
                {items.length === 0 && <span className={styles.emptyList}>No items yet.</span>}
            </div>
        </section>
    )
}

function GenericListSection({
    title, items, placeholder, onAdd, onUpdate, onRemove
}: {
    title: string; items: string[]; placeholder: string;
    onAdd: () => void;
    onUpdate: (i: number, v: string) => void;
    onRemove: (i: number) => void;
}) {
    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div className={styles.listHeader}>
                <h3 style={{ fontSize: '0.8125rem', color: 'var(--color-text)', fontWeight: 500 }}>{title}</h3>
                <button className={styles.addButton} onClick={onAdd}><Plus size={14} /> Add</button>
            </div>
            <div className={styles.listItems}>
                {items.map((item, i) => (
                    <div key={i} className={styles.listItem}>
                        <input type="text" className={styles.input} value={item} onChange={e => onUpdate(i, e.target.value)} placeholder={placeholder} />
                        <button className={styles.removeButton} onClick={() => onRemove(i)}><X size={14} /></button>
                    </div>
                ))}
                {items.length === 0 && <span className={styles.emptyList}>No items yet.</span>}
            </div>
        </div>
    )
}
