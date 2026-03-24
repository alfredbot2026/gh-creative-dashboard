# Generation Quality Research

## Current State

### Model: Gemini 3 Flash Preview (free tier)
- Fallback chain: Gemini → Moonshot → ZAI → DeepSeek
- In practice: only Gemini has a key configured, so it's always Gemini Flash
- Temperature: 0.7
- No system prompt tuning for creative writing specifically

### Topic Generation: Non-existent
- User types a topic manually OR leaves it blank and AI picks one
- When AI picks, it pulls from business profile + products only
- No topic ideation engine, no sub-topic expansion, no content calendar intelligence
- Result: every script defaults to the same 3-4 talking points

### KB Utilization: Minimal
- KB has 300+ entries across 10 categories (hooks, structures, virality science, CRO, etc.)
- But generation only pulls: business profile + brand style + structure blocks
- KB hook library (40+ hook types) is NOT used during generation
- KB content funnel entries (pillars, CCN fit, accordion method) are NOT used
- KB virality science entries are NOT used
- Massive waste — we built the knowledge but don't query it during script writing

---

## Root Cause Analysis

### Problem 1: Content Repetition
**Why:** The generation prompt has exactly ONE context source: the business profile. Every script gets the same inputs → same outputs.

**What's missing:**
1. **Topic decomposition** — "sticker business" has 50+ sub-topics (paper types, printing methods, pricing, packaging, customer stories, seasonal trends, tool reviews, etc.). We should generate a topic tree FIRST, then write scripts against specific sub-topics.
2. **Angle variation** — KB has entries for "angle shifts" (ad_creative > angle_shifts) and "contrarian reframe" and "comparison hooks" etc. Each structure should be paired with a DIFFERENT angle, not just a different wrapper for the same angle.
3. **Previously generated tracking** — no memory of what's been created before. Simple fix: query content_items for recent scripts and inject "avoid these angles/hooks."

### Problem 2: Wrong Model for the Job
**Current:** Gemini 3 Flash — optimized for speed and cost, NOT creative writing quality.

**Research findings (2026 benchmarks):**
- **Claude Opus 4.6** — #1 on Mazur Writing Benchmark (8.561). Best for structured creative writing, emotional resonance, Taglish nuance.
- **Gemini 3.1 Pro** — Strong for serious writing. Better than Flash for creative tasks.
- **GPT-5.2** — Strong general reasoning. Good at structured output but less "human" feel.
- **Gemini Flash** — Fast, cheap. OK for classification/analysis. Weak for creative writing that needs emotional depth, cultural nuance, humor, authentic voice.

**The model matters enormously for script quality.** Flash is fine for our classification pipeline, data analysis, and batch processing. It's the WRONG tool for writing scripts that need to sound like a real Filipina mompreneur talking to her community.

### Problem 3: No Topic Intelligence
**What the KB says but we don't use:**
- **CCN Fit** — every topic should serve Core (buyers), Casual (watchers), AND New (strangers)
- **70/20/10 Rule** — 70% proven topics, 20% iterations, 10% experiments
- **Accordion Method** — expand across topics, contract to winners, repeat
- **Content Pillars** — Grace's business profile has content_pillars defined but we don't use them to generate sub-topics
- **4-on-4 Validation** — test 4 outlier videos on the same topic before committing

---

## Proposed Solutions (Architecture Level)

### Solution 1: Topic Engine (NEW)
Build a proper topic ideation system:

```
Main Topic (user input or AI suggested)
    ↓
Topic Decomposer (LLM call)
    ↓
├── Sub-topic 1: Material selection (paper types, thickness, glossy vs matte)
├── Sub-topic 2: Pricing strategy (cost breakdown, profit margins, bundle pricing)
├── Sub-topic 3: Design tips (Canva tricks, border spacing, color psychology)
├── Sub-topic 4: Customer stories (first sale, biggest order, repeat buyers)
├── Sub-topic 5: Seasonal content (Christmas stickers, back-to-school, Valentine's)
├── Sub-topic 6: Equipment (printer comparison, scissors vs cutter, lamination)
├── Sub-topic 7: Marketing (FB groups, school fairs, word of mouth)
├── Sub-topic 8: Mistakes to avoid (wrong paper, bad pricing, too many designs)
└── ... (10-20 sub-topics per main topic)
```

