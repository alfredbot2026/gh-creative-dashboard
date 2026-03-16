/**
 * StatCard — Metric display component
 * Shows a label, value, and optional change indicator.
 * Used on Dashboard for KPIs (content due, spend, ROAS, etc.)
 */
import styles from './StatCard.module.css'

interface StatCardProps {
    label: string
    value: string | number
    change?: string         // e.g. "+12%" or "-3%"
    changeType?: 'positive' | 'negative' | 'neutral'
    icon?: React.ReactNode  // Lucide icon element
}

export default function StatCard({
    label,
    value,
    change,
    changeType = 'neutral',
    icon,
}: StatCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.label}>{label}</span>
                {icon && <span className={styles.icon}>{icon}</span>}
            </div>
            <div className={styles.value}>{value}</div>
            {change && (
                <span className={`${styles.change} ${styles[changeType]}`}>
                    {change}
                </span>
            )}
        </div>
    )
}
