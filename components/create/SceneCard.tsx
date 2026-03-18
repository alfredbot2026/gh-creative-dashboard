import type { ScriptScene } from '@/lib/create/types'
import { RotateCw, Film, Clock, Anchor } from 'lucide-react'
import styles from './SceneCard.module.css'

interface SceneCardProps {
  scene: ScriptScene
  onRegenerate?: (sceneNumber: number) => void
}

export default function SceneCard({ scene, onRegenerate }: SceneCardProps) {
  return (
    <div className={styles.card}>
      {/* Header: Scene Number & Duration */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.sceneNumberBadge}>
            Scene {scene.scene_number}
          </span>
          {scene.hook_type && (
            <span className={styles.hookTypeBadge}>
              <Anchor size={12} />
              {scene.hook_type}
            </span>
          )}
        </div>
        <div className={styles.duration}>
          <Clock size={14} />
          <span>{scene.duration_seconds}s</span>
        </div>
      </div>

      {/* Visual Direction */}
      <div className={styles.visualDirection}>
        <Film size={16} className={styles.visualIcon} />
        <span>{scene.visual_direction}</span>
      </div>

      {/* Script Text */}
      <div className={styles.scriptText}>
        {scene.script_text}
      </div>

      {/* B-Roll Suggestion */}
      {scene.b_roll_suggestion && (
        <div className={styles.brollCallout}>
          <strong>B-Roll Idea:</strong> {scene.b_roll_suggestion}
        </div>
      )}

      {/* Footer Actions */}
      {onRegenerate && (
        <div className={styles.footer}>
          <button
            onClick={() => onRegenerate(scene.scene_number)}
            className={styles.regenerateBtn}
          >
            <RotateCw size={14} />
            Regenerate Scene
          </button>
        </div>
      )}
    </div>
  )
}
