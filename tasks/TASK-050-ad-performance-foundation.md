# Task: TASK-050 — Phase 4d Wave 1: Ad Performance Data Foundation (DELTA)

> **Track:** SECURITY
> **Builder:** Lead (Dr. Strange) — direct implementation per Rob's directive
> **Status:** IN PROGRESS

## What Already Exists
- ✅ `lib/meta/client.ts` — Meta Marketing API client (fetchCampaignInsights, fetchAdCreatives)
- ✅ `app/api/meta/sync/route.ts` — sync route (pulls insights + creatives, upserts to ad_performance)
- ✅ `supabase/migrations/020_ad_performance_phase4d.sql` — full schema with all columns, RLS, indexes, unique constraint
- ✅ Growth-lead FB Ads cron (daily report generation)
- ✅ Pipeline cron `/api/pipeline/cron` (classify + profile every 12h)

## What Needs Fixing/Adding
1. **Sync route upsert key:** Currently `onConflict: 'campaign_name,ad_name'` — needs to be `user_id,meta_ad_id,date_start` per migration 020
2. **Daily date breakdown:** Current sync uses `date_preset` — needs `time_range` + `time_increment=1` for daily granularity
3. **Content matching:** No `lib/meta/content-matcher.ts` yet — match ads to content_items by post ID, URL, or text
4. **User-scoped sync:** Currently uses env vars for token — should also support per-user tokens from `meta_tokens` table for SaaS
