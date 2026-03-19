import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import styles from './QualityBadge.module.css'

interface QualityScore {
  composite: number
  passed_gate: boolean
  feedback: string[]
}

interface QualityBadgeProps {
  score: QualityScore
}

export default function QualityBadge({ score }: QualityBadgeProps) {
  const [expanded, setExpanded] = useState(false)
  const isGreen = score.composite >= 0.8
  const isYellow = score.composite >= 0.6 && score.composite < 0.8

  const colorClass = isGreen ? styles.green : isYellow ? styles.yellow : styles.red
  const Icon = isGreen ? CheckCircle2 : isYellow ? AlertTriangle : XCircle
  const label = isGreen ? 'Passed' : isYellow ? 'Needs Revision' : 'Failed'
  const hasDetails = score.feedback.length > 0

  return (
    <div className={`${styles.badge} ${colorClass}`}>
      <div
        className={`${styles.badgeHeader} ${hasDetails ? styles.clickable : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className={styles.badgeLeft}>
          <Icon size={18} />
          <span className={styles.badgeLabel}>Brand Voice: {label}</span>
          <span className={styles.scorePill}>
            {Math.round(score.composite * 100)}%
          </span>
        </div>

        {hasDetails && (
          <button className={styles.chevronBtn} aria-label="Toggle feedback">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className={styles.feedbackPanel}>
          <ul className={styles.feedbackList}>
            {score.feedback.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
