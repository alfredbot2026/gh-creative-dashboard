'use client'
import styles from './steps.module.css'

interface Props {
  data: any
  onChange: (partial: any) => void
}

export default function StepBrand({ data, onChange }: Props) {
  const updateColor = (i: number, field: string, val: string) => {
    const palette = [...data.color_palette]
    palette[i] = { ...palette[i], [field]: val }
    onChange({ color_palette: palette })
  }

  const addColor = () => {
    onChange({ color_palette: [...data.color_palette, { name: '', hex: '#000000', usage: '' }] })
  }

  const addToList = (field: string) => onChange({ [field]: [...(data[field] || []), ''] })
  const updateList = (field: string, i: number, val: string) => {
    const arr = [...(data[field] || [])]; arr[i] = val; onChange({ [field]: arr })
  }
  const removeFromList = (field: string, i: number) => {
    onChange({ [field]: (data[field] || []).filter((_: any, idx: number) => idx !== i) })
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Your Brand Style</h2>
      <p className={styles.subtitle}>Colors, photography style, and voice — so AI matches your aesthetic</p>

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Color Palette</span>
          <button className={styles.addBtn} onClick={addColor}>+ Add Color</button>
        </div>
        {data.color_palette.map((c: any, i: number) => (
          <div key={i} className={styles.colorRow}>
            <input type="color" value={c.hex} onChange={e => updateColor(i, 'hex', e.target.value)} className={styles.colorPicker} />
            <input className={styles.inputSmall} value={c.name} onChange={e => updateColor(i, 'name', e.target.value)} placeholder="Name" />
            <input className={styles.inputSmall} value={c.hex} onChange={e => updateColor(i, 'hex', e.target.value)} placeholder="#hex" />
            <input className={styles.input} value={c.usage} onChange={e => updateColor(i, 'usage', e.target.value)} placeholder="Usage (e.g. backgrounds)" />
          </div>
        ))}
      </div>

      <label className={styles.label}>
        Photography Style
        <textarea className={styles.textarea} rows={2} value={data.photography_style} onChange={e => onChange({ photography_style: e.target.value })} placeholder="e.g. Warm, natural light, cozy home-office feel, cream/rose gold tones" />
      </label>

      <label className={styles.label}>
        Product Styling Rules
        <textarea className={styles.textarea} rows={2} value={data.product_styling_rules} onChange={e => onChange({ product_styling_rules: e.target.value })} placeholder="e.g. Clean desk, paper supplies visible, approachable aesthetic" />
      </label>

      <label className={styles.label}>
        Creator Description (how you look in AI images)
        <textarea className={styles.textarea} rows={2} value={data.creator_description} onChange={e => onChange({ creator_description: e.target.value })} placeholder="e.g. Filipino woman, 30s, warm smile, casual-professional style" />
      </label>

      <label className={styles.label}>
        Wardrobe Notes
        <input className={styles.input} value={data.wardrobe_notes} onChange={e => onChange({ wardrobe_notes: e.target.value })} placeholder="e.g. Neutral/pastel tops, minimal jewelry" />
      </label>

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Tone Descriptors</span>
          <button className={styles.addBtn} onClick={() => addToList('tone_descriptors')}>+ Add</button>
        </div>
        {(data.tone_descriptors || []).map((item: string, i: number) => (
          <div key={i} className={styles.listItem}>
            <input className={styles.input} value={item} onChange={e => updateList('tone_descriptors', i, e.target.value)} placeholder="e.g. warm, encouraging, relatable" />
            <button className={styles.removeBtn} onClick={() => removeFromList('tone_descriptors', i)}>×</button>
          </div>
        ))}
      </div>

      <label className={styles.label}>
        Taglish Ratio ({Math.round(data.taglish_ratio * 100)}% Filipino)
        <input type="range" min="0" max="1" step="0.05" value={data.taglish_ratio} onChange={e => onChange({ taglish_ratio: parseFloat(e.target.value) })} className={styles.slider} />
        <span className={styles.hint}>{data.taglish_ratio < 0.3 ? 'Mostly English' : data.taglish_ratio < 0.6 ? 'Balanced Taglish' : 'Mostly Filipino'}</span>
      </label>
    </div>
  )
}
