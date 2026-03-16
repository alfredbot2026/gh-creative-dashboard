# YouTube AI Coaching Features

## Goal
Implement 4 Gemini-powered "YouTube Guru" features designed to provide actionable coaching for Grace's channel (Channel Auditor, Video Autopsy, Script Rater, Thumbnail Simulator).

## Tasks
- [ ] Task 1: Create UI structure for 'AI Coach' tab in `app/youtube/page.tsx` → Verify: New tab renders without errors.
- [ ] Task 2: Build API route `/api/youtube/coach/audit` that feeds 90-day analytics to `gemini-3.1-pro-preview` → Verify: Curl returns 3 working, 3 failing, 3 action items.
- [ ] Task 3: Build frontend component for 'Channel Auditor' and integrate with API → Verify: Clicking "Run Audit" displays formatted Markdown AI advice.
- [ ] Task 4: Add 'Run Autopsy' action button to top videos in 'My Channel' tab → Verify: Button opens modal for specific video analysis.
- [ ] Task 5: Build API route `/api/youtube/coach/autopsy` that uses `gemini-3.1-pro-preview` on video files → Verify: API returns hook failure/success analysis.
- [ ] Task 6: Build 'Hook & Script Rater' UI and API using `gemini-3-flash-preview` → Verify: Submitting a script returns a 1-10 score and rewrites.
- [ ] Task 7: Build 'Thumbnail/Title Simulator' UI (image upload) and API with Gemini Vision → Verify: Uploading 2 images returns the winning thumbnail with explanation.
- [ ] Task 8: Add database schema `youtube_audits` to save coaching results → Verify: Past audits are stored and retrievable.

## Done When
- [ ] Grace can run a full channel audit and get specific content format directions.
- [ ] Individual videos can be "autopsied" to find out exactly where the hook failed or succeeded.
- [ ] Grace can test pre-production scripts and thumbnails before filming to predict CTR!