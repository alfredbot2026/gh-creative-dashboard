/**
 * Sidebar Navigation Component
 * Vertical nav for Mission Control with Lucide icons.
 * Active state indicator + responsive collapse on mobile.
 */
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    Youtube,
    Lightbulb,
    BookOpen,
    Upload,
    Rocket,
    Settings,
    MessageSquare,
} from 'lucide-react'
import styles from './Sidebar.module.css'

/* -- Navigation items with routes and icons -- */
const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/ads', label: 'Ad Performance', icon: BarChart3 },
    { href: '/youtube', label: 'YouTube', icon: Youtube },
    { href: '/research', label: 'Research Hub', icon: Lightbulb },
    { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
    { href: '/upload', label: 'Upload', icon: Upload },
    { href: '/chat', label: 'AI Chat', icon: MessageSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className={styles.sidebar}>
            {/* Brand header */}
            <div className={styles.brand}>
                <Rocket className={styles.brandIcon} size={24} />
                <span className={styles.brandText}>Mission Control</span>
            </div>

            {/* Navigation links */}
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    /* Exact match for home, startsWith for other routes */
                    const isActive =
                        item.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <item.icon size={20} />
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Footer with subtle branding */}
            <div className={styles.footer}>
                <span className={styles.footerText}>GH Creative</span>
            </div>
        </aside>
    )
}
