# LLM Hook Generation Comparison

> **Date:** 2026-04-01  
> **Prompt:** Aspiration × New Mom Curious (3 hooks, Taglish, PAS framework)  
> **Temperature:** 0.8  
> **Same system prompt + user prompt for all providers**  
> **Note:** Gemini Flash hit daily free tier limit (20 req/day) from build session. Moonshot key expired. Will retry both when available.  
> **Script:** `scripts/llm-compare.mjs` — rerun anytime with `node scripts/llm-compare.mjs`

---

## Quick Summary

| Provider | Model | Latency | Hooks Parsed | 
|----------|-------|---------|-------------|
| Gemini Flash | gemini-3-flash-preview | 0ms | ❌ Error |
| OpenAI GPT-4o-mini | gpt-4o-mini | 4087ms | 3 |
| Claude Sonnet | claude-sonnet-4-20250514 | 7211ms | 3 |
| DeepSeek | deepseek-chat | 5264ms | 3 |
| Moonshot (Kimi) | moonshot-v1-8k | 0ms | ❌ Error |

---

## Gemini Flash (gemini-3-flash-preview) — 0ms

**ERROR:** ERROR: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3-flash\nPlease retry in 1.56152477s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3-flash"},"quotaValue":"20"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"1s"}]}}

---

## OpenAI GPT-4o-mini (gpt-4o-mini) — 4087ms

### Hook 1: question
> Worried ka ba na hindi mo na kayang maghanap ng extra income habang busy sa mga anak?

Proof points: No experience needed, Work from home

### Hook 2: social_proof
> 500+ moms na ang nag-start ng printing business from home — ikaw na kaya ang susunod?

Proof points: 500+ successful students, Step-by-step video lessons

### Hook 3: curiosity_gap
> Alam mo ba na may step-by-step guide para sa pag-launch ng iyong sariling printing business?

Proof points: Step-by-step video lessons, Templates included

---

## Claude Sonnet (claude-sonnet-4-20250514) — 7211ms

### Hook 1: question
> Tired ka na ba maging dependent sa husband mo for everything? Imagine mo kung may sarili kang business na pwedeng gawin sa bahay lang habang nag-aalaga sa kids.

Proof points: Work from home, No experience needed

### Hook 2: social_proof
> 500+ moms na ang naging successful sa printing business — at lahat sila nag-start without any experience. Ikaw ba susunod na mag-transform from stay-at-home mom to boss mom?

Proof points: 500+ successful students, No experience needed

### Hook 3: curiosity_gap
> May secret na ginagawa ng mga thriving work-from-home moms na hindi mo pa alam. Hindi siya complicated, hindi siya expensive — pero life-changing siya for busy moms like you.

Proof points: Step-by-step video lessons, Private community support

---

## DeepSeek (deepseek-chat) — 5264ms

### Hook 1: pain_call
> Gusto mo ba talaga magkaroon ng sariling home business pero hindi mo alam sa'n magsisimula?

Proof points: Step-by-step video lessons, No experience needed

### Hook 2: how_to
> Paano nga ba magsimula ng printing business from home kahit walang experience?

Proof points: Step-by-step video lessons, Templates included, Work from home

### Hook 3: social_proof
> May 500+ moms na ang nag-start ng home printing business nila — ikaw ba next?

Proof points: 500+ successful students, Private community support

---

## Moonshot (Kimi) (moonshot-v1-8k) — 0ms

**ERROR:** ERROR: Moonshot 401: {"error":{"message":"Invalid Authentication","type":"invalid_authentication_error"}}

---

## Evaluation Criteria

When comparing, look for:

1. **Taglish naturalness** — Does it sound like a real Filipina mom talking? Or robotic translated English?
2. **Scroll-stopping power** — Would YOU stop scrolling? First 3 words matter most.
3. **Angle discipline** — Does every hook stay on "aspiration"? Or drift to pain/education?
4. **Proof point integration** — Are proof points woven in naturally? Or bolted on awkwardly?
5. **Hook type variety** — Did it actually give 3 DIFFERENT hook types? Or variations of the same?
6. **Compliance** — Any income guarantees or false scarcity?
7. **Brand voice** — Warm, encouraging, practical? Or salesy/corporate?

## Raw Responses (for debugging)

### Gemini Flash
```json
ERROR: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3-flash\nPlease retry in 1.56152477s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3-flash"},"quotaValue":"20"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"1s"}]}}
```

### OpenAI GPT-4o-mini
```json
{"hooks":[{"hook_text":"Worried ka ba na hindi mo na kayang maghanap ng extra income habang busy sa mga anak?","hook_type":"question","proof_points_used":["No experience needed","Work from home"]},{"hook_text":"500+ moms na ang nag-start ng printing business from home — ikaw na kaya ang susunod?","hook_type":"social_proof","proof_points_used":["500+ successful students","Step-by-step video lessons"]},{"hook_text":"Alam mo ba na may step-by-step guide para sa pag-launch ng iyong sariling printing business?","hook_type":"curiosity_gap","proof_points_used":["Step-by-step video lessons","Templates included"]}]}
```

### Claude Sonnet
```json
```json
{
  "hooks": [
    {
      "hook_text": "Tired ka na ba maging dependent sa husband mo for everything? Imagine mo kung may sarili kang business na pwedeng gawin sa bahay lang habang nag-aalaga sa kids.",
      "hook_type": "question",
      "proof_points_used": ["Work from home", "No experience needed"]
    },
    {
      "hook_text": "500+ moms na ang naging successful sa printing business — at lahat sila nag-start without any experience. Ikaw ba susunod na mag-transform from stay-at-home mom to boss mom?",
      "hook_type": "social_proof",
      "proof_points_used": ["500+ successful students", "No experience needed"]
    },
    {
      "hook_text": "May secret na ginagawa ng mga thriving work-from-home moms na hindi mo pa alam. Hindi siya complicated, hindi siya expensive — pero life-changing siya for busy moms like you.",
      "hook_type": "curiosity_gap",
      "proof_points_used": ["Step-by-step video lessons", "Private community support"]
    }
  ]
}
```
```

### DeepSeek
```json
```json
{
    "hooks": [
        {
            "hook_text": "Gusto mo ba talaga magkaroon ng sariling home business pero hindi mo alam sa'n magsisimula?",
            "hook_type": "pain_call",
            "proof_points_used": ["Step-by-step video lessons", "No experience needed"]
        },
        {
            "hook_text": "Paano nga ba magsimula ng printing business from home kahit walang experience?",
            "hook_type": "how_to",
            "proof_points_used": ["Step-by-step video lessons", "Templates included", "Work from home"]
        },
        {
            "hook_text": "May 500+ moms na ang nag-start ng home printing business nila — ikaw ba next?",
            "hook_type": "social_proof",
            "proof_points_used": ["500+ successful students", "Private community support"]
        }
    ]
}
```
```

### Moonshot (Kimi)
```json
ERROR: Moonshot 401: {"error":{"message":"Invalid Authentication","type":"invalid_authentication_error"}}
```

