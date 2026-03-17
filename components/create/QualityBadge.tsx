import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

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
  const isRed = score.composite < 0.6

  const colors = {
    bg: isGreen ? '#dcfce7' : isYellow ? '#fef08a' : '#fee2e2',
    text: isGreen ? '#166534' : isYellow ? '#854d0e' : '#991b1b',
    border: isGreen ? '#bbf7d0' : isYellow ? '#fde047' : '#fecaca',
  }

  const Icon = isGreen ? CheckCircle2 : isYellow ? AlertTriangle : XCircle
  const label = isGreen ? 'Passed' : isYellow ? 'Needs Revision' : 'Failed'

  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      backgroundColor: colors.bg,
      color: colors.text,
      overflow: 'hidden'
    }}>
      <div 
        style={{ 
          padding: '12px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: score.feedback.length > 0 ? 'pointer' : 'default'
        }}
        onClick={() => score.feedback.length > 0 && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon size={18} />
          <span style={{ fontWeight: 600 }}>Brand Voice: {label}</span>
          <span style={{ 
            backgroundColor: 'white', 
            padding: '2px 6px', 
            borderRadius: '12px', 
            fontSize: '0.8rem',
            marginLeft: '8px'
          }}>
            {Math.round(score.composite * 100)}%
          </span>
        </div>
        
        {score.feedback.length > 0 && (
          <button style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer', padding: 0 }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && score.feedback.length > 0 && (
        <div style={{ 
          padding: '0 16px 16px 16px', 
          borderTop: `1px solid ${colors.border}`,
          marginTop: '4px',
          paddingTop: '12px',
          fontSize: '0.9rem'
        }}>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {score.feedback.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
