'use client'

import { useState, useEffect } from 'react'
import styles from './TemplatePicker.module.css'

interface Template {
  id: string
  name: string
  content_purpose?: string
  content_lane?: string
  template_params: Record<string, unknown>
  times_used: number
}

interface TemplatePickerProps {
  lane: string
  onSelect: (params: Record<string, unknown>) => void
}

const PURPOSE_EMOJI: Record<string, string> = {
  educate: '📚', story: '📖', sell: '🎯', prove: '🤝', trend: '🔥', inspire: '💡',
}

export default function TemplatePicker({ lane, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data.filter(t => !lane || t.content_lane === lane))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lane])

  if (loading || templates.length === 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.label}>Quick Templates</div>
      <div className={styles.row}>
        {templates.slice(0, 5).map(t => (
          <button
            key={t.id}
            type="button"
            className={styles.chip}
            onClick={() => onSelect(t.template_params)}
            title={`Used ${t.times_used}x`}
          >
            {t.content_purpose && <span>{PURPOSE_EMOJI[t.content_purpose] || '📋'}</span>}
            <span className={styles.chipName}>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