Each sub-topic gets a DIFFERENT angle. When Grace picks "sticker business," she sees 10+ specific sub-topic suggestions, not just one text box.

**Data sources for topic suggestions:**
1. Content pillars from business profile
2. Top-performing topics from Grace's own data (we have this!)
3. Trending topics from competitive intelligence (Phase 4c — we have this!)
4. KB content funnel entries (content planning frameworks)
5. Gaps: topics competitors cover but Grace hasn't

### Solution 2: Model Selection (NEW)
Add Claude as a generation option:

**Architecture:**
```typescript
// New provider in PROVIDERS array
{
    name: 'Claude',
    envKey: 'ANTHROPIC_API_KEY',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',  // or opus for premium
}
```

**Rob's Claude Max subscription:**
- Claude Max gives API access? Need to check. If not, we use the Anthropic API key.
- Sonnet 4.6 at $3/$15 per million tokens — roughly $0.01-0.03 per script generation
- Opus 4.6 at $5/$25 — roughly $0.05-0.10 per script generation
- vs Gemini Flash: essentially free

**Recommendation:** 
- Default: Gemini Flash for classification, batch processing, data work (cheap/fast)
- Script generation: Claude Sonnet (best creative writing quality for the price)
- Premium option: Claude Opus for "best possible" scripts (toggle in UI)
- Let Grace choose: "Fast & Free" vs "Premium Quality" toggle

### Solution 3: KB-Enriched Generation (FIX)
Actually USE the knowledge base during generation:

```
Current flow:
  Business Profile → Structure Blocks → LLM → Script

Proposed flow:
  Business Profile
  + Structure Blocks  
  + Relevant KB entries (hook library, virality science, CRO patterns)
  + Top-performing patterns from Grace's own data
  + Competitive intelligence (what's working in the niche)
  + Recently generated scripts (avoid repetition)
  → LLM → Script
```

Specifically:
1. **Hook injection** — Pull 3-5 hook entries from KB matching the structure type. "For this Curiosity Gap hook, here are proven patterns: [examples]"
2. **Angle injection** — Pull "angle_shifts" and "contrarian_reframe" entries. "Take a DIFFERENT angle than the obvious one."
3. **Virality injection** — Pull relevant virality science. "Posts with emotional triggers get 3x more shares. Ensure at least one emotional beat."
4. **Performance injection** — "Grace's top-performing content uses: [patterns from her data]"
5. **Anti-repetition** — "Do NOT use these angles/phrases from recent scripts: [list]"

### Solution 4: Goal-Appropriate Behavior (FIX)
```
sell/announce: Full product pitch, pricing, CTA to buy
educate/process: Pure value. Soft brand mention at most. "Follow for more"
story/inspire/journey: NO product mention. Pure emotional connection.
debunk: Challenge common beliefs. End with truth, not sales.
prove: Show results/evidence. Can mention product as the proof vehicle.
```

---

## Implementation Priority

| # | Fix | Impact | Effort | Notes |
|---|-----|--------|--------|-------|
| 1 | **Goal-appropriate CTA** | HIGH — stops scripts from all feeling like ads | 30 min | Modify system prompt per goal |
| 2 | **KB-enriched generation** | HIGH — massively different scripts | 2-3 hrs | Query KB, inject into prompt |
| 3 | **Topic engine** | HIGH — solves the "same talking points" problem | 3-4 hrs | New API + UI for sub-topic picker |
| 4 | **Add Claude as provider** | MEDIUM-HIGH — better writing quality | 1-2 hrs | New provider in LLM client |
| 5 | **Anti-repetition** | MEDIUM — prevents déjà vu across scripts | 1 hr | Query recent content_items |
| 6 | **Fix broken structure blocks** | LOW — 2 specific structures | 30 min | Update DB + seed data |
| 7 | **Quality score recalibration** | LOW — cosmetic | 1 hr | Stricter rubric |

**Total estimated effort:** ~10 hours for all fixes
**Biggest bang for buck:** Items 1-3 would transform the output quality
