# LLM Hook Generation — Final Comparison (All Providers)

> **Date:** 2026-04-01  
> **Prompt:** Aspiration × New Mom Curious — 3 hooks, Taglish, PAS  
> **Same prompt for all. Temperature 0.8 (K2.5 forced to 1.0)**  
> **Script:** `node scripts/llm-compare-final.mjs`

---

## Summary

| # | Provider | Model | Speed | In→Out | Cost/call | Hooks |
|---|----------|-------|-------|--------|-----------|-------|
| 1 | **Gemini Flash** | `gemini-3-flash-preview` | ❌ | —→— | ❌ | — |
| 2 | **GPT-5.4 Nano** | `gpt-5.4-nano` | 3401ms | 443→253 | $0.000146 | 3 |
| 3 | **GPT-5.4 Mini** | `gpt-5.4-mini` | 1964ms | 443→217 | $0.000524 | 3 |
| 4 | **GPT-5.4** | `gpt-5.4` | 4905ms | 443→243 | $0.003537 | 3 |
| 5 | **GPT-4o-mini** | `gpt-4o-mini` | 4795ms | 444→199 | $0.000186 | 3 |
| 6 | **Claude Sonnet 4** | `claude-sonnet-4-20250514` | 5921ms | 493→242 | $0.005109 | 3 |
| 7 | **DeepSeek V3** | `deepseek-chat` | 7149ms | 450→191 | $0.000116 | 3 |
| 8 | **Kimi K2-Turbo** | `kimi-k2-turbo-preview` | 3562ms | 441→187 | $0.000238 | 3 |
| 9 | **Kimi K2.5** | `kimi-k2.5` | ❌ | —→— | ❌ | — |

---

## Gemini Flash (`gemini-3-flash-preview`) — ❌

**Error:** {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metri

---

## GPT-5.4 Nano (`gpt-5.4-nano`) — 3401ms

**Hook 1 [question]:**
> Busy mom ka ba, pero gusto mo ng way to earn from home without starting from scratch? Papers to Profits shows you the step-by-step way (with templates + no experience needed).

**Hook 2 [how_to]:**
> Start your home-based printing business today—one simple step at a time. With step-by-step video lessons, templates included, and private community support, madali mong ma-follow kahit super busy ka.

**Hook 3 [social_proof]:**
> 500+ moms already found their path to printing from home—ready ka na ba mag-start rin? Papers to Profits gives you templates + private community support, step-by-step video lessons for beginners.

---

## GPT-5.4 Mini (`gpt-5.4-mini`) — 1964ms

**Hook 1 [question]:**
> Busy mom ka ba na gusto mag-start ng home-based income, pero hindi mo alam saan uunahin? Sa Papers to Profits, step-by-step video lessons + templates included para mas simple mag-umpisa from home.

**Hook 2 [how_to]:**
> Paano kung may simple guide ka para makapagsimula ng printing business sa bahay kahit no experience needed? With Papers to Profits, may step-by-step video lessons at private community support para di ka nag-iisa.

**Hook 3 [social_proof]:**
> 500+ students na ang nagsimula with Papers to Profits—pang-mom na gusto ng malinaw, step-by-step na path to a home-based printing business. Work from home ka, with templates included to make things easier.

---

## GPT-5.4 (`gpt-5.4`) — 4905ms

**Hook 1 [question]:**
> Mommy, gusto mo bang mag-start ng home-based printing business pero wala ka nang time mag-figure out mag-isa? Sa Papers to Profits, may step-by-step video lessons at templates included para mas simple ang first step mo from home.

**Hook 2 [how_to]:**
> How to start a printing business kahit busy new mom ka: sundan mo lang ang step-by-step video lessons ng Papers to Profits, kahit no experience needed. Plus, may private community support ka habang binubuo mo ito from home.

**Hook 3 [social_proof]:**
> Hindi ka nag-iisa, Mommy—500+ successful students na ang nag-start with Papers to Profits gamit ang step-by-step video lessons at support ng private community. Kung pangarap mo ang simple home-based business, dito puwedeng magsimula.

---

## GPT-4o-mini (`gpt-4o-mini`) — 4795ms

**Hook 1 [question]:**
> Nais mo bang kumita mula sa bahay, kahit abala ka sa mga bata? With our step-by-step video lessons, makakahanap ka ng paraan na simple at masaya!

**Hook 2 [social_proof]:**
> Mahigit 500 moms na ang nagtagumpay sa aming community! Join us and learn how to start your own printing business na wala pang experience!

**Hook 3 [bold_claim]:**
> Imagine mo, habang nag-aalaga ka ng anak, kumikita ka rin sa iyong sariling business! Ang Papers to Profits ay may templates at community support para sa mga busy moms!

---

## Claude Sonnet 4 (`claude-sonnet-4-20250514`) — 5921ms

**Hook 1 [question]:**
> Paano kaya kung may paraan para maging successful home-based entrepreneur kahit baguhan ka pa lang sa business?

**Hook 2 [social_proof]:**
> Here's how 500+ moms transformed their extra time into a thriving printing business from their own homes.

**Hook 3 [curiosity_gap]:**
> Imagine mo - may sariling business ka na hindi mo kailangan mag-invest ng malaking capital, at may step-by-step guide pa.

---

## DeepSeek V3 (`deepseek-chat`) — 7149ms

**Hook 1 [question]:**
> Gusto mo ba ng extra income from home pero di mo alam sa'n magsisimula?

**Hook 2 [how_to]:**
> Paano kung may step-by-step guide na lang na susundan para magka-home printing business ka?

**Hook 3 [social_proof]:**
> Imagine this: 500+ na moms na tulad mo, nag-e-earn na from home printing.

---

## Kimi K2-Turbo (`kimi-k2-turbo-preview`) — 3562ms

**Hook 1 [curiosity_gap]:**
> Nananabik ka bang makita ang pangalan mo sa "Mom-Preneur of the Year" habang nakapantulog ka pa?

**Hook 2 [how_to]:**
> How to: gawing ₱1,497 na printing biz ang laptop at 20 minuto lang kapag tulog si baby—step-by-step kahit zero experience.

**Hook 3 [social_proof]:**
> 500+ moms na mismo ang naka-hanap ng kanilang "me-time fund" sa gabi—sali ka na sa secret group namin!

---

## Kimi K2.5 (`kimi-k2.5`) — ❌

**Error:** kimi-k2.5 429: {"error":{"message":"The engine is currently overloaded, please try again later","type":"engine_overloaded_error"}}

---

## Rob's Evaluation

_Score each provider 1-5 on these criteria:_

| Provider | Taglish | Scroll-stop | Angle | Variety | Voice | Overall |
|----------|---------|-------------|-------|---------|-------|---------|
| GPT-5.4 Nano | /5 | /5 | /5 | /5 | /5 | /5 |
| GPT-5.4 Mini | /5 | /5 | /5 | /5 | /5 | /5 |
| GPT-5.4 | /5 | /5 | /5 | /5 | /5 | /5 |
| GPT-4o-mini | /5 | /5 | /5 | /5 | /5 | /5 |
| Claude Sonnet 4 | /5 | /5 | /5 | /5 | /5 | /5 |
| DeepSeek V3 | /5 | /5 | /5 | /5 | /5 | /5 |
| Kimi K2-Turbo | /5 | /5 | /5 | /5 | /5 | /5 |

**Winner:** _______________  
**Runner-up:** _______________  
**Best value (quality/cost):** _______________
