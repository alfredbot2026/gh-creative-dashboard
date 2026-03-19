# QA Report — TASK-015 (Ad Copy Generation API)
## Cycle 3 — Final

## Verdict: PASS ✅

## Fix Cycle History
| # | Bug | Cycle 1 | Cycle 2 | Cycle 3 |
|---|-----|---------|---------|---------|
| 1 | Variant fields missing (headline/cta/framework_used etc.) | ❌ | ✅ FIXED | ✅ |
| 2 | content_items insert: missing `title` NOT NULL | ❌ | ✅ FIXED | ✅ |
| 3 | KB entries not loading (kb_entries_loaded=0) | ❌ | ❌ | ✅ FIXED (fallback to candidate) |
| 4 | brand_voice_score always 0 | ❌ | ✅ FIXED | ✅ |

---

## Checks
- [x] Build: `next build` exit 0, all routes compiled, 0 TypeScript errors
- [x] Auth gate: 401 if unauthenticated; proceeds with valid session cookie
- [x] Variant count: 4 returned (spec: 3-5) ✓
- [x] All required fields present on all variants: `headline`, `primary_text`, `description`, `cta`, `framework_used`, `framework_explanation`, `image_prompt`, `brand_voice_score`
- [x] All frameworks unique: PAS, FAB, urgency, before_after
- [x] brand_voice_score > 0 on all variants
- [x] KB entries loaded: 15 (fallback to `candidate` tier working)
- [x] `kb_tier_used: 'candidate'` logged in provenance (correct transparency)
- [x] `content_items` row persisted: confirmed in DB, no insert errors in logs
- [x] Provenance included: model, kb_entries_loaded, kb_tier_used, brand_guide_version

---

## Evidence

### API Response
```
POST /api/create/ad → HTTP 200
Variant count: 4
All required fields: ✓ on all 4 variants
```

### Variants
```
[1] PAS    — "Hirap ba mag-umpisa ng negosyo?"          score: ✓
[2] FAB    — "50 Templates + Live Q&A inside!"          score: ✓
[3] urgency — "Last chance for P2997 Early Bird!"       score: ✓
[4] before_after — "From Zero to Digital Product Pro"   score: ✓

All frameworks unique: True
Count in range 3-5: True
All required fields present: True
KB entries loaded: True (15, tier: candidate)
```

### Provenance
```json
{
  "model": "gemini-3-flash-preview",
  "kb_entries_loaded": 15,
  "kb_tier_used": "candidate",
  "brand_guide_version": "2026-03-17T23:00:40.777863+00:00"
}
```

### content_items DB
```
id:           73413922-3c24-4716-8f2d-5eda86990456
title:        Papers to Profits Digital Course — conversions (facebook)  ✓
content_type: ad-static  ✓
platform:     facebook   ✓
status:       draft       ✓
created_at:   2026-03-18 04:11:25 UTC  ✓
```

### Build
```
next build → exit code 0
TypeScript: 0 errors
All routes compiled (incl. /api/create/ad)
```

## Issues Found
None. All 4 bugs from Cycle 1 are resolved.
