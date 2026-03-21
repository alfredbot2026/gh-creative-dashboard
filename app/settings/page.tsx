/**
 * Settings Page
 * Business profile and Brand Style Guide forms.
 * Client component for interactive form management.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { upsertBusinessProfile, getBusinessProfile, BusinessProfileData } from '@/app/actions/settings'
import { upsertBrandStyleGuide, getBrandStyleGuide } from '@/app/actions/brand'
import { listProducts, upsertProduct, deleteProduct, ProductData } from '@/app/actions/products'
import type { BrandStyleGuide, VoiceRubric, CaptionRules } from '@/lib/brand/types'
import PageHeader from '@/components/ui/PageHeader'
import { Save, Plus, X, CheckCircle, AlertCircle } from 'lucide-react'
import styles from './page.module.css'
import ConnectedAccounts from '@/components/settings/ConnectedAccounts'

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
    const [activeTab, setActiveTab] = useState<'business' | 'brand' | 'products' | 'persona' | 'accounts'>('business')

    const [profile, setProfile] = useState<BusinessProfileData>(EMPTY_PROFILE)
    const [brandStyle, setBrandStyle] = useState<Partial<BrandStyleGuide>>(EMPTY_BRAND_STYLE)
    const [products, setProducts] = useState<ProductData[]>([])
    const [editingProduct, setEditingProduct] = useState<ProductData | null>(null)
    const [showProductForm, setShowProductForm] = useState(false)
    const [persona, setPersona] = useState<{ character_name: string; backstory: string; appearance: string; voice_preset: string; custom_voice_notes: string; avatar_url?: string }>({ character_name: 'Grace', backstory: '', appearance: '', voice_preset: 'warm_empowering', custom_voice_notes: '' })
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [refPreviews, setRefPreviews] = useState<string[]>([])

    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)

    /* Load existing data on mount */
    useEffect(() => {
        async function load() {
            try {
                const { createClient: createBrowserClient } = await import('@/lib/supabase/client')
                const supabaseClient = createBrowserClient()
                const [existingProfile, existingBrand, existingProducts, { data: existingPersona }] = await Promise.all([
                    getBusinessProfile(),
                    getBrandStyleGuide().catch(() => null),
                    listProducts().catch(() => []),
                    supabaseClient.from('brand_persona').select('*').limit(1).maybeSingle()
                ])
                if (existingProfile) setProfile(existingProfile)
                if (existingProducts) setProducts(existingProducts)
                if (existingPersona) {
                    setPersona({ ...persona, ...existingPersona })
                    // Load reference image previews
                    const refs = (existingPersona.reference_images as string[]) || []
                    if (refs.length > 0) {
                        const sb2 = createBrowserClient()
                        const urls: string[] = []
                        for (const ref of refs) {
                            const objPath = ref.replace('ad-creatives/', '')
                            const { data: signedData } = await sb2.storage.from('ad-creatives').createSignedUrl(objPath, 3600)
                            if (signedData?.signedUrl) urls.push(signedData.signedUrl)
                        }
                        setRefPreviews(urls)
                    } else if (existingPersona.avatar_url) {
                        const sb2 = createBrowserClient()
                        const objPath = existingPersona.avatar_url.replace('ad-creatives/', '')
                        const { data: signedData } = await sb2.storage.from('ad-creatives').createSignedUrl(objPath, 3600)
                        if (signedData?.signedUrl) setRefPreviews([signedData.signedUrl])
                    }
                }
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
                <button 
                    className={`${styles.tab} ${activeTab === 'products' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    Products
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'persona' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('persona')}
                >
                    Brand Persona
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'accounts' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('accounts')}
                >
                    Connected Accounts
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

            {activeTab === 'products' && (
                <div className={styles.formGrid}>
                    <section className={styles.section}>
                        <div className={styles.listHeader}>
                            <h2 className={styles.sectionTitle}>Your Products</h2>
                            <button className={styles.addButton} onClick={() => { setEditingProduct({ name: '' }); setShowProductForm(true) }}>
                                <Plus size={14} /> Add Product
                            </button>
                        </div>

                        {(showProductForm && editingProduct) && (
                            <div className={styles.section} style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <label className={styles.label}>
                                    Product Name *
                                    <input type="text" className={styles.input} value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} placeholder="e.g. Papers to Profits Course" />
                                </label>
                                <label className={styles.label}>
                                    Price
                                    <input type="text" className={styles.input} value={editingProduct.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} placeholder="e.g. ₱1,300" />
                                </label>
                                <label className={styles.label}>
                                    Type
                                    <select className={styles.input} value={editingProduct.product_type || 'physical'} onChange={e => setEditingProduct({ ...editingProduct, product_type: e.target.value })}>
                                        <option value="physical">Physical Product</option>
                                        <option value="digital">Digital Product</option>
                                        <option value="course">Course</option>
                                        <option value="service">Service</option>
                                    </select>
                                </label>
                                <label className={styles.label}>
                                    Description
                                    <textarea className={styles.textarea} rows={2} value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} placeholder="Brief product description" />
                                </label>
                                <label className={styles.label}>
                                    Offer Details (what's included, bonuses)
                                    <textarea className={styles.textarea} rows={3} value={editingProduct.offer_details || ''} onChange={e => setEditingProduct({ ...editingProduct, offer_details: e.target.value })} placeholder="e.g. Includes templates, tutorials, Canva designs, community access" />
                                </label>
                                <label className={styles.label}>
                                    Target Audience
                                    <textarea className={styles.textarea} rows={2} value={editingProduct.target_audience || ''} onChange={e => setEditingProduct({ ...editingProduct, target_audience: e.target.value })} placeholder="e.g. Moms aged 25-45 who want to start a home business" />
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    <button className={styles.saveButton} onClick={async () => {
                                        if (!editingProduct.name) return
                                        try {
                                            const saved = await upsertProduct(editingProduct)
                                            setProducts(prev => {
                                                const idx = prev.findIndex(p => p.id === saved.id)
                                                if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
                                                return [...prev, saved]
                                            })
                                            setShowProductForm(false)
                                            setEditingProduct(null)
                                        } catch (err) { alert(err instanceof Error ? err.message : 'Save failed') }
                                    }}>
                                        <Save size={14} /> Save Product
                                    </button>
                                    <button className={styles.addButton} onClick={() => { setShowProductForm(false); setEditingProduct(null) }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {products.map(p => (
                                <div key={p.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ fontSize: '0.875rem' }}>{p.name}</strong>
                                            {p.price && <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{p.price}</span>}
                                            {p.product_type && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)' }}>{p.product_type}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button className={styles.addButton} onClick={() => { setEditingProduct(p); setShowProductForm(true) }}>Edit</button>
                                            <button className={styles.removeButton} onClick={async () => {
                                                if (!confirm(`Delete "${p.name}"?`)) return
                                                await deleteProduct(p.id!)
                                                setProducts(prev => prev.filter(x => x.id !== p.id))
                                            }}><X size={14} /></button>
                                        </div>
                                    </div>
                                    {p.offer_details && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>{p.offer_details}</p>}
                                </div>
                            ))}
                            {products.length === 0 && !showProductForm && (
                                <span className={styles.emptyList}>No products yet. Add your first product to auto-fill content generators.</span>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'persona' && (
                <div className={styles.formGrid}>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Brand Character</h2>
                        <label className={styles.label}>
                            Character Name
                            <input type="text" className={styles.input} value={persona.character_name} onChange={e => setPersona({ ...persona, character_name: e.target.value })} placeholder="e.g. Grace" />
                        </label>
                        <label className={styles.label}>
                            Backstory (for AI context)
                            <textarea className={styles.textarea} rows={3} value={persona.backstory} onChange={e => setPersona({ ...persona, backstory: e.target.value })} placeholder="e.g. Filipino mompreneur who turned paper crafting into a business..." />
                        </label>
                        <label className={styles.label}>
                            Appearance / Visual Description (for AI image generation)
                            <textarea className={styles.textarea} rows={2} value={persona.appearance} onChange={e => setPersona({ ...persona, appearance: e.target.value })} placeholder="e.g. Filipino woman, 30s, warm smile, casual-professional style" />
                        </label>
                        <div className={styles.label}>
                            Reference Photos (used by AI for consistent face identity)
                            {refPreviews.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                    {refPreviews.map((url, i) => (
                                        <img key={i} src={url} alt={`Ref ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-border)' }} />
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    style={{ fontSize: '0.75rem' }}
                                    onChange={async (e) => {
                                        const files = e.target.files
                                        if (!files || files.length === 0) return
                                        setUploadingAvatar(true)
                                        try {
                                            const fd = new FormData()
                                            for (const file of Array.from(files)) {
                                                fd.append('photos', file)
                                            }
                                            const res = await fetch('/api/persona/avatar', { method: 'POST', body: fd })
                                            if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
                                            const data = await res.json()
                                            setRefPreviews(data.signed_urls || [])
                                            setStatus('saved')
                                            setTimeout(() => setStatus('idle'), 2000)
                                        } catch (err: any) {
                                            alert(err.message)
                                        } finally {
                                            setUploadingAvatar(false)
                                        }
                                    }}
                                />
                                {uploadingAvatar && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Uploading...</span>}
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                                Upload 3-6 clear photos from different angles. AI uses these as identity references — it will preserve exact facial features across all generated images. JPG/PNG/WebP, max 10MB each.
                            </p>
                        </div>
                    </section>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Voice Preset</h2>
                        <label className={styles.label}>
                            Voice Style
                            <select className={styles.input} value={persona.voice_preset} onChange={e => setPersona({ ...persona, voice_preset: e.target.value })}>
                                <option value="warm_empowering">🤗 Warm &amp; Empowering (Ate Energy)</option>
                                <option value="professional_mommy">👩‍💼 Professional Mommy</option>
                                <option value="bestie_vibes">💬 Bestie Vibes (Casual, Fun)</option>
                                <option value="hustle_queen">🔥 Hustle Queen (Motivational)</option>
                                <option value="expert_teacher">📚 Expert Teacher (Educational)</option>
                                <option value="custom">✏️ Custom (set below)</option>
                            </select>
                        </label>
                        {persona.voice_preset === 'custom' && (
                            <label className={styles.label}>
                                Custom Voice Notes
                                <textarea className={styles.textarea} rows={3} value={persona.custom_voice_notes} onChange={e => setPersona({ ...persona, custom_voice_notes: e.target.value })} placeholder="Describe the tone, language style, and personality..." />
                            </label>
                        )}
                        <div className={styles.listHeader} style={{ marginTop: '1rem' }}>
                            <span />
                            <button className={styles.saveButton} onClick={async () => {
                                try {
                                    const { createClient: createBrowserClient } = await import('@/lib/supabase/client')
                                    const sb = createBrowserClient()
                                    const { data: existing } = await sb.from('brand_persona').select('id').limit(1).maybeSingle()
                                    if (existing?.id) {
                                        await sb.from('brand_persona').update({ ...persona, updated_at: new Date().toISOString() }).eq('id', existing.id)
                                    } else {
                                        await sb.from('brand_persona').insert({ ...persona })
                                    }
                                    setStatus('saved')
                                    setTimeout(() => setStatus('idle'), 2000)
                                } catch { setStatus('error') }
                            }}>
                                <Save size={14} /> Save Persona
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'accounts' && <ConnectedAccounts />}
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
