import type { ScriptScene } from '@/lib/create/types'
import { RotateCw, Film, Clock, Anchor } from 'lucide-react'

interface SceneCardProps {
  scene: ScriptScene
  onRegenerate?: (sceneNumber: number) => void
}

export default function SceneCard({ scene, onRegenerate }: SceneCardProps) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      backgroundColor: 'var(--surface)'
    }}>
      {/* Header: Scene Number & Duration */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            Scene {scene.scene_number}
          </span>
          {scene.hook_type && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--accent-purple-light, #f3e8ff)',
              color: 'var(--accent-purple-dark, #6b21a8)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <Anchor size={12} />
              {scene.hook_type}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <Clock size={14} />
          <span>{scene.duration_seconds}s</span>
        </div>
      </div>

      {/* Visual Direction */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        color: 'var(--text-muted)', 
        fontStyle: 'italic', 
        fontSize: '0.95rem',
        marginBottom: '12px',
        padding: '8px',
        backgroundColor: 'var(--surface-hover)',
        borderRadius: '6px'
      }}>
        <Film size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{scene.visual_direction}</span>
      </div>

      {/* Script Text */}
      <div style={{ 
        fontSize: '1.05rem', 
        lineHeight: 1.6, 
        color: 'var(--text)',
        marginBottom: scene.b_roll_suggestion ? '12px' : '0'
      }}>
        {scene.script_text}
      </div>

      {/* B-Roll Suggestion */}
      {scene.b_roll_suggestion && (
        <div style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          padding: '6px 10px',
          borderLeft: '3px solid var(--primary)',
          backgroundColor: 'var(--surface-hover)',
          marginTop: '12px'
        }}>
          <strong>B-Roll Idea:</strong> {scene.b_roll_suggestion}
        </div>
      )}

      {/* Footer Actions */}
      {onRegenerate && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => onRegenerate(scene.scene_number)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <RotateCw size={14} />
            Regenerate Scene
          </button>
        </div>
      )}
    </div>
  )
}
