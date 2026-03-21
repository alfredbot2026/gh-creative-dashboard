# Content Evaluation Framework
> Synthesized from KB notebooks: Viral Video Anatomy, Sam Gaudet, Caleb Ralston, Briar Cochran, Personal Brand Launch Library

## Core Principle
**The audience determines quality, not the creator.** Evaluation must be data-driven, not subjective.

---

## 1. Scoring System: The Multiplier Tracking System

### How it works
1. **Establish baseline:** Median views across last 75-90 days of content per format
2. **Grade with multiplier:** Each piece scored as Nx the median (e.g., 65K views / 10K median = 6.5x)
3. **Monthly audit:** Isolate top 10%, study what worked. Eliminate formats consistently below 1x

### Our implementation
- Calculate median views per platform (YouTube, IG, FB)
- Score every post as `views / platform_median`
- Tier assignment: `<0.5x` = Below | `0.5-1.2x` = Average | `1.2-2x` = Above | `>2x` = Top

---

## 2. The 7 Components of Evaluation (per video)

### A. Hook (0-3 seconds) — CRITICAL
**Metrics:** 3-second hold rate (target: 60%+, top: 70-80%)
**Evaluate:**
- Pattern Interruption: Does it break scroll autopilot? (unexpected visual, bold text, abrupt sound)
- Curiosity Gap: Does it open a question the viewer NEEDS answered?
- Bold Claim: Counterintuitive statement that demands attention?
- The 3 C's: Context (new viewers understand), Contrarian take, Creates intrigue
- Fluff check: Opens with "Hi guys" or slow build-up = FAIL
- Triple hook: Written + Verbal + Visual hooks layered together?

### B. Value & Content (The Body)
**Metrics:** Average view duration, completion rate, avg view percentage
**Evaluate:**
- Value Compression: Maximum actionable value in minimum time
- Specificity: Real numbers, frameworks, examples — not vague advice
- Jargon check: Industry terms that confuse casual viewers?
- HEIT framework: Hook → Explain → Illustrate (story/analogy) → Teach (actionable lesson)

### C. Retention & Pacing
**Metrics:** Audience retention curve, predicted drop-off points
**Evaluate:**
- Hook-Hold-Reward structure: Does it deliver on the promise?
- Visual changes every 2-4 seconds (cuts, overlays, B-roll, framing shifts)
- Curiosity stacking: Resolves one micro-gap, immediately opens another
- Drop-off diagnosis: If viewers leave at 5-7s, hook worked but pacing failed

### D. Format & Visual Style
**Evaluate:**
- Talking head alone = lower retention vs. mixed formats
- Engaging formats: talking back-and-forth, props, angle changes, demonstrations
- Vertical + good lighting + clear audio
- Captions mandatory (90% watch on mute)

### E. Emotional Resonance
**Evaluate using STEPPS framework:**
- High-arousal emotions (awe, anger, anxiety, excitement) = SHARED
- Low-arousal emotions (sadness, contentment) = NOT shared
- Does it speak to Hopes, Dreams, Fears, Blockers of the target audience?

### F. CTA (Call to Action)
**Evaluate:**
- Exists? (many videos have none)
- Type matches purpose:
  - Storytelling → Follow CTA
  - Educational → Freebie/Offer CTA
  - Selling → Comment/Link CTA
- Timing: End only, or woven into content?

### G. Topic & Audience Fit
**Evaluate using CCN framework:**
- Core audience (buyers): Does this serve them?
- Casual audience (watchers): Does this engage them?
- New audience (never seen you): Is this accessible?
- Total Addressable Market: Is the topic broad enough?

---

## 3. Key Metrics Hierarchy

### Primary (algorithmic weight)
| Metric | Source | What it means |
|--------|--------|---------------|
| **Watch time** | YouTube Analytics | Total time watched — #1 algorithm signal |
| **Avg view percentage** | YouTube Analytics | % of video watched — retention quality |
| **3-second hold rate** | YouTube Analytics (intro retention) | Hook effectiveness |
| **Sends per reach** | IG Insights | Shareability — highest algorithm weight |
| **Saves** | IG Insights | Value indicator — "I need this later" |

### Secondary (audience building)
| Metric | Source | What it means |
|--------|--------|---------------|
| **Followers added per video** | Platform analytics | THE most important metric (not views) |
| **View-to-follower rate** | Calculated | 1% = banger, 0.5% = good, 0.1% = decent |
| **View velocity** | Early hours data | How fast views accumulate — viral predictor |
| **Comments** | Basic metrics | Conversation starter |
| **CTR** | YouTube Analytics | Thumbnail + title effectiveness |

### Vanity (track but don't optimize for)
- Total views (without context)
- Likes (easy engagement, low signal)
- Impressions (reach ≠ impact)

---

## 4. Content Mix: 70/20/10 Rule

- **70% Proven formats** — Topics + formats that reliably hit >1x multiplier
- **20% Iterations** — Tweaks to proven content (new hook, different CTA, adjusted pacing)
- **10% Experiments** — Completely new formats. Flops are expected and celebrated.

---

## 5. Evaluation Process

### Per-Video Scorecard
For each video, score 1-10 on:
1. **Hook Strength** — Pattern interrupt + curiosity gap + triple hook
2. **Value Density** — Actionable, specific, jargon-free
3. **Retention Design** — Pacing, visual variety, curiosity stacking
4. **Emotional Trigger** — High-arousal emotion present?
5. **CTA Effectiveness** — Right type, right timing
6. **Production Quality** — Audio, lighting, captions, format
7. **Topic-Market Fit** — CCN coverage, TAM size

**Overall Score = weighted average** (Hook 25%, Value 20%, Retention 20%, Emotion 10%, CTA 10%, Production 5%, Topic 10%)

### Monthly Content Audit
1. Sort all content by multiplier (views / median)
2. Isolate top 10% — what do they have in common?
3. Isolate bottom 10% — what went wrong?
4. Check content mix: Is it 70/20/10?
5. Identify one pattern to double down on, one to eliminate

---

## 6. What We're Missing (vs what we have)

### Have ✅
- Views, likes, comments (YouTube + IG basic)
- Deep analysis: transcript, hook type, pacing, visual style, topics
- Content purpose classification
- Gemini-generated score + tips

### Need ❌ (actual data, not AI predictions)
- **YouTube audience retention curve** (actual drop-off graph, not predicted)
- **3-second hold rate** (intro retention from YouTube Analytics)
- **Sends per reach** (IG — requires insights API)
- **Saves** (IG — rate limited, need retry)
- **Followers added per video** (both platforms)
- **View velocity** (first 24h/48h view trajectory)
- **CTR** (YouTube — have for 87 videos, need for all)
- **Multiplier score** (need to calculate from median)

### Evaluation Gap
Our current Gemini analysis uses a generic 1-10 score. It should instead use this KB framework:
- Replace generic score with the 7-component weighted scorecard
- Replace "predicted drop-off" with actual retention data
- Add multiplier scoring (vs platform median)
- Add view-to-follower conversion tracking
