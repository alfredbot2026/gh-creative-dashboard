# TASK-013: Brand Style Guide Table Hotfix

## Priority: P0 (Blocks Eval scorer)
## Track: DEFAULT

## Problem
The Eval scorer (`/eval` → "Score Content") fails with:
```
Failed to load brand voice rubric: Could not find the table 'public.brand_style_guide' in the schema cache
```

**Root cause:** Migration `003_brand_style_guide.sql` exists locally but was never pushed to Supabase. The table doesn't exist in production DB.

## Reference Files to Read
1. `references/ARCHITECTURE.md` — project structure
2. `supabase/migrations/003_brand_style_guide.sql` — the migration that needs pushing
3. `lib/eval/quality-gate.ts` — uses `brand_style_guide` (line 49)
4. `lib/create/kb-retriever.ts` — uses `brand_style_guide` (line 52)
5. `app/actions/brand.ts` — CRUD for brand_style_guide

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Wave 1: Push Migration

### Step 1: Push the migration
```bash
npx supabase db push
```

### Step 2: Verify table exists
```bash
npx supabase db dump --schema public | grep "brand_style_guide"
```

If `db push` fails because prior migrations already ran, push just migration 003:
```bash
# Mark prior migrations as applied if needed
npx supabase migration repair --status applied 001_knowledge_entries
npx supabase migration repair --status applied 002_generation_provenance
# Then push
npx supabase db push
```

### Step 3: Seed initial brand guide
Insert a default row so the scorer has data to work with:
```sql
INSERT INTO brand_style_guide (
  voice_rubric,
  caption_rules,
  creator_description
) VALUES (
  '{
    "tone_descriptors": ["warm", "empowering", "knowledgeable", "approachable"],
    "taglish_ratio": {"target": 0.4, "min": 0.2, "max": 0.6},
    "formality_levels": {"instagram": "casual", "youtube": "semi-formal", "ads": "direct"},
    "vocabulary_whitelist": ["mommy", "kumita", "puhunan", "negosyo", "diskarte"],
    "vocabulary_blacklist": ["utilize", "leverage", "synergy"],
    "banned_ai_words": ["delve", "tapestry", "landscape", "in conclusion", "it is important to note", "realm", "multifaceted"],
    "example_phrases": ["Kalma lang, Mommy", "Step-by-step lang"],
    "scoring_weights": {"tone": 0.3, "vocabulary": 0.2, "taglish": 0.2, "formality": 0.15, "banned_words": 0.15}
  }'::jsonb,
  '{
    "instagram": {"max_length": 2200, "hashtag_count": 15, "emoji_usage": "moderate", "cta_required": true},
    "tiktok": {"max_length": 4000, "hashtag_count": 5, "emoji_usage": "minimal", "cta_required": false},
    "youtube": {"max_length": 5000, "hashtag_count": 3, "emoji_usage": "minimal", "cta_required": true}
  }'::jsonb,
  'Grace is a Filipina entrepreneur and content creator focused on Facebook ads and e-commerce.'
);
```

Run via: `npx supabase db execute --stdin < seed-brand-guide.sql` or through Supabase SQL editor.

## Wave 2: Verify Fix

### Step 1: Start dev server
```bash
npx next dev --port 3100
```

### Step 2: Browser test
1. Login with `grace@ghcreative.test` / `GHCreative2026!`
2. Navigate to `/eval`
3. Enter test content: "3 common Facebook ad mistakes that cost you money"
4. Click "Score Content"
5. **Expected:** Score result appears (no error)
6. Screenshot the result

### Step 3: Test scorer API directly
```bash
curl -X POST http://localhost:3100/api/eval/score \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content for scoring", "lane": "youtube"}'
```

## Verification
- [ ] `brand_style_guide` table exists in Supabase
- [ ] Default brand guide row seeded
- [ ] `/eval` → Score Content works without error
- [ ] `next build` passes
- [ ] Screenshot of successful scoring saved to `qa/TASK-013-eval-scoring-fixed.png`

## Files to Touch
| Path | Action | What |
|------|--------|------|
| (none — migration already exists) | Push | `supabase db push` |
| `seed-brand-guide.sql` or inline | Create | Seed script for default brand guide |

## Known Risk
- If other migrations (004-006) were pushed individually, migration 003 may need `repair --status applied` on the others first
- The seed data is placeholder — Grace will customize via Settings later
