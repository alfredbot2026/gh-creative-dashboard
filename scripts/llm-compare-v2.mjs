/**
 * LLM Comparison V2 — Full provider sweep
 * Tests: GPT-5.4 nano/mini/standard/pro, GPT-4o-mini, Claude Sonnet, DeepSeek, Gemini Flash
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
8. Study the proven hook patterns below — adapt the patterns to this specific concept.

COMPLIANCE: No income guarantees, no false scarcity, no "guaranteed results", no specific earnings claims`

const USER = `Generate 3 hook variations for this concept.

CONCEPT:
- Angle: aspiration
- Persona: new_mom_curious
- Core message: Papers to Profits teaches busy moms how to start a home-based printing business step-by-step
- Product: Papers to Profits (₱1,497)
- Framework: PAS (Problem → Agitate → Solution. Start with the pain, make it vivid, present the product as the answer.)
- Available proof points: Step-by-step video lessons | Private community support | Templates included | Work from home | No experience needed | 500+ successful students

WINNING PATTERNS (reference, don't copy):
MODE: EXPLORE — This angle is untested. Goal is to find what works. Be bold, test different hook types.

PROVEN HOOK PATTERNS FROM KNOWLEDGE BASE (adapt, don't copy verbatim):
• Question Hook: Start with a question that hits the viewer's pain point. "Nakakapagod na ba mag-isip kung paano mag-extra income?"
• Social Proof Hook: Lead with a real number or result. "500+ moms na ang kumikita from home — ikaw ba next?"
• Curiosity Gap: Tease something unexpected. "May isang bagay na ginagawa ng mga work-from-home moms na hindi mo ine-expect..."

Return JSON: {"hooks": [{"hook_text": "the opening line in Taglish", "hook_type": "question|how_to|social_proof|direct_benefit|story_opening|bold_claim|pain_call|curiosity_gap", "proof_points_used": ["proof point 1", "proof point 2"]}]}`

// ─── Callers ───

async function callOpenAI(model) {
  const start = Date.now()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
      temperature: 0.8,
    }),
  })
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const usage = data.usage || {}
  return {
    content: data.choices?.[0]?.message?.content,
    ms: Date.now() - start,
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
  }
}

async function callClaude() {
  const start = Date.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: 'user', content: USER }],
      temperature: 0.8,
    }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return {
    content: data.content?.[0]?.text,
    ms: Date.now() - start,
    input_tokens: data.usage?.input_tokens,
    output_tokens: data.usage?.output_tokens,
  }
}

async function callDeepSeek() {
  const start = Date.now()
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
      temperature: 0.8,
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const usage = data.usage || {}
  return {
    content: data.choices?.[0]?.message?.content,
    ms: Date.now() - start,
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
  }
}

async function callGemini() {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  const start = Date.now()
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: USER,
    config: { systemInstruction: SYSTEM, temperature: 0.8 },
  })
  return { content: response.text, ms: Date.now() - start, input_tokens: null, output_tokens: null }
}

function parseHooks(content) {
  if (!content) return []
  try {
    let cleaned = content.trim()
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence) cleaned = fence[1].trim()
    return JSON.parse(cleaned).hooks || []
  } catch {
    const match = content.match(/\{[\s\S]*"hooks"[\s\S]*\}/)
    if (match) try { return JSON.parse(match[0]).hooks || [] } catch {}
    return []
  }
}

// ─── Pricing (per 1M tokens) ───
const PRICING = {
  'gpt-5.4-nano':  { input: 0.10, output: 0.40 },
  'gpt-5.4-mini':  { input: 0.40, output: 1.60 },
  'gpt-5.4':       { input: 2.50, output: 10.00 },
  'gpt-5.4-pro':   { input: 15.00, output: 60.00 },
  'gpt-4o-mini':   { input: 0.15, output: 0.60 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'deepseek-chat':   { input: 0.14, output: 0.28 },
  'gemini-3-flash':  { input: 0.00, output: 0.00 },
}

function estimateCost(model, inputTokens, outputTokens) {
  const key = Object.keys(PRICING).find(k => model.includes(k)) || model
  const p = PRICING[key]
  if (!p || !inputTokens) return null
  return ((inputTokens * p.input + outputTokens * p.output) / 1_000_000).toFixed(6)
}

// ─── Run ───

const providers = [
  { name: 'GPT-5.4 Nano', model: 'gpt-5.4-nano', fn: () => callOpenAI('gpt-5.4-nano') },
  { name: 'GPT-5.4 Mini', model: 'gpt-5.4-mini', fn: () => callOpenAI('gpt-5.4-mini') },
  { name: 'GPT-5.4 Standard', model: 'gpt-5.4', fn: () => callOpenAI('gpt-5.4') },
  { name: 'GPT-4o-mini', model: 'gpt-4o-mini', fn: () => callOpenAI('gpt-4o-mini') },
  { name: 'Claude Sonnet 4', model: 'claude-sonnet-4-20250514', fn: () => callClaude() },
  { name: 'DeepSeek V3', model: 'deepseek-chat', fn: () => callDeepSeek() },
  { name: 'Gemini Flash', model: 'gemini-3-flash-preview', fn: () => callGemini() },
]

console.log('Running LLM comparison V2 — 7 providers...\n')

const results = []

for (const p of providers) {
  process.stdout.write(`  ${p.name} (${p.model})...`)
  try {
    const r = await p.fn()
    const hooks = parseHooks(r.content)
    const cost = estimateCost(p.model, r.input_tokens, r.output_tokens)
    console.log(` ✅ ${r.ms}ms | ${r.input_tokens || '?'}→${r.output_tokens || '?'} tokens | $${cost || '?'}`)
    results.push({ ...p, ms: r.ms, hooks, input_tokens: r.input_tokens, output_tokens: r.output_tokens, cost, raw: r.content })
  } catch (err) {
    console.log(` ❌ ${err.message.slice(0, 120)}`)
    results.push({ ...p, ms: 0, hooks: [], error: true, raw: err.message })
  }
}

// ─── Build Document ───

let doc = `# LLM Hook Generation Comparison V2

> **Date:** ${new Date().toISOString().split('T')[0]}  
> **Prompt:** Aspiration × New Mom Curious (3 hooks, Taglish, PAS framework)  
> **Temperature:** 0.8  
> **Same prompt for all providers**  
> **Script:** \`node scripts/llm-compare-v2.mjs\`

---

## Summary Table

| Provider | Model | Latency | In Tokens | Out Tokens | Cost/call | Hooks |
|----------|-------|---------|-----------|------------|-----------|-------|
${results.map(r => `| ${r.name} | \`${r.model}\` | ${r.error ? '❌' : r.ms + 'ms'} | ${r.input_tokens || '—'} | ${r.output_tokens || '—'} | ${r.cost ? '$' + r.cost : (r.error ? '—' : 'FREE')} | ${r.error ? '—' : r.hooks.length} |`).join('\n')}

---

## Monthly Cost Estimate (3 batches/week × 4 weeks = 12 calls/month)

| Provider | Cost/call | Monthly (hooks only) | Monthly (hooks + formats) |
|----------|-----------|---------------------|--------------------------|
${results.filter(r => !r.error).map(r => {
  const perCall = r.cost ? parseFloat(r.cost) : 0
  const monthly = (perCall * 12).toFixed(4)
  const monthlyFull = (perCall * 36).toFixed(4)  // hooks + 2 format calls
  return `| ${r.name} | $${r.cost || '0'} | $${monthly} | $${monthlyFull} |`
}).join('\n')}

---

`

for (const r of results) {
  doc += `## ${r.name} (\`${r.model}\`) — ${r.error ? '❌ Error' : r.ms + 'ms'}\n\n`
  
  if (r.error) {
    doc += `**Error:** ${r.raw?.slice(0, 300)}\n\n---\n\n`
    continue
  }
  
  for (let i = 0; i < r.hooks.length; i++) {
    const h = r.hooks[i]
    doc += `### Hook ${i + 1}: \`${h.hook_type || 'unknown'}\`\n`
    doc += `> ${h.hook_text}\n\n`
    if (h.proof_points_used?.length) doc += `*Proof points: ${h.proof_points_used.join(', ')}*\n\n`
  }
  
  if (r.hooks.length === 0) {
    doc += `*Could not parse hooks*\n\n\`\`\`\n${r.raw?.slice(0, 500)}\n\`\`\`\n\n`
  }
  
  doc += `---\n\n`
}

doc += `## Evaluation Criteria

| Criteria | What to look for |
|----------|-----------------|
| **Taglish naturalness** | Sounds like a real Filipina mom? Or translated English? |
| **Scroll-stopping** | First 3 words grab attention? Would you stop scrolling? |
| **Angle discipline** | All hooks stay on "aspiration"? Or drift to pain/education? |
| **Proof point integration** | Woven in naturally? Or bolted on? |
| **Hook type variety** | 3 genuinely different types? Or variations of same? |
| **Compliance** | No income guarantees or false scarcity? |
| **Brand voice** | Warm, encouraging, practical? |
`

writeFileSync(resolve(__dirname, '../docs/LLM-COMPARISON-V2.md'), doc)
console.log(`\n✅ Saved to docs/LLM-COMPARISON-V2.md`)
