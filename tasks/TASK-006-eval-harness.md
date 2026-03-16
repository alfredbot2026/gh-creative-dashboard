# TASK-006 — Eval Harness & Quality Gate (Phase 0.5)

## Reference Files (MUST read before starting)
- `references/BRAND-RESEARCH.md` — Real brand data, performance patterns
- `lib/knowledge/types.ts` — KB type definitions
- `lib/llm/client.ts` — Existing LLM client (Gemini)
- `lib/brand/types.ts` — Brand style guide types (from TASK-005)
- `app/actions/brand.ts` — Brand actions (from TASK-005)
- `PROJECT-SPEC.md` §Phase 0.5

## Context
Before we generate content at scale, we need to know what "good" looks like. This task builds the evaluation system: a scoring rubric, gold standard dataset, and automated quality gate that checks every generated piece against the brand voice rubric before showing it to Grace.

**Depends on:** TASK-005 (brand identity + voice rubric must exist)

## Wave 1 — Eval Dataset Schema & Types

### Create migration: `supabase/migrations/004_eval_harness.sql`

```sql
-- Gold standard evaluation dataset
CREATE TABLE IF NOT EXISTS eval_dataset (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Content
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('short-form-script', 'ad-copy', 'youtube-script', 'carousel-copy', 'caption')),
  lane TEXT NOT NULL CHECK (lane IN ('short-form', 'ads', 'youtube')),
  
  -- The actual content being evaluated
  content TEXT NOT NULL,                              -- Full script/copy text
  script_data JSONB,                                  -- Structured script if applicable
  
  -- Scoring (human-assigned ground truth)
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {
  --   hook_specificity: 1-10,
  --   research_backing: 1-10,
  --   brand_voice_match: 1-10,
  --   production_readiness: 1-10,
  --   taglish_naturalness: 1-10,
  --   overall: 1-10
  -- }
  
  -- Metadata
  source TEXT DEFAULT 'manual',                       -- 'manual' | 'past_content' | 'generated'
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quality scores for generated content
CREATE TABLE IF NOT EXISTS quality_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id UUID,                               -- Link to content_items if applicable
  
  -- What was scored
  content_type TEXT NOT NULL,
  content_text TEXT NOT NULL,
  
  -- Automated scores (from brand voice rubric)
  auto_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {
  --   tone_match: 0-1,
  --   vocabulary_match: 0-1,
  --   taglish_ratio: 0-1,
  --   formality_match: 0-1,
  --   banned_words_clean: 0-1,
  --   composite: 0-1
  -- }
  
  -- Human override (Grace's verdict)
  human_verdict TEXT CHECK (human_verdict IN ('approved', 'rejected', 'edited')),
  human_notes TEXT,
  
  -- Threshold check
  passed_gate BOOLEAN NOT NULL DEFAULT false,
  threshold_used FLOAT NOT NULL DEFAULT 0.7,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quality_scores_content_item ON quality_scores(content_item_id);
CREATE INDEX idx_quality_scores_passed ON quality_scores(passed_gate);
CREATE INDEX idx_eval_dataset_type ON eval_dataset(content_type, lane);

CREATE TRIGGER update_eval_dataset_updated_at
  BEFORE UPDATE ON eval_dataset
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: deny all by default, allow authenticated users only
ALTER TABLE eval_dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage eval_dataset" ON eval_dataset FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage quality_scores" ON quality_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Create: `lib/eval/types.ts`
```typescript
export interface EvalScores {
  hook_specificity: number    // 1-10
  research_backing: number    // 1-10
  brand_voice_match: number   // 1-10
  production_readiness: number // 1-10
  taglish_naturalness: number // 1-10
  overall: number             // 1-10
}

export interface AutoScores {
  tone_match: number          // 0-1
  vocabulary_match: number    // 0-1
  taglish_ratio: number       // 0-1
  formality_match: number     // 0-1
  banned_words_clean: number  // 0-1
  composite: number           // 0-1 (weighted average)
}

export interface EvalDatasetEntry {
  id: string
  title: string
  content_type: 'short-form-script' | 'ad-copy' | 'youtube-script' | 'carousel-copy' | 'caption'
  lane: 'short-form' | 'ads' | 'youtube'
  content: string
  script_data?: Record<string, unknown>
  scores: EvalScores
  source: 'manual' | 'past_content' | 'generated'
  notes: string
}

