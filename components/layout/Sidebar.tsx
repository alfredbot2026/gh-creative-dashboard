'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  PenTool,
  Film,
  Megaphone,
  MessageCircle,
  Youtube,
  BookOpen,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    defaultOpen: true,
    items: [
      { href: '/', label: 'Home', icon: LayoutDashboard },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    label: 'Create',
    defaultOpen: true,
    items: [
      { href: '/create/short-form', label: 'Short-form Scripts', icon: PenTool },
      { href: '/create/ads', label: 'Ads', icon: Megaphone },
      { href: '/create/social-post', label: 'Social Posts', icon: MessageCircle },
      { href: '/create/youtube', label: 'YouTube Scripts', icon: Film },
    ],
  },
  {
    label: 'Insights',
    defaultOpen: false,
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/ads', label: 'Ad Performance', icon: BarChart3 },
      { href: '/analytics/short-form', label: 'Script Performance', icon: BarChart3 },
    ],
  },
  {
    label: 'Knowledge',
    defaultOpen: false,
    items: [
      { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
      { href: '/knowledge/extract', label: 'Extract', icon: Sparkles },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/onboarding', label: 'Brand Setup', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  const toggleGroup = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const isGroupOpen = (group: NavGroup) => {
    if (!group.label) return true // ungrouped items always visible
    if (collapsed[group.label] !== undefined) return !collapsed[group.label]
    // Auto-open if any child is active
    return group.defaultOpen || group.items.some(item => isActive(item.href))
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandEmoji}>✨</span>
        <span className={styles.brandText}>Creative Studio</span>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label || 'top'} className={styles.group}>
            {group.label && (
              <button
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.label)}
              >
                <span>{group.label}</span>
                <ChevronDown
                  size={14}
                  className={`${styles.chevron} ${isGroupOpen(group) ? styles.open : ''}`}
                />
              </button>
            )}

            {isGroupOpen(group) && (
              <div className={styles.groupItems}>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
