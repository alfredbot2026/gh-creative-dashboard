/**
 * Retry failed providers (Gemini + Moonshot) and append to comparison doc
 */
import { readFileSync, writeFileSync, appendFileSync } from 'fs'
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

// Gemini
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

// Moonshot — try kimi-k2-0711-preview (their latest model)
async function callMoonshot() {
  const start = Date.now()
  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model: 'kimi-k2-0711-preview',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
      temperature: 0.8,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    // Try fallback model
    console.log(`  kimi-k2 failed (${res.status}), trying moonshot-v1-8k...`)
    const res2 = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.MOONSHOT_API_KEY}` },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
        temperature: 0.8,
      }),
    })
    if (!res2.ok) throw new Error(`Moonshot ${res2.status}: ${await res2.text()}`)
    const data = await res2.json()
    return { content: data.choices?.[0]?.message?.content, ms: Date.now() - start, model: 'moonshot-v1-8k' }
  }
  const data = await res.json()
  return { content: data.choices?.[0]?.message?.content, ms: Date.now() - start, model: 'kimi-k2-0711-preview' }
}

console.log('Retrying Gemini + Moonshot...\n')

for (const [name, fn] of [['Gemini Flash', callGemini], ['Moonshot (Kimi)', callMoonshot]]) {
  process.stdout.write(`  ${name}...`)
  try {
    const result = await fn()
    console.log(` ✅ ${result.ms}ms`)
    
    let hooks = []
    try {
      let cleaned = result.content.trim()
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) cleaned = fence[1].trim()
      hooks = JSON.parse(cleaned).hooks || []
    } catch {
      const match = result.content.match(/\{[\s\S]*"hooks"[\s\S]*\}/)
      if (match) try { hooks = JSON.parse(match[0]).hooks || [] } catch {}
    }

    // Print hooks
    console.log(`  Hooks parsed: ${hooks.length}`)
    for (const h of hooks) {
      console.log(`    [${h.hook_type}] ${h.hook_text}`)
    }
    console.log()
  } catch (err) {
    console.log(` ❌ ${err.message.slice(0, 150)}`)
  }
}
