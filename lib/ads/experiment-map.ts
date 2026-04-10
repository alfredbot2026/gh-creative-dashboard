import { extractLearningsFromCreative } from '@/lib/ads/learn-extractor'

export type CellStatus = 'untested' | 'testing' | 'inconclusive' | 'winner' | 'fatigued' | 'loser' | 'over_tested'
export type Confidence = 'high' | 'medium' | 'low' | 'gap'

export interface ExperimentCreativeRow {
  id: string
  user_id?: string
  meta_ad_id?: string | null
  angle: string | null
  persona: string | null
  ad_status: string | null
  is_active: boolean | null
  total_spend: number | null
  avg_roas: number | null
  avg_cpa: number | null
  avg_ctr: number | null
  creative_format: string | null
  body_text: string | null
  headline: string | null
  cta_text: string | null
  link_description: string | null
  hook_type: string | null
  emotional_tone: string | null
  frame_descriptions?: Array<{ timestamp_s?: number; description?: string | null }> | null
  ad_name: string | null
  first_active_date: string | null
  last_active_date: string | null
  classified_at: string | null
}

export interface CompetitiveAngleRow {
  angle?: string | null
  classification?: Record<string, unknown> | null
}

export interface CreativeLearningRow {
  ad_creative_id: string | null
  hook_family: string | null
  format: string | null
  inferred_mechanism?: string | null
}

export interface ExperimentCellRecord {
  user_id: string
  angle: string
  persona: string
  format: string | null
  hook_family: string | null
  test_count: number
  winner_count: number
  loser_count: number
  fatigued_count: number
  inconclusive_count: number
  best_roas: number | null
  best_cpa: number | null
  best_ctr: number | null
  confidence: Confidence
  status: CellStatus
  top_ad_ids: string[]
  competitor_signal: number
  first_tested_at: string | null
  last_tested_at: string | null
  updated_at?: string
}

export interface ExperimentMapResponse {
  cells: ExperimentCellRecord[]
  summary: {
    total_cells: number
    tested_cells: number
    winning_cells: number
    fatiguing_cells: number
    untested_cells: number
    coverage_pct: number
  }
  gaps: Array<{
    angle: string
    persona: string
    format: string | null
    hook_family: string | null
    priority: 'high' | 'medium' | 'low'
    reason: string
    competitor_signal: number
  }>
  last_updated: string
}

export interface CellDetailResponse {
  cell: ExperimentCellRecord & { suggested_action: 'scale' | 'refresh' | 'explore' | 'test_format' | 'test_hook_family' }
  ads: Array<{
    id: string
    ad_name: string
    status: string
    format: string | null
    hook_preview: string
    hook_family: string | null
    roas: number | null
    cpa: number | null
    ctr: number | null
    spend: number | null
    mechanism: string | null
  }>
  hook_coverage: { tested: string[]; untested: string[] }
  format_coverage: { tested: string[]; untested: string[] }
  top_performer: CellDetailResponse['ads'][number] | null
  recommendations: string[]
}

const DEFAULT_ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
const DEFAULT_PERSONAS = ['new_mom_curious', 'returning_buyer', 'price_sensitive', 'aspirational', 'skeptic', 'beginner', 'advanced', 'gift_buyer', 'busy_professional']
const DEFAULT_FORMATS = ['static_image', 'video', 'carousel']
const DEFAULT_HOOK_FAMILIES = ['question', 'bold_claim', 'pain_call', 'curiosity_gap', 'social_proof_lead', 'direct_benefit', 'story_opening', 'how_to']

function firstLine(value?: string | null) {
  return (value || '').split('\n').map(part => part.trim()).find(Boolean) || ''
}

