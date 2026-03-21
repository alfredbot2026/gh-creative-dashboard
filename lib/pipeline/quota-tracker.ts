/**
 * API Quota Tracker
 * 
 * Tracks daily API usage per service to prevent quota exhaustion.
 * In-memory for V1 — resets on server restart (acceptable).
 */

interface QuotaConfig {
  daily_limit: number
  warning_threshold: number  // 0-1, e.g., 0.8 = warn at 80%
}

interface DailyUsage {
  units: number
  date: string  // YYYY-MM-DD
}

const QUOTA_CONFIGS: Record<string, QuotaConfig> = {
  youtube_data: { daily_limit: 10000, warning_threshold: 0.8 },
  youtube_analytics: { daily_limit: 200, warning_threshold: 0.8 },
  meta_graph: { daily_limit: 200, warning_threshold: 0.8 },  // per user per hour, simplified as daily
}

const usage = new Map<string, DailyUsage>()

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getKey(service: string): string {
  return `${service}:${getToday()}`
}

export class QuotaExhaustedError extends Error {
  constructor(service: string, used: number, limit: number) {
    super(`QUOTA_EXHAUSTED: ${service} — used ${used}/${limit} units today`)
    this.name = 'QuotaExhaustedError'
  }
}

/**
 * Track API usage.
 */
export function trackUsage(service: string, units: number = 1): void {
  const key = getKey(service)
  const current = usage.get(key) || { units: 0, date: getToday() }
  current.units += units
  usage.set(key, current)

  const config = QUOTA_CONFIGS[service]
  if (config) {
    const pct = current.units / config.daily_limit
    if (pct >= config.warning_threshold) {
      console.warn(`[Quota] ⚠️ ${service}: ${current.units}/${config.daily_limit} units (${Math.round(pct * 100)}%)`)
    }
  }
}

/**
 * Get current usage for a service.
 */
export function getUsage(service: string): {
  used: number
  limit: number
  remaining: number
  percentage: number
} {
  const key = getKey(service)
  const current = usage.get(key) || { units: 0, date: getToday() }
  const config = QUOTA_CONFIGS[service] || { daily_limit: Infinity, warning_threshold: 0.8 }

  return {
    used: current.units,
    limit: config.daily_limit,
    remaining: Math.max(0, config.daily_limit - current.units),
    percentage: Math.round((current.units / config.daily_limit) * 100),
  }
}

/**
 * Check if we can proceed with an operation.
 */
export function canProceed(service: string, estimatedUnits: number = 1): boolean {
  const { remaining } = getUsage(service)
  return remaining >= estimatedUnits
}

/**
 * Assert we can proceed, throwing if quota exhausted.
 */
export function assertQuota(service: string, estimatedUnits: number = 1): void {
  const { used, limit, remaining } = getUsage(service)
  if (remaining < estimatedUnits) {
    throw new QuotaExhaustedError(service, used, limit)
  }
}

/**
 * Get all quota statuses.
 */
export function getAllQuotaStatus(): Record<string, ReturnType<typeof getUsage>> {
  const result: Record<string, ReturnType<typeof getUsage>> = {}
  for (const service of Object.keys(QUOTA_CONFIGS)) {
    result[service] = getUsage(service)
  }
  return result
}
