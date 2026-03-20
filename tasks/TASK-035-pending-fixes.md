# TASK-035: Wire Pending Features + Fix Vercel Auth + Auto-Approve KB

## Reference Files to Read FIRST
- `app/api/create/generate/route.ts` — Current generation API (understand the response shape)
- `app/create/page.tsx` + `app/create/create.module.css` — Current Create page with results view
- `lib/create/kb-retriever.ts` — KB retrieval functions
- `app/library/page.tsx` — Library page (understand how items are displayed)

## Project Location
`/home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard`

## Wave 1: Wire "Save to Library" Button

The Create page results view has "Save" buttons on each variant card. These need to actually save the generated content to Supabase.

### File: `app/create/page.tsx`
**Action:** Find the Save button handler and implement it.

When user clicks "Save" on a variant card:
1. POST to save the variant to the `content_items` table (or whatever table the Library reads from)
2. Check what table `app/library/page.tsx` queries — use THAT table
3. Save fields: title (use the hook), content (full variant JSON), platform, content_type, quality_score, created_at
4. Show "Saved ✓" confirmation on the button after success
5. Disable the button after saving (prevent duplicates)

### Verification
- Generate 3 variants
- Click Save on one
- Navigate to Library → the saved item should appear

## Wave 2: Wire "Create 3 More" Button

### File: `app/create/page.tsx`
**Action:** The "Create 3 More" button in the results view should:
1. Keep the same platform + content type selections
2. Clear the current results
3. Show loading skeletons again
4. Call the generate API again
5. Display fresh 3 variants

This is essentially re-triggering `handleGenerate()` without resetting selections.

### Verification
- Generate → see 3 results → click "Create 3 More" → see 3 NEW results

## Wave 3: Auto-Approve All KB Entries

### Run this SQL via Supabase:
```sql
UPDATE knowledge_entries SET review_status = 'approved' WHERE review_status = 'candidate';
```

Use the Supabase Management API or run via the project's supabase client. The anon key should have UPDATE permission if RLS allows it. If not, use the service role key from `.env.local` (check for `SUPABASE_SERVICE_ROLE_KEY`).

Alternative: Use curl to the Supabase REST API:
```bash
# Read SUPABASE_SERVICE_ROLE_KEY from .env.local
curl -X PATCH "https://mnqwquoewvgfztenyygf.supabase.co/rest/v1/knowledge_entries?review_status=eq.candidate" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"review_status": "approved"}'
```

### Verification
- Query: `SELECT count(*) FROM knowledge_entries WHERE review_status = 'approved'` should return 463
- Query: `SELECT count(*) FROM knowledge_entries WHERE review_status = 'candidate'` should return 0

## Wave 4: Fix Vercel Auth

The Library shows empty on Vercel because Supabase auth doesn't have the Vercel domain in redirect URLs.

### Steps:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add `https://gh-creative-dashboard.vercel.app` to the Redirect URLs list
3. Also add `https://gh-creative-dashboard.vercel.app/**` as a wildcard pattern

Since we can't access the Supabase dashboard from CLI, use the Supabase Management API:
```bash
# This may need to be done manually by Rob in the Supabase dashboard
# Or via: supabase projects update-auth-config
```

Actually — check if the `NEXT_PUBLIC_SITE_URL` env var is set on Vercel. If it's still pointing to localhost, auth callbacks will break.

### File: Check Vercel env vars
- `NEXT_PUBLIC_SITE_URL` should be `https://gh-creative-dashboard.vercel.app`
- Verify in Vercel dashboard or via `vercel env ls`

### Verification
- Visit `https://gh-creative-dashboard.vercel.app/library` while logged in → should show items

## Wave 5: Test All Platform × Content Type Combos

Test these 8 critical combos via curl to `/api/create/generate`:
1. `reels` + `educate` ✅ (already tested)
2. `reels` + `prove` ✅ (already tested)  
3. `reels` + `story`
4. `reels` + `sell`
5. `facebook-ad` + `sell`
6. `facebook-post` + `educate`
7. `youtube` + `educate`
8. `carousel` + `prove`

For each: verify the response has 3 variants, each with proper platform-specific content structure, and content references paper crafting / P2P / Grace's business.

### Verification
All 8 return valid JSON with 3 variants each. No errors, no generic content.

## Wave 6: Mobile Create Flow Test

### Steps:
1. Start dev server on port 3100
2. Open browser at 375px width
3. Navigate to /create
4. Select platform + content type
5. Tap "Create 3 Variants"
6. Verify loading state displays correctly
7. Verify results cards are readable and scrollable
8. Verify "Copy", "Save", "Create 3 More" buttons are tappable (44px min)

## Git
Commit message: `feat: wire Save + Create More buttons, auto-approve KB, test all combos`
Push to origin/main.
