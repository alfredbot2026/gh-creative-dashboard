/**
 * PageHeader — Consistent page title component
 * Used at the top of every page for uniform layout.
 */
import styles from './PageHeader.module.css'

interface PageHeaderProps {
    title: string
    subtitle?: string
    action?: React.ReactNode // Optional right-side button/action
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    return (
        <div className={styles.header}>
            <div>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {action && <div className={styles.action}>{action}</div>}
        </div>
    )
}
