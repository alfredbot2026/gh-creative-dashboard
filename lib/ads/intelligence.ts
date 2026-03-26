/**
 * Ad Intelligence Engine — The Media Buyer Brain
 * 
 * Builds the strategic view of an ad account:
 * 1. Ad Account Map: angle × persona matrix with performance + status
 * 2. Gap Analysis: untested combos, saturation detection
 * 3. Recommendations: ranked strategic actions with confidence scoring
 * 
 * Confidence model (from security addendum P0-4):
 * - high: ≥5 ads, ≥₱5,000 spend, ≥30 days data
 * - medium: ≥2 ads, ≥₱1,000 spend
 * - low: 1 ad or <₱1,000 spend
 * - gap: 0 ads (untested)
 */

// === TYPES ===

export type Confidence = 'high' | 'medium' | 'low' | 'gap'
export type CellStatus = 'winning' | 'weak' | 'tired' | 'gap' | 'new' | 'dead'

export interface MatrixCell {
  angle: string
  persona: string
  ad_count: number
  total_spend: number
  avg_roas: number | null
  avg_cpa: number | null
  avg_ctr: number | null
  confidence: Confidence
  status: CellStatus
  trend: 'rising' | 'stable' | 'declining' | null
  ads: Array<{
    id: string
    ad_name: string
    ad_status: string
    total_spend: number
    avg_roas: number | null
    creative_format: string
  }>
}

export interface GapEntry {
  angle: string
  persona: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  competitor_signal: boolean
}

export interface SaturationEntry {
  angle: string
  persona: string
  ad_name: string
  roas_30d: number | null
  roas_7d: number | null
  trend: 'declining'
  recommendation: string
}

export interface Recommendation {
  priority: number
  angle: string
  persona: string
  confidence: Confidence
  evidence: {
    ad_count: number
    total_spend: number
    avg_roas: number | null
    data_days: number
    competitor_signal: boolean
  }
  action: string
  reason: string
  suggested_frameworks: string[]
  estimated_variants: number
  type: 'create_new' | 'refresh' | 'scale' | 'kill'
}

export interface AdAccountMap {
  matrix: Record<string, Record<string, MatrixCell>>
  coverage: { tested: number; total: number; percent: number }
  gaps: GapEntry[]
  saturating: SaturationEntry[]
  recommendations: Recommendation[]
  summary: {
    total_ads: number
    total_spend: number
    winning_count: number
    tired_count: number
    dead_count: number
    exploration_mode: boolean
  }
}

// === CONSTANTS ===

const ANGLES = [
  'pain_point', 'aspiration', 'fear', 'social_proof', 'comparison',
  'education', 'urgency', 'curiosity', 'transformation', 'authority',
]

const PERSONAS = [
  'new_mom_curious', 'returning_buyer', 'price_sensitive',
  'aspirational', 'skeptic', 'beginner', 'advanced',
  'gift_buyer', 'busy_professional',
]

const FRAMEWORK_SUGGESTIONS: Record<string, string[]> = {
  pain_point: ['PAS', 'before_after', 'testimonial'],
  aspiration: ['AIDA', 'before_after', 'storytelling'],
  fear: ['PAS', 'urgency', 'comparison'],
  social_proof: ['testimonial', 'listicle', 'storytelling'],
  comparison: ['comparison', 'FAB', 'before_after'],
  education: ['AIDA', 'FAB', 'listicle'],
  urgency: ['urgency', 'PAS', 'direct_offer'],
  curiosity: ['AIDA', 'storytelling', 'comparison'],
  transformation: ['before_after', 'testimonial', 'storytelling'],
  authority: ['FAB', 'listicle', 'comparison'],
}

// === CORE ENGINE ===

export interface AdCreativeRow {
  id: string
  angle: string | null
  persona: string | null
  framework: string | null
  ad_name: string | null
  ad_status: string | null
  creative_format: string | null
  total_spend: number
  total_purchases: number
  avg_roas: number | null
  avg_cpa: number | null
  avg_ctr: number | null
  first_active_date: string | null
  last_active_date: string | null
  classified_at: string | null
}

function calcConfidence(adCount: number, totalSpend: number, dataDays: number): Confidence {
  if (adCount === 0) return 'gap'
  if (adCount >= 5 && totalSpend >= 5000 && dataDays >= 30) return 'high'
  if (adCount >= 2 && totalSpend >= 1000) return 'medium'
  return 'low'
}

function calcCellStatus(ads: AdCreativeRow[]): CellStatus {
  if (ads.length === 0) return 'gap'
  const statuses = ads.map(a => a.ad_status || 'unknown')
  if (statuses.some(s => s === 'winning')) return 'winning'
  if (statuses.some(s => s === 'tired')) return 'tired'
  if (statuses.every(s => s === 'new')) return 'new'
  if (statuses.every(s => s === 'dead')) return 'dead'
  return 'weak'
}

