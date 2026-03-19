# TASK-014: Ad Frameworks Reference File + Migration

## Priority: P1
## Track: DEFAULT

## Overview
Create the ad frameworks reference file and the database migration for linking ad_performance to content_items. This is the foundation task — TASK-015 and TASK-016 depend on it.

## Reference Files to Read
1. `references/ARCHITECTURE.md` — project structure
2. `specs/phase-2a-ad-copy-static.md` — full Phase 2a spec
3. `lib/brand/types.ts` — brand style guide types
4. `supabase/migrations/006_content_items.sql` — content_items schema

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Wave 1: Ad Frameworks Reference

### File: `references/AD-FRAMEWORKS.md`
Create comprehensive reference documenting these frameworks:

1. **PAS (Problem-Agitate-Solution)**
   - When: Pain-point driven products, course launches
   - Structure: Identify problem → Amplify pain → Present solution
   - Grace example: "Pagod ka na ba sa 9-5? (Problem) Ang hirap kumita ng pera habang naka-bahay lang... (Agitate) With Papers to Profits, step-by-step mo lang gagawin... (Solution)"

2. **AIDA (Attention-Interest-Desire-Action)**
   - When: Cold audiences, awareness campaigns
   - Structure: Hook → Educate → Create want → CTA

3. **Before/After/Bridge**
   - When: Transformation-focused offers, testimonials
   - Structure: Show current state → Show dream state → Your product is the bridge

4. **Social Proof / Testimonial**
   - When: Mid-funnel, retargeting, trust-building
   - Structure: Student result → Their journey → How your product helped

5. **Urgency / Scarcity**
   - When: Launch windows, limited offers, BOFU
   - Structure: Time/quantity limit → What they'll miss → Act now

6. **FAB (Features-Advantages-Benefits)**
   - When: Product comparison, detailed info ads
   - Structure: What it is → Why it's better → What it does for you

Each framework should include: use case, structure template, platform-specific notes (FB vs IG), and a Grace-specific Taglish example.

## Wave 2: Database Migration

### File: `supabase/migrations/007_ad_content.sql`
```sql
-- Link ad_performance to content_items
ALTER TABLE ad_performance 
  ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES content_items(id);

CREATE INDEX IF NOT EXISTS idx_ad_performance_content_item 
  ON ad_performance(content_item_id);

-- Create storage bucket for ad creatives (run via Supabase dashboard or SQL)
-- INSERT INTO storage.buckets (id, name, public) 
--   VALUES ('ad-creatives', 'ad-creatives', true)
--   ON CONFLICT (id) DO NOTHING;
```

Push migration: `supabase db push`

## Wave 3: Update ARCHITECTURE.md
Add to the database tables section:
- `ad_performance.content_item_id` FK documentation
- Ad frameworks reference in Core Modules section
- New API routes coming in TASK-015

## Verification
- [ ] `references/AD-FRAMEWORKS.md` exists with all 6 frameworks
- [ ] Migration 007 pushed successfully
- [ ] `ad_performance` table has `content_item_id` column
- [ ] `references/ARCHITECTURE.md` updated
- [ ] `next build` passes

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `references/AD-FRAMEWORKS.md` | Create | Full ad frameworks reference |
| `supabase/migrations/007_ad_content.sql` | Create | Migration for ad_performance FK |
| `references/ARCHITECTURE.md` | Modify | Add ad content documentation |
