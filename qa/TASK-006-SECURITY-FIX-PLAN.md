# TASK-006 — Security Fix Plan (P0 Gate)

Context: TASK-006 (Eval Harness) is blocked due to P0 security findings.
Evidence: `active/gh-creative-dashboard/qa/SECURITY-SCAN-2026-03-16.md`

## Blockers to clear (must-do)

### P0 — XSS surface
- File: `app/youtube/page.tsx`
- Issue: `dangerouslySetInnerHTML` used with `renderMarkdown(analysisMarkdown)`.
- Required: prove sanitization OR remove/replace.
  - If `renderMarkdown` returns unsanitized HTML: replace with a safe renderer (e.g., `react-markdown` with `rehype-sanitize`) or sanitize output (DOMPurify/isomorphic).
  - Add a small unit/regression check: `<script>` / `onerror=` payloads are stripped.

### P0 — RLS + policies for new tables
- Tables: `eval_dataset`, `quality_scores`
- Required in migration:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
  - Explicit policies: default deny for anon; allow only authenticated roles as intended.

### P0 — Protect new eval API
- Route: `app/api/eval/score/route.ts`
- Required:
  - Require authenticated user
  - Role/permission gate (admin/editor) if applicable
  - Basic abuse guard (rate limit or minimum guardrails)

## Scanner noise to address (optional but recommended)
- Update scanner to ignore `.agent/**` so it doesn’t self-flag its own rule patterns.

## Verification checklist (evidence required)
1) `python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py . --output summary` shows no CRITICAL items (or CRITICAL items explained as false-positive with ignore rules).
2) `npm run build` passes.
3) Manual spot-check: YouTube page renders markdown safely (no raw HTML injection).

## Deliverables
- Updated code + migrations
- Updated security scan summary pasted into build report for TASK-006