function dataDays(ads: AdCreativeRow[]): number {
  const dates = ads.map(a => a.first_active_date).filter(Boolean) as string[]
  if (dates.length === 0) return 0
  const earliest = new Date(dates.sort()[0])
  return Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Build the full Ad Account Map from classified creatives.
 */
export function buildAdAccountMap(
  creatives: AdCreativeRow[],
  competitorAngles?: string[],
): AdAccountMap {
  // Only use classified creatives
  const classified = creatives.filter(c => c.classified_at && c.angle && c.persona)

  // Build matrix
  const matrix: Record<string, Record<string, MatrixCell>> = {}

  for (const angle of ANGLES) {
    matrix[angle] = {}
    for (const persona of PERSONAS) {
      const cellAds = classified.filter(c => c.angle === angle && c.persona === persona)
      const totalSpend = cellAds.reduce((s, a) => s + (a.total_spend || 0), 0)
      const roasValues = cellAds.filter(a => a.avg_roas && a.avg_roas > 0).map(a => a.avg_roas!)
      const avgRoas = roasValues.length > 0 ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length : null
      const cpaValues = cellAds.filter(a => a.avg_cpa && a.avg_cpa > 0).map(a => a.avg_cpa!)
      const avgCpa = cpaValues.length > 0 ? cpaValues.reduce((a, b) => a + b, 0) / cpaValues.length : null
      const ctrValues = cellAds.filter(a => a.avg_ctr && a.avg_ctr > 0).map(a => a.avg_ctr!)
      const avgCtr = ctrValues.length > 0 ? ctrValues.reduce((a, b) => a + b, 0) / ctrValues.length : null

      const days = dataDays(cellAds)
      const confidence = calcConfidence(cellAds.length, totalSpend, days)
      const status = calcCellStatus(cellAds)

      // Determine trend from individual ad statuses
      let trend: 'rising' | 'stable' | 'declining' | null = null
      if (cellAds.some(a => a.ad_status === 'tired')) trend = 'declining'
      else if (cellAds.some(a => a.ad_status === 'winning') && !cellAds.some(a => a.ad_status === 'tired')) trend = 'stable'

      matrix[angle][persona] = {
        angle,
        persona,
        ad_count: cellAds.length,
        total_spend: Math.round(totalSpend * 100) / 100,
        avg_roas: avgRoas ? Math.round(avgRoas * 100) / 100 : null,
        avg_cpa: avgCpa ? Math.round(avgCpa * 100) / 100 : null,
        avg_ctr: avgCtr ? Math.round(avgCtr * 10000) / 10000 : null,
        confidence,
        status,
        trend,
        ads: cellAds.map(a => ({
          id: a.id,
          ad_name: a.ad_name || 'Unknown',
          ad_status: a.ad_status || 'unknown',
          total_spend: a.total_spend || 0,
          avg_roas: a.avg_roas,
          creative_format: a.creative_format || 'static_image',
        })),
      }
    }
  }

  // Coverage stats
  let tested = 0
  const total = ANGLES.length * PERSONAS.length
  for (const angle of ANGLES) {
    for (const persona of PERSONAS) {
      if (matrix[angle][persona].ad_count > 0) tested++
    }
  }

  // Gap analysis
  const gaps: GapEntry[] = []
  for (const angle of ANGLES) {
    for (const persona of PERSONAS) {
      const cell = matrix[angle][persona]
      if (cell.ad_count === 0) {
        const competitorUsesAngle = competitorAngles?.includes(angle) || false
        const priority = competitorUsesAngle ? 'high'
          : ['pain_point', 'social_proof', 'transformation'].includes(angle) ? 'medium'
          : 'low'

        gaps.push({
          angle,
          persona,
          priority,
          reason: competitorUsesAngle
            ? `Competitors use ${angle} ads heavily — you haven't tested this`
            : `Untested ${angle} × ${persona} combo — potential opportunity`,
          competitor_signal: competitorUsesAngle,
        })
      }
    }
  }
  gaps.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 }
    return prio[a.priority] - prio[b.priority]
  })

  // Saturation detection (tired ads)
  const saturating: SaturationEntry[] = classified
    .filter(c => c.ad_status === 'tired')
    .map(c => ({
      angle: c.angle!,
      persona: c.persona!,
      ad_name: c.ad_name || 'Unknown',
      roas_30d: c.avg_roas,
      roas_7d: null, // would need time-series data for this
      trend: 'declining' as const,
      recommendation: `Replace with fresh ${c.angle} creative for ${c.persona}`,
    }))

  // Build recommendations
  const recommendations = buildRecommendations(matrix, gaps, saturating, classified, competitorAngles)

  // Summary
  const winning = classified.filter(c => c.ad_status === 'winning').length
  const tired = classified.filter(c => c.ad_status === 'tired').length
  const dead = classified.filter(c => c.ad_status === 'dead').length
  const totalSpend = classified.reduce((s, c) => s + (c.total_spend || 0), 0)

  return {
    matrix,
    coverage: { tested, total, percent: Math.round((tested / total) * 100) },
    gaps,
    saturating,
    recommendations,
    summary: {
      total_ads: classified.length,
      total_spend: Math.round(totalSpend * 100) / 100,
      winning_count: winning,
      tired_count: tired,
      dead_count: dead,
      exploration_mode: classified.length < 10 || totalSpend < 5000,
    },
  }
}

