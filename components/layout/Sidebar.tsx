/**
 * Sidebar Navigation Component
 * Vertical nav for Mission Control with Lucide icons.
 * Active state indicator + responsive collapse on mobile.
 */
'use client'

import { usePathname, useRouter } from 'next/navigation'
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
    Sparkles,
    TestTube,
    LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './Sidebar.module.css'

/* -- Navigation items with routes and icons -- */
const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/ads', label: 'Ad Performance', icon: BarChart3 },
    {
        href: '/analytics',
        label: 'Analytics',
        icon: BarChart3,
        subItems: [
            { href: '/analytics/short-form', label: 'Short-form Performance', icon: BarChart3 }
        ]
    },
    { href: '/youtube', label: 'YouTube', icon: Youtube },
    { href: '/research', label: 'Research Hub', icon: Lightbulb },
    { 
        href: '/knowledge', 
        label: 'Knowledge Base', 
        icon: BookOpen,
        subItems: [
            { href: '/knowledge/extract', label: 'Extract Knowledge', icon: Sparkles }
        ]
    },
    {
        href: '/create',
        label: 'Create',
        icon: Sparkles,
        subItems: [
            { href: '/create/short-form', label: 'Short-form Scripts', icon: Rocket },
            { href: '/create/ads', label: 'Ads', icon: Rocket },
            { href: '/create/social-post', label: 'Social Posts', icon: Rocket }
        ]
    },
    { href: '/eval', label: 'Eval', icon: TestTube },
    { href: '/upload', label: 'Upload', icon: Upload },
    { href: '/chat', label: 'AI Chat', icon: MessageSquare },
    { href: '/onboarding', label: 'Brand Setup', icon: Settings },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

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
                            : pathname === item.href || (pathname.startsWith(item.href) && !item.subItems?.some(sub => pathname.startsWith(sub.href)))

                    return (
                        <div key={item.href} style={{ display: 'flex', flexDirection: 'column' }}>
                            <Link
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            >
                                <item.icon size={20} />
                                <span className={styles.navLabel}>{item.label}</span>
                            </Link>

                            {/* Render subItems if any */}
                            {item.subItems && item.subItems.map((subItem) => {
                                const isSubActive = pathname.startsWith(subItem.href)
                                return (
                                    <Link
                                        key={subItem.href}
                                        href={subItem.href}
                                        className={`${styles.navSubItem} ${isSubActive ? styles.activeSub : ''}`}
                                    >
                                        <subItem.icon size={16} />
                                        <span className={styles.navLabel}>{subItem.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    )
                })}
            </nav>

            {/* Footer with logout action */}
            <div className={styles.footer}>
                <button onClick={handleLogout} className={styles.logoutButton}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    )
}
