# QA Report — TASK-006 (Eval Harness & Quality Gate)

## Verdict: PASS ✅ (auth gate verified; full scoring requires login)

## Scope
- Task spec: `active/gh-creative-dashboard/tasks/TASK-006-eval-harness.md`
- Build report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-006.md`

## 1) Build
Ran:
```bash
cd active/gh-creative-dashboard
npm run build
```
Result: **PASS** (exit code 0)
Evidence:
- `✓ Compiled successfully in 10.8s`
- `✓ Generating static pages ... (32/32)`
- Route includes: `/eval` and `/api/eval/score`

## 2) Pages opened + basic functionality
Started prod server:
```bash
PORT=3100 npm run start
```
Opened (render screenshots):
- `/eval` (new eval UI page loads)
- `/settings` (brand rubric dependency page loads)
- `/` (sanity)

## 3) Screenshots
Saved to `active/gh-creative-dashboard/qa/`:
- `TASK-006-eval.png`
- `TASK-006-settings.png`
- `TASK-006-home.png`

## 4) API behaviour (security-critical)
Unauthenticated call test:
```bash
curl -X POST http://localhost:3100/api/eval/score \
  -H 'content-type: application/json' \
  -d '{"text":"Kalma lang, Mommy. Step-by-step lang.","content_type":"short-form-script","platform":"instagram"}'
```
Result:
- **401 Unauthorized** with `{ "error": "Unauthorized" }`

This confirms the endpoint is auth-gated (required by spec).

## 5) Permissions / roles
Not tested across multiple authenticated roles (no role-switch harness used). Minimum security requirement (unauth blocked) was verified.

## Notes
- Security scan tool still reports CRITICAL due to scanner self-matching in `.agent/**`. This is known noise and should be resolved as part of the broader security-gate hardening.
