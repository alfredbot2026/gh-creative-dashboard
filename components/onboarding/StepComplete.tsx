'use client'
import styles from './steps.module.css'

export default function StepComplete() {
  return (
    <div className={styles.complete}>
      <div className={styles.completeIcon}>🎉</div>
      <h2 className={styles.title}>You're All Set!</h2>
      <p className={styles.subtitle}>
        Your brand is configured. Every piece of content AI generates will now match your colors, voice, and style.
      </p>
      <div className={styles.whatNext}>
        <h3>What you can do now:</h3>
        <ul>
          <li>📝 <strong>Create short-form scripts</strong> — AI writes in your voice with proven hooks</li>
          <li>📣 <strong>Generate ad copy</strong> — with images featuring your brand colors</li>
          <li>📱 <strong>Write social posts</strong> — Taglish captions with hashtags, ready to paste</li>
          <li>📅 <strong>Plan your content calendar</strong> — AI suggests the right content mix</li>
        </ul>
      </div>
    </div>
  )
}