function buildRecommendations(
  matrix: Record<string, Record<string, MatrixCell>>,
  gaps: GapEntry[],
  saturating: SaturationEntry[],
  allAds: AdCreativeRow[],
  competitorAngles?: string[],
): Recommendation[] {
  const recs: Recommendation[] = []
  let priority = 1

  // 1. REFRESH: Replace tired/saturating creatives (highest urgency)
  for (const sat of saturating) {
    const cell = matrix[sat.angle]?.[sat.persona]
    recs.push({
      priority: priority++,
      angle: sat.angle,
      persona: sat.persona,
      confidence: cell?.confidence || 'low',
      evidence: {
        ad_count: cell?.ad_count || 0,
        total_spend: cell?.total_spend || 0,
        avg_roas: cell?.avg_roas,
        data_days: dataDays(allAds.filter(a => a.angle === sat.angle && a.persona === sat.persona)),
        competitor_signal: false,
      },
      action: `Refresh: create new ${sat.angle} ads for ${formatPersona(sat.persona)}`,
      reason: `"${sat.ad_name}" is getting tired — declining returns. Fresh creative needed.`,
      suggested_frameworks: FRAMEWORK_SUGGESTIONS[sat.angle] || ['PAS', 'AIDA'],
      estimated_variants: 3,
      type: 'refresh',
    })
  }

  // 2. SCALE: Double down on winning combos
  for (const angle of ANGLES) {
    for (const persona of PERSONAS) {
      const cell = matrix[angle][persona]
      if (cell.status === 'winning' && cell.confidence !== 'low') {
        recs.push({
          priority: priority++,
          angle,
          persona,
          confidence: cell.confidence,
          evidence: {
            ad_count: cell.ad_count,
            total_spend: cell.total_spend,
            avg_roas: cell.avg_roas,
            data_days: dataDays(allAds.filter(a => a.angle === angle && a.persona === persona)),
            competitor_signal: false,
          },
          action: `Scale: create more ${angle} variants for ${formatPersona(persona)}`,
          reason: `This combo is winning (${cell.avg_roas?.toFixed(1)}x return). More variants = more budget capacity.`,
          suggested_frameworks: FRAMEWORK_SUGGESTIONS[angle] || ['PAS', 'AIDA'],
          estimated_variants: 5,
          type: 'scale',
        })
      }
    }
  }

  // 3. CREATE NEW: Fill high-priority gaps
  const topGaps = gaps.filter(g => g.priority === 'high').slice(0, 5)
  for (const gap of topGaps) {
    recs.push({
      priority: priority++,
      angle: gap.angle,
      persona: gap.persona,
      confidence: 'gap',
      evidence: {
        ad_count: 0,
        total_spend: 0,
        avg_roas: null,
        data_days: 0,
        competitor_signal: gap.competitor_signal,
      },
      action: `Explore: test ${gap.angle} ads for ${formatPersona(gap.persona)}`,
      reason: gap.reason,
      suggested_frameworks: FRAMEWORK_SUGGESTIONS[gap.angle] || ['PAS', 'AIDA'],
      estimated_variants: 3,
      type: 'create_new',
    })
  }

  // 4. KILL: Remove dead ads wasting budget
  const deadAds = allAds.filter(a => a.ad_status === 'dead' && (a.total_spend || 0) > 500)
  for (const ad of deadAds.slice(0, 5)) {
    recs.push({
      priority: priority++,
      angle: ad.angle || 'unknown',
      persona: ad.persona || 'unknown',
      confidence: calcConfidence(1, ad.total_spend, dataDays([ad])),
      evidence: {
        ad_count: 1,
        total_spend: ad.total_spend,
        avg_roas: ad.avg_roas,
        data_days: dataDays([ad]),
        competitor_signal: false,
      },
      action: `Kill: turn off "${ad.ad_name}"`,
      reason: `Spent ${formatCurrency(ad.total_spend)} with ${ad.avg_roas?.toFixed(1) || '0'}x return. Stop the bleed.`,
      suggested_frameworks: [],
      estimated_variants: 0,
      type: 'kill',
    })
  }

  // 5. More gap fills (medium priority)
  const medGaps = gaps.filter(g => g.priority === 'medium').slice(0, 3)
  for (const gap of medGaps) {
    recs.push({
      priority: priority++,
      angle: gap.angle,
      persona: gap.persona,
      confidence: 'gap',
      evidence: {
        ad_count: 0,
        total_spend: 0,
        avg_roas: null,
        data_days: 0,
        competitor_signal: gap.competitor_signal,
      },
      action: `Explore: test ${gap.angle} ads for ${formatPersona(gap.persona)}`,
      reason: gap.reason,
      suggested_frameworks: FRAMEWORK_SUGGESTIONS[gap.angle] || ['PAS', 'AIDA'],
      estimated_variants: 3,
      type: 'create_new',
    })
  }

  return recs
}

// === HELPERS ===

function formatPersona(persona: string): string {
  return persona.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatCurrency(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export { ANGLES, PERSONAS }
