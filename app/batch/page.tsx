/**
 * Batch Generation Dashboard
 * Generate a full week of content across all lanes in one action.
 * Review all generated content at a glance, bulk approve/reject.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  Sparkles,
  Calendar,
  Check,
  X,
  Loader2,
  Film,
  Image as ImageIcon,
  Clapperboard,
  Megaphone,
  Save,
  RefreshCw,
} from 'lucide-react'
import styles from './page.module.css'

interface BatchItem {
  lane: 'short-form' | 'youtube' | 'social' | 'ads'
  content_type: string
  platform: string
  scheduled_date: string
  title: string
  hook?: string
  content?: Record<string, unknown>
  preview?: string
  purpose?: string
  approved?: boolean
  rejected?: boolean
}

const LANE_ICONS = {
  'short-form': Clapperboard,
  'youtube': Film,
  'social': ImageIcon,
  'ads': Megaphone,
}

const LANE_COLORS = {
  'short-form': '#8b5cf6', // purple
  'youtube': '#ef4444',    // red
  'social': '#3b82f6',     // blue
  'ads': '#f59e0b',        // amber
}

const PURPOSE_LABELS: Record<string, string> = {
  educate: '📚 Educate',
  story: '📖 Story',
  sell: '🎯 Sell',
  prove: '🤝 Prove',
  inspire: '💡 Inspire',
}

export default function BatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay()) // Start of current week (Sunday)
    return d.toISOString().split('T')[0]
  })
  const [contentMix, setContentMix] = useState({
    shortForm: 3,
    youtube: 1,
    social: 2,
    ads: 2,
  })
  const [generated, setGenerated] = useState<BatchItem[] | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/batch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, contentMix, save: false }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      
      // Mark all as pending (neither approved nor rejected)
      setGenerated(data.items.map((item: BatchItem) => ({ ...item, approved: false, rejected: false })))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (index: number) => {
    if (!generated) return
    const updated = [...generated]
    updated[index].approved = true
    updated[index].rejected = false
    setGenerated(updated)
  }

  const handleReject = (index: number) => {
    if (!generated) return
    const updated = [...generated]
    updated[index].approved = false
    updated[index].rejected = true
    setGenerated(updated)
  }

  const handleApproveAll = () => {
    if (!generated) return
    setGenerated(generated.map(item => ({ ...item, approved: true, rejected: false })))
  }

  const handleSave = async () => {
    if (!generated) return
    
    const approvedItems = generated.filter(item => item.approved && !item.rejected)
    if (approvedItems.length === 0) {
      alert('Please approve at least one item to save')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/batch/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: approvedItems,
          weekStart 
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      
      alert(`Saved ${data.saved} items to calendar!`)
      router.push('/calendar')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const approvedCount = generated?.filter(i => i.approved && !i.rejected).length || 0
  const rejectedCount = generated?.filter(i => i.rejected).length || 0

  return (
    <>
      <PageHeader
        title="Batch Generation"
        subtitle="Generate a full week of content across all lanes in one action"
      />

      <div className={styles.container}>
        {/* Configuration Panel */}
        <div className={styles.configPanel}>
          <h3 className={styles.panelTitle}>
            <Calendar size={18} /> Week Configuration
          </h3>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Week Starting (Sunday)</label>
            <input
              type="date"
              className={styles.input}
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
            />
          </div>

          <div className={styles.mixSection}>
            <label className={styles.label}>Content Mix</label>
            
            <div className={styles.mixRow}>
              <span className={styles.mixLabel}>
                <Clapperboard size={14} /> Short-form (Reels)
              </span>
              <input
                type="number"
                min={0}
                max={7}
                className={styles.numberInput}
                value={contentMix.shortForm}
                onChange={e => setContentMix(m => ({ ...m, shortForm: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className={styles.mixRow}>
              <span className={styles.mixLabel}>
                <Film size={14} /> YouTube Videos
              </span>
              <input
                type="number"
                min={0}
                max={3}
                className={styles.numberInput}
                value={contentMix.youtube}
                onChange={e => setContentMix(m => ({ ...m, youtube: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className={styles.mixRow}>
              <span className={styles.mixLabel}>
                <ImageIcon size={14} /> Social Posts
              </span>
              <input
                type="number"
                min={0}
                max={7}
                className={styles.numberInput}
                value={contentMix.social}
                onChange={e => setContentMix(m => ({ ...m, social: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className={styles.mixRow}>
              <span className={styles.mixLabel}>
                <Megaphone size={14} /> Ad Concepts
              </span>
              <input
                type="number"
                min={0}
                max={5}
                className={styles.numberInput}
                value={contentMix.ads}
                onChange={e => setContentMix(m => ({ ...m, ads: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={18} className={styles.spinning} /> Generating...</>
            ) : (
              <><Sparkles size={18} /> Generate Week Content</>
            )}
          </button>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Preview Panel */}
        <div className={styles.previewPanel}>
          {!generated ? (
            <div className={styles.emptyState}>
              <Sparkles size={48} style={{ opacity: 0.3 }} />
              <h3>No Content Generated Yet</h3>
              <p>Configure your week and click Generate to create content across all lanes.</p>
            </div>
          ) : (
            <>
              <div className={styles.previewHeader}>
                <div>
                  <h3>Generated Content</h3>
                  <p className={styles.summary}>
                    {generated.length} items ·{' '}
                    <span style={{ color: '#22c55e' }}>{approvedCount} approved</span> ·{' '}
                    <span style={{ color: '#ef4444' }}>{rejectedCount} rejected</span>
                  </p>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.btnOutline} onClick={handleApproveAll}>
                    <Check size={14} /> Approve All
                  </button>
                  <button 
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving || approvedCount === 0}
                  >
                    {saving ? (
                      <><Loader2 size={14} className={styles.spinning} /> Saving...</>
                    ) : (
                      <><Save size={14} /> Save {approvedCount} to Calendar</>
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.itemsList}>
                {generated.map((item, index) => {
                  const Icon = LANE_ICONS[item.lane]
                  const isApproved = item.approved && !item.rejected
                  const isRejected = item.rejected
                  
                  return (
                    <div 
                      key={index}
                      className={`${styles.itemCard} ${isApproved ? styles.approved : ''} ${isRejected ? styles.rejected : ''}`}
                    >
                      <div className={styles.itemHeader}>
                        <div className={styles.itemMeta}>
                          <span 
                            className={styles.laneBadge}
                            style={{ 
                              background: `${LANE_COLORS[item.lane]}20`,
                              color: LANE_COLORS[item.lane]
                            }}
                          >
                            <Icon size={12} /> {item.lane}
                          </span>
                          {item.purpose && (
                            <span className={styles.purposeBadge}>
                              {PURPOSE_LABELS[item.purpose] || item.purpose}
                            </span>
                          )}
                          <span className={styles.dateBadge}>
                            <Calendar size={12} /> {item.scheduled_date}
                          </span>
                        </div>
                        
                        <div className={styles.itemActions}>
                          <button
                            className={`${styles.actionBtn} ${isApproved ? styles.active : ''}`}
                            onClick={() => handleApprove(index)}
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${isRejected ? styles.activeReject : ''}`}
                            onClick={() => handleReject(index)}
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <h4 className={styles.itemTitle}>{item.title}</h4>
                      
                      {item.hook && (
                        <p className={styles.itemHook}>&ldquo;{item.hook}&rdquo;</p>
                      )}
                      
                      {item.preview && (
                        <p className={styles.itemPreview}>{item.preview}</p>
                      )}

                      {isApproved && (
                        <div className={styles.statusBadge}>
                          <StatusBadge status="approved" size="sm" />
                        </div>
                      )}
                      {isRejected && (
                        <div className={styles.statusBadge}>
                          <StatusBadge status="rejected" size="sm" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {approvedCount > 0 && (
                <div className={styles.footerActions}>
                  <button 
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <><Loader2 size={18} className={styles.spinning} /> Saving...</>
                    ) : (
                      <><Save size={18} /> Save {approvedCount} Items to Calendar</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}