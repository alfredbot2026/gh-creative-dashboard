/**
 * StatusBadge — Color-coded status pill
 * Maps status strings to semantic colors.
 * Used in Ad Performance cards and Content Calendar.
 */
import styles from './StatusBadge.module.css'

/* Status-to-color mapping */
type StatusType =
    | 'scale'
    | 'monitor'
    | 'kill'
    | 'pause'
    | 'planned'
    | 'in_progress'
    | 'created'
    | 'published'
    | 'draft'
    | 'active'
    | 'completed'

interface StatusBadgeProps {
    status: StatusType | string
    size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    /* Normalize display text */
    const displayText = status.replace(/_/g, ' ')

    return (
        <span
            className={`${styles.badge} ${styles[status] || ''} ${styles[size]}`}
        >
            {displayText}
        </span>
    )
}
