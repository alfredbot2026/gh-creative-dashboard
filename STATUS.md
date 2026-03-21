# GH Creative Dashboard — STATUS

## Current: Phase 3.5 Learning Pipeline COMPLETE → Awaiting Phase 4a
**Updated:** 2026-03-21 17:30 Manila

---

## Phase 3.5 Learning Pipeline — ✅ COMPLETE

All 9 tasks shipped in one session. Build passing. Committed to `main` (latest: `ca0e72e`).

| Task | Description | Status |
|------|-------------|--------|
| TASK-041 | Meta OAuth + Connected Accounts UI | ✅ Done |
| TASK-042 | Meta content ingest + content_ingest table | ✅ Done |
| TASK-043 | YouTube content ingest (playlist-based, quota-safe) | ✅ Done |
| TASK-044 | Classification prompt + gold set + validator | ✅ Done |
| TASK-045 | Batch classification + content_analysis table | ✅ Done |
| TASK-046 | Performance correlation engine + performance_profile table | ✅ Done |
| TASK-047 | Profile API + insights + recommendations | ✅ Done |
| TASK-048 | Pipeline orchestrator + cron | ✅ Done |
| TASK-049 | Quota tracker + token health + YouTube disconnect | ✅ Done |

### New DB migrations (apply to Supabase before running pipeline):
- `013_meta_tokens.sql`
- `014_content_ingest.sql`
- `015_content_analysis.sql`
- `016_performance_profile.sql`

### New env vars needed in Vercel:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI` = `https://your-domain/api/meta/callback`
- `CRON_SECRET` (for pipeline cron protection)

### To run the pipeline:
1. Apply 4 migrations to Supabase
2. Go to Settings → Connected Accounts → Connect Instagram + YouTube
3. `POST /api/ingest/youtube` (pulls all videos)
4. `POST /api/ingest/meta` (pulls all IG/FB posts)
5. `POST /api/classify/all` (classifies all ingested content)
6. `POST /api/profile/generate` (builds performance profile)
7. `GET /api/profile/insights` (view ranked insights)

---

## Phase 3 YouTube — IN PROGRESS

| Task | Description | Status |
|------|-------------|--------|
| TASK-036 | Thumbnail Generation | ✅ Tested (fixed timeout bug) |
| TASK-037 | Save to Library | ✅ Tested |
| TASK-038 | Retention Annotations | ⏳ Deferred (may absorb into V2) |
| TASK-039 | YouTube Performance Table | ⏳ Deferred |
| TASK-040 | Script Quality Polish | ⏳ Deferred |

---

## Image Consistency — Code Complete, Blocked on Refs

- TASK-035 code complete: multi-turn sessions, anchor chain, Nano Banana 2
- Rob to provide 6-angle Grace reference photos for 9+/10 target
- Current best: ~7.5/10 with 3 ref photos

---

## Next Phase

**Phase 4a: Content Engine V2 Core** — waiting on Rob's go-ahead
- Topic Intelligence Engine
- Outline-first YouTube flow
- Block swap UI
- Working documents + PDF export
- Spec: `specs/CONTENT-ENGINE-V2-VISION.md`
