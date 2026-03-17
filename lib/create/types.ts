export interface ScriptScene {
  scene_number: number
  duration_seconds: number
  visual_direction: string      // what's on screen
  script_text: string           // what's said/shown as text
  hook_type?: string            // if this scene uses a specific hook pattern
  b_roll_suggestion?: string
}

export interface ShortFormScript {
  title: string
  hook: string                  // the opening hook line
  scenes: ScriptScene[]
  total_duration_seconds: number
  content_type: 'short-form-script'
  lane: 'short-form'
  topic: string
  angle: string                 // the creative angle taken
  cta: string
  hashtags: string[]
  caption_draft: string
  knowledge_entries_used: string[]  // KB entry IDs that informed this
}

export interface GenerateShortFormRequest {
  topic: string
  angle?: string                // optional — AI picks if not provided
  platform: 'instagram-reels' | 'tiktok' | 'youtube-shorts'
  target_duration?: number      // seconds, default 30-60
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
    hooks_used: string[]        // KB entry titles used for hook patterns
    frameworks_used: string[]   // KB entry titles used for structure
  }
}
