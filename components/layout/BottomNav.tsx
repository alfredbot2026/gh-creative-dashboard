'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/create', label: 'Create' },
  { href: '/library', label: 'Library' },
  { href: '/settings', label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
          >
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
