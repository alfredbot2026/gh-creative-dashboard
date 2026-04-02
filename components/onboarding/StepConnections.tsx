'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Link2, AlertCircle } from 'lucide-react'
import styles from './steps.module.css'

interface StepConnectionsProps {
  onComplete?: () => void
}

export default function StepConnections({ onComplete }: StepConnectionsProps) {
  const [connections, setConnections] = useState({
    meta: false,
    youtube: false,
  })
  const [loading, setLoading] = useState({
    meta: false,
    youtube: false,
  })
  const supabase = createClient()

  // Check existing connections on load
  useEffect(() => {
    const checkConnections = async () => {
      const { data: metaData } = await supabase
        .from('meta_tokens')
        .select('id')
        .limit(1)
        .maybeSingle()
      
      const { data: ytData } = await supabase
        .from('youtube_tokens')
        .select('id')
        .limit(1)
        .maybeSingle()

      setConnections({
        meta: !!metaData,
        youtube: !!ytData,
      })
    }
    checkConnections()
  }, [])

  const handleMetaConnect = async () => {
    setLoading(l => ({ ...l, meta: true }))
    // Redirect to Meta OAuth flow
    window.location.href = '/api/auth/meta'
  }

  const handleYouTubeConnect = async () => {
    setLoading(l => ({ ...l, youtube: true }))
    // Redirect to YouTube OAuth flow
    window.location.href = '/api/auth/youtube'
  }

  const allConnected = connections.meta && connections.youtube
  const atLeastOne = connections.meta || connections.youtube

  return (
    <div className={styles.step}>
      <h2 className={styles.stepTitle}>🔗 Connect Your Accounts</h2>
      <p className={styles.stepDesc}>
        Link your platforms to analyze performance and sync content. 
        You can skip this and connect later in Settings.
      </p>

      <div className={styles.connectionsList}>
        {/* Meta Connection */}
        <div className={`${styles.connectionCard} ${connections.meta ? styles.connected : ''}`}>
          <div className={styles.connectionInfo}>
            <div className={styles.connectionIcon} style={{ background: '#1877F2' }}>
              📘
            </div>
            <div className={styles.connectionDetails}>
              <h4>Meta (Facebook & Instagram)</h4>
              <p>Connect to analyze ad performance and sync audiences</p>
              {connections.meta && (
                <span className={styles.connectedBadge}>
                  <Check size={12} /> Connected
                </span>
              )}
            </div>
          </div>
          <button
            className={connections.meta ? styles.btnOutline : styles.btnPrimary}
            onClick={handleMetaConnect}
            disabled={loading.meta || connections.meta}
          >
            {loading.meta ? (
              <><Loader2 size={16} className={styles.spinning} /> Connecting...</>
            ) : connections.meta ? (
              'Connected'
            ) : (
              'Connect'
            )}
          </button>
        </div>

        {/* YouTube Connection */}
        <div className={`${styles.connectionCard} ${connections.youtube ? styles.connected : ''}`}>
          <div className={styles.connectionInfo}>
            <div className={styles.connectionIcon} style={{ background: '#FF0000' }}>
              ▶️
            </div>
            <div className={styles.connectionDetails}>
              <h4>YouTube</h4>
              <p>Connect to analyze video performance and track analytics</p>
              {connections.youtube && (
                <span className={styles.connectedBadge}>
                  <Check size={12} /> Connected
                </span>
              )}
            </div>
          </div>
          <button
            className={connections.youtube ? styles.btnOutline : styles.btnPrimary}
            onClick={handleYouTubeConnect}
            disabled={loading.youtube || connections.youtube}
          >
            {loading.youtube ? (
              <><Loader2 size={16} className={styles.spinning} /> Connecting...</>
            ) : connections.youtube ? (
              'Connected'
            ) : (
              'Connect'
            )}
          </button>
        </div>
      </div>

      {!atLeastOne && (
        <div className={styles.skipNote}>
          <AlertCircle size={14} />
          <span>You can skip this step and connect accounts later in Settings</span>
        </div>
      )}

      {atLeastOne && (
        <div className={styles.successNote}>
          <Check size={14} />
          <span>Great! You can add more connections anytime in Settings</span>
        </div>
      )}
    </div>
  )
}