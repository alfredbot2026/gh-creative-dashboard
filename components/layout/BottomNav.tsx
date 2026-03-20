'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './BottomNav.module.css'
import { Home, PlusCircle, Library } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/create', label: 'Create', icon: PlusCircle },
  { href: '/library', label: 'Library', icon: Library },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
          >
            <Icon className={styles.icon} size={24} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
