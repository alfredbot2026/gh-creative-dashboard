/**
 * Plan Preview Modal
 * Shows AI-generated content plan before saving.
 * User can review items, then save all to calendar.
 */
'use client'

import { X, Sparkles, Check, Loader2 } from 'lucide-react'
import styles from './PlanPreview.module.css'

/* Content item shape from the generate-plan API */
interface GeneratedItem {
    title: string
    content_type: string
    platform: string
    hook: string
    cta: string
    scheduled_date: string
    reasoning: string
    research_refs: string[]
}

interface PlanPreviewProps {
    plan: {
        week_summary: string
        items: GeneratedItem[]
    }
    provider: string
    onSave: () => void
    onClose: () => void
    saving: boolean
}

export default function PlanPreview({ plan, provider, onSave, onClose, saving }: PlanPreviewProps) {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Sparkles size={18} className={styles.sparkle} />
                        <h2>Generated Content Plan</h2>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Summary */}
                <p className={styles.summary}>{plan.week_summary}</p>
                <span className={styles.provider}>Generated via {provider}</span>

                {/* Items list */}
                <div className={styles.itemsList}>
                    {plan.items.map((item, i) => (
                        <div key={i} className={styles.item}>
                            <div className={styles.itemHeader}>
                                <span className={styles.itemTitle}>{item.title}</span>
                                <div className={styles.itemTags}>
                                    <span className={styles.typeTag}>{item.content_type}</span>
                                    <span className={styles.platformTag}>{item.platform}</span>
                                </div>
                            </div>
                            <div className={styles.itemDate}>{item.scheduled_date}</div>
                            {item.hook && (
                                <p className={styles.itemHook}>&ldquo;{item.hook}&rdquo;</p>
                            )}
                            {item.reasoning && (
                                <p className={styles.itemReasoning}>{item.reasoning}</p>
                            )}
                            {item.research_refs.length > 0 && (
                                <div className={styles.refs}>
                                    {item.research_refs.map((ref, j) => (
                                        <span key={j} className={styles.refTag}>{ref}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.cancelButton} onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button className={styles.saveButton} onClick={onSave} disabled={saving}>
                        {saving ? (
                            <><Loader2 size={14} className={styles.spinner} /> Saving...</>
                        ) : (
                            <><Check size={14} /> Save All to Calendar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
