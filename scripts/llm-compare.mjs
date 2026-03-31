/**
 * LLM Comparison Script — Hook Generation
 * 
 * Calls 5 providers with the EXACT same prompt, saves results for comparison.
 * Run: node scripts/llm-compare.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenAI } from '@google/genai'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

// Load .env.local
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) env[match[1]] = match[2].trim()
}

// ─── The Prompt (exact same for all providers) ───

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

// ─── Provider Callers ───

async function callGemini() {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  const start = Date.now()
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: USER,
    config: { systemInstruction: SYSTEM, temperature: 0.8 },
  })
  return { content: response.text, ms: Date.now() - start }
}

async function callOpenAICompat(name, endpoint, model, apiKey) {
  const start = Date.now()
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
      temperature: 0.8,
    }),
  })
  if (!res.ok) throw new Error(`${name} ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { content: data.choices?.[0]?.message?.content, ms: Date.now() - start }
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
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return { content: data.content?.[0]?.text, ms: Date.now() - start }
}

// ─── Run All ───

const providers = [
  { name: 'Gemini Flash', model: 'gemini-3-flash-preview', fn: () => callGemini() },
  { name: 'OpenAI GPT-4o-mini', model: 'gpt-4o-mini', fn: () => callOpenAICompat('OpenAI', 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini', env.OPENAI_API_KEY) },
  { name: 'Claude Sonnet', model: 'claude-sonnet-4-20250514', fn: () => callClaude() },
  { name: 'DeepSeek', model: 'deepseek-chat', fn: () => callOpenAICompat('DeepSeek', 'https://api.deepseek.com/v1/chat/completions', 'deepseek-chat', env.DEEPSEEK_API_KEY) },
  { name: 'Moonshot (Kimi)', model: 'moonshot-v1-8k', fn: () => callOpenAICompat('Moonshot', 'https://api.moonshot.cn/v1/chat/completions', 'moonshot-v1-8k', env.MOONSHOT_API_KEY) },
]

console.log('Running LLM comparison — hook generation (aspiration × new_mom_curious)...\n')

const results = []

for (const p of providers) {
  process.stdout.write(`  ${p.name}...`)
  try {
    const { content, ms } = await p.fn()
    console.log(` ✅ ${ms}ms`)
    
    // Try to parse hooks
    let hooks = []
    try {
      let cleaned = content.trim()
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) cleaned = fence[1].trim()
      const parsed = JSON.parse(cleaned)
      hooks = parsed.hooks || []
    } catch {
      // Try to find JSON in response
      const match = content.match(/\{[\s\S]*"hooks"[\s\S]*\}/)
      if (match) {
        try { hooks = JSON.parse(match[0]).hooks || [] } catch {}
      }
    }
    
    results.push({ name: p.name, model: p.model, ms, hooks, raw: content })
  } catch (err) {
    console.log(` ❌ ${err.message.slice(0, 100)}`)
    results.push({ name: p.name, model: p.model, ms: 0, hooks: [], raw: `ERROR: ${err.message}`, error: true })
  }
}

// ─── Build Comparison Document ───

let doc = `# LLM Hook Generation Comparison

> **Date:** ${new Date().toISOString()}
> **Prompt:** Aspiration × New Mom Curious (3 hooks, Taglish, PAS framework)
> **Temperature:** 0.8
> **Same system prompt + user prompt for all providers**

---

## Quick Summary

| Provider | Model | Latency | Hooks Parsed | 
|----------|-------|---------|-------------|
${results.map(r => `| ${r.name} | ${r.model} | ${r.ms}ms | ${r.error ? '❌ Error' : r.hooks.length} |`).join('\n')}

---

`

for (const r of results) {
  doc += `## ${r.name} (${r.model}) — ${r.ms}ms\n\n`
  
  if (r.error) {
    doc += `**ERROR:** ${r.raw}\n\n---\n\n`
    continue
  }
  
  if (r.hooks.length > 0) {
    for (let i = 0; i < r.hooks.length; i++) {
      const h = r.hooks[i]
      doc += `### Hook ${i + 1}: ${h.hook_type || 'unknown'}\n`
      doc += `> ${h.hook_text}\n\n`
      if (h.proof_points_used?.length) {
        doc += `Proof points: ${h.proof_points_used.join(', ')}\n\n`
      }
    }
  } else {
    doc += `*Could not parse hooks from response*\n\n`
    doc += `**Raw output:**\n\`\`\`\n${r.raw?.slice(0, 1000)}\n\`\`\`\n\n`
  }
  
  doc += `---\n\n`
}

doc += `## Evaluation Criteria

When comparing, look for:

1. **Taglish naturalness** — Does it sound like a real Filipina mom talking? Or robotic translated English?
2. **Scroll-stopping power** — Would YOU stop scrolling? First 3 words matter most.
3. **Angle discipline** — Does every hook stay on "aspiration"? Or drift to pain/education?
4. **Proof point integration** — Are proof points woven in naturally? Or bolted on awkwardly?
5. **Hook type variety** — Did it actually give 3 DIFFERENT hook types? Or variations of the same?
6. **Compliance** — Any income guarantees or false scarcity?
7. **Brand voice** — Warm, encouraging, practical? Or salesy/corporate?

## Raw Responses (for debugging)

`

for (const r of results) {
  doc += `### ${r.name}\n\`\`\`json\n${r.raw?.slice(0, 2000)}\n\`\`\`\n\n`
}

const outPath = resolve(__dirname, '../docs/LLM-COMPARISON.md')
writeFileSync(outPath, doc)
console.log(`\n✅ Comparison saved to docs/LLM-COMPARISON.md`)
