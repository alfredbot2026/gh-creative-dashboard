/**
 * Classification Validator
 * 
 * Runs AI classification on the gold set and measures agreement.
 * Must achieve >80% agreement before proceeding to batch classification.
 */
import type { ContentClassification, GoldSetEntry, ValidationResult } from './classification-types'

// Fields to validate (skip confidence scores — they're AI-internal)
const VALIDATION_FIELDS: (keyof ContentClassification)[] = [
  'hook_type',
  'structure',
  'topic_category',
  'content_purpose',
  'visual_style',
  'text_overlay_style',
  'production_quality',
  'cta_type',
  'emotional_tone',
]

/**
 * Compare two string values with fuzzy matching.
 * Returns 1.0 for exact match, 0.5 for partial, 0.0 for no match.
 */
function fieldAgreement(expected: string, actual: string): number {
  if (!expected || !actual) return 0

  const e = expected.toLowerCase().trim()
  const a = actual.toLowerCase().trim()

  // Exact match
  if (e === a) return 1.0

  // One contains the other (e.g., "Comparison Hook" matches "Comparison Hooks")
  if (e.includes(a) || a.includes(e)) return 0.8

  // First word matches (e.g., "Question Hook" vs "Question")
  const eFirst = e.split(/[\s_/]+/)[0]
  const aFirst = a.split(/[\s_/]+/)[0]
  if (eFirst === aFirst && eFirst.length > 3) return 0.5

  return 0.0
}

/**
 * Validate AI classification against a gold set.
 */
export function validateClassification(
  goldSet: GoldSetEntry[],
  aiResults: ContentClassification[]
): ValidationResult {
  if (goldSet.length !== aiResults.length) {
    throw new Error(`Gold set (${goldSet.length}) and results (${aiResults.length}) must have same length`)
  }

  const perField: Record<string, { total: number; score: number }> = {}
  const failures: ValidationResult['failures'] = []

  for (const field of VALIDATION_FIELDS) {
    perField[field] = { total: 0, score: 0 }
  }

  for (let i = 0; i < goldSet.length; i++) {
    const expected = goldSet[i].expected
    const actual = aiResults[i]

    for (const field of VALIDATION_FIELDS) {
      const expectedVal = String(expected[field] || '')
      const actualVal = String(actual[field] || '')
      const agreement = fieldAgreement(expectedVal, actualVal)

      perField[field].total++
      perField[field].score += agreement

      if (agreement < 0.5) {
        failures.push({
          entry_index: i,
          field,
          expected: expectedVal,
          actual: actualVal,
        })
      }
    }
  }

  // Calculate per-field agreement rates
  const fieldRates: Record<string, number> = {}
  for (const [field, data] of Object.entries(perField)) {
    fieldRates[field] = data.total > 0 ? data.score / data.total : 0
  }

  // Overall agreement = average of all field rates
  const fieldValues = Object.values(fieldRates)
  const overall = fieldValues.length > 0
    ? fieldValues.reduce((a, b) => a + b, 0) / fieldValues.length
    : 0

  return {
    overall_agreement: Math.round(overall * 1000) / 1000,
    per_field: Object.fromEntries(
      Object.entries(fieldRates).map(([k, v]) => [k, Math.round(v * 1000) / 1000])
    ),
    failures,
    recommendation: overall >= 0.8 ? 'proceed' : 'refine_prompt',
    total_entries: goldSet.length,
  }
}
