# Generation Audit — Detailed Analysis

**Auditor:** Dr. Strange (Lead)
**Date:** 2026-03-24
**Topic tested:** "How to start a sticker business with less than 500 pesos"
**Results:** 24/24 pass (all generate correctly)

---

## 🔴 Critical Issues

### 1. Repetitive Content Across Structures
**Severity: HIGH** — The same talking points appear in nearly every script:

- "₱500 for sticker paper" → appears in 20/24 scripts
- "No need for expensive cutting machine / Cricut / Silhouette" → appears in 22/24
- "Fussy cut / hand-cut with scissors" → appears in 18/24
- "Papers to Profits Starter Kit for ₱1,300" → appears in 21/24
- "Comment STICKER" CTA → appears in 12/24
- "Habang natutulog ang mga bata" (while kids sleep) → appears in 8/24
- "Canva free version" → appears in 16/24

**Impact:** If Grace generates 3 scripts back to back, they'll all say the same things in different structures. The STRUCTURE changes but the CONTENT doesn't. This is the biggest quality issue.

**Root cause:** The generation prompt pulls the same business context + KB entries every time. There's no deduplication or diversity enforcement.

**Fix needed:** 
- Add "recently generated" context — avoid repeating exact same talking points
- Add diversity instructions: "Do NOT use these phrases/angles that were used in recent scripts: [list]"
- Or: vary the angle per structure (e.g., Comparison should find a NEW comparison, not just ₱500 vs ₱20,000 again)

### 2. P2P Hard Sell in Every Script
**Severity: MEDIUM** — Even "educate" and "story" scripts end with a P2P product pitch (₱1,300 starter kit). This makes all content feel like ads regardless of the goal selected.

**Expected behavior:**
- `sell` goal → product pitch is appropriate
- `educate` goal → should teach, maybe soft mention at most
- `story` goal → should be purely narrative, build connection

**Fix needed:** Adjust system prompt to restrict product mentions based on goal:
- `sell/announce`: full product pitch + pricing allowed
- `educate/process`: soft mention OK, no pricing
- `story/inspire/journey`: NO product mention, purely relational

### 3. Quality Scores Are Inflated
**Severity: LOW** — Scores range from 92-99 with average ~96. No script scored below 90. Either every script is genuinely excellent or the scoring rubric is too generous.

**Likely issue:** The quality gate scores its own output, creating a "grading your own homework" problem.

---

## 🟡 Structure-Specific Issues

### Facebook Ads
| Structure | Blocks | Verdict | Notes |
|-----------|--------|---------|-------|
| Before-After-Bridge | 4 | ✅ Good | Clear contrast, correct structure |
| Benefit-Caveat | 4 | ✅ Good | Caveat feels natural |
| Hook-Story-Offer | 3 | ⚠️ OK | Story section is thin — just one paragraph |
| PAS | 4 | ✅ Good | Agitate section hits hard |
| PASTOR | 6 | ✅ Excellent | All 6 sections distinct and purposeful |
| WHO-WHY-OFFER-ACTION | 4 | ✅ Good | "Who" callout is specific |
| (No structure) | flat | ✅ Good | Classic headline + body format |

**FB Ad winner:** PASTOR — most complete, each section has a clear job.
**FB Ad concern:** Hook-Story-Offer story section needs more depth.

### Reels
| Structure | Blocks | Verdict | Notes |
|-----------|--------|---------|-------|
| Comparison | 4 | ✅ Excellent | Clean A vs B format with verdict |
| Full Reel Anatomy | 8 | ✅ Excellent | All 8 blocks distinct, timing correct |
| Hook-Hold-Reward | 3 | ⚠️ OK | "Hold" section is too long (one wall of text) |
| Iceberg Effect | 5 | ✅ Good | Generated 5 blocks (expected 4, added CTA) |
| Micro-Story Arc | 3 | ✅ Excellent | Emotional, specific, perfect arc |
| Myth, Truth, Move | 4 | ✅ Good | Myth → Truth transition is sharp |
| Show Then Tell | 5 | ✅ Good | "Show Result" has no text (correct — it's visual-first) |
| (No structure) | 5 | ⚠️ Interesting | AI created its own structure (HOOK → STEP 1-3 → CTA) |

**Reel winner:** Micro-Story Arc — genuinely moving, would stop the scroll.
**Reel concern:** Hook-Hold-Reward "Hold" section needs to be broken into sub-beats.

### Facebook Posts
| Structure | Blocks | Verdict | Notes |
|-----------|--------|---------|-------|
| 4 Founder Videos | 4 | ⚠️ Odd | "Choose Video Type" block outputs a category label, not post content |
| 6-Step My Story | 6 | ✅ Excellent | Most emotionally resonant script in the audit |
| Three-Part Brand Story | 3 | ✅ Good | "Core Truth" section is powerful |
| Year-by-Year | 3 | ⚠️ Weak | "Match Photos" block is meta-instruction, not actual content |
| (No structure) | flat | ✅ Excellent | Best caption in the audit — raw, emotional, specific |

**FB Post winner:** 6-Step My Story — genuinely would perform well on Facebook.
**FB Post concerns:** 
- 4 Founder Videos "Choose Video Type" block shouldn't be a content block — it's a meta-decision
- Year-by-Year "Match Photos" block reads like instructions to Grace, not post content

### YouTube
| Structure | Blocks | Verdict | Notes |
|-----------|--------|---------|-------|
| 4 C's YouTube Intro | 6 | ✅ Excellent | Perfect YouTube intro structure |
| HEIT Framework | 4 | ✅ Good | "Illustrate" with real examples |
| One Concept, Five Stories | 7 | ✅ Excellent | 5 distinct stories, each with a tactic |
| (No structure) | sections | ✅ Good | Clean timestamp format |

**YouTube winner:** One Concept, Five Stories — this is genuinely a complete, filmable video script.
**YouTube concern:** None significant.

---

## 🟢 What's Working Well

1. **Taglish tone is consistent** — every script sounds like Grace, not a corporate copywriter
2. **Visual directions are filmable** — "Grace at her desk, holding..." not abstract concepts
3. **Price anchoring** — ₱500 vs ₱20,000 comparison appears naturally
4. **On-screen text** — reels have proper text overlays with emoji
5. **Timing markers** — reels have second-by-second timing
6. **Structure adherence** — blocks actually follow their defined purpose (PASTOR Amplify section DOES amplify, not just repeat the problem)

---

## 📋 Recommended Fixes (Priority Order)

### P0 — Content Diversity (blocks overlap across scripts)
- Track recently generated content and inject "avoid these angles" into prompt
- Each structure should find a UNIQUE angle on the same topic
- e.g., Comparison should compare DIFFERENT things than Before-After-Bridge

### P1 — Goal-Appropriate CTA (product pitch in non-sell scripts)
- `sell`: full P2P pitch with pricing ✅
- `educate`: "Follow for more tips" or soft brand mention only
- `story`: no product mention, just emotional connection

### P2 — Fix 4 Founder Videos "Choose Video Type" block
- This block should contain actual content, not a meta-label
- Or: remove it from the structure and make it 3 blocks

### P3 — Fix Year-by-Year "Match Photos" block
- Should contain actual photo descriptions/captions, not instructions

### P4 — Hook-Hold-Reward "Hold" needs sub-beats
- The "Hold" section outputs one massive paragraph
- Should be broken into 3-4 numbered points or fast cuts

### P5 — Quality score recalibration
- Every script scoring 95+ is meaningless differentiation
- Need external evaluation or stricter rubric
