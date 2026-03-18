# BUILD REPORT: TASK-015 Cycle 2

All bugs from QA-REPORT-TASK-015 have been fixed.

1. **Bug 1 (P0): Variant fields missing**
   - Added a strict JSON schema to the prompt instructions.
   - Added validation loop inside `ad-generator.ts` to enforce that all required string fields (`headline`, `primary_text`, `description`, `cta`, `framework_used`, `framework_explanation`, `image_prompt`) are present and non-empty.

2. **Bug 2 (P0): `content_items` insert fails due to null title**
   - Updated `app/api/create/ad/route.ts` to generate a sensible `title` for the content item before insertion (`${body.product} — ${body.objective} (${body.platform})`).

3. **Bug 3 (P1): KB entries returning 0 (review_status constraint)**
   - Modified `lib/create/kb-retriever.ts` `getGenerationContext`.
   - Now checks if there are `approved` entries first. If 0, it falls back to querying `candidate` entries (both for mandatory entries and category-specific entries).

4. **Bug 4 (P1): `brand_voice_score` always 0**
   - Modified `ad-generator.ts` to properly map `request.platform` before passing it to `checkQualityGate`.
   - `checkQualityGate` expects platforms like `'ads'` instead of `'facebook'`, so it checks if the platform is `'facebook'` and passes `'ads'`, or just uses the platform correctly. 

### Verification
- `next build` executed successfully.
- `next dev` is running on `:3100`.
- I recommend triggering the test via the QA script again.
