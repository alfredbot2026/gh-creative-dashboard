# Security Re-Review — TASK-050 (Post-fix Verification)

## Verdict: BLOCK (P0 still present)

I re-reviewed the claimed fixes in:
- `reports/BUILD-REPORT-TASK-050.md`
- `app/api/ads/sync/route.ts`
- `lib/meta/ads-fetcher.ts`
- `supabase/migrations/020_ad_performance_phase4d.sql`

---

## Claimed Fix Verification

| Fix | Claimed | Implemented? | Notes |
|---|---|---|---|
| 1) P0 rate limit + single-flight lock | 1 sync/hour + lock | **PARTIAL / FAIL (P0)** | Logic exists in route, but `sync_locks` RLS only has SELECT policy. No INSERT/UPDATE policy exists, so lock acquire/release upsert/update can fail under user session. Errors are not checked, so limiter can silently fail. |
| 2) Token moved to Authorization header | Yes | **PASS** | `/me/adaccounts` and insights requests now use `Authorization: Bearer ...`; token removed from query string. |
| 3) Date range validation | Format + 90-day max | **PASS (with minor hardening note)** | Validates format, reversed range, and max window/lookback. Good baseline. Minor: date parsing is JS-permissive (e.g., rollover dates); can harden later with strict parser. |
| 4) Deterministic NOT NULL migration | Yes | **PASS** | Null pre-cleanup + explicit `ALTER ... SET NOT NULL`; removed prior exception-swallow pattern. |

---

## Remaining Blocker (P0)

### P0 — Rate limit/lock is not enforceable due to missing write policies on `sync_locks`

`020_ad_performance_phase4d.sql` creates:
- table `sync_locks`
- RLS enabled
- only policy: `FOR SELECT USING (user_id = auth.uid())`

But `POST /api/ads/sync` performs:
- `.upsert(...)` on `sync_locks` to acquire lock
- `.update(...)` on `sync_locks` in `finally` to release lock

With RLS enabled and no INSERT/UPDATE policies, these writes are denied for authenticated users (unless service role is used, which this route is not). Since route does not check lock write errors, rate limiting and single-flight control may be bypassed/fail open.

**Required fix before PASS:**
1. Add `sync_locks` policies:
   - INSERT with `WITH CHECK (user_id = auth.uid())`
   - UPDATE with `USING (user_id = auth.uid())` and `WITH CHECK (user_id = auth.uid())`
2. Check and handle errors on lock acquire/release DB writes; fail closed on lock-acquire error.
3. (Optional but recommended) Add unique test cases for:
   - second sync within 1 hour returns 429
   - concurrent sync returns 429
   - lock table write failure returns 500/controlled error (not silent pass)

---

## Focus Area Status (Re-review)

1. RLS on `ad_performance` user scoping: **PASS**
2. Token handling (`meta_tokens`, no query-token leak): **PASS**
3. API auth required on both routes: **PASS**
4. SQL injection vectors in performance query: **PASS**
5. Rate limiting / abuse potential on sync endpoint: **FAIL (P0 remains)**

---

## Final Call

Security fixes improved the implementation materially, but **TASK-050 remains BLOCKED** until `sync_locks` write policies + error handling are corrected and verified.
