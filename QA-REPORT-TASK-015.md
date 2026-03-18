# QA Report — TASK-015 (Ad Copy Generation API)
## Cycle 2 — Post-Fix Re-QA

## Verdict: FAIL (1 remaining issue — P1)

## Fix Cycle Summary
4 bugs reported in Cycle 1. 3 fixed, 1 still present:

| # | Bug | Cycle 1 | Cycle 2 |
|---|-----|---------|---------|
| 1 | Variant fields missing (headline/cta/framework_used etc.) | ❌ FAIL | ✅ FIXED |
| 2 | content_items insert: missing `title` NOT NULL | ❌ FAIL | ✅ FIXED |
| 3 | KB entries not loading (kb_entries_loaded: 0) | ❌ FAIL | ❌ STILL FAILING |
| 4 | brand_voice_score always 0 | ❌ FAIL | ✅ FIXED |

---

## Checks (Cycle 2)
- [x] Build: clean
- [x] Auth gate: 401 if unauthenticated, proceeds if authenticated
- [x] **Bug 1 FIXED** — All required variant fields now populated: `headline`, `primary_text`, `description`, `cta`, `framework_used`, `framework_explanation`, `image_prompt`
- [x] **Bug 2 FIXED** — `content_items` row inserted successfully (verified in DB: title = "Papers to Profits Digital Course — conversions (facebook)", content_type = ad-static, status = draft)
- [x] **Bug 4 FIXED** — `brand_voice_score` non-zero: scores 89, 67, 74 across 3 variants
- [x] Variant count: 3 (within spec of 3-5)
- [x] All 3 frameworks unique: PAS, FAB, urgency
- [x] Provenance included: model, brand_guide_version
- [ ] **Bug 3 STILL PRESENT** — `kb_entries_loaded: 0`, `knowledge_entries_used: []` on all variants

---

## Evidence (Cycle 2)

### API Response
```
POST /api/create/ad → HTTP 200
Variant count: 3
```

### Variant sample
```
[Variant 1]
  framework_used:        PAS
  headline:              Hirap bang simulan ang digital business mo?
  primary_text present:  True (428 chars)
  description present:   True
  cta:                   Learn More
  framework_explanation: True
  image_prompt present:  True
  brand_voice_score:     89
  kb_entries_used count: 0   ← still empty

[Variant 2]
  framework_used:        FAB
  brand_voice_score:     67

[Variant 3]
  framework_used:        urgency
  brand_voice_score:     74

Provenance: model=gemini-3-flash-preview, kb_entries_loaded=0
```

### content_items DB verification
```
id:           83018a99-96bd-4a16-ac7e-e04ec871f32d
title:        Papers to Profits Digital Course — conversions (facebook)  ✓
content_type: ad-static  ✓
platform:     facebook   ✓
status:       draft       ✓
```

### Bug 3 Root Cause (DB investigation)
```sql
-- All 315 knowledge_entries have review_status = 'candidate', none = 'approved'
SELECT review_status, COUNT(*) FROM knowledge_entries GROUP BY review_status;
→ candidate | 315

-- getAdGenerationContext filters: .eq('review_status', 'approved')
-- 44 ad_creative entries exist, lanes = [ads] — but none are approved
-- Result: always returns 0 entries
```

**Root cause:** The KB was seeded with `review_status = 'candidate'`. The retriever requires `'approved'`. No entries have ever been approved → KB context is always empty. This is a data/workflow gap.

---

## Issue to Fix (send to Blackwidow)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 3 | P1 | `getAdGenerationContext` returns 0 entries — all 315 KB entries have `review_status='candidate'`, none `'approved'`. Retriever requires `approved`. | Either: (a) bulk-approve relevant entries via migration/seed, OR (b) relax the retriever filter to include `candidate` entries when no `approved` entries exist (fallback), OR (c) approve entries programmatically in the seed script |

---

## What's Working (Cycle 2)
- ✅ 3 variants with all required fields populated
- ✅ All 3 frameworks unique
- ✅ Brand voice scores: 89, 67, 74 (non-zero, meaningful)
- ✅ content_items row persisted correctly
- ✅ Auth gate functional
- ✅ Taglish present in variant copy
