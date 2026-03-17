# BUILD REPORT: TASK-013 — Brand Style Guide Hotfix

## Summary
Fixed the P0 blocker on the Eval Scorer where it threw an error about missing `brand_style_guide`. The migration `003_brand_style_guide.sql` was correctly pushed and evaluated against the linked database.

## Verification Checklist
- [x] **Database:** Pushed `003_brand_style_guide.sql` migration and confirmed `brand_style_guide` table exists.
- [x] **Seed Data:** Confirmed seed data properly populated.
- [x] **E2E Browser Test:** Logged in as `grace@ghcreative.test`, navigated to `/eval`, scored a test text, and verified result successfully displays a composite score.
- [x] **Screenshot Evidence:** Saved screenshot with the successful result to `qa/TASK-013-eval-scoring-fixed.png`.
- [x] **Build:** `npx next build` ran with zero errors.

## Commands Run
```bash
# Push schema
npx supabase db query -f supabase/migrations/003_brand_style_guide.sql --linked

# Build & verification
npx next build
```