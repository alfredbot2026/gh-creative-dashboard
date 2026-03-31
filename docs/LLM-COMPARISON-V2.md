# LLM Hook Generation Comparison V2

> **Date:** 2026-03-31  
> **Prompt:** Aspiration × New Mom Curious (3 hooks, Taglish, PAS framework)  
> **Temperature:** 0.8  
> **Same prompt for all providers**  
> **Script:** `node scripts/llm-compare-v2.mjs`

---

## Summary Table

| Provider | Model | Latency | In Tokens | Out Tokens | Cost/call | Hooks |
|----------|-------|---------|-----------|------------|-----------|-------|
| GPT-5.4 Nano | `gpt-5.4-nano` | 2436ms | 609 | 251 | $0.000161 | 3 |
| GPT-5.4 Mini | `gpt-5.4-mini` | 2289ms | 609 | 205 | $0.000572 | 3 |
| GPT-5.4 Standard | `gpt-5.4` | 5314ms | 609 | 250 | $0.004023 | 3 |
| GPT-4o-mini | `gpt-4o-mini` | 3282ms | 610 | 171 | $0.000194 | 3 |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | 6681ms | 688 | 307 | $0.006669 | 3 |
| DeepSeek V3 | `deepseek-chat` | 5841ms | 628 | 191 | $0.000141 | 3 |
| Gemini Flash | `gemini-3-flash-preview` | ❌ | — | — | — | — |

---

## Monthly Cost Estimate (3 batches/week × 4 weeks = 12 calls/month)

| Provider | Cost/call | Monthly (hooks only) | Monthly (hooks + formats) |
|----------|-----------|---------------------|--------------------------|
| GPT-5.4 Nano | $0.000161 | $0.0019 | $0.0058 |
| GPT-5.4 Mini | $0.000572 | $0.0069 | $0.0206 |
| GPT-5.4 Standard | $0.004023 | $0.0483 | $0.1448 |
| GPT-4o-mini | $0.000194 | $0.0023 | $0.0070 |
| Claude Sonnet 4 | $0.006669 | $0.0800 | $0.2401 |
| DeepSeek V3 | $0.000141 | $0.0017 | $0.0051 |

---

## GPT-5.4 Nano (`gpt-5.4-nano`) — 2436ms

### Hook 1: `question`
> Busy ka na—pero gusto mo ring may extra income from home? Papers to Profits tuturuan ka step-by-step paano mag-start ng printing business kahit no experience.

*Proof points: Work from home, No experience needed, Step-by-step video lessons*

### Hook 2: `social_proof`
> 500+ moms na ang natuto mag-printing business from home—step-by-step, hindi trial-and-error. With templates included at private community support, mas madali magsimula kahit overwhelmed ka.

*Proof points: 500+ successful students, Templates included, Private community support*

### Hook 3: `curiosity_gap`
> Ever wonder kung paano magsisimula ng home-based printing business nang hindi sobrang complicated? Papers to Profits may step-by-step video lessons + templates para tuloy-tuloy ka kahit busy mom ka.

*Proof points: Step-by-step video lessons, Templates included, Work from home*

---

## GPT-5.4 Mini (`gpt-5.4-mini`) — 2289ms

### Hook 1: `question`
> Pagod ka na bang mag-isip kung paano magsimula ng income from home kahit super busy ka sa baby? Sa Papers to Profits, step-by-step video lessons + templates included para mas simple ang first move mo.

*Proof points: Step-by-step video lessons, Templates included*

### Hook 2: `how_to`
> Paano kung may home-based business ka na puwedeng simulan kahit wala kang experience? Sa Papers to Profits, may private community support at work from home setup para hindi ka mag-isa.

*Proof points: No experience needed, Private community support*

### Hook 3: `social_proof`
> 500+ students na ang natulungan ng Papers to Profits matutong magsimula ng printing business from home. Kung gusto mo ng simple, guided, at mom-friendly na way, ito na ’yon.

*Proof points: 500+ successful students, Work from home*

---

