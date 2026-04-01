/**
 * LLM Comparison FINAL — All providers including Kimi + Gemini
 * Endpoint fix: Moonshot now uses api.moonshot.ai (not api.moonshot.cn)
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenAI } from '@google/genai'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) env[match[1]] = match[2].trim()
}

const SYSTEM = `You generate hook variations for Meta ads. ALL hooks must serve the SAME concept — do not drift into other angles.

RULES:
1. Every hook must open with a different hook TYPE (question, how_to, social_proof, direct_benefit, story_opening, bold_claim, pain_call, curiosity_gap)
2. Every hook must be about the SAME core message: "Papers to Profits teaches busy moms how to start a home-based printing business step-by-step"
3. Every hook must target the SAME persona: Moms 25-45, time-poor, wants income from home, overwhelmed by options, needs simple guidance. Warm, encouraging tone.
4. Hooks must be in Taglish (Filipino + English mix), natural and conversational
5. Each hook picks 2-3 proof points from the available list to highlight
6. DO NOT drift into other angles. The angle is "aspiration" — every hook must be aspiration.
7. Hooks are the FIRST LINE the viewer reads/hears. Max 2 sentences. Must stop the scroll.

COMPLIANCE: No income guarantees, no false scarcity, no "guaranteed results", no specific earnings claims`

const USER = `Generate 3 hook variations for this concept.

CONCEPT:
- Angle: aspiration
- Persona: new_mom_curious
- Core message: Papers to Profits teaches busy moms how to start a home-based printing business step-by-step
- Product: Papers to Profits (₱1,497)
- Framework: PAS
- Available proof points: Step-by-step video lessons | Private community support | Templates included | Work from home | No experience needed | 500+ successful students

MODE: EXPLORE — This angle is untested. Be bold, test different hook types.

Return JSON: {"hooks": [{"hook_text": "the opening line in Taglish", "hook_type": "question|how_to|social_proof|direct_benefit|story_opening|bold_claim|pain_call|curiosity_gap", "proof_points_used": ["proof point 1", "proof point 2"]}]}`

async function callOpenAI(model) {
  const s = Date.now()
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages: [{role:'system',content:SYSTEM},{role:'user',content:USER}], temperature: 0.8 }),
  })
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0,200)}`)
  const d = await r.json()
  return { content: d.choices?.[0]?.message?.content, ms: Date.now()-s, input_tokens: d.usage?.prompt_tokens, output_tokens: d.usage?.completion_tokens }
}

async function callClaude() {
  const s = Date.now()
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: SYSTEM, messages: [{role:'user',content:USER}], temperature: 0.8 }),
  })
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0,200)}`)
  const d = await r.json()
  return { content: d.content?.[0]?.text, ms: Date.now()-s, input_tokens: d.usage?.input_tokens, output_tokens: d.usage?.output_tokens }
}

async function callDeepSeek() {
  const s = Date.now()
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{role:'system',content:SYSTEM},{role:'user',content:USER}], temperature: 0.8 }),
  })
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${(await r.text()).slice(0,200)}`)
  const d = await r.json()
  return { content: d.choices?.[0]?.message?.content, ms: Date.now()-s, input_tokens: d.usage?.prompt_tokens, output_tokens: d.usage?.completion_tokens }
}

async function callKimi(model, temp) {
  const s = Date.now()
  const r = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({ model, messages: [{role:'system',content:SYSTEM},{role:'user',content:USER}], temperature: temp, max_tokens: 2048 }),
  })
  if (!r.ok) { const t = await r.text(); throw new Error(`${model} ${r.status}: ${t.slice(0,200)}`) }
  const d = await r.json()
  return { content: d.choices?.[0]?.message?.content, ms: Date.now()-s, input_tokens: d.usage?.prompt_tokens, output_tokens: d.usage?.completion_tokens }
}

async function callGemini() {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  const s = Date.now()
  const r = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: USER, config: { systemInstruction: SYSTEM, temperature: 0.8 }})
  return { content: r.text, ms: Date.now()-s, input_tokens: null, output_tokens: null }
}

function parseHooks(content) {
  if (!content) return []
  try {
    let c = content.trim(); const f = c.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) c = f[1].trim()
    return JSON.parse(c).hooks || []
  } catch { const m = content.match(/\{[\s\S]*"hooks"[\s\S]*\}/); if (m) try { return JSON.parse(m[0]).hooks || [] } catch {}; return [] }
}

const PRICING = {
  'gpt-5.4-nano': {i:0.10,o:0.40}, 'gpt-5.4-mini': {i:0.40,o:1.60}, 'gpt-5.4': {i:2.50,o:10.00},
  'gpt-4o-mini': {i:0.15,o:0.60}, 'claude-sonnet-4': {i:3.00,o:15.00}, 'deepseek-chat': {i:0.14,o:0.28},
  'gemini-3-flash': {i:0,o:0}, 'kimi-k2-turbo': {i:0.20,o:0.80}, 'kimi-k2.5': {i:0.42,o:2.20},
}
function cost(model, it, ot) {
  const k = Object.keys(PRICING).find(k => model.includes(k)); const p = PRICING[k]; if (!p||!it) return null
  return ((it*p.i+ot*p.o)/1e6).toFixed(6)
}

const providers = [
  { name: 'Gemini Flash', model: 'gemini-3-flash-preview', fn: callGemini },
  { name: 'GPT-5.4 Nano', model: 'gpt-5.4-nano', fn: () => callOpenAI('gpt-5.4-nano') },
  { name: 'GPT-5.4 Mini', model: 'gpt-5.4-mini', fn: () => callOpenAI('gpt-5.4-mini') },
  { name: 'GPT-5.4', model: 'gpt-5.4', fn: () => callOpenAI('gpt-5.4') },
  { name: 'GPT-4o-mini', model: 'gpt-4o-mini', fn: () => callOpenAI('gpt-4o-mini') },
  { name: 'Claude Sonnet 4', model: 'claude-sonnet-4-20250514', fn: callClaude },
  { name: 'DeepSeek V3', model: 'deepseek-chat', fn: callDeepSeek },
  { name: 'Kimi K2-Turbo', model: 'kimi-k2-turbo-preview', fn: () => callKimi('kimi-k2-turbo-preview', 0.8) },
  { name: 'Kimi K2.5', model: 'kimi-k2.5', fn: () => callKimi('kimi-k2.5', 1) },
]

console.log('Running FINAL LLM comparison — 9 providers...\n')
const results = []
for (const p of providers) {
  process.stdout.write(`  ${p.name}...`)
  try {
    const r = await p.fn()
    const hooks = parseHooks(r.content)
    const c = cost(p.model, r.input_tokens, r.output_tokens)
    console.log(` ✅ ${r.ms}ms | ${r.input_tokens||'?'}→${r.output_tokens||'?'} | $${c||'FREE'}`)
    results.push({ ...p, ms: r.ms, hooks, input_tokens: r.input_tokens, output_tokens: r.output_tokens, cost: c, raw: r.content })
  } catch(e) {
    console.log(` ❌ ${e.message.slice(0,120)}`)
    results.push({ ...p, ms: 0, hooks: [], error: true, raw: e.message })
  }
}

// Build doc
let doc = `# LLM Hook Generation — Final Comparison (All Providers)

> **Date:** ${new Date().toISOString().split('T')[0]}  
> **Prompt:** Aspiration × New Mom Curious — 3 hooks, Taglish, PAS  
> **Same prompt for all. Temperature 0.8 (K2.5 forced to 1.0)**  
> **Script:** \`node scripts/llm-compare-final.mjs\`

---

## Summary

| # | Provider | Model | Speed | In→Out | Cost/call | Hooks |
|---|----------|-------|-------|--------|-----------|-------|
${results.map((r,i) => `| ${i+1} | **${r.name}** | \`${r.model}\` | ${r.error ? '❌' : r.ms+'ms'} | ${r.input_tokens||'—'}→${r.output_tokens||'—'} | ${r.cost ? '$'+r.cost : r.error ? '❌' : 'FREE'} | ${r.error ? '—' : r.hooks.length} |`).join('\n')}

---

`
for (const r of results) {
  doc += `## ${r.name} (\`${r.model}\`)${r.error ? ' — ❌' : ` — ${r.ms}ms`}\n\n`
  if (r.error) { doc += `**Error:** ${r.raw?.slice(0,300)}\n\n---\n\n`; continue }
  for (let i = 0; i < r.hooks.length; i++) {
    const h = r.hooks[i]
    doc += `**Hook ${i+1} [${h.hook_type}]:**\n> ${h.hook_text}\n\n`
  }
  if (!r.hooks.length) doc += `*Parse failed. Raw:*\n\`\`\`\n${r.raw?.slice(0,500)}\n\`\`\`\n\n`
  doc += `---\n\n`
}

doc += `## Rob's Evaluation

_Score each provider 1-5 on these criteria:_

| Provider | Taglish | Scroll-stop | Angle | Variety | Voice | Overall |
|----------|---------|-------------|-------|---------|-------|---------|
${results.filter(r=>!r.error).map(r => `| ${r.name} | /5 | /5 | /5 | /5 | /5 | /5 |`).join('\n')}

**Winner:** _______________  
**Runner-up:** _______________  
**Best value (quality/cost):** _______________
`

writeFileSync(resolve(__dirname, '../docs/LLM-COMPARISON-FINAL.md'), doc)
console.log('\n✅ Saved to docs/LLM-COMPARISON-FINAL.md')
