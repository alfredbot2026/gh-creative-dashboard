/**
 * Root Layout — Mission Control
 * Wraps all pages with sidebar navigation + main content area.
 * Uses Inter + Fira Code fonts from Google.
 */
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'Mission Control — GH Creative',
  description: 'AI-powered ad-buying assistant dashboard for content creators',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  )
}
