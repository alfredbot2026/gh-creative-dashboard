import type { SupabaseClient } from '@supabase/supabase-js'

export type PlanType = 'scale' | 'refresh' | 'explore' | 'mixed'
export type PlanStatus = 'pending' | 'accepted' | 'generating' | 'completed' | 'dismissed' | 'expired'

export interface PlanBriefRow {
  id: string
  user_id: string
  plan_type: PlanType
  priority: number
  target_angle: string | null
  target_persona: string | null
  target_formats: string[] | null
  objective: string
  hypothesis: string | null
  evidence_summary: Record<string, unknown> | null
  why_now: string | null
  status: PlanStatus
  generated_concept_ids: string[] | null
  source_experiment_cell_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface PlanAssetRow {
  id: string
  user_id: string
  plan_brief_id: string
  asset_type: string
  plan_section: string | null
  payload: Record<string, unknown> | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface CandidateEvidence {
  winners: Array<Record<string, unknown>>
  losers: Array<Record<string, unknown>>
  fatigue: Array<Record<string, unknown>>
  gaps: Array<Record<string, unknown>>
}

export interface PlanCandidate {
  plan_type: PlanType
  priority: number
  target_angle: string | null
  target_persona: string | null
  target_formats: string[]
  objective: string
  hypothesis: string
  why_now: string
  evidence_summary: CandidateEvidence
  source_experiment_cell_id: string | null
}

interface BuildPlanOptions {
  mode?: 'auto' | 'scale' | 'refresh' | 'explore'
  angle?: string
  persona?: string
  formats?: string[]
  count?: number
}

interface ExperimentCell {
  id: string
  angle: string | null
  persona: string | null
  format: string | null
  hook_family: string | null
  status: string | null
  confidence: string | null
  test_count: number | null
  winner_count: number | null
  loser_count: number | null
  fatigued_count: number | null
  last_tested_at: string | null
}

interface CreativeLearning {
  ad_creative_id: string | null
  format: string | null
  hook_primary: string | null
  hook_family: string | null
  body_summary: string | null
  cta_pattern: string | null
  visual_pattern: string | null
  inferred_mechanisms?: unknown
  inferred_mechanism?: unknown
  confidence_score?: number | null
  extraction_confidence?: number | null
}

interface AdCreativeLight {
  id: string
  angle: string | null
  persona: string | null
  creative_format: string | null
  ad_name: string | null
  ad_status: string | null
  avg_roas: number | null
  total_spend: number | null
  hook_type: string | null
}

function toTitle(value: string | null | undefined, fallback = 'Unknown') {
  if (!value) return fallback
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function dedupeFormats(formats: Array<string | null | undefined>) {
  return Array.from(new Set(formats.filter((value): value is string => !!value && value.trim().length > 0)))
}

function parseEvidenceArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function buildScaleCandidate(cell: ExperimentCell, relatedCreatives: AdCreativeLight[], relatedLearnings: CreativeLearning[], forcedFormats: string[]) {
  const winners = relatedCreatives
    .filter(item => item.ad_status === 'winning')
    .sort((a, b) => Number(b.avg_roas || 0) - Number(a.avg_roas || 0))
    .slice(0, 3)
    .map(item => ({
      id: item.id,
      ad_name: item.ad_name,
      format: item.creative_format,
      roas: item.avg_roas,
      spend: item.total_spend,
      hook_family: item.hook_type,
    }))

  const learningSummary = relatedLearnings.slice(0, 3).map(item => ({
    format: item.format,
    hook_family: item.hook_family,
    cta_pattern: item.cta_pattern,
    mechanism: item.inferred_mechanisms,
    confidence_score: item.confidence_score,
  }))

  const targetFormats = forcedFormats.length > 0
    ? forcedFormats
    : dedupeFormats([cell.format, ...relatedCreatives.map(item => item.creative_format)])

  return {
    plan_type: 'scale' as const,
    priority: 1,
    target_angle: cell.angle,
    target_persona: cell.persona,
    target_formats: targetFormats.length > 0 ? targetFormats : ['video_ugc', 'static_image'],
    objective: `Scale the ${toTitle(cell.angle)} message for ${toTitle(cell.persona)} with fresh winning variants.`,
    hypothesis: `We believe the existing ${toTitle(cell.angle)} winner can support more spend if we preserve the core message and vary the hook, format, and presentation.`,
    why_now: `This cell is already winning${winners.length > 0 ? ` — led by ${winners[0].ad_name || 'a top performer'}` : ''}. Extend it before fatigue shows up.`,
    evidence_summary: {
      winners,
      losers: [],
      fatigue: [],
      gaps: learningSummary,
    },
    source_experiment_cell_id: cell.id,
  }
}

function buildRefreshCandidate(cell: ExperimentCell, relatedCreatives: AdCreativeLight[], relatedLearnings: CreativeLearning[], forcedFormats: string[]) {
  const fatigue = relatedCreatives
    .filter(item => item.ad_status === 'tired' || item.ad_status === 'weak')
    .slice(0, 3)
    .map(item => ({
      id: item.id,
      ad_name: item.ad_name,
      format: item.creative_format,
      roas: item.avg_roas,
      spend: item.total_spend,
      hook_family: item.hook_type,
    }))

  const winners = relatedCreatives
    .filter(item => item.ad_status === 'winning')
    .slice(0, 2)
    .map(item => ({
      id: item.id,
      ad_name: item.ad_name,
      format: item.creative_format,
      roas: item.avg_roas,
    }))

  const refreshHooks = relatedLearnings.slice(0, 3).map(item => ({
    hook_family: item.hook_family,
    hook_primary: item.hook_primary,
    visual_pattern: item.visual_pattern,
  }))

  const targetFormats = forcedFormats.length > 0
    ? forcedFormats
    : dedupeFormats([cell.format, ...relatedCreatives.map(item => item.creative_format)])

  return {
    plan_type: 'refresh' as const,
    priority: 2,
    target_angle: cell.angle,
    target_persona: cell.persona,
    target_formats: targetFormats.length > 0 ? targetFormats : ['video_ugc'],
    objective: `Refresh the ${toTitle(cell.angle)} creative for ${toTitle(cell.persona)} before performance slips further.`,
    hypothesis: `We believe the message still resonates, but the current executions are fatiguing. New hooks and format shifts should recover efficiency.`,
    why_now: `Fatigue is showing up in this cell${fatigue.length > 0 ? ` across ${fatigue.length} ad(s)` : ''}. Replace tired executions while preserving the winning logic.`,
    evidence_summary: {
      winners,
      losers: [],
      fatigue,
      gaps: refreshHooks,
    },
    source_experiment_cell_id: cell.id,
  }
}

function buildExploreCandidate(cell: ExperimentCell, relatedCreatives: AdCreativeLight[], relatedLearnings: CreativeLearning[], forcedFormats: string[]) {
  const gaps = [{
    angle: cell.angle,
    persona: cell.persona,
    format: cell.format,
    hook_family: cell.hook_family,
    confidence: cell.confidence,
    status: cell.status,
    test_count: cell.test_count,
  }]

  const losers = relatedCreatives
    .filter(item => item.ad_status === 'dead' || item.ad_status === 'weak')
    .slice(0, 2)
    .map(item => ({
      id: item.id,
      ad_name: item.ad_name,
      format: item.creative_format,
      roas: item.avg_roas,
      hook_family: item.hook_type,
    }))

  const mechanisms: Record<string, unknown>[] = relatedLearnings.slice(0, 2).map(item => ({
    format: item.format,
    mechanism: item.inferred_mechanisms ?? item.inferred_mechanism ?? null,
    cta_pattern: item.cta_pattern,
  }))

  const targetFormats = forcedFormats.length > 0
    ? forcedFormats
    : dedupeFormats([cell.format])

  return {
    plan_type: 'explore' as const,
    priority: 3,
    target_angle: cell.angle,
    target_persona: cell.persona,
    target_formats: targetFormats.length > 0 ? targetFormats : ['static_image', 'video_ugc'],
    objective: `Explore the unproven ${toTitle(cell.angle)} angle for ${toTitle(cell.persona)} in a structured test batch.`,
    hypothesis: `We believe this gap may unlock a new winner if we test the right message-to-format combination with a clean hypothesis.`,
    why_now: `This angle/persona combination is under-tested or still inconclusive, so it is a good candidate for a focused exploration sprint.`,
    evidence_summary: {
      winners: [],
      losers,
      fatigue: [],
      gaps: [...gaps, ...mechanisms],
    },
    source_experiment_cell_id: cell.id,
  }
}

async function loadSupportData(supabase: SupabaseClient, userId: string) {
  const [cellsRes, learningsRes, creativesRes] = await Promise.all([
    supabase
      .from('experiment_cells')
      .select('id, angle, persona, format, hook_family, status, confidence, test_count, winner_count, loser_count, fatigued_count, last_tested_at')
      .eq('user_id', userId),
    supabase
      .from('creative_learnings')
      .select('ad_creative_id, format, hook_primary, hook_family, body_summary, cta_pattern, visual_pattern, inferred_mechanisms, inferred_mechanism, confidence_score, extraction_confidence')
      .eq('user_id', userId),
    supabase
      .from('ad_creatives')
      .select('id, angle, persona, creative_format, ad_name, ad_status, avg_roas, total_spend, hook_type')
      .eq('user_id', userId),
  ])

  if (cellsRes.error) throw new Error(cellsRes.error.message)
  if (learningsRes.error) throw new Error(learningsRes.error.message)
  if (creativesRes.error) throw new Error(creativesRes.error.message)

  return {
    cells: (cellsRes.data || []) as ExperimentCell[],
    learnings: (learningsRes.data || []) as CreativeLearning[],
    creatives: (creativesRes.data || []) as AdCreativeLight[],
  }
}

export async function buildPlanCandidates(
  supabase: SupabaseClient,
  userId: string,
  options: BuildPlanOptions,
) {
  const { cells, learnings, creatives } = await loadSupportData(supabase, userId)
  const mode = options.mode || 'auto'
  const count = Math.min(Math.max(options.count || 3, 1), 6)
  const forcedFormats = dedupeFormats(options.formats || [])

  const filteredCells = cells.filter(cell => {
    if (options.angle && cell.angle !== options.angle) return false
    if (options.persona && cell.persona !== options.persona) return false
    if (forcedFormats.length > 0 && cell.format && !forcedFormats.includes(cell.format)) return false
    return true
  })

  const byCell = (cell: ExperimentCell) => creatives.filter(item => item.angle === cell.angle && item.persona === cell.persona)
  const learningsByCell = (cell: ExperimentCell) => {
    const ids = new Set(byCell(cell).map(item => item.id))
    return learnings.filter(item => item.ad_creative_id && ids.has(item.ad_creative_id))
  }

  const scaleCells = filteredCells
    .filter(cell => (cell.winner_count || 0) > 0 || cell.status === 'winner' || cell.status === 'winning')
    .sort((a, b) => (b.winner_count || 0) - (a.winner_count || 0))

  const refreshCells = filteredCells
    .filter(cell => (cell.fatigued_count || 0) > 0 || cell.status === 'fatigued' || cell.status === 'tired')
    .sort((a, b) => (b.fatigued_count || 0) - (a.fatigued_count || 0))

  const exploreCells = filteredCells
    .filter(cell => (cell.status || '').toLowerCase().includes('gap') || (cell.test_count || 0) === 0 || cell.status === 'untested' || cell.status === 'inconclusive' || ((cell.winner_count || 0) === 0 && (cell.test_count || 0) <= 1))
    .sort((a, b) => (a.test_count || 0) - (b.test_count || 0))

  const candidates: PlanCandidate[] = []

  if (mode === 'auto' || mode === 'scale') {
    for (const cell of scaleCells) {
      candidates.push(buildScaleCandidate(cell, byCell(cell), learningsByCell(cell), forcedFormats))
    }
  }

  if (mode === 'auto' || mode === 'refresh') {
    for (const cell of refreshCells) {
      candidates.push(buildRefreshCandidate(cell, byCell(cell), learningsByCell(cell), forcedFormats))
    }
  }

  if (mode === 'auto' || mode === 'explore') {
    for (const cell of exploreCells) {
      candidates.push(buildExploreCandidate(cell, byCell(cell), learningsByCell(cell), forcedFormats))
    }
  }

  if (mode === 'auto' && scaleCells.length > 0 && (refreshCells.length > 0 || exploreCells.length > 0)) {
    const leadScale = scaleCells[0]
    const leadSecondary = refreshCells[0] || exploreCells[0]
    const mixedFormats = dedupeFormats([
      ...forcedFormats,
      leadScale?.format,
      leadSecondary?.format,
      ...byCell(leadScale).map(item => item.creative_format),
    ])

    candidates.push({
      plan_type: 'mixed',
      priority: 2,
      target_angle: leadScale?.angle || leadSecondary?.angle || null,
      target_persona: leadScale?.persona || leadSecondary?.persona || null,
      target_formats: mixedFormats.length > 0 ? mixedFormats : ['video_ugc', 'static_image'],
      objective: `Run one balanced sprint: scale a winner, refresh fatigue, and probe one adjacent gap.`,
      hypothesis: `A mixed batch lets us protect current winners while expanding into one new test frontier without losing weekly momentum.`,
      why_now: `You have enough signal to do more than one thing this cycle. A mixed plan keeps delivery balanced between scale and exploration.`,
      evidence_summary: {
        winners: scaleCells.slice(0, 1).map(cell => ({ angle: cell.angle, persona: cell.persona, winner_count: cell.winner_count })),
        losers: [],
        fatigue: refreshCells.slice(0, 1).map(cell => ({ angle: cell.angle, persona: cell.persona, fatigued_count: cell.fatigued_count })),
        gaps: exploreCells.slice(0, 1).map(cell => ({ angle: cell.angle, persona: cell.persona, test_count: cell.test_count })),
      },
      source_experiment_cell_id: leadScale?.id || leadSecondary?.id || null,
    })
  }

  const deduped = new Map<string, PlanCandidate>()
  for (const candidate of candidates) {
    const key = [candidate.plan_type, candidate.target_angle || '', candidate.target_persona || ''].join('::')
    if (!deduped.has(key)) deduped.set(key, candidate)
  }

  return Array.from(deduped.values()).sort((a, b) => a.priority - b.priority).slice(0, count)
}

export async function listPlans(supabase: SupabaseClient, userId: string, filters: { status?: string | null, type?: string | null, limit?: number }) {
  let query = supabase
    .from('plan_briefs')
    .select(`
      id,
      user_id,
      plan_type,
      priority,
      target_angle,
      target_persona,
      target_formats,
      objective,
      hypothesis,
      evidence_summary,
      why_now,
      status,
      generated_concept_ids,
      source_experiment_cell_id,
      expires_at,
      created_at,
      updated_at,
      completed_at,
      plan_assets(count)
    `)
    .eq('user_id', userId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(filters.limit || 20)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.type) query = query.eq('plan_type', filters.type)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data || []) as Array<PlanBriefRow & { plan_assets?: Array<{ count: number }> }>
  const statusRank: Record<string, number> = { pending: 0, accepted: 1, generating: 2, completed: 3, dismissed: 4, expired: 5 }

  return rows
    .map(plan => ({
      id: plan.id,
      plan_type: plan.plan_type,
      priority: plan.priority,
      objective: plan.objective,
      why_now: plan.why_now,
      target_angle: plan.target_angle,
      target_persona: plan.target_persona,
      target_formats: plan.target_formats || [],
      status: plan.status,
      evidence_summary: safeObject(plan.evidence_summary),
      created_at: plan.created_at,
      completed_at: plan.completed_at,
      asset_count: Number(plan.plan_assets?.[0]?.count || 0),
      has_objective: plan.objective.trim().length > 0,
    }))
    .sort((a, b) => {
      const rankDiff = (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)
      if (rankDiff !== 0) return rankDiff
      if (a.priority !== b.priority) return a.priority - b.priority
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
}

export async function getPlanDetail(supabase: SupabaseClient, userId: string, id: string) {
  const [{ data: plan, error: planError }, { data: assets, error: assetsError }] = await Promise.all([
    supabase
      .from('plan_briefs')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single(),
    supabase
      .from('plan_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_brief_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (planError) throw new Error(planError.message)
  if (assetsError) throw new Error(assetsError.message)

  const brief = plan as PlanBriefRow
  const assetRows = (assets || []) as PlanAssetRow[]
  const groupedAssets = assetRows.reduce<Record<string, PlanAssetRow[]>>((acc, asset) => {
    const key = asset.plan_section || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(asset)
    return acc
  }, {})

  return {
    ...brief,
    target_formats: brief.target_formats || [],
    evidence_summary: {
      winners: parseEvidenceArray(safeObject(brief.evidence_summary).winners),
      losers: parseEvidenceArray(safeObject(brief.evidence_summary).losers),
      fatigue: parseEvidenceArray(safeObject(brief.evidence_summary).fatigue),
      gaps: parseEvidenceArray(safeObject(brief.evidence_summary).gaps),
    },
    assets: assetRows,
    asset_groups: groupedAssets,
  }
}
