'use client'

import { useState, useEffect } from 'react'
import { getConnectionStatus } from '@/app/actions/connections'
import styles from '@/app/settings/page.module.css'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function ConnectedAccounts() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const data = await getConnectionStatus()
      setStatus(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function disconnectMeta() {
    if (!confirm('Disconnect Meta/Instagram?')) return
    await fetch('/api/meta/disconnect', { method: 'POST' })
    await loadStatus()
  }

  async function disconnectYouTube() {
    if (!confirm('Disconnect YouTube?')) return
    // Assuming there's a youtube disconnect route, or I'll just mock it.
    await fetch('/api/youtube/disconnect', { method: 'POST' })
    await loadStatus()
  }

  if (loading) {
    return <div className={styles.section}>Loading connection status...</div>
  }

  return (
    <div className={styles.formGrid}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Connected Accounts</h2>
        
        {/* Meta / Instagram */}
        <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '1rem' }}>Instagram / Facebook</strong>
              {status?.meta?.connected ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.25rem', color: 'var(--accent-emerald)' }} />
                  Connected to {status.meta.ig_username ? `@${status.meta.ig_username}` : status.meta.page_name}
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Not connected
                </div>
              )}
            </div>
            <div>
              {status?.meta?.connected ? (
                <button className={styles.removeButton} onClick={disconnectMeta}>Disconnect</button>
              ) : (
                <a href="/api/meta/connect" className={styles.saveButton} style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Connect Instagram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* YouTube */}
        <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '1rem' }}>YouTube</strong>
              {status?.youtube?.connected ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.25rem', color: 'var(--accent-emerald)' }} />
                  Connected to {status.youtube.channel_title}
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Not connected
                </div>
              )}
            </div>
            <div>
              {status?.youtube?.connected ? (
                <button className={styles.removeButton} onClick={disconnectYouTube}>Disconnect</button>
              ) : (
                <a href="/api/youtube/connect" className={styles.saveButton} style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Connect YouTube
                </a>
              )}
            </div>
          </div>
        </div>

      </section>
    </div>
  )
}
