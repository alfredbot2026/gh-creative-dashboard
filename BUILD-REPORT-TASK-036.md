# BUILD-REPORT-TASK-036.md

## Task
Unify Ad Engine with KB Pipeline — Replace hardcoded FRAMEWORK_MAP and PERSONA_MAP with KB queries.

## Changes Made

### Wave 1: Replace Hardcoded Maps with KB Queries

**File:** `lib/ads/creative-engine.ts`

1. **Added `getFrameworks()` function** (lines 65-85)
   - Queries `knowledge_entries` where `category = 'scripting_framework'` and `lanes @> ['ads']`
   - Filters by `review_status IN ['approved', 'candidate']`
   - Orders by `effectiveness_score DESC`
   - Returns map of `subcategory/title → content`
   - Graceful fallback to `FRAMEWORK_MAP_FALLBACK` if KB empty

2. **Renamed `FRAMEWORK_MAP` → `FRAMEWORK_MAP_FALLBACK`** (lines 88-95)
   - 6 hardcoded entries preserved as fallback

3. **Updated `generateConceptBrief()`**
   - Added `getFrameworks()` to parallel Promise.all loading
   - `bestFramework` now defaults to first available KB framework: `Object.keys(frameworksMap)[0]`
   - Added KB persona query: fetches `ad_creative` entries tagged with `persona:${persona}`
   - Appends persona KB insights to `persona_context`

### Wave 2: Expand KB Hook Usage

1. **Updated `generateCreativeTree()`**
   - Added angle/persona-tagged hook query using `.or(\`tags.cs.{angle:${angle}},tags.cs.{persona:${persona}}\")`
   - Falls back to general `hook_library` entries if < 3 matches
   - Increased hook limit from 5 → 10
   - Shows full content (not truncated to 200 chars)
   - Includes examples in hook context

2. **Updated `generateHookVariations()`**
   - Added optional `frameworksMap` parameter
   - Uses KB frameworks for framework description in prompt
   - Falls back to `FRAMEWORK_MAP_FALLBACK` if not provided

### Wave 3: Add Quality Gate to All Ad Formats

1. **Added `checkQualityGate` import** (line 10)

2. **Updated `expandToFormats()`** (static/carousel section)
   - Runs `checkQualityGate(textToCheck, 'ad-copy', 'facebook', 0.7)` on each execution
   - Soft gate — logs failures via `console.warn` but doesn't block
   - Adds `quality_score`, `passed_quality_gate`, `quality_feedback` to execution content

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ PASS (0 errors) |
| `npx next build` | ❌ FAIL (pre-existing env var issue — missing Supabase credentials) |

**Build failure is NOT related to this change.** The error occurs during static page generation for `/calendar`, `/create/short-form`, and `/ads/audit` due to missing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables. This is a known environment configuration issue.

## Git Commit

```bash
git add -A
git commit -m "feat: unify ad engine with KB pipeline — replace hardcoded maps

- Add getFrameworks() to query KB scripting_framework entries
- Rename FRAMEWORK_MAP → FRAMEWORK_MAP_FALLBACK for graceful degradation  
- Enrich persona_context with KB persona-tagged entries
- Filter hooks by angle/persona tags, increase to 10, show full content
- Add checkQualityGate to static/carousel formats (soft gate)
- Pass frameworksMap through generateHookVariations for KB framework descriptions"
```

## What Changed Summary

| Component | Before | After |
|-----------|--------|-------|
| Frameworks | Hardcoded 6 entries | KB-query first, fallback to hardcoded |
| Personas | Static map only | Static + KB persona-tagged entries |
| Hooks | 5 entries, 200 char truncation | 10 entries, full content, angle/persona filtered |
| Quality Gate | Video only | All formats (static, carousel, video) |

## Files Modified

- `lib/ads/creative-engine.ts` (main changes)

## No Breaking Changes

- `/create` organic flow unchanged (kb-retriever.ts not modified)
- `/create/ad-generator.ts` not modified
- Page/route files not modified
- Graceful degradation ensures KB-empty scenarios still work
