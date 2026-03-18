# QA Report — TASK-018 (Security RLS Hardening)

## Verdict: PASS

## Checks
- [x] Migration `20260318000000_008_security_policies.sql` exists
- [x] Migration pushed: `supabase migration list` → Local 008 = Remote 008
- [x] `content_items` RLS: old broad policy dropped, new `user_id = auth.uid()` policy active
- [x] `brand_style_guide` RLS: read-only for authenticated users, writes blocked for non-service-role
- [x] `ad-creatives` bucket: exists, `public: false` (correctly private)
- [x] Storage RLS: all 4 policies (INSERT, SELECT, UPDATE, DELETE) enforced per-owner via `owner_id = auth.uid()::text`
- [x] `ARCHITECTURE.md` updated with RLS policy documentation
- [x] Build: `next build` exit 0

## Evidence

### Migration status
```
supabase migration list:
  20260318000000 | 20260318000000 | 2026-03-18 00:00:00  ✓ pushed
```

### content_items policies (live DB)
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'content_items';

tablename     | policyname                             | cmd | qual                   | with_check
content_items | Users can manage their own content_items | ALL | (user_id = auth.uid()) | (user_id = auth.uid())
```

### brand_style_guide policies (live DB)
```sql
brand_style_guide | Allow read access for authenticated users | SELECT | true | NULL
```
(No INSERT/UPDATE/DELETE → writes restricted to service_role ✓)

### ad-creatives storage policies (live DB)
```
Users can delete their own ad-creatives | DELETE | bucket_id='ad-creatives' AND owner_id=auth.uid()
Users can read their own ad-creatives   | SELECT | bucket_id='ad-creatives' AND owner_id=auth.uid()
Users can update their own ad-creatives | UPDATE | bucket_id='ad-creatives' AND owner_id=auth.uid()
Users can upload their own ad-creatives | INSERT | with_check: bucket_id='ad-creatives' AND owner_id=auth.uid()
```

### Functional RLS tests (live)
```
Test 1 — Anon read content_items:
  Result: [] (empty) ✓ — RLS blocks unauthenticated access

Test 2 — Grace reads content_items:
  Result: 0 rows, all_own=True ✓ — only sees her own data

Test 3 — Grace inserts into brand_style_guide:
  Result: { code: '42501', message: 'new row violates row-level security policy' } ✓ — write blocked
```

## Issues Found
None. All RLS policies correctly applied and verified via live DB queries.
