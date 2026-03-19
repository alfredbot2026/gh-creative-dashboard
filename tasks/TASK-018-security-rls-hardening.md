# TASK-018: Security Hardening — RLS + Storage Policies

## Priority: P0 (blocks TASK-017)
## Track: DEFAULT
## Context
Security review flagged that some DB/storage policies are overly permissive and must be tightened before the Ad Creation UI ships.

## Scope
### A) content_items RLS
Current migration 006 sets policy to `USING (true) WITH CHECK (true)` (overly broad).

**Goal:** authenticated users can only CRUD their own rows.
- Policy should be equivalent to: `user_id = auth.uid()`
- Ensure inserts require `user_id = auth.uid()`

### B) brand_style_guide RLS
Migration 003 includes permissive policies.

**Goal:** (choose safest baseline)
- If this is truly single-tenant per-user: restrict to `auth.uid()` owner column (if no owner column exists, add one via migration).
- If it is global brand guide shared for all authenticated users in this app: allow read to authenticated, but restrict writes to an admin role (if no roles exist, restrict writes to service role only and implement writes via server actions).

### C) Storage bucket policies — ad-creatives
TASK-016 build report includes SQL for bucket creation and policies.

**Goal:**
- Bucket exists.
- Upload limited to user prefix (foldername(name)[1] = auth.uid()).
- Public read allowed only if intended; otherwise authenticated read.

## Deliverables
1) New migration file: `supabase/migrations/008_security_policies.sql`
   - Drops the overly broad policies and replaces with least-privilege policies.
2) Push migration to remote: `npx supabase db push`
3) Verification queries (via `npx supabase db query --linked`) proving:
   - policies exist and are correct
   - sample select from another user is denied (if feasible)
4) Update `references/ARCHITECTURE.md` security notes with the chosen policy model.
5) Build report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-018.md`
6) Update `WORKER-QUEUE.md` → WAITING_FOR_QA

## Constraints
- Do not invent missing schema (verify existing columns first).
- Do not break existing Phase 1 flows (short-form create, eval, analytics).
