'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/create', label: 'Create' },
  { href: '/insights', label: 'Insights' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/library', label: 'Library' },
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
        <Link
          href="/settings"
          className={`${styles.navItem} ${isActive('/settings') ? styles.active : ''}`}
        >
          Settings
        </Link>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Log Out
        </button>
      </div>
    </aside>
  )
}