export interface QualityScore {
  id: string
  content_item_id?: string
  content_type: string
  content_text: string
  auto_scores: AutoScores
  human_verdict?: 'approved' | 'rejected' | 'edited'
  human_notes?: string
  passed_gate: boolean
  threshold_used: number
}
```

### Verify:
```bash
npx tsc --noEmit  # Zero errors
```

## Wave 2 — Brand Voice Scoring Engine

### Create: `lib/eval/brand-voice-scorer.ts`

The core scoring function that evaluates any text against the brand voice rubric.

**Algorithm:**
1. **Tone match (0-1):** Use Gemini to score how well the text matches tone descriptors. Single LLM call with rubric context.
2. **Vocabulary match (0-1):** Count whitelist word hits / expected density. Penalize blacklist hits.
3. **Taglish ratio (0-1):** Heuristic — count Filipino words vs total. Score based on distance from target ratio.
4. **Formality match (0-1):** Use Gemini to classify formality level. Score based on match to expected level for the platform.
5. **Banned words clean (0-1):** Binary check — 1.0 if no banned words, 0.0 if any found. Simple string search.
6. **Composite:** Weighted average using `scoring_weights` from rubric.

```typescript
export async function scoreBrandVoice(
  text: string,
  platform: string,
  rubric: VoiceRubric
): Promise<AutoScores> {
  // Implementation: 
  // - banned_words_clean: pure string matching (no LLM needed)
  // - vocabulary_match: string matching + frequency analysis
  // - taglish_ratio: heuristic word classification
  // - tone_match + formality_match: single Gemini call (batch both)
  // - composite: weighted average
}
```

**Important:** The scorer should make at most 1 LLM call per scoring (batch tone + formality into one prompt). The other checks are pure string/heuristic operations.

### Create: `lib/eval/quality-gate.ts`

```typescript
export async function checkQualityGate(
  text: string,
  contentType: string,
  platform: string,
  threshold?: number  // default 0.7
): Promise<{ passed: boolean; scores: AutoScores; feedback: string[] }> {
  // 1. Load brand voice rubric
  // 2. Score text
  // 3. Compare composite to threshold
  // 4. Generate actionable feedback for any low-scoring dimensions
  // Return result
}
```

### Create: API route `app/api/eval/score/route.ts`
- POST: `{ text, content_type, platform }` → `{ scores, passed, feedback }`
- Uses `checkQualityGate`
- **Security:** Must check Supabase auth session before processing. Return 401 if unauthenticated.
- **Rate limiting:** Max 10 requests per minute per session (simple in-memory counter). This endpoint calls Gemini — unbounded access = cost attack vector.

### Verify:
```bash
npx tsc --noEmit  # Zero errors
# Test: curl POST /api/eval/score with sample Taglish text
```

## Wave 3 — Eval Dataset Management UI

### Create: `app/eval/page.tsx`

A simple page for managing the gold standard dataset and testing the scorer.

**Sections:**
1. **Test Scorer** — paste text, select platform, hit "Score" → see breakdown
2. **Eval Dataset** — list of gold standard entries with scores
3. **Add Entry** — modal to add new gold standard entries (paste content, manually score 1-10 on each dimension)

### Add to sidebar navigation (modify `components/Sidebar.tsx` or equivalent):
- New nav item: "Eval" with test tube icon, under Knowledge

### Verify:
```bash
npm run build  # Clean build
# /eval page renders, scorer works on sample text
```

## Wave 4 — Seed Gold Standard Dataset

### Create: `scripts/seed-eval-dataset.ts`

Seed 10 gold standard entries based on Grace's actual top-performing content patterns:

1. **Short-form hooks (3 entries):**
   - Income proof hook: "PAANO AKO KUMITA NG P50K SA NOTEBOOK MAKING" (score: 9/10)
   - Mistake hook: "3 COMMON MISTAKES NA GINAGAWA NG BAGONG PAPER BUSINESS" (score: 8/10)
   - Tutorial hook: "Step-by-step: How to Make Spring Notebook at Home" (score: 7/10)

2. **Ad copy (3 entries):**
   - Proof-first: "738 students na ang nag-enroll... ikaw na lang ang kulang" (score: 9/10)
   - Mistake-led: "Nagtry ka na ba mag-paper business pero hindi kumita? Baka ito ang dahilan..." (score: 8/10)
   - Direct CTA: "Papers to Profits Course — from 1K puhunan to 6 digits income" (score: 7/10)

3. **YouTube scripts (2 entries):**
   - Workshop format opening (high retention intro pattern)
   - Tutorial with income proof hook

4. **Captions (2 entries):**
   - Instagram Taglish caption with hashtags
   - Facebook caption with CTA

**Each entry includes full scores across all 5 dimensions.**

### Verify:
```bash
npx tsx scripts/seed-eval-dataset.ts
# Verify 10 entries in eval_dataset table
```

## Final Verification
```bash
npx tsc --noEmit  # Zero type errors
npm run build      # Clean build
# /eval page loads, scorer returns scores for sample text
# Eval dataset has 10 seeded entries
```

## UI Reference
Match existing page layouts (knowledge page style). Card-based list, modal for adding entries.
