# TASK-006a — Security Gate Fix (P0) for TASK-006

> **Track:** FAST
> **Priority:** P0
> **Blocks:** TASK-006

## Evidence / Why this exists
Security scan flagged critical issues.
See: `active/gh-creative-dashboard/qa/SECURITY-SCAN-2026-03-16.md`

## Goal
Clear P0 security gate so TASK-006 can proceed.

## Required fixes

### 1) XSS: remove or harden dangerouslySetInnerHTML
- File: `app/youtube/page.tsx`
- Current: `dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisMarkdown) }}`
- Required:
  - Prove `renderMarkdown()` sanitises OR
  - Replace with safe renderer:
    - `react-markdown` + `rehype-sanitize` (recommended)
    - OR sanitize HTML output with isomorphic DOMPurify and only then render

### 2) Supabase RLS for eval tables
- File: `supabase/migrations/004_eval_harness.sql`
- Add:
  - `ALTER TABLE eval_dataset ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;`
  - Explicit policies (default deny anon). Minimum: only authenticated admins can insert/update/delete; read as per product decision.

### 3) Protect eval scoring API
- File: `app/api/eval/score/route.ts`
- Required:
  - Require authenticated user
  - Permission gate (admin/editor)
  - Basic abuse guard (rate limit or equivalent)

### 4) Reduce scanner false positives (optional)
- Update scanner config to ignore `.agent/**` so it doesn't self-flag.

## Verification (paste evidence)
1) `python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py . --output summary`
   - Must show **0 Critical** or clear documented false-positive ignore.
2) `npm run build` must pass.
3) Manual: open YouTube page and verify markdown renders without allowing `<script>` injection.

## Output
- Update `BUILD-REPORT-TASK-006.md` with the scan summary + evidence.
- Move TASK-006 back to IMPLEMENTING.
