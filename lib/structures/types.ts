export interface StructureBlock {
  id: string
  label: string
  timing: string          // e.g., "0-3s"
  duration_hint: string   // e.g., "3s"
  instruction: string
  example?: string
  rules?: string[]
}

export interface ContentStructure {
  name: string
  slug: string
  description: string
  source_creator: string
  content_type: 'reel' | 'youtube' | 'ad' | 'story'
  purpose: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  blocks: StructureBlock[]
  ideal_length_min: number | null
  ideal_length_max: number | null
  is_cutting_edge: boolean
  sort_order: number
}

export interface TechniqueEntry {
  name: string
  slug: string
  category: 'hook' | 'retention' | 'algorithm' | 'production' | 'strategy'
  description: string
  source_creator: string
  steps: { step: number; text: string }[]
  examples: { text: string; context?: string }[]
  timing_rules: Record<string, string>
  is_cutting_edge: boolean
  sort_order: number
}
