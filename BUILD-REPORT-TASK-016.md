# BUILD REPORT — TASK-016: Gemini Image Generation API

## Status: WAITING_FOR_QA

## Date: 2026-03-18

---

## What Was Implemented

### Wave 1 — Types
**File:** `lib/create/image-types.ts`
- `ImageStyle` union type: `product_shot | lifestyle | promotional | faceless_quote | creator_featured`
- `AspectRatio` union type: `1:1 | 4:5 | 16:9 | 9:16`
- `ImageGenerationRequest` interface
- `ImageGenerationResponse` interface

### Wave 2 — Image Generator
**File:** `lib/create/image-generator.ts`
- Loads `brand_style_guide` from Supabase via `createClient()` — throws if missing
- Builds brand prefix from: color palette, photography_style, product_styling_rules
  - `creator_featured`: appends `creator_description` + `wardrobe_notes`
  - `faceless_quote`: appends typography rules + "no human faces" directive
- Downloads reference images from Supabase Storage to temp dir (if provided)
- Shells out to nano-banana-pro via `execFile('uv', [...args])` — **no shell injection**
  - Resolution: 2K
  - Aspect ratio: from request
  - Reference images passed via `-i` flags
- Uploads output PNG to `ad-creatives/{user_id}/{YYYY-MM-DD}/{uuid}.png`
- Returns: `{ image_url, storage_path, prompt_used, model }`
- Cleans up temp dir in `finally` block

### Wave 3 — API Route
**File:** `app/api/create/image/route.ts`
- Auth gate: `supabase.auth.getUser()` → 401 if unauthenticated (consistent with `/api/create/ad/route.ts`)
- Input validation: `prompt`, `style` (enum), `aspect_ratio` (enum)
- Calls `generateAdImage(body, user.id)`
- Returns `ImageGenerationResponse` JSON

### Wave 4 — Architecture Update
**File:** `references/ARCHITECTURE.md`
- Updated `POST /api/create/image` entry with TASK-016 details
- Added `lib/create/image-types.ts` and `lib/create/image-generator.ts` to Core Modules

---

## Supabase Storage Bucket: `ad-creatives`

The bucket is referenced in `supabase/migrations/007_ad_content.sql` but the INSERT is **commented out**.

**To create the bucket, run this SQL in the Supabase dashboard (SQL Editor):**
```sql
INSERT INTO storage.buckets (id, name, public)
  VALUES ('ad-creatives', 'ad-creatives', true)
  ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own prefix only
CREATE POLICY "Users upload own ad-creatives"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ad-creatives' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read ad-creatives"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'ad-creatives');
```

**Storage path example:**
```
ad-creatives/550e8400-e29b-41d4-a716-446655440000/2026-03-18/a3f1c2d4-e5b6-7890-abcd-ef1234567890.png
```
Public URL pattern:
```
https://mnqwquoewvgfztenyygf.supabase.co/storage/v1/object/public/ad-creatives/{user_id}/{date}/{uuid}.png
```

---

## Build Output

```
▲ Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in 16.3s
TypeScript: npx tsc --noEmit → 0 errors
npm run build → PASS (all routes compiled)
```

Routes compiled:
- `/api/create/image` — ƒ Dynamic (new, TASK-016)
- All existing routes unchanged

---

## Runtime Verification

**uv:** Available at `/home/linuxbrew/.linuxbrew/bin/uv` ✅
**GEMINI_API_KEY:** Present in environment ✅
**End-to-end test:** FAILED — Gemini API returned 503 (model temporarily unavailable due to high demand)

```
Error: 503 UNAVAILABLE — This model is currently experiencing high demand.
```

This is a transient API issue, not a code issue. The script itself ran correctly and reached the API.

**Screenshot:** `qa/TASK-016-image-gen.png` — NOT generated (API 503, no output file produced)

---

## Files Created/Modified

| Path | Action |
|------|--------|
| `lib/create/image-types.ts` | Created |
| `lib/create/image-generator.ts` | Created |
| `app/api/create/image/route.ts` | Created |
| `references/ARCHITECTURE.md` | Updated |

---

## Known Gaps / QA Notes

1. **Bucket `ad-creatives` must be created** via SQL above before uploads will work
2. **End-to-end test blocked** by Gemini 503 — retry when API recovers
3. No Codex review available in this environment; manual review done

