'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './Sidebar.module.css'
import { Home, PlusCircle, Calendar, Library, Settings, LogOut } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon?: any
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/create', label: 'Create', icon: PlusCircle },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/library', label: 'Library', icon: Library },
]

const BOTTOM_ITEMS: NavItem[] = [
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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandText}>Creative Studio</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
            >
              {Icon && <Icon size={18} className={styles.icon} />}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className={styles.bottom}>
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
            >
              {Icon && <Icon size={18} className={styles.icon} />}
              {item.label}
            </Link>
          )
        })}
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={18} className={styles.icon} />
          Log Out
        </button>
      </div>
    </aside>
  )
}
