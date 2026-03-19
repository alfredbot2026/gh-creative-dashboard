'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/create', label: 'Create' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/library', label: 'Library' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/settings', label: 'Settings' },
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
        <span className={styles.brandEmoji}>✨</span>
        <span className={styles.brandText}>Creative Studio</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.bottom}>
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            {item.label}
          </Link>
        ))}
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Log Out
        </button>
      </div>
    </aside>
  )
}