## GPT-5.4 Standard (`gpt-5.4`) — 5314ms

### Hook 1: `question`
> Pagod ka na bang gusto mong kumita from home pero sobrang daming options na lalo ka lang nao-overwhelm? Sa Papers to Profits, may step-by-step video lessons at templates included para makapagsimula ka ng home-based printing business kahit no experience needed.

*Proof points: Step-by-step video lessons, Templates included, No experience needed*

### Hook 2: `social_proof`
> 500+ successful students na ang natulungan ng Papers to Profits na magsimula from home—mom life man o hectic ang schedule. May private community support at step-by-step video lessons para hindi ka mangapa sa pagbuo ng sarili mong printing business.

*Proof points: 500+ successful students, Private community support, Step-by-step video lessons*

### Hook 3: `curiosity_gap`
> Akala mo kailangan mong maging expert para magka-home business, pero may mas simple palang way for busy moms. Papers to Profits shows you step-by-step how to start a printing business from home, with templates included and no experience needed.

*Proof points: Work from home, Templates included, No experience needed*

---

## GPT-4o-mini (`gpt-4o-mini`) — 3282ms

### Hook 1: `question`
> Nahihirapan ka bang maghanap ng paraan para kumita from home? Papers to Profits offers step-by-step video lessons para sa mga busy moms!

*Proof points: Step-by-step video lessons, Work from home*

### Hook 2: `social_proof`
> 500+ moms na ang nagtagumpay sa kanilang sariling printing business — bakit hindi ka pa? Join our supportive community and start your journey!

*Proof points: 500+ successful students, Private community support*

### Hook 3: `curiosity_gap`
> Isipin mo, may opportunity ka na makapag-work from home kahit walang experience! Papers to Profits has all the templates you need to get started!

*Proof points: No experience needed, Templates included*

---

## Claude Sonnet 4 (`claude-sonnet-4-20250514`) — 6681ms

### Hook 1: `question`
> Tired ka na ba mag-isip kung paano mag-extra income while taking care of your baby? Yung feeling na gusto mo mag-contribute sa family pero hindi mo alam san magsisimula?

*Proof points: Work from home, No experience needed*

### Hook 2: `social_proof`
> 500+ moms na ang nagsimula ng printing business from home — at lahat sila walang experience nung una. Ikaw ba ang susunod na mag-transform ng free time into income?

*Proof points: 500+ successful students, No experience needed*

### Hook 3: `curiosity_gap`
> May secret na ginagawa ng mga successful work-from-home moms na hindi mo pa naisip. It's not online selling, hindi rin VA work — it's something na pwede mo gawin kahit may baby ka.

*Proof points: Work from home, Step-by-step video lessons*

---

## DeepSeek V3 (`deepseek-chat`) — 5841ms

### Hook 1: `question`
> Gusto mo ba talaga ng extra income from home pero hindi mo alam kung saan magsisimula?

*Proof points: Work from home, No experience needed*

### Hook 2: `social_proof`
> 500+ moms na ang nag-start ng printing business from scratch — ikaw ba next?

*Proof points: 500+ successful students, No experience needed*

### Hook 3: `curiosity_gap`
> May isang home-based business na perfect for busy moms — at hindi mo kailangan ng malaking capital.

*Proof points: Work from home, Templates included*

---

## Gemini Flash (`gemini-3-flash-preview`) — ❌ Error

**Error:** {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metri

---

## Evaluation Criteria

| Criteria | What to look for |
|----------|-----------------|
| **Taglish naturalness** | Sounds like a real Filipina mom? Or translated English? |
| **Scroll-stopping** | First 3 words grab attention? Would you stop scrolling? |
| **Angle discipline** | All hooks stay on "aspiration"? Or drift to pain/education? |
| **Proof point integration** | Woven in naturally? Or bolted on? |
| **Hook type variety** | 3 genuinely different types? Or variations of same? |
| **Compliance** | No income guarantees or false scarcity? |
| **Brand voice** | Warm, encouraging, practical? |
