# Security Scan — 2026-03-16 (Pipeline Escalation)

Project: `active/gh-creative-dashboard`
Scan tool: `.agent/skills/vulnerability-scanner/scripts/security_scan.py` (summary mode)

## Summary
- Status: **CRITICAL ISSUES FOUND**
- Total findings: 9 (Critical: 3, High: 4)

## Findings (raw)
### Dependencies
- HIGH: Missing lock file: `yarn.lock` (not in use)
- HIGH: Missing lock file: `pnpm-lock.yaml` (not in use)

### Secrets
- CRITICAL: "Bearer Token" flagged inside the **scanner script itself** (`security_scan.py`).
  - Likely false-positive: the regex pattern `bearer\s+...` matches its own rule definition.

### Code patterns
- CRITICAL: `eval()` and `exec()` patterns flagged in **scanner script rule table** (false-positive vs project code).
- HIGH: `dangerouslySetInnerHTML` flagged in:
  - `app/youtube/page.tsx` line ~824: `dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisMarkdown) }}` (real XSS surface unless `renderMarkdown` sanitizes)

### Configuration
- MEDIUM: No security headers configuration found (CSP/HSTS/XFO).

## What this means for TASK-006
TASK-006 adds:
- new tables (`eval_dataset`, `quality_scores`)
- new API route (`/api/eval/score`)

**Security gates that must be satisfied before proceeding:**
1) Add RLS + policies for new tables (no public read/write by default).
2) Protect `/api/eval/score` behind auth/role checks (and rate limit if possible).
3) Resolve/justify existing XSS surface (`dangerouslySetInnerHTML`), or document sanitization guarantees.
4) (Optional) add baseline security headers in `next.config.ts`.

## Recommended next actions
1) Confirm whether `renderMarkdown()` sanitizes HTML. If not, switch to a sanitizer (DOMPurify/isomorphic) or render plain text.
2) Update scanner to ignore `.agent/**` to reduce false positives (or move scanners outside repo).
3) Implement RLS policies + API auth checks as part of TASK-006 Wave 1/2.
