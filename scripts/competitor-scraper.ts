/**
 * Competitor Discovery via Meta Ad Library (Browser)
 * 
 * Uses OpenClaw's browser tool indirectly — this script is meant to be
 * called from an OpenClaw cron that has browser access.
 * 
 * For now: seeds competitors manually + from search, stores in Supabase.
 * The browser-based Ad Library scraping happens via the OpenClaw cron
 * which calls the /api/ads/competitors/scrape endpoint.
 * 
 * Usage: npx tsx scripts/competitor-scraper.ts
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const geminiKey = process.env.GEMINI_API_KEY!

if (!supabaseUrl || !supabaseKey) { console.error('Missing SUPABASE env vars'); process.exit(1) }

const supabase = createClient(supabaseUrl, supabaseKey)
const ai = new GoogleGenAI({ apiKey: geminiKey })

// Known/discovered competitors in Grace's niche
const SEED_COMPETITORS = [
  {
    page_name: 'The Bibong Pinay Company',
    page_url: 'https://www.facebook.com/thebibongpinaycompany/',
    website_url: 'https://thebibongpinaycompany.com',
    niche: 'filipina_entrepreneur_course',
    notes: 'Empowering Filipina entrepreneurs. DIY, business training, mentorship. Direct competitor for home-based business courses.',
  },
  {
    page_name: 'GRAFX Express',
    page_url: 'https://www.facebook.com/grafxexpress/',
    niche: 'printing_templates',
    notes: 'Sells printing business template bundles (200K+ graphic files for ₱199). Competes on the "start a printing business" angle with template-based approach.',
  },
  {
    page_name: 'I Love Paper',
    page_url: null,
    niche: 'paper_crafting',
    notes: 'Found in Ad Library for "notebook business". Paper crafting/printing niche.',
  },
  {
    page_name: 'InnoSoft Business Academy',
    page_url: null,
    niche: 'business_course',
    notes: 'Found in Ad Library for "printing business course". Online business courses in PH.',
  },
]

// Ad Library search terms — these will be used by the OpenClaw cron
// to browse Ad Library and extract ads
const AD_LIBRARY_SEARCHES = [
  'kumikita habang nasa bahay',
  'printing business course',
  'notebook business',
  'home based business course Philippines',
  'paper products business',
]

async function classifyAdCopy(adBody: string, pageName: string): Promise<Record<string, string> | null> {
  if (!adBody || adBody.length < 20) return null
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Classify this competitor ad. Pick ONE value per dimension.

Advertiser: ${pageName}
Ad copy: ${adBody.slice(0, 800)}

- angle: pain_point|aspiration|fear|social_proof|comparison|education|urgency|curiosity|transformation|authority
- persona: new_mom_curious|returning_buyer|price_sensitive|aspirational|skeptic|beginner|advanced|gift_buyer|busy_professional
- framework: PAS|AIDA|before_after|testimonial|urgency|FAB|comparison|storytelling|listicle|direct_offer
- hook_type: question|bold_claim|statistic|story_opening|curiosity_gap|pain_call|social_proof_lead|direct_benefit|controversy|how_to
- offer_type: discount|free_trial|value_stack|limited_time|social_proof|educational|no_offer|bundle|guarantee|sample
- emotional_tone: warm|urgent|educational|aspirational|fear|empowering|playful|authoritative|nostalgic|relieved

JSON only: {"angle":"...","persona":"...","framework":"...","hook_type":"...","offer_type":"...","emotional_tone":"..."}`,
    config: { temperature: 0.1 }
  })

  const text = response.text || ''
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try { return JSON.parse(cleaned) } catch { return null }
}

async function main() {
  console.log('[Scraper] Starting competitor seeding + discovery...')
  
  const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
  const userId = tokenRow?.user_id
  if (!userId) { console.error('No user found'); return }

  // 1. Seed known competitors
  let seeded = 0
  for (const comp of SEED_COMPETITORS) {
    const { error } = await supabase.from('competitors').upsert({
      user_id: userId,
      page_name: comp.page_name,
      page_url: comp.page_url || null,
      website_url: comp.website_url || null,
      niche: comp.niche,
      notes: comp.notes,
      discovered_via: 'manual',
    }, { onConflict: 'user_id, page_name' })
    if (!error) seeded++
  }
  console.log(`[Scraper] Seeded ${seeded} competitors`)

  // 2. Seed tracked search terms
  for (const term of AD_LIBRARY_SEARCHES) {
    await supabase.from('tracked_terms').upsert({
      user_id: userId, term, term_type: 'keyword', language: 'tl',
    }, { onConflict: 'user_id, term' })
  }
  console.log(`[Scraper] Seeded ${AD_LIBRARY_SEARCHES.length} search terms`)

  // 3. For competitors that have known ad copy (from our Ad Library browsing), classify them
  const { data: unclassified } = await supabase
    .from('competitor_ads')
    .select('id, ad_body, page_name')
    .eq('user_id', userId)
    .is('angle', null)
    .gt('ad_body', '')

  let classified = 0
  for (const ad of unclassified || []) {
    const cls = await classifyAdCopy(ad.ad_body, ad.page_name)
    if (cls) {
      await supabase.from('competitor_ads').update({
        angle: cls.angle, persona: cls.persona, framework: cls.framework,
        hook_type: cls.hook_type, offer_type: cls.offer_type, emotional_tone: cls.emotional_tone,
        classification_raw: cls, updated_at: new Date().toISOString(),
      }).eq('id', ad.id)
      classified++
    }
    await new Promise(r => setTimeout(r, 500))
  }

  // 4. Create daily snapshots
  const today = new Date().toISOString().split('T')[0]
  const { data: allComps } = await supabase
    .from('competitors')
    .select('id, page_name')
    .eq('user_id', userId)
    .eq('is_active', true)

  for (const comp of allComps || []) {
    const { data: compAds } = await supabase
      .from('competitor_ads')
      .select('angle, ad_format')
      .eq('competitor_id', comp.id)
      .eq('is_active', true)

    const angleDist: Record<string, number> = {}
    const formatDist: Record<string, number> = {}
    for (const ad of compAds || []) {
      if (ad.angle) angleDist[ad.angle] = (angleDist[ad.angle] || 0) + 1
      if (ad.ad_format) formatDist[ad.ad_format] = (formatDist[ad.ad_format] || 0) + 1
    }

    await supabase.from('competitor_snapshots').upsert({
      user_id: userId, competitor_id: comp.id, snapshot_date: today,
      active_ad_count: compAds?.length || 0,
      angle_distribution: Object.keys(angleDist).length ? angleDist : null,
      format_distribution: Object.keys(formatDist).length ? formatDist : null,
    }, { onConflict: 'user_id, competitor_id, snapshot_date' })
  }

  console.log(`[Scraper] DONE! Seeded: ${seeded} competitors, Classified: ${classified} ads, Snapshots: ${allComps?.length || 0}`)
  console.log(`[Scraper] NOTE: For Ad Library scraping, use the OpenClaw cron which has browser access.`)
  console.log(`[Scraper] The cron should browse Ad Library for these terms: ${AD_LIBRARY_SEARCHES.join(', ')}`)
}

main().catch(err => { console.error('[Scraper] Fatal:', err); process.exit(1) })
