/**
 * GET /api/ads/sentiment — Read market sentiment data
 * POST /api/ads/sentiment — Run sentiment collection (cron or manual)
 * 
 * Collects market signals via Brave Search API, summarizes with Gemini.
 * Fully serverless — works on Vercel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateJSON } from '@/lib/llm/client'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const DEFAULT_QUERIES = [
  'printing business Philippines 2026',
  'home based business Philippines',
  'kumikita habang nasa bahay',
  'notebook business ideas',
  'Papers to Profits course',
  'Canva business Philippines',
  'online course selling Philippines',
  'work from home business ideas Philippines',
]

interface SearchResult {
  title: string
  url: string
  description: string
}

async function braveSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY
  if (!apiKey) return []

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=PH&count=10`
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.web?.results || []).map((r: Record<string, string>) => ({
    title: r.title || '',
    url: r.url || '',
    description: r.description || '',
  }))
}

async function analyzeSentiment(query: string, results: SearchResult[]): Promise<{
  score: number  // -100 to 100 (negative = bearish, positive = bullish)
  summary: string
  key_signals: string[]
}> {
  if (!results.length) return { score: 0, summary: 'No data', key_signals: [] }

  const resultsText = results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}`)
    .join('\n\n')

  const { data } = await generateJSON<{
    score: number
    summary: string
    key_signals: string[]
  }>(
    `You are a market analyst for a home-based printing/notebook business course in the Philippines called "Papers to Profits" by Graceful Homeschooling.
    
Analyze these search results for the query "${query}" and determine:
1. Market sentiment score (-100 to 100): negative means declining interest/negative sentiment, positive means growing interest/positive sentiment
2. A 1-2 sentence summary of what the market landscape looks like
3. 2-4 key signals (new competitors, trending topics, sentiment shifts, opportunities, threats)

Focus on: Is this niche growing or shrinking? Are there new competitors? Any negative press? Any new opportunities?`,
    `Search results for "${query}":\n\n${resultsText}\n\nReturn JSON: {"score": number, "summary": "string", "key_signals": ["string"]}`,
    { temperature: 0.2 }
  )

  return data
}

async function getAuth(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (isCronAuth) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
    return { supabase, userId: tokenRow?.user_id || '' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, userId: user?.id || '' }
}

// GET: Read sentiment data
export async function GET(request: NextRequest) {
  const { supabase, userId } = await getAuth(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const days = parseInt(params.get('days') || '30', 10)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: signals } = await supabase
    .from('market_sentiment')
    .select('*')
    .eq('user_id', userId)
    .gte('signal_date', since)
    .order('signal_date', { ascending: false })

  // Group by date
  const byDate = new Map<string, typeof signals>()
  for (const s of signals || []) {
    if (!byDate.has(s.signal_date)) byDate.set(s.signal_date, [])
    byDate.get(s.signal_date)!.push(s)
  }

  // Calculate average sentiment per day
  const dailyScores = Array.from(byDate.entries()).map(([date, sigs]) => ({
    date,
    avg_score: Math.round((sigs || []).reduce((s: number, sig: Record<string, number>) => s + (sig.score || 0), 0) / (sigs?.length || 1)),
    signals: (sigs || []).map((s: Record<string, string | number>) => ({ query: s.query, score: s.score, summary: s.summary })),
  }))

  return NextResponse.json({ signals: signals || [], daily_scores: dailyScores })
}

// POST: Run sentiment collection
export async function POST(request: NextRequest) {
  const { supabase, userId } = await getAuth(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const queries = body.queries || DEFAULT_QUERIES
  const today = new Date().toISOString().split('T')[0]

  let collected = 0
  let errors = 0

  for (const query of queries) {
    try {
      console.log(`[Sentiment] Searching: "${query}"`)
      const results = await braveSearch(query)
      if (!results.length) {
        console.log(`[Sentiment] No results for "${query}"`)
        continue
      }

      const analysis = await analyzeSentiment(query, results)

      // Get previous score for comparison
      const { data: prev } = await supabase
        .from('market_sentiment')
        .select('score')
        .eq('user_id', userId)
        .eq('query', query)
        .lt('signal_date', today)
        .order('signal_date', { ascending: false })
        .limit(1)
        .single()

      const prevScore = prev?.score || null
      const changePct = prevScore !== null && prevScore !== 0
        ? Math.round(((analysis.score - prevScore) / Math.abs(prevScore)) * 100)
        : null

      await supabase.from('market_sentiment').upsert({
        user_id: userId,
        signal_date: today,
        signal_type: 'search_landscape',
        query,
        score: analysis.score,
        prev_score: prevScore,
        change_pct: changePct,
        summary: analysis.summary,
        raw_data: { key_signals: analysis.key_signals, result_count: results.length },
        source_urls: results.slice(0, 5).map(r => r.url),
      }, { onConflict: 'user_id, signal_date, signal_type, query' })

      collected++
      console.log(`[Sentiment] "${query}": score=${analysis.score}, summary=${analysis.summary.slice(0, 80)}`)

      // Rate limit
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.error(`[Sentiment] Error for "${query}":`, err)
      errors++
    }
  }

  return NextResponse.json({ success: true, collected, errors, date: today })
}
