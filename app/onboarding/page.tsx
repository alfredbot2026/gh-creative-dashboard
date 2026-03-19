'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import StepBusiness from '@/components/onboarding/StepBusiness'
import StepBrand from '@/components/onboarding/StepBrand'
import StepProducts from '@/components/onboarding/StepProducts'
import StepPersona from '@/components/onboarding/StepPersona'
import StepComplete from '@/components/onboarding/StepComplete'
import styles from './page.module.css'

const STEPS = [
  { id: 'business', label: 'Business', icon: '🏪' },
  { id: 'brand', label: 'Brand Style', icon: '🎨' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'persona', label: 'You', icon: '👤' },
  { id: 'complete', label: 'Done', icon: '🚀' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    // Step 1: Business
    business_name: '',
    industry: '',
    target_audience: '',
    brand_voice: '',
    products_services: [] as string[],
    unique_selling_points: [] as string[],
    content_pillars: [] as string[],
    platforms: [] as string[],
    competitors: [] as string[],
    additional_notes: '',
    // Step 2: Brand Style
    color_palette: [
      { name: 'Primary', hex: '#E8C4B8', usage: 'Main brand color' },
      { name: 'Secondary', hex: '#F5E6D3', usage: 'Backgrounds' },
      { name: 'Accent', hex: '#B76E79', usage: 'CTAs and highlights' },
    ] as Array<{ name: string; hex: string; usage: string }>,
    photography_style: '',
    product_styling_rules: '',
    creator_description: '',
    wardrobe_notes: '',
    tone_descriptors: [] as string[],
    taglish_ratio: 0.4,
    banned_ai_words: ['unleash', 'elevate', 'game-changer', 'delve', 'tapestry', 'leverage'] as string[],
    // Step 3: Products
    products: [] as Array<{
      name: string; description: string; price: string;
      product_type: string; target_audience: string;
      usps: string[]; offer_details: string;
    }>,
    // Step 4: Persona
    character_name: '',
    backstory: '',
    appearance: '',
    voice_preset: 'warm_empowering',
    custom_voice_notes: '',
  })

  const supabase = createClient()

  // Check if already onboarded
  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('business_name')
        .limit(1)
        .maybeSingle()
      // If they have a profile, pre-fill what we can
      if (profile?.business_name) {
        const { data: fullProfile } = await supabase
          .from('business_profiles')
          .select('*')
          .limit(1)
          .single()
        if (fullProfile) {
          setData(prev => ({
            ...prev,
            business_name: fullProfile.business_name || '',
            industry: fullProfile.industry || '',
            target_audience: fullProfile.target_audience || '',
            brand_voice: fullProfile.brand_voice || '',
            products_services: fullProfile.products_services || [],
            unique_selling_points: fullProfile.unique_selling_points || [],
            content_pillars: fullProfile.content_pillars || [],
            platforms: fullProfile.platforms || [],
            competitors: fullProfile.competitors || [],
            additional_notes: fullProfile.additional_notes || '',
          }))
        }
      }
    }
    checkOnboarding()
  }, [])

  const updateData = (partial: Partial<typeof data>) => {
    setData(prev => ({ ...prev, ...partial }))
  }

  const saveStep = async () => {
    setSaving(true)
    try {
      if (step === 0) {
        // Save business profile
        const { data: existing } = await supabase.from('business_profiles').select('id').limit(1).maybeSingle()
        const profileData = {
          business_name: data.business_name,
          industry: data.industry,
          target_audience: data.target_audience,
          brand_voice: data.brand_voice,
          products_services: data.products_services.filter(Boolean),
          unique_selling_points: data.unique_selling_points.filter(Boolean),
          content_pillars: data.content_pillars.filter(Boolean),
          platforms: data.platforms.filter(Boolean),
          competitors: data.competitors.filter(Boolean),
          additional_notes: data.additional_notes,
        }
        if (existing?.id) {
          await supabase.from('business_profiles').update(profileData).eq('id', existing.id)
        } else {
          await supabase.from('business_profiles').insert(profileData)
        }
      } else if (step === 1) {
        // Save brand style guide
        const { data: existing } = await supabase.from('brand_style_guide').select('id').limit(1).maybeSingle()
        const brandData = {
          color_palette: data.color_palette,
          photography_style: data.photography_style,
          product_styling_rules: data.product_styling_rules,
          creator_description: data.creator_description,
          wardrobe_notes: data.wardrobe_notes,
          voice_rubric: {
            tone_descriptors: data.tone_descriptors.filter(Boolean),
            taglish_ratio: { target: data.taglish_ratio, tolerance: 0.15 },
            banned_ai_words: data.banned_ai_words.filter(Boolean),
          },
          caption_rules: {
            max_length: 2200,
            hashtag_count: { min: 5, max: 15 },
            emoji_density: 'moderate',
          },
          typography: {},
        }
        if (existing?.id) {
          await supabase.from('brand_style_guide').update(brandData).eq('id', existing.id)
        } else {
          await supabase.from('brand_style_guide').insert(brandData)
        }
      } else if (step === 2) {
        // Save products
        for (const product of data.products) {
          if (!product.name) continue
          await supabase.from('product_catalog').upsert({
            name: product.name,
            description: product.description,
            price: product.price,
            product_type: product.product_type || 'course',
            target_audience: product.target_audience,
            usps: product.usps?.filter(Boolean) || [],
            offer_details: product.offer_details,
            is_active: true,
          }, { onConflict: 'name' }).select()
        }
      } else if (step === 3) {
        // Save persona
        const { data: existing } = await supabase.from('brand_persona').select('id').limit(1).maybeSingle()
        const personaData = {
          character_name: data.character_name,
          backstory: data.backstory,
          appearance: data.appearance,
          voice_preset: data.voice_preset,
          custom_voice_notes: data.custom_voice_notes,
        }
        if (existing?.id) {
          await supabase.from('brand_persona').update({ ...personaData, updated_at: new Date().toISOString() }).eq('id', existing.id)
        } else {
          await supabase.from('brand_persona').insert(personaData)
        }
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    await saveStep()
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => setStep(s => Math.max(s - 1, 0))

  const handleFinish = () => router.push('/create')

  return (
    <>
      <PageHeader
        title="Set Up Your Brand"
        subtitle="Tell us about your business so AI can create on-brand content"
      />

      {/* Progress bar */}
      <div className={styles.progress}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`${styles.stepDot} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`}
            onClick={() => i <= step && setStep(i)}
          >
            <span className={styles.stepIcon}>{i < step ? '✓' : s.icon}</span>
            <span className={styles.stepLabel}>{s.label}</span>
          </button>
        ))}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className={styles.stepContent}>
        {step === 0 && <StepBusiness data={data} onChange={updateData} />}
        {step === 1 && <StepBrand data={data} onChange={updateData} />}
        {step === 2 && <StepProducts data={data} onChange={updateData} />}
        {step === 3 && <StepPersona data={data} onChange={updateData} />}
        {step === 4 && <StepComplete />}
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        {step > 0 && step < 4 && (
          <button className={styles.backBtn} onClick={handleBack}>← Back</button>
        )}
        <div className={styles.spacer} />
        {step < 3 && (
          <button className={styles.nextBtn} onClick={handleNext} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue →'}
          </button>
        )}
        {step === 3 && (
          <button className={styles.nextBtn} onClick={handleNext} disabled={saving}>
            {saving ? 'Saving...' : 'Finish Setup →'}
          </button>
        )}
        {step === 4 && (
          <button className={styles.nextBtn} onClick={handleFinish}>
            🚀 Start Creating
          </button>
        )}
      </div>
    </>
  )
}
