# TASK-019: Phase 2a Polish Fixes

## Priority: P2
## Track: DEFAULT

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `app/create/ads/page.tsx` — the ad creation UI

## Bug 1: Brand Voice Score Display (P2)
**Current:** Shows "9100%" instead of "91%"
**Expected:** "91%" 
**Location:** `app/create/ads/page.tsx` — where brand_voice_score is rendered
**Fix:** The score comes as a float (0.91) or integer (91). If float, multiply by 100. If already integer, just append %. Check what the API actually returns and display accordingly.

## Bug 2: CTA Format (P2)
**Current:** Shows "LEARN_MORE" (raw enum)
**Expected:** "Learn More" (human-readable)
**Location:** `app/create/ads/page.tsx` — where CTA is rendered
**Fix:** Map CTA enum values to display text:
```typescript
const ctaLabels: Record<string, string> = {
  'LEARN_MORE': 'Learn More',
  'SHOP_NOW': 'Shop Now',
  'SIGN_UP': 'Sign Up',
  'GET_OFFER': 'Get Offer',
  'BOOK_NOW': 'Book Now',
  'CONTACT_US': 'Contact Us',
}
```

## Bug 3: Knowledge Used Shows Raw UUIDs (P2)
**Current:** Lists like "efafcd67-06b2-4faf-9adc-15ee2d402525"
**Expected:** Entry title + category, e.g. "🪝 The Contrarian Perspective Framework"
**Location:** `app/create/ads/page.tsx` — Knowledge Used section
**Fix:** The API response should include entry titles. Either:
- Option A: Update the ad-generator to return `{ id, title, category }` instead of just IDs
- Option B: Fetch titles client-side from the KB entries

Option A is cleaner — update `lib/create/ad-generator.ts` to include entry metadata in the provenance.

## Bug 4: offer_details Should Be Optional in API (P2)
**Current:** API returns 400 if offer_details is empty
**Expected:** Should generate with just a product name (offer_details enhances but shouldn't block)
**Location:** `app/api/create/ad/route.ts` — validation block
**Fix:** Remove `offer_details` from required fields check. Default to empty string if not provided.

## Verification
- [ ] Brand voice score displays as "91%" not "9100%"
- [ ] CTA shows human-readable text
- [ ] Knowledge Used shows entry titles and categories
- [ ] Generation works with only product name (no offer_details)
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `app/create/ads/page.tsx` | Modify | Fix score display, CTA labels, KB display |
| `lib/create/ad-generator.ts` | Modify | Include KB entry titles in provenance |
| `app/api/create/ad/route.ts` | Modify | Make offer_details optional |
