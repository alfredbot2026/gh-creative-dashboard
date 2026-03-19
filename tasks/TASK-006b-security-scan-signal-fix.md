# TASK-006b — Security Scan Signal Fix (Reduce False P0s)

> **Track:** SECURITY
> **Priority:** P0 (pipeline unblocker)

## Context
`security_scan.py` currently reports CRITICAL due to scanning `.agent/**` and matching its own regex rules (bearer/eval/exec). This creates persistent false P0 escalations and blocks downstream tasks (TASK-007/008/009) even after real mitigations landed.

## Goal
Make the security scanner produce a meaningful signal:
- Ignore `.agent/**` and other tooling dirs so it doesn't self-flag.
- Keep scanning application code (`app/`, `lib/`, `components/`, `supabase/`, etc.).

## Changes

### Wave 1 — Update scanner skip dirs
Modify:
- `.agent/skills/vulnerability-scanner/scripts/security_scan.py`

Add to `SKIP_DIRS` (or equivalent ignore logic):
- `.agent`

Also ensure symlink loops are not followed.

### Wave 2 — Re-run scan evidence
Run:
```bash
python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py . --output summary
```
Expected:
- **0 Critical** findings from scanner self-match.
- High findings should reflect real app code only.

### Wave 3 — Document decision
Update:
- `qa/SECURITY-SCAN-2026-03-16.md` (append note that scanner ignore rules updated)
- Add a new scan snapshot in `qa/SECURITY-SCAN-<today>.md`

## Verification
- `npm run build` still passes
- Scan output pasted into build report `BUILD-REPORT-TASK-006b.md`

## Output
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-006b.md`
- Update WORKER-QUEUE.md → WAITING_FOR_QA
