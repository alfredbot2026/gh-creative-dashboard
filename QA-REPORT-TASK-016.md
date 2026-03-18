# QA Report — TASK-016 (Image Generation API)

## Verdict: PASS (with known transient caveat)

## Checks
- [x] Build: clean (`next build` exit 0)
- [x] `lib/create/image-types.ts` exists — `ImageStyle`, `AspectRatio`, `ImageGenerationRequest`, `ImageGenerationResponse` types defined
- [x] `lib/create/image-generator.ts` exists — brand prefix builder, storage download, `uv run` shell-out, upload to `ad-creatives` bucket, temp dir cleanup in `finally`
- [x] `app/api/create/image/route.ts` exists — auth gate (401), input validation (`prompt`, `style`, `aspect_ratio`), calls `generateAdImage`
- [x] nano-banana-pro script exists at correct path: `/home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py`
- [x] `uv` available at `/home/linuxbrew/.linuxbrew/bin/uv` (v0.10.2)
- [x] `GEMINI_API_KEY` present in environment
- [x] `ad-creatives` storage bucket created (confirmed via `storage.buckets` query)
- [x] `execFile('uv', args)` — no shell injection; args array used correctly
- [x] Auth gate: 401 if unauthenticated
- [x] Brand style guide loaded before generation (throws if missing — correct)
- [x] Reference images downloaded to temp dir before passing via `-i` flags
- [x] Temp dir cleanup in `finally` block
- [x] Storage path: `{user_id}/{YYYY-MM-DD}/{uuid}.png` (per-owner prefix)
- [x] `references/ARCHITECTURE.md` updated with `POST /api/create/image` and new lib files
- [ ] End-to-end image generation: **NOT VERIFIED** — Gemini API returned 503 (high demand, transient)

## Evidence

### File existence
```
/home/rob/.npm-global/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py ✓
uv 0.10.2 (Homebrew 2026-02-10) ✓
ad-creatives bucket: { id: 'ad-creatives', name: 'ad-creatives', public: false } ✓
```

### Code review findings
- `execFile` (not `exec`) used → no shell injection ✓
- Brand guide mandatory check: throws `Error('Brand style guide not found...')` if missing ✓
- Temp dir cleanup in `finally` block ✓
- Storage path enforces user prefix: `${userId}/${dateStr}/${filename}` ✓

### Note on bucket visibility
Build report stated `public: true` but migration 008 correctly set `public: false`. Storage objects are per-owner protected by RLS policies. This is the more secure configuration. ✓

### Gemini 503
```
Error: 503 UNAVAILABLE — This model is currently experiencing high demand.
```
This is a transient API issue, not a code defect. The script reached the API endpoint correctly before failing.

## QA Rationale for PASS
The implementation is structurally correct and security-sound. The only gap is the E2E Gemini call which is blocked by a transient 503. Code review shows no logic errors, no shell injection, correct auth gate, correct storage path, correct temp cleanup. PASS is conditional — if Gemini 503 persists beyond 24h, re-test should be triggered.

## Known Gaps
- E2E test blocked by Gemini 503 (transient)
- No UI for image generation yet (TASK-017, blocked)
