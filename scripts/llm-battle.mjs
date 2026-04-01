/**
 * LLM Battle — Multi-round comparison (hooks + video scripts)
 * 
 * Round 1: Aspiration hooks (same as before, consistency check)
 * Round 2: Pain point hooks (different angle)
 * Round 3: Video script (30s UGC reel — the real test)
 * 
 * Each provider gets all 3 rounds. Results in one doc.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/)
  if (m) env[m[1]] = m[2].trim()
}

// ─── Prompts ───

const ROUNDS = [
  {
    id: 'hooks-aspiration',
    name: 'Round 1: Aspiration Hooks',
    desc: '3 hooks for aspiration angle × new_mom_curious',
    system: `You generate hook variations for Meta ads in Taglish (Filipino-English mix). Output ONLY valid JSON. No markdown fences.`,
    user: `Generate 3 hook variations for this Meta ad.

ANGLE: aspiration (dreams, goals, transformation, "imagine if...")
PERSONA: Filipino moms 25-45, busy, wants income from home, overwhelmed by options
PRODUCT: Papers to Profits (₱1,497) — home-based printing business course
PROOF POINTS: Step-by-step video lessons | 500+ successful students | No experience needed | Work from home | Templates included | Private community support

RULES:
- Each hook = max 2 sentences, Taglish, scroll-stopping
- Each hook uses a DIFFERENT hook type
- Stay on ASPIRATION angle — dreams, possibilities, transformation. NOT pain.
- No income guarantees

Return: {"hooks": [{"hook_text": "...", "hook_type": "question|social_proof|curiosity_gap|direct_benefit|story_opening|bold_claim", "proof_points_used": ["...", "..."]}]}`
  },
  {
    id: 'hooks-pain',
    name: 'Round 2: Pain Point Hooks',
    desc: '3 hooks for pain_point angle × price_sensitive',
    system: `You generate hook variations for Meta ads in Taglish (Filipino-English mix). Output ONLY valid JSON. No markdown fences.`,
    user: `Generate 3 hook variations for this Meta ad.

ANGLE: pain_point (frustration, struggle, "tired of...", "fed up with...")
PERSONA: Filipino moms who are price-sensitive, budget-conscious, needs to see ROI clearly
PRODUCT: Papers to Profits (₱1,497) — home-based printing business course  
PROOF POINTS: Step-by-step video lessons | 500+ successful students | No experience needed | Work from home | Templates included | Private community support

RULES:
- Each hook = max 2 sentences, Taglish, scroll-stopping
- Each hook uses a DIFFERENT hook type
- Stay on PAIN POINT angle — frustration, struggle, being stuck. NOT aspiration.
- No income guarantees

Return: {"hooks": [{"hook_text": "...", "hook_type": "question|social_proof|curiosity_gap|pain_call|bold_claim|story_opening", "proof_points_used": ["...", "..."]}]}`
  },
  {
    id: 'video-script',
    name: 'Round 3: 30s UGC Video Script',
    desc: 'Full video script — hook + body + CTA, scene by scene',
    system: `You write short-form video scripts for Filipino creators. Taglish (60% Filipino, 40% English). Output ONLY valid JSON. No markdown fences.`,
    user: `Write a 30-second UGC-style Instagram Reel script.

TOPIC: How Papers to Profits changed my printing business journey
ANGLE: transformation (before → after)
PERSONA: Speaking TO busy moms who want side income
PRODUCT: Papers to Profits (₱1,497) — home-based printing business course
BRAND VOICE: Warm, encouraging, practical. Like a friend giving advice over coffee.

RULES:
- 30 seconds total, 4-5 scenes
- Scene 1 = HOOK (first 3 seconds, must stop the scroll)
- Natural Taglish — not translated English, not pure Filipino
- Selfie/talking head style
- End with clear CTA
- No income guarantees or specific earnings

Return: {"script": {"hook": "opening line (3s)", "scenes": [{"scene_number": 1, "timing": "0-3s", "script_text": "what to say", "visual_direction": "what viewer sees", "on_screen_text": "text overlay"}], "cta": "call to action", "total_duration_seconds": 30, "caption_draft": "instagram caption in Taglish"}}`
  }
]

// ─── Callers ───

async function callOpenAI(model, sys, usr) {
  const s = Date.now()
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages: [{role:'system',content:sys},{role:'user',content:usr}], temperature: 0.8 }),
  })
  if (!r.ok) throw new Error(`${r.status}`)
  const d = await r.json()
  return { content: d.choices?.[0]?.message?.content, ms: Date.now()-s, it: d.usage?.prompt_tokens, ot: d.usage?.completion_tokens }
}

async function callClaude(sys, usr) {
  const s = Date.now()
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: sys, messages: [{role:'user',content:usr}], temperature: 0.8 }),
  })
  if (!r.ok) throw new Error(`${r.status}`)
  const d = await r.json()
  return { content: d.content?.[0]?.text, ms: Date.now()-s, it: d.usage?.input_tokens, ot: d.usage?.output_tokens }
}

async function callDeepSeek(sys, usr) {
  const s = Date.now()
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{role:'system',content:sys},{role:'user',content:usr}], temperature: 0.8 }),
  })
  if (!r.ok) throw new Error(`${r.status}`)
  const d = await r.json()
  return { content: d.choices?.[0]?.message?.content, ms: Date.now()-s, it: d.usage?.prompt_tokens, ot: d.usage?.completion_tokens }
}

async function callKimi(sys, usr) {
  const s = Date.now()
  const r = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({ model: 'kimi-k2-turbo-preview', messages: [{role:'system',content:sys},{role:'user',content:usr}], temperature: 0.8, max_tokens: 2048 }),
  })
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0,100)}`)
  const d = await r.json()
  return { content: d.choices?.[0]?.message?.content, ms: Date.now()-s, it: d.usage?.prompt_tokens, ot: d.usage?.completion_tokens }
}

const PROVIDERS = [
  { name: 'GPT-5.4 Mini', id: 'gpt54mini', fn: (s,u) => callOpenAI('gpt-5.4-mini', s, u) },
  { name: 'GPT-5.4', id: 'gpt54', fn: (s,u) => callOpenAI('gpt-5.4', s, u) },
  { name: 'GPT-4o-mini', id: 'gpt4omini', fn: (s,u) => callOpenAI('gpt-4o-mini', s, u) },
  { name: 'Claude Sonnet 4', id: 'claude', fn: (s,u) => callClaude(s, u) },
  { name: 'DeepSeek V3', id: 'deepseek', fn: (s,u) => callDeepSeek(s, u) },
  { name: 'Kimi K2-Turbo', id: 'kimi', fn: (s,u) => callKimi(s, u) },
]

// ─── Run ───

console.log('🥊 LLM Battle — 3 rounds × 6 providers = 18 calls\n')

const allResults = {} // provider → round → result

for (const p of PROVIDERS) {
  allResults[p.id] = {}
  for (const round of ROUNDS) {
    process.stdout.write(`  ${p.name} × ${round.id}...`)
    try {
      const r = await p.fn(round.system, round.user)
      console.log(` ✅ ${r.ms}ms`)
      allResults[p.id][round.id] = { ms: r.ms, content: r.content, it: r.it, ot: r.ot }
    } catch (e) {
      console.log(` ❌ ${e.message.slice(0,80)}`)
      allResults[p.id][round.id] = { error: e.message }
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500))
  }
}

// ─── Build Document ───

function cleanJSON(raw) {
  if (!raw) return null
  let c = raw.trim()
  const f = c.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (f) c = f[1].trim()
  try { return JSON.parse(c) } catch {}
  const m = c.match(/[\[{][\s\S]*[\]}]/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  return null
}

let doc = `# 🥊 LLM Battle — Multi-Round Comparison

> **Date:** ${new Date().toISOString().split('T')[0]}  
> **Rounds:** Aspiration hooks | Pain point hooks | 30s video script  
> **Providers:** ${PROVIDERS.map(p=>p.name).join(', ')}  
> **Script:** \`node scripts/llm-battle.mjs\`

---

`

// For each ROUND, show all providers side by side
for (const round of ROUNDS) {
  doc += `# ${round.name}\n\n`
  doc += `> ${round.desc}\n\n`
  
  for (const p of PROVIDERS) {
    const r = allResults[p.id][round.id]
    doc += `## ${p.name}${r.error ? ' ❌' : ` — ${r.ms}ms`}\n\n`
    
    if (r.error) {
      doc += `Error: ${r.error.slice(0,200)}\n\n`
      continue
    }
    
    const parsed = cleanJSON(r.content)
    
    if (round.id.startsWith('hooks')) {
      const hooks = parsed?.hooks || []
      if (hooks.length > 0) {
        for (let i = 0; i < hooks.length; i++) {
          const h = hooks[i]
          doc += `**${i+1}. [${h.hook_type}]:** ${h.hook_text}\n\n`
        }
      } else {
        doc += `*Parse failed*\n\`\`\`\n${r.content?.slice(0,400)}\n\`\`\`\n\n`
      }
    } else {
      // Video script
      const script = parsed?.script
      if (script) {
        doc += `**Hook:** ${script.hook}\n\n`
        if (script.scenes) {
          for (const s of script.scenes) {
            doc += `**[${s.timing}]** ${s.script_text}\n`
            if (s.visual_direction) doc += `> 📷 ${s.visual_direction}\n`
            if (s.on_screen_text) doc += `> 📝 ${s.on_screen_text}\n`
            doc += `\n`
          }
        }
        if (script.cta) doc += `**CTA:** ${script.cta}\n\n`
        if (script.caption_draft) doc += `**Caption:** ${script.caption_draft}\n\n`
      } else {
        doc += `*Parse failed*\n\`\`\`\n${r.content?.slice(0,600)}\n\`\`\`\n\n`
      }
    }
    
    doc += `---\n\n`
  }
}

// Scoring table
doc += `# Rob's Scorecard

## Hooks (average of Round 1 + Round 2)

| Provider | Taglish | Scroll-stop | Angle Discipline | Variety | Brand Voice | Total /25 |
|----------|---------|-------------|-----------------|---------|-------------|-----------|
${PROVIDERS.map(p => `| ${p.name} | /5 | /5 | /5 | /5 | /5 | /25 |`).join('\n')}

## Video Script (Round 3)

| Provider | Taglish | Hook Power | Scene Flow | Visual Dir | CTA | Total /25 |
|----------|---------|------------|------------|------------|-----|-----------|
${PROVIDERS.map(p => `| ${p.name} | /5 | /5 | /5 | /5 | /5 | /25 |`).join('\n')}

## Final Verdict

| Provider | Hooks Score | Script Score | Combined /50 | Cost/call |
|----------|------------|-------------|-------------|-----------|
${PROVIDERS.map(p => `| ${p.name} | /25 | /25 | /50 | |`).join('\n')}

**Winner:** _______________  
**Best Value:** _______________  
**Recommendation:** _______________
`

const outPath = resolve(__dirname, '../docs/LLM-BATTLE.md')
writeFileSync(outPath, doc)
console.log(`\n✅ Saved to docs/LLM-BATTLE.md`)
