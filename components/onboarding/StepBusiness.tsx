'use client'
import styles from './steps.module.css'

interface Props {
  data: any
  onChange: (partial: any) => void
}

export default function StepBusiness({ data, onChange }: Props) {
  const addToList = (field: string) => {
    onChange({ [field]: [...(data[field] || []), ''] })
  }
  const updateList = (field: string, i: number, val: string) => {
    const arr = [...(data[field] || [])]
    arr[i] = val
    onChange({ [field]: arr })
  }
  const removeFromList = (field: string, i: number) => {
    onChange({ [field]: (data[field] || []).filter((_: any, idx: number) => idx !== i) })
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Tell us about your business</h2>
      <p className={styles.subtitle}>This helps AI understand your brand context</p>

      <label className={styles.label}>
        Business Name *
        <input className={styles.input} value={data.business_name} onChange={e => onChange({ business_name: e.target.value })} placeholder="e.g. Papers to Profits" />
      </label>

      <label className={styles.label}>
        Industry
        <input className={styles.input} value={data.industry} onChange={e => onChange({ industry: e.target.value })} placeholder="e.g. Paper crafting business education" />
      </label>

      <label className={styles.label}>
        Target Audience
        <textarea className={styles.textarea} rows={2} value={data.target_audience} onChange={e => onChange({ target_audience: e.target.value })} placeholder="e.g. Filipino stay-at-home moms ages 25-45 who want to earn from home" />
      </label>

      <label className={styles.label}>
        Brand Voice
        <textarea className={styles.textarea} rows={2} value={data.brand_voice} onChange={e => onChange({ brand_voice: e.target.value })} placeholder="e.g. Warm, encouraging, relatable — speaks like a trusted ate" />
      </label>

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Content Pillars</span>
          <button className={styles.addBtn} onClick={() => addToList('content_pillars')}>+ Add</button>
        </div>
        {(data.content_pillars || []).map((item: string, i: number) => (
          <div key={i} className={styles.listItem}>
            <input className={styles.input} value={item} onChange={e => updateList('content_pillars', i, e.target.value)} placeholder="e.g. Proof, Education, Relatability" />
            <button className={styles.removeBtn} onClick={() => removeFromList('content_pillars', i)}>×</button>
          </div>
        ))}
      </div>

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Platforms</span>
          <button className={styles.addBtn} onClick={() => addToList('platforms')}>+ Add</button>
        </div>
        {(data.platforms || []).map((item: string, i: number) => (
          <div key={i} className={styles.listItem}>
            <input className={styles.input} value={item} onChange={e => updateList('platforms', i, e.target.value)} placeholder="e.g. Facebook, Instagram, TikTok" />
            <button className={styles.removeBtn} onClick={() => removeFromList('platforms', i)}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
