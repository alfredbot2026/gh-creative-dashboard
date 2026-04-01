/**
 * Seed Hook Bank — calls creative engine DIRECTLY (same pipeline as wizard)
 * Uses: generateConceptBrief → generateHookVariations (with KB + brand + winning patterns)
 * 
 * Run: node --experimental-specifier-resolution=node scripts/seed-bank.mjs
 * Or simpler: just call the production endpoint with proper auth
 * 
 * Since we can't easily import Next.js server functions from a standalone script,
 * we replicate the exact same flow using the same LLM calls + Supabase queries.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/)
  if (m) env[m[1]] = m[2].trim()
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ─── Get user + product context (same as creative engine) ───
const { data: tokenRow } = await supabase.from('meta_tokens').select('user_id').limit(1).single()
const userId = tokenRow?.user_id
if (!userId) { console.error('No user found'); process.exit(1) }

const { data: product } = await supabase.from('product_catalog').select('name, price, description, offer_details, target_audience, usps').eq('is_active', true).limit(1).single()
const { data: brand } = await supabase.from('brand_style_guide').select('*').limit(1).single()

// ─── KB retrieval (same as getAdGenerationContext) ───
async function getKBContext() {
  const categories = ['ad_creative', 'hook_library', 'cro_patterns', 'content_funnel', 'virality_science', 'platform_intelligence']
  
  // Mandatory first-reads
  const { data: mandatory } = await supabase.from('knowledge_entries').select('*').eq('is_mandatory_first_read', true).in('review_status', ['approved', 'candidate'])
  
  // Pool from ads lane
  const { data: pool } = await supabase.from('knowledge_entries').select('*').in('category', categories).contains('lanes', ['ads']).in('review_status', ['approved', 'candidate'])
  
  // Tier split (same as kb-retriever.ts)
  const tierA = (pool || []).filter(e => (e.effectiveness_score ?? 50) > 70)
  const tierB = (pool || []).filter(e => { const s = e.effectiveness_score ?? 50; return s >= 50 && s <= 70 })
  
  // Shuffle + take 15
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }; return a }
  const result = [...(mandatory || []), ...shuffle(tierA).slice(0, 8), ...shuffle(tierB).slice(0, 5)].slice(0, 15)
  
  return result
}

// ─── Winning ads for context (same as generateConceptBrief) ───
async function getWinningContext(angle, mode) {
  const { data: winners } = await supabase
    .from('ad_creatives')
    .select('hook_type, framework, body_text, video_transcription, avg_roas, headline')
    .eq('user_id', userId).eq('angle', angle).eq('ad_status', 'winning')
    .order('avg_roas', { ascending: false }).limit(mode === 'scale' ? 10 : 5)
  
  return (winners || []).slice(0, 3).map(ad => 
    `[${ad.hook_type}/${ad.framework}, ${ad.avg_roas?.toFixed(1)}x ROAS] ${(ad.video_transcription || ad.body_text || '').slice(0, 200)}`
  ).join('\n')
}

// ─── Get existing hooks for exclusion ───
async function getExistingHooks(angle, persona) {
  const { data } = await supabase
    .from('hook_bank')
    .select('hook_text, exclusion_hash')
    .eq('user_id', userId).eq('angle', angle).eq('persona', persona)
    .neq('status', 'retired').limit(20)
  return data || []
}

// ─── Angle coverage ───
const { data: allCreatives } = await supabase.from('ad_creatives').select('angle, ad_status, avg_roas').eq('user_id', userId)
const angleStats = new Map()
for (const c of allCreatives || []) {
  if (!c.angle) continue
  if (!angleStats.has(c.angle)) angleStats.set(c.angle, { count: 0, winners: 0, roas: 0 })
  const s = angleStats.get(c.angle)
  s.count++
  if (c.ad_status === 'winning') { s.winners++; s.roas = Math.max(s.roas, c.avg_roas || 0) }
}

const ALL_ANGLES = ['pain_point', 'aspiration', 'education', 'urgency', 'curiosity', 'transformation', 'comparison', 'social_proof', 'authority', 'fear']
const ALL_PERSONAS = ['new_mom_curious', 'beginner', 'price_sensitive', 'aspirational', 'skeptic']

const PERSONA_MAP = {
  new_mom_curious: 'Moms 25-45, time-poor, wants income from home, overwhelmed by options. Warm, encouraging.',
  beginner: 'Complete beginners, zero business experience. Simple language, no jargon.',
  price_sensitive: 'Budget-conscious. Needs to see ROI clearly. Lead with value-for-money.',
  aspirational: 'Wants lifestyle transformation. Show the dream: working from home, freedom.',
  skeptic: 'Has been burned by online courses. Needs real proof — screenshots, specific numbers.',
}

const prioritized = ALL_ANGLES.map(a => {
  const s = angleStats.get(a) || { count: 0, winners: 0, roas: 0 }
  return { angle: a, ...s, mode: s.winners > 0 ? 'scale' : 'explore' }
}).sort((a, b) => b.winners - a.winners || b.roas - a.roas)

console.log('📊 Angle priority:')
prioritized.forEach(a => console.log(`  ${a.angle}: ${a.count} ads, ${a.winners}W, ${a.roas.toFixed(1)}x → ${a.mode}`))

// ─── LLM call — Kimi K2-Turbo for hooks (best quality from battle test) ───
async function generateHooks(angle, persona, mode, kbEntries, winningPatterns, exclusionList) {
  const brandTone = brand 
    ? `${brand.tone_descriptors || 'Warm, encouraging'}. Taglish ratio: ${brand.taglish_ratio || '60/40'}. ${brand.vocabulary_notes || ''}. BANNED: ${brand.banned_words || 'AI slop, guaranteed income'}`
    : 'Warm, encouraging, Taglish (Filipino-English mix)'

  const kbSection = kbEntries.filter(e => e.category === 'hook_library').slice(0, 4)
    .map(e => `• ${e.title}: ${(e.content || '').substring(0, 200)}`).join('\n')

  const exclusionPrompt = exclusionList.length > 0
    ? `\n\nDO NOT repeat or rephrase these existing hooks:\n${exclusionList.map(h => `- "${h.hook_text}"`).join('\n')}`
    : ''

  const modeContext = mode === 'scale'
    ? `MODE: SCALE — This angle has winners. Create DIFFERENT hooks following same emotional logic.`
    : `MODE: EXPLORE — This angle is untested. Be bold.`

  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model: 'kimi-k2-turbo-preview',
      messages: [
        { role: 'system', content: `You generate hook variations for Meta ads. ALL hooks must be in Taglish. Output ONLY valid JSON. No markdown fences.\n\nBRAND VOICE: ${brandTone}` },
        { role: 'user', content: `Generate 5 hook variations.

ANGLE: ${angle}
PERSONA: ${PERSONA_MAP[persona] || persona}
PRODUCT: ${product?.name || 'Papers to Profits'} (₱${product?.price || 1497})
PROOF POINTS: ${(product?.usps || []).join(' | ')}
${modeContext}
${winningPatterns ? `\nWINNING PATTERNS:\n${winningPatterns}` : ''}
${kbSection ? `\nPROVEN HOOK PATTERNS FROM KB:\n${kbSection}` : ''}
${exclusionPrompt}

RULES:
- Each hook = max 2 sentences, Taglish, scroll-stopping
- 5 DIFFERENT hook types
- No income guarantees
- COMPLIANCE: ${brand?.banned_words || 'No guaranteed income, no false scarcity'}

Return: {"hooks": [{"hook_text": "...", "hook_type": "question|social_proof|curiosity_gap|direct_benefit|story_opening|bold_claim|pain_call|how_to", "proof_points_used": ["...", "..."]}]}` }
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) throw new Error(`Kimi ${res.status}: ${(await res.text()).slice(0, 100)}`)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''
  
  try {
    let c = raw.trim()
    const f = c.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (f) c = f[1].trim()
    return { hooks: JSON.parse(c).hooks || [], tokens: data.usage }
  } catch {
    const m = raw.match(/\{[\s\S]*"hooks"[\s\S]*\}/)
    if (m) try { return { hooks: JSON.parse(m[0]).hooks || [], tokens: data.usage } } catch {}
    return { hooks: [], tokens: data.usage }
  }
}

// ─── SEED ───

// Top 5 angles × 3 personas = 15 combos
const COMBOS = []
for (const a of prioritized.slice(0, 5)) {
  for (const p of ALL_PERSONAS.slice(0, 3)) {
    COMBOS.push({ angle: a.angle, persona: p, mode: a.mode })
  }
}

console.log(`\n🌱 Seeding: ${COMBOS.length} combos × 5 hooks = up to ${COMBOS.length * 5} hooks\n`)

let totalGen = 0, totalSaved = 0, totalTokens = { input: 0, output: 0 }
const kbEntries = await getKBContext()
console.log(`📚 KB loaded: ${kbEntries.length} entries\n`)

for (const { angle, persona, mode } of COMBOS) {
  process.stdout.write(`  ${angle} × ${persona} (${mode})...`)
  
  try {
    const existing = await getExistingHooks(angle, persona)
    const winPatterns = await getWinningContext(angle, mode)
    const { hooks, tokens } = await generateHooks(angle, persona, mode, kbEntries, winPatterns, existing)
    
    if (tokens) {
      totalTokens.input += tokens.prompt_tokens || 0
      totalTokens.output += tokens.completion_tokens || 0
    }
    
    let saved = 0
    for (const h of hooks) {
      if (!h.hook_text) continue
      const hash = crypto.createHash('md5').update(h.hook_text).digest('hex')
      if (existing.some(e => e.exclusion_hash === hash)) continue
      
      const { error } = await supabase.from('hook_bank').insert({
        user_id: userId, angle, persona,
        hook_text: h.hook_text, hook_type: h.hook_type,
        proof_points_used: h.proof_points_used || [],
        generated_by: 'kimi-k2-turbo',
        generated_model: 'kimi-k2-turbo-preview',
        generation_context: { kb_count: kbEntries.length, mode, has_winners: winPatterns.length > 0 },
        exclusion_hash: hash,
        status: 'fresh',
      })
      if (!error) saved++
    }
    
    totalGen += hooks.length
    totalSaved += saved
    console.log(` ✅ ${hooks.length} gen, ${saved} saved`)
    
    await new Promise(r => setTimeout(r, 800)) // rate limit
  } catch (err) {
    console.log(` ❌ ${err.message.slice(0, 80)}`)
  }
}

console.log(`\n━━━ SEED COMPLETE ━━━`)
console.log(`Generated: ${totalGen} hooks`)
console.log(`Saved: ${totalSaved} new (${totalGen - totalSaved} dupes/errors)`)
console.log(`Tokens used: ${totalTokens.input} in → ${totalTokens.output} out`)

const { count } = await supabase.from('hook_bank').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'retired')
console.log(`Bank total: ${count} hooks`)
