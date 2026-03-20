/**
 * Session Manager — caches GraceImageSession instances per user.
 * 
 * Sessions expire after 30 minutes of inactivity.
 * On first request: initializes session (generates/loads anchor) → caches.
 * Subsequent requests: reuses cached session for multi-turn consistency.
 */
import { GraceImageSession } from './image-conversation'
import { getGraceReferenceImages } from './reference-images'

interface CachedSession {
  session: GraceImageSession
  lastUsed: number
}

const sessions = new Map<string, CachedSession>()
const SESSION_TTL = 30 * 60 * 1000 // 30 minutes

// Cleanup stale sessions every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, cached] of sessions) {
      if (now - cached.lastUsed > SESSION_TTL) {
        sessions.delete(key)
        console.log(`[SessionManager] Expired session for user ${key}`)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Get or create a GraceImageSession for a user.
 * Reference images are loaded internally from local files.
 */
export async function getOrCreateSession(userId: string, forceNew = false): Promise<GraceImageSession> {
  if (!forceNew) {
    const cached = sessions.get(userId)
    if (cached && Date.now() - cached.lastUsed < SESSION_TTL && cached.session.isInitialized) {
      cached.lastUsed = Date.now()
      return cached.session
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const session = new GraceImageSession(apiKey)

  // Load reference images from local files
  const referenceImages = getGraceReferenceImages()
  if (referenceImages.length === 0) {
    throw new Error('No reference images available for Grace')
  }

  await session.initialize(referenceImages)
  sessions.set(userId, { session, lastUsed: Date.now() })
  console.log(`[SessionManager] Created new session for user ${userId}`)

  return session
}

/**
 * Invalidate a user's session (e.g., to force anchor regeneration).
 */
export function invalidateSession(userId: string): void {
  sessions.delete(userId)
}

/**
 * Get session count (for debugging).
 */
export function getActiveSessionCount(): number {
  return sessions.size
}
