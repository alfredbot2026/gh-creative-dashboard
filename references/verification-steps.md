# Verification Steps

When implementing tasks, workers must self-verify using:
1. **TypeScript Check:** `npx tsc --noEmit` — Must pass with 0 errors.
2. **Build Check:** `npm run build` — Must pass clean.
3. **Linter:** (If configured) `npm run lint`
4. **Security Scan:** Before marking QA ready, run `python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py . --output summary` to catch regressions (e.g., XSS, un-gated APIs).
