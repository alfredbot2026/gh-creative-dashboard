# Security Review — TASK-050

## Verdict: BLOCK

## Scope Reviewed
- `supabase/migrations/020_ad_performance_phase4d.sql`
- `app/api/ads/sync/route.ts`
- `app/api/ads/performance/route.ts`
- `lib/meta/ads-fetcher.ts`
- `lib/meta/content-matcher.ts`
- Task + build report context

## Findings

| # | Severity | Issue | Impact | Fix |
|---|----------|-------|--------|-----|
| 1 | P0 | No rate limiting / abuse control on `POST /api/ads/sync` | Any authenticated user can repeatedly trigger full 90-day pulls + matching loops. This can cause external API quota burn, internal DB churn, and potential cost/availability degradation. | Add per-user + per-IP rate limiting (e.g., max N syncs/hr), idempotency lock (single active sync/user), and bounded date window validation. |
| 2 | P1 | Meta access token is sent in URL query string to Graph API | Query-string tokens can be exposed in logs/proxies/error traces and are harder to sanitize than headers. | Use `Authorization: Bearer <token>` headers for Meta requests (`/me/adaccounts`, insights fetch). Ensure token redaction in all logs. |
| 3 | P1 | Sync route does not validate user-supplied `dateRange` | A crafted request can force very large fetch ranges, increasing API calls and processing load. | Validate `since/until` format and max lookback window (e.g., 90d hard cap unless admin override). Reject invalid/reversed ranges. |
| 4 | P1 | `020` migration silently swallows NOT NULL enforcement errors | `meta_ad_id/date_start/date_stop` may remain nullable if ALTER fails, weakening data integrity and conflict behavior. | Make nullability migration explicit and fail-fast, with a pre-cleanup migration for existing null rows. Avoid exception-swallowing DDL for critical constraints. |
| 5 | P2 | Service-role policy shape is incomplete/ambiguous (`FOR ALL USING (...)` without explicit `WITH CHECK`) | Can create future confusion and policy drift; harder to reason about write semantics in audits. | Define explicit policies per operation, including `WITH CHECK` for INSERT/UPDATE paths where needed. |

---

## Focus Area Checks

### 1) RLS on `ad_performance` — user_id scoping correct?
**Status: PASS (with caveats)**
- Table has RLS enabled.
- User policies are correctly scoped to `user_id = auth.uid()` for SELECT/INSERT/UPDATE.
- APIs also filter `.eq('user_id', user.id)` in application layer.

**Caveat:** schema still mixes historical tenant wording elsewhere in project docs; ensure future ad tables keep ownership model consistent.

### 2) Token handling — per-user tokens, no env var leaks?
**Status: PARTIAL PASS**
- Per-user token retrieval from `meta_tokens` is implemented in sync route.
- No env-var token fallback observed in reviewed files.

**Risk:** token passed in URL query params (P1) and one helper (`getDecryptedToken`) is unused/no encryption semantics despite naming.

### 3) API auth — both routes require authenticated user?
**Status: PASS**
- `POST /api/ads/sync` checks `supabase.auth.getUser()` and returns 401 if missing.
- `GET /api/ads/performance` checks `supabase.auth.getUser()` and returns 401 if missing.

### 4) SQL injection vectors in performance query (`group_by`, date filters)
**Status: PASS**
- Query uses Supabase query builder filters (not raw SQL concatenation).
- `group_by` is whitelisted to fixed values and aggregation is performed in JS after DB fetch.

### 5) Rate limiting / abuse on sync endpoint
**Status: FAIL (P0)**
- No throttling, cooldown, lock, or dedupe guard.
- Endpoint allows repeated expensive ingestion and matching runs.

---

## Additional Notes
- `lib/meta/content-matcher.ts` is O(n*m) style matching and can grow expensive with scale; not a direct security bug but increases abuse blast radius if sync is spammed.
- Build report claims “daily ad-level foundation” — security hardening should be completed before enabling cron or exposing manual sync broadly.

---

## Required Before PASS
- [ ] Add sync rate limits + single-flight lock per user
- [ ] Enforce bounded/validated date ranges
- [ ] Move Meta token transport to Authorization header
- [ ] Make migration constraints deterministic (no swallowed NOT NULL failures)
- [ ] Add tests: unauthorized access, over-limit sync, invalid date range rejection

---

## RLS Policy Verification
- [x] Policies scoped to authenticated owner (`user_id = auth.uid()`)
- [x] API layer also scopes to authenticated user
- [x] No direct SQL string interpolation in reviewed routes
- [ ] Abuse controls on privileged ingestion route (missing)
