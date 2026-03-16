/**
 * ScriptDetail Component
 * Full production script view in P2P Ad Script format.
 * Shows: Header info → Scene Brief table → Script timeline table.
 * Opens when clicking a content card on the calendar.
 */
'use client'

import { X, Pencil, Film, Clock } from 'lucide-react'
import styles from './ScriptDetail.module.css'

/* Content item shape (from calendar page) */
interface ContentItem {
    id: string
    title: string
    content_type: string
    platform?: string
    scheduled_date: string
    status: string
    hook?: string
    cta?: string
    notes?: string
    script_data?: {
        format?: string
        length?: string
        scene_brief?: {
            visual_goal?: string
            setting?: string
            camera?: string
            first_frame?: string
            lighting?: string
            avoid?: string
            mood_ref?: string
        }
        script?: Array<{
            time: string
            visual: string
            says: string
            text_overlay: string
        }>
    }
    generation_reasoning?: string
    research_refs?: string[]
}

interface ScriptDetailProps {
    item: ContentItem
    onClose: () => void
    onEdit: () => void
}

export default function ScriptDetail({ item, onClose, onEdit }: ScriptDetailProps) {
    const script = item.script_data
    const hasScript = script && (script.scene_brief || script.script)

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>{item.title}</h2>
                        <div className={styles.meta}>
                            <span className={styles.badge}>{item.content_type}</span>
                            {item.platform && <span className={styles.badge}>{item.platform}</span>}
                            {script?.format && (
                                <span className={styles.format}>
                                    <Film size={12} /> {script.format}
                                </span>
                            )}
                            {script?.length && (
                                <span className={styles.format}>
                                    <Clock size={12} /> {script.length}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={styles.headerButtons}>
                        <button className={styles.editButton} onClick={onEdit}>
                            <Pencil size={14} /> Edit
                        </button>
                        <button className={styles.closeButton} onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className={styles.body}>
                    {/* Hook section */}
                    {item.hook && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Hook</h3>
                            <p className={styles.hookText}>&ldquo;{item.hook}&rdquo;</p>
                        </div>
                    )}

                    {/* Scene Brief — production-style table */}
                    {hasScript && script?.scene_brief && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Scene Brief</h3>
                            <table className={styles.briefTable}>
                                <tbody>
                                    {script.scene_brief.visual_goal && (
                                        <tr>
                                            <td className={styles.briefLabel}>**Visual Goal**</td>
                                            <td>{script.scene_brief.visual_goal}</td>
                                        </tr>
                                    )}
                                    {script.scene_brief.setting && (
                                        <tr>
                                            <td className={styles.briefLabel}>**Setting**</td>
                                            <td>{script.scene_brief.setting}</td>
                                        </tr>
                                    )}
                                    {script.scene_brief.camera && (
                                        <tr>
                                            <td className={styles.briefLabel}>**Camera**</td>
                                            <td>{script.scene_brief.camera}</td>
                                        </tr>
                                    )}
                                    {script.scene_brief.first_frame && (
                                        <tr>
                                            <td className={styles.briefLabel}>**First Frame**</td>
                                            <td>{script.scene_brief.first_frame}</td>
                                        </tr>
                                    )}
                                    {script.scene_brief.lighting && (
                                        <tr>
                                            <td className={styles.briefLabel}>**Lighting**</td>
                                            <td>{script.scene_brief.lighting}</td>
                                        </tr>
                                    )}
                                    {script.scene_brief.avoid && (
                                        <tr>
                                            <td className={styles.briefLabel}>**Avoid**</td>
                                            <td>{script.scene_brief.avoid}</td>
                                        </tr>
                                    )}
                                    {script.scene_brief.mood_ref && (
                                        <tr>
                                            <td className={styles.briefLabel}>**Mood Ref**</td>
                                            <td>{script.scene_brief.mood_ref}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Script Table — time-based production script */}
                    {hasScript && script?.script && script.script.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Script</h3>
                            <table className={styles.scriptTable}>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Visual</th>
                                        <th>Says</th>
                                        <th>Text Overlay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {script.script.map((row, i) => (
                                        <tr key={i}>
                                            <td className={styles.timeCell}>{row.time}</td>
                                            <td>{row.visual}</td>
                                            <td className={styles.saysCell}>&ldquo;{row.says}&rdquo;</td>
                                            <td className={styles.overlayCell}>{row.text_overlay}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* CTA */}
                    {item.cta && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Call to Action</h3>
                            <p className={styles.ctaText}>{item.cta}</p>
                        </div>
                    )}

                    {/* Generation reasoning */}
                    {item.generation_reasoning && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Why This Content</h3>
                            <p className={styles.reasoning}>{item.generation_reasoning}</p>
                        </div>
                    )}

                    {/* Research refs */}
                    {item.research_refs && item.research_refs.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Research Sources</h3>
                            <ul className={styles.refsList}>
                                {item.research_refs.map((ref, i) => (
                                    <li key={i}>{ref}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Notes</h3>
                            <p className={styles.notes}>{item.notes}</p>
                        </div>
                    )}

                    {/* No script data — show prompt to generate */}
                    {!hasScript && (
                        <div className={styles.emptyScript}>
                            <Film size={32} />
                            <p>No production script yet.</p>
                            <p className={styles.emptyHint}>
                                Use &quot;Generate Week&quot; to create scripts with scene briefs and shot-by-shot breakdowns.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
