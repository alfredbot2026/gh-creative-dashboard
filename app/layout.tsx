/**
 * Root Layout — Mission Control
 * Wraps all pages with sidebar navigation + main content area.
 * Uses Inter + Fira Code fonts from Google.
 */
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export const metadata: Metadata = {
  title: 'Creative Studio — Graceful Homeschooling',
  description: 'Your AI-powered content creation studio',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f0f12" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
