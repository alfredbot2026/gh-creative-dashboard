/**
 * /ads — Main ads page
 * 
 * Consolidated: renders the audit page directly.
 * Single source of truth for ad data (campaign tree + daily metrics).
 * 
 * Previous version had a separate intelligence-map-based dashboard
 * that computed ROAS differently and showed inflated numbers.
 * Now everything uses /api/ads/metrics (daily data, proper aggregation).
 */
import AuditPage from './audit/page'

export default AuditPage
