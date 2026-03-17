export interface ScriptScene {
  scene_number: number
  duration_seconds: number
  visual_direction: string
  script_text: string
  hook_type?: string
  b_roll_suggestion?: string
}

export interface ShortFormScript {
  title: string
  hook: string
  scenes: ScriptScene[]
  total_duration_seconds: number
  content_type: 'short-form-script'
  lane: 'short-form'
  topic: string
  angle: string
  cta: string
  hashtags: string[]
  caption_draft: string
  knowledge_entries_used: string[]
}

export interface GenerateShortFormRequest {
  topic: string
  angle?: string
  platform: 'instagram-reels' | 'tiktok' | 'youtube-shorts'
  target_duration?: number
  style?: 'tutorial' | 'storytelling' | 'proof' | 'mistake' | 'hook-first'
}

export interface GenerateShortFormResponse {
  script: ShortFormScript
  quality_score?: {
    composite: number
    passed_gate: boolean
    feedback: string[]
  }
  knowledge_context: {
    hooks_used: string[]
    frameworks_used: string[]
  }
}
