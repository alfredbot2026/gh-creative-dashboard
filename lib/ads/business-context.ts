/**
 * Business Context Loader
 * 
 * Pulls product pricing and observed conversion rates from the database
 * to drive all ad intelligence thresholds dynamically.
 * 
 * No hardcoded thresholds — everything derives from:
 * 1. Product price (from product_catalog)
 * 2. Observed conversion rates (calculated from ad_performance data)
 */
import type { BusinessContext } from './classifier'

interface ProductRow {
  price: string
  is_active: boolean
}

/**
 * Parse PHP price string like "₱1,300" or "₱2,997" to number
 */
function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[₱,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Load business context from database.
 * Returns product price + estimated conversation-to-sale rate.
 * 
 * The conv-to-sale rate is estimated by comparing total conversations
 * from engagement campaigns vs total purchases across all campaigns
 * in the same period. This is an approximation since we can't track
 * individual user journeys cross-campaign.
 */
export async function loadBusinessContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<BusinessContext> {
  // 1. Get active product price
  const { data: products } = await supabase
    .from('product_catalog')
    .select('price, is_active')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)

  let productPrice = 1300 // fallback
  if (products?.length) {
    const parsed = parsePrice((products[0] as ProductRow).price)
    if (parsed > 0) productPrice = parsed
  }

  // 2. Calculate observed conversation → purchase rate
  // Look at last 30 days of data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const { data: perfData } = await supabase
    .from('ad_performance')
    .select('conversions, messaging_conversations')
    .eq('user_id', userId)
    .gte('date_start', thirtyDaysAgo)

  let totalConversations = 0
  let totalPurchases = 0
  for (const row of perfData || []) {
    totalConversations += row.messaging_conversations || 0
    totalPurchases += row.conversions || 0
  }

  // Estimated conversion rate (with floor to avoid division by zero)
  // This is approximate: not all purchases come from conversations,
  // and not all conversations come from engagement campaigns.
  // But it's better than a hardcoded guess.
  let convToSaleRate = 0.08 // default fallback
  if (totalConversations > 50 && totalPurchases > 5) {
    // Cap at reasonable range (1% to 25%)
    const raw = totalPurchases / totalConversations
    convToSaleRate = Math.max(0.01, Math.min(0.25, raw))
  }

  return { productPrice, convToSaleRate }
}

/**
 * Get the breakeven and threshold values for display in the UI.
 * Useful for showing "why" an ad is rated the way it is.
 */
export function getThresholds(biz: BusinessContext) {
  const breakevenCPA = biz.productPrice                    // 1x ROAS
  const winningCPA = biz.productPrice / 2                  // 2x ROAS
  const breakevenCostPerConv = biz.productPrice * biz.convToSaleRate
  const winningCostPerConv = breakevenCostPerConv * 0.5

  return {
    productPrice: biz.productPrice,
    convToSaleRate: biz.convToSaleRate,
    // Sales thresholds
    breakevenCPA: Math.round(breakevenCPA),
    winningCPA: Math.round(winningCPA),
    breakevenROAS: 1.0,
    winningROAS: 2.0,
    // Engagement thresholds
    breakevenCostPerConv: Math.round(breakevenCostPerConv),
    winningCostPerConv: Math.round(winningCostPerConv),
  }
}