function safeDate(value?: string | null) {
  return value ? new Date(value) : null
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function confidenceForAds(ads: ExperimentCreativeRow[]): Confidence {
  const spend = ads.reduce((sum, ad) => sum + Number(ad.total_spend || 0), 0)
  if (ads.length === 0) return 'gap'
  if (ads.length >= 4 && spend >= 4000) return 'high'
  if (ads.length >= 2 && spend >= 1000) return 'medium'
  return 'low'
}

function statusForAds(ads: ExperimentCreativeRow[]): CellStatus {
  if (ads.length === 0) return 'untested'
  const testCount = ads.length
  const winnerCount = ads.filter(ad => ad.ad_status === 'winning' && Number(ad.avg_roas || 0) >= 2).length
  const fatiguedCount = ads.filter(ad => ad.ad_status === 'tired').length
  const deadCount = ads.filter(ad => ad.ad_status === 'dead').length
  const activeCount = ads.filter(ad => ad.is_active).length

  if (testCount >= 6) return 'over_tested'
  if (testCount >= 2 && winnerCount >= 1) return 'winner'
  if (testCount >= 2 && fatiguedCount >= 1) return 'fatigued'
  if (testCount >= 2 && deadCount === testCount) return 'loser'
  if (activeCount > 0) return 'testing'
  return 'inconclusive'
}

function priorityForGap(angle: string, competitorSignal: number, hookFamily: string | null, format: string | null): 'high' | 'medium' | 'low' {
  if (competitorSignal > 0) return 'high'
  if (hookFamily || format) return 'medium'
  return ['pain_point', 'social_proof', 'transformation', 'comparison'].includes(angle) ? 'medium' : 'low'
}

function suggestedAction(cell: ExperimentCellRecord, untestedFormats: string[], untestedHooks: string[]): 'scale' | 'refresh' | 'explore' | 'test_format' | 'test_hook_family' {
  if (cell.status === 'winner') return 'scale'
  if (cell.status === 'fatigued' || cell.status === 'over_tested') return 'refresh'
  if (cell.status === 'untested') return 'explore'
  if (untestedFormats.length > 0) return 'test_format'
  if (untestedHooks.length > 0) return 'test_hook_family'
  return 'explore'
}

export function buildExperimentCells(params: {
  userId: string
  creatives: ExperimentCreativeRow[]
  competitorAngles?: string[]
  existingLearnings?: CreativeLearningRow[]
}): ExperimentCellRecord[] {
  const { userId, creatives, competitorAngles = [], existingLearnings = [] } = params
  const classified = creatives.filter(creative => creative.angle && creative.persona)
  const angles = unique([...DEFAULT_ANGLES, ...classified.map(c => c.angle!).filter(Boolean)])
  const personas = unique([...DEFAULT_PERSONAS, ...classified.map(c => c.persona!).filter(Boolean)])

  const learningMap = new Map<string, string | null>()
  for (const learning of existingLearnings) {
    if (learning.ad_creative_id) learningMap.set(learning.ad_creative_id, learning.hook_family)
  }

  const cells: ExperimentCellRecord[] = []
  for (const angle of angles) {
    for (const persona of personas) {
      const pairAds = classified.filter(ad => ad.angle === angle && ad.persona === persona)
      const pairHookFamilies = unique(pairAds.map(ad => learningMap.get(ad.id) || ad.hook_type || extractLearningsFromCreative(ad)?.hook_family).filter(Boolean) as string[])
      const pairFormats = unique(pairAds.map(ad => ad.creative_format).filter(Boolean) as string[])

      if (pairAds.length === 0) {
        cells.push({
          user_id: userId,
          angle,
          persona,
          format: null,
          hook_family: null,
          test_count: 0,
          winner_count: 0,
          loser_count: 0,
          fatigued_count: 0,
          inconclusive_count: 0,
          best_roas: null,
          best_cpa: null,
          best_ctr: null,
          confidence: 'gap',
          status: 'untested',
          top_ad_ids: [],
          competitor_signal: competitorAngles.filter(entry => entry === angle).length,
          first_tested_at: null,
          last_tested_at: null,
        })
        continue
      }

      const allVariants = [{ format: null, hook: null }, ...pairFormats.map(format => ({ format, hook: null })), ...pairHookFamilies.map(hook => ({ format: null, hook }))]
      for (const variant of allVariants) {
        const variantAds = pairAds.filter(ad => (variant.format ? ad.creative_format === variant.format : true) && (variant.hook ? (learningMap.get(ad.id) || ad.hook_type || extractLearningsFromCreative(ad)?.hook_family) === variant.hook : true))
        if (variantAds.length === 0 && (variant.format || variant.hook)) continue
        const sortedByRoas = [...variantAds].sort((a, b) => Number(b.avg_roas || 0) - Number(a.avg_roas || 0)).slice(0, 3)
        cells.push({
          user_id: userId,
          angle,
          persona,
          format: variant.format,
          hook_family: variant.hook,
          test_count: variantAds.length,
          winner_count: variantAds.filter(ad => ad.ad_status === 'winning' && Number(ad.avg_roas || 0) >= 2).length,
          loser_count: variantAds.filter(ad => ad.ad_status === 'dead').length,
          fatigued_count: variantAds.filter(ad => ad.ad_status === 'tired').length,
          inconclusive_count: variantAds.filter(ad => ['weak', 'new', 'unknown'].includes(ad.ad_status || 'unknown')).length,
          best_roas: sortedByRoas[0] ? Number(sortedByRoas[0].avg_roas || 0) : null,
          best_cpa: [...variantAds].map(ad => Number(ad.avg_cpa || 0)).filter(Boolean).sort((a, b) => a - b)[0] || null,
          best_ctr: [...variantAds].map(ad => Number(ad.avg_ctr || 0)).filter(Boolean).sort((a, b) => b - a)[0] || null,
          confidence: confidenceForAds(variantAds),
          status: statusForAds(variantAds),
          top_ad_ids: sortedByRoas.map(ad => ad.id),
          competitor_signal: competitorAngles.filter(entry => entry === angle).length,
          first_tested_at: variantAds.map(ad => safeDate(ad.first_active_date)).filter(Boolean).sort((a, b) => (a!.getTime() - b!.getTime()))[0]?.toISOString() || null,
          last_tested_at: variantAds.map(ad => safeDate(ad.last_active_date)).filter(Boolean).sort((a, b) => (b!.getTime() - a!.getTime()))[0]?.toISOString() || null,
        })
      }
    }
  }

  return cells
}

export function buildExperimentMapResponse(cells: ExperimentCellRecord[]): ExperimentMapResponse {
  const aggregateCells = cells.filter(cell => cell.format === null && cell.hook_family === null)
  const testedCells = aggregateCells.filter(cell => cell.test_count > 0)
  const winningCells = aggregateCells.filter(cell => cell.status === 'winner')
  const fatiguingCells = aggregateCells.filter(cell => cell.status === 'fatigued' || cell.status === 'over_tested')
  const untestedCells = aggregateCells.filter(cell => cell.status === 'untested')

  const gaps = aggregateCells.filter(cell => cell.status === 'untested').map(cell => ({
    angle: cell.angle,
    persona: cell.persona,
    format: cell.format,
    hook_family: cell.hook_family,
    priority: priorityForGap(cell.angle, cell.competitor_signal, cell.hook_family, cell.format),
    reason: cell.competitor_signal > 0
      ? `Competitors are using ${cell.angle.replace(/_/g, ' ')} but this persona is still untested`
      : `No experiment evidence yet for ${cell.angle.replace(/_/g, ' ')} × ${cell.persona.replace(/_/g, ' ')}`,
    competitor_signal: cell.competitor_signal,
  })).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  const lastUpdated = cells.reduce<string>((latest, cell) => {
    const candidate = cell.updated_at || cell.last_tested_at || new Date(0).toISOString()
    return candidate > latest ? candidate : latest
  }, new Date(0).toISOString())

  return {
    cells,
    summary: {
      total_cells: aggregateCells.length,
      tested_cells: testedCells.length,
      winning_cells: winningCells.length,
      fatiguing_cells: fatiguingCells.length,
      untested_cells: untestedCells.length,
      coverage_pct: aggregateCells.length ? Math.round((testedCells.length / aggregateCells.length) * 100) : 0,
    },
    gaps,
    last_updated: lastUpdated,
  }
}

export function buildCellDetail(params: {
  cells: ExperimentCellRecord[]
  creatives: ExperimentCreativeRow[]
  learnings?: CreativeLearningRow[]
  angle: string
  persona: string
  format?: string | null
  hookFamily?: string | null
}): CellDetailResponse | null {
  const { cells, creatives, learnings = [], angle, persona, format = null, hookFamily = null } = params
  const cell = cells.find(entry => entry.angle === angle && entry.persona === persona && (entry.format || null) === (format || null) && (entry.hook_family || null) === (hookFamily || null))
  if (!cell) return null

  const learningByCreative = new Map(learnings.filter(l => l.ad_creative_id).map(l => [l.ad_creative_id!, l]))
  const ads = creatives
    .filter(ad => ad.angle === angle && ad.persona === persona && (!format || ad.creative_format === format) && (!hookFamily || (learningByCreative.get(ad.id)?.hook_family || ad.hook_type || extractLearningsFromCreative(ad)?.hook_family) === hookFamily))
    .map(ad => ({
      id: ad.id,
      ad_name: ad.ad_name || 'Untitled ad',
      status: ad.ad_status || 'unknown',
      format: ad.creative_format,
      hook_preview: firstLine(ad.body_text) || firstLine(ad.headline) || ad.ad_name || 'No hook preview',
      hook_family: learningByCreative.get(ad.id)?.hook_family || ad.hook_type || extractLearningsFromCreative(ad)?.hook_family || null,
      roas: ad.avg_roas,
      cpa: ad.avg_cpa,
      ctr: ad.avg_ctr,
      spend: ad.total_spend,
      mechanism: learningByCreative.get(ad.id)?.inferred_mechanism || extractLearningsFromCreative(ad)?.inferred_mechanism || null,
    }))
    .sort((a, b) => Number(b.roas || 0) - Number(a.roas || 0))

  const testedHooks = unique(ads.map(ad => ad.hook_family).filter(Boolean) as string[])
  const testedFormats = unique(ads.map(ad => ad.format).filter(Boolean) as string[])
  const untestedHooks = DEFAULT_HOOK_FAMILIES.filter(entry => !testedHooks.includes(entry))
  const untestedFormats = DEFAULT_FORMATS.filter(entry => !testedFormats.includes(entry))
  const action = suggestedAction(cell, untestedFormats, untestedHooks)

  const recommendations = [
    action === 'scale' ? 'Promote the winning cell into a controlled scale batch with fresh hooks.' : null,
    action === 'refresh' ? 'Keep the core angle/persona, but swap in new hooks or visuals to avoid fatigue.' : null,
    action === 'explore' ? 'Start with 2–3 low-cost variations to establish signal in this gap.' : null,
    action === 'test_format' ? `Add an untested format next: ${untestedFormats.slice(0, 2).join(', ')}.` : null,
    action === 'test_hook_family' ? `Add an untested hook family next: ${untestedHooks.slice(0, 2).join(', ')}.` : null,
  ].filter(Boolean) as string[]

  return {
    cell: { ...cell, suggested_action: action },
    ads,
    hook_coverage: { tested: testedHooks, untested: untestedHooks },
    format_coverage: { tested: testedFormats, untested: untestedFormats },
    top_performer: ads[0] || null,
    recommendations,
  }
}
