# YouTube AI Coaching Features Implementation Plan

## Goal
Implement 4 Gemini-powered "YouTube Guru" features designed to provide actionable coaching for Grace's channel (Channel Auditor, Video Autopsy, Script Rater, Thumbnail Simulator), storing audit history safely and caching YouTube analytics efficiently.

## Project Type
WEB

## Success Criteria
- Grace can run a full channel audit using past 90-day analytics.
- Individual videos can be autopsied via YouTube URL (passed directly to Gemini API).
- Grace can test pre-production scripts and thumbnails before filming to predict CTR.
- All audits are saved to the `youtube_audits` schema with user-tied RLS policies.
- A Supabase Edge Function automatically fetches & caches daily YouTube Analytics to prevent quota issues and enable fast audit generation.

## Tech Stack
- Frontend: Next.js App Router, React, TailwindCSS
- AI Integration: `@ai-sdk/google` (Vercel AI SDK) configuring `gemini-3.1-pro-preview` and `gemini-3-flash-preview`
- Database: Supabase (PostgreSQL) for `youtube_audits` and caching `youtube_daily_analytics`
- Edge/Cron Jobs: Supabase Edge Functions + pg_cron.

## File Structure
```
├── app/youtube/page.tsx                          # Modified: AI Coach Tabs & UI
├── app/api/youtube/coach/audit/route.ts          # NEW: Channel Auditor Endpoint
├── app/api/youtube/coach/autopsy/route.ts        # NEW: Video Autopsy Endpoint
├── app/api/youtube/coach/script/route.ts         # NEW: Script Rater Endpoint
├── app/api/youtube/coach/thumbnail/route.ts      # NEW: Thumbnail Simulator Endpoint
├── supabase/migrations/..._youtube_features.sql  # NEW: DB schemas & RLS
└── supabase/functions/fetch-youtube-analytics/   # NEW: Edge Function
```

## Task Breakdown

1. Provide RLS DB script for `youtube_audits` and `youtube_daily_analytics` via Supabase Migrations.
2. Draft the `fetch-youtube-analytics` Supabase Edge Function and establish cron setup logic.
3. Scaffold the 'AI Coach' Tab in `app/youtube/page.tsx` with sections Auditor, Autopsy, Script Rater, and Thumbnail.
4. Implement `/api/youtube/coach/audit` to gather cached db analytics and query `gemini-3.1-pro-preview`.
5. Implement `/api/youtube/coach/autopsy` testing Gemini's native youtube URL handling for video files.
6. Implement `/api/youtube/coach/script` using `gemini-3-flash-preview` (high speed, text parsing).
7. Implement `/api/youtube/coach/thumbnail` testing multimodal Vision capabilities for 2 uploaded assets.
8. Perform Master UX, Code, and Security Verification via Python scripts.

## ✅ PHASE X COMPLETE
- Lint: ⏳ Pending
- Security: ⏳ Pending
- Build: ⏳ Pending
- Date: [TBD]
