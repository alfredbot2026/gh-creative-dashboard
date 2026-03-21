# Task: TASK-044 — Classification Prompt + Gold Set Validation

> **Track:** DEFAULT
> **Builder:** solo
> **Requires review:** Tony (no)
> **Depends on:** TASK-042 or TASK-043 (needs ingested content to classify)

## Pre-Task Learning
**Read these FIRST:**
1. `corrections.md`
2. `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
3. `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Context
**Read these BEFORE writing any code:**
- [ ] `references/ARCHITECTURE.md`
- [ ] `specs/phase-3.5-learning-pipeline.md` — Sub-phase 3.5b
- [ ] `lib/create/kb-retriever.ts` — how we pull from knowledge_entries
- [ ] `lib/llm/client.ts` — existing LLM client patterns

## Objective
Build the AI classification prompt that tags ingested content using KB vocabulary. Create a gold set of 20-30 manually classified posts. Validate AI achieves >80% agreement before proceeding.

## Changes

### Wave 1: Classification Types + Prompt

#### Task 1.1: Classification types
- **File:** `lib/pipeline/classification-types.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  export interface ContentClassification {
    hook_type: string
    hook_confidence: number       // 0-1
    structure: string
    structure_confidence: number
    topic_category: string
    content_purpose: 'educate' | 'story' | 'sell' | 'prove' | 'inspire' | 'trend'
    visual_style: string
    text_overlay_style: string
    production_quality: 'phone_casual' | 'lit_styled' | 'studio_pro'
    cta_type: string
    emotional_tone: string
    taglish_ratio: string
    key_elements: string[]
  }
  
  export interface ClassificationResult {
    ingest_id: string
    classification: ContentClassification
    model_used: string
    confidence_avg: number
    raw_response?: string
  }
  ```

#### Task 1.2: Classification prompt builder
- **File:** `lib/pipeline/classification-prompt.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // buildClassificationPrompt(caption, contentType, kbHooks, kbFrameworks)
  //
  // Pulls hook names from knowledge_entries (category = 'hook_library')
  // Pulls framework names from knowledge_entries (category = 'scripting_framework')
  // Uses these as constrained vocabulary in the prompt
  //
  // The prompt should:
  // 1. Describe the creator context (Filipina paper crafting / planning)
  // 2. List ALL valid hook types from KB (not hardcoded — queried from DB)
  // 3. List ALL valid structures from KB
  // 4. List valid options for each other field
  // 5. Request JSON output matching ContentClassification
  // 6. Include 2-3 examples of classified posts for few-shot learning
  //
  // Model: gemini-3-flash-preview (cheap, fast)
  // Temperature: 0.1 (low — we want consistent classification, not creative)
  // Response format: JSON
  ```

### Wave 2: Gold Set

#### Task 2.1: Gold set data file
- **File:** `lib/pipeline/gold-set.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // 20-30 manually classified posts
  // These are posts we've MANUALLY labeled as ground truth
  // 
  // For now: create placeholder structure with 5 examples
  // Rob/Grace will need to fill in the rest from actual content
  //
  // interface GoldSetEntry {
  //   platform: string
  //   caption: string
  //   content_type: string
  //   expected: ContentClassification
  // }
  //
  // Export: GOLD_SET: GoldSetEntry[]
  //
  // NOTE: If we don't have enough ingested content yet, create synthetic
  // examples based on Grace's known content style. Mark as synthetic.
  // Real gold set entries will be added once content is ingested.
  ```

#### Task 2.2: Validation runner
- **File:** `lib/pipeline/classification-validator.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // validateClassification(goldSet, classifyFn)
  //
  // For each gold set entry:
  //   1. Run AI classification
  //   2. Compare each field with expected
  //   3. Score agreement per field:
  //      - Exact match = 1.0
  //      - Partial match (e.g., "Question Hook" vs "Curiosity Question") = 0.5
  //      - No match = 0.0
  //   4. Calculate per-field agreement rate across all entries
  //
  // Output: {
  //   overall_agreement: number,  // average across all fields
  //   per_field: Record<string, number>,  // agreement per classification field
  //   failures: Array<{ entry, expected, actual, field }>,  // mismatches for review
  //   recommendation: 'proceed' | 'refine_prompt'  // >80% = proceed
  // }
  ```

### Wave 3: Validation API

#### Task 3.1: Classification validation endpoint
- **File:** `app/api/classify/validate/route.ts`
- **Action:** Create
- **What to do:**
  ```typescript
  // POST /api/classify/validate
  // Runs gold set validation
  // Returns agreement metrics + specific failures
  // This is a diagnostic endpoint — run it to check prompt quality
  // before proceeding to batch classification
  ```

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
# POST /api/classify/validate → returns agreement metrics
# Agreement should be >80% on hook_type and structure fields
```

## Commit
```bash
git add -A
git commit -m "feat(pipeline): classification prompt + gold set validation

- ContentClassification types
- Classification prompt builder (KB-vocabulary constrained)
- Gold set with manual classifications
- Validation runner with per-field agreement scoring
- POST /api/classify/validate diagnostic endpoint"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-044.md`

## Output
- Branch: `main`
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-044.md`
- Notify: Dr. Strange via sessions_send
