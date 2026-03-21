# Phase 3.5: Learning Pipeline

> Status: SPEC | Author: Dr. Strange | Date: 2026-03-21
> Prerequisite for Content Engine V2. Must ship before Phase 4.
> Red-team review: Tony CONDITIONAL PASS — guardrails incorporated below.

---

## Why This Phase Exists

The Content Engine V2 vision requires Grace-specific performance data to drive topic suggestions, technique ranking, overlay style selection, and content mix optimization. Without this pipeline, V2 would rely only on generic KB best practices — no different from what we already have.

**This is the foundation of everything we're building.** — Rob, 2026-03-21

---

## Scope

**In scope:** Ingest Grace's historical content from Meta + YouTube, classify it with AI, correlate with performance metrics, build a performance profile, and set up continuous ingestion.

**Out of scope:** Top creator analysis (Phase 4c), topic intelligence UI (Phase 4a), text overlay compositor (Phase 4b), content creation flow changes.

---

## What We Know About Grace's Content

- **Platforms:** Instagram, Facebook (via Meta), YouTube
- **History:** 5+ years, 500+ pieces of content
- **Accounts:** Meta Business account, YouTube Studio access
- **YouTube OAuth:** Already implemented (`youtube_tokens` table, `/api/youtube/callback`)
- **Meta API:** Meta Marketing API integration exists (`lib/meta/client.ts`, `/api/meta/sync`)

---

## Architecture

### Sub-phases (don't over-cram — each is a deliverable milestone)

| Sub-phase | What | Depends on |
|-----------|------|------------|
| **3.5a** | Platform OAuth + Content Ingest | Nothing |
| **3.5b** | AI Content Classification | 3.5a |
| **3.5c** | Performance Correlation + Profile | 3.5b |
| **3.5d** | Continuous Pipeline | 3.5a, 3.5c |

---

## Sub-phase 3.5a: Platform OAuth + Content Ingest

### Goal
Connect Grace's Meta and YouTube accounts, pull all historical content with metadata and metrics.

### Meta Graph API Integration

**Auth flow:**
- OAuth 2.0 with Meta Business login
- Scopes needed: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`
- Store tokens in `meta_tokens` table (similar pattern to `youtube_tokens`)
- Token refresh: Meta tokens expire in 60 days; implement auto-refresh on API call
- **Tony guardrail:** Encrypt tokens at rest (use Supabase Vault or app-level encryption). Implement explicit revocation endpoint. Never log raw tokens.

**Instagram content pull:**
- Endpoint: `GET /{ig-user-id}/media` (paginated, up to 10k posts)
- Fields: `id, caption, media_type, media_url, thumbnail_url, timestamp, permalink`
- Insights per media: `GET /{media-id}/insights` — metrics: `impressions, reach, engagement, saved, shares, plays` (Reels: `plays, reach, likes, comments, shares, saved`)
- Pagination: cursor-based, pull all pages
- **Rate limit:** 200 calls/user/hour. For 500 posts: ~500 media calls + ~500 insight calls = handle with backoff + batching across multiple hours if needed.
- **Historical depth:** Instagram API returns up to ~2 years of insights data. Posts older than that will have content but no metrics.

**Facebook page content pull:**
- If Grace posts to a Facebook Page (likely shares from IG):
- Endpoint: `GET /{page-id}/posts`
- Insights: `GET /{post-id}/insights` — `post_impressions, post_engaged_users, post_reactions_by_type_total`

**YouTube content pull (extend existing):**
- We already have `youtube_tokens` and OAuth callback
- Extend to pull ALL videos: `GET /youtube/v3/search?forChannelId={id}&type=video&maxResults=50` (paginated)
- For each video: `GET /youtube/v3/videos?part=snippet,statistics,contentDetails`
- Analytics (requires `yt-analytics.readonly` scope — may need to add):
  - `GET /youtubeAnalytics/v1/reports` — dimensions: video, day
  - Metrics: views, estimatedMinutesWatched, averageViewDuration, averageViewPercentage, subscribersGained, likes, comments, shares
- **Tony guardrail — Quota:** YouTube Data API = 10,000 units/day. `search.list` = 100 units/call. `videos.list` = 1 unit. `channels.list` = 1 unit. For initial ingest of ~100 videos: use `search.list` sparingly (2-3 calls to get all video IDs), then `videos.list` in batches of 50 (2 calls). Total: ~300-500 units. Safe. But DO NOT use `search.list` in any polling/recurring job.
- **YouTube Analytics API** is separate from Data API — different quota. 200 requests/day default. Batch requests by date range to minimize calls.

### Database: `content_ingest` table

```sql
CREATE TABLE content_ingest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Source identification
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube')),
  platform_id TEXT NOT NULL,          -- platform's native post/video ID
  platform_url TEXT,                  -- permalink
  
  -- Content
  content_type TEXT NOT NULL,         -- 'image', 'video', 'carousel', 'reel', 'story', 'youtube_video'
  caption TEXT,                       -- post caption or video title
  description TEXT,                   -- video description (YouTube)
  media_url TEXT,                     -- thumbnail or media URL
  tags TEXT[],                        -- hashtags (IG) or tags (YT)
  
  -- Timing
  published_at TIMESTAMPTZ NOT NULL,
  
  -- Raw metrics (snapshotted — updated at intervals)
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Instagram: { reach, impressions, engagement, saves, shares, likes, comments, plays }
  -- YouTube: { views, watch_time_minutes, avg_view_duration, avg_view_percentage, 
  --            likes, comments, shares, subscribers_gained, impressions, ctr }
  
  metrics_updated_at TIMESTAMPTZ,
  metrics_snapshot_count INT DEFAULT 0,  -- how many times we've refreshed metrics
  
  -- Metadata
  raw_api_response JSONB,            -- full API response for debugging
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, platform, platform_id)
);

ALTER TABLE content_ingest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ingested content"
  ON content_ingest FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Database: `meta_tokens` table

```sql
CREATE TABLE meta_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  
  access_token TEXT NOT NULL,         -- encrypted at app level
  token_expires_at TIMESTAMPTZ,
  
  ig_user_id TEXT,                    -- Instagram Business Account ID
  page_id TEXT,                       -- Facebook Page ID
  page_name TEXT,
  
  scopes TEXT[],                      -- granted scopes
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meta_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meta tokens"
  ON meta_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### API Routes

```
POST /api/meta/connect          — Initiate Meta OAuth
GET  /api/meta/callback         — Handle Meta OAuth callback
POST /api/ingest/meta           — Trigger full Meta content ingest
POST /api/ingest/youtube        — Trigger full YouTube content ingest
GET  /api/ingest/status         — Check ingest progress
```

### UI: Settings > Connected Accounts

Add to Settings page:
- **YouTube**: Already connected ✅ / Connect button
- **Instagram/Meta**: Connect button → OAuth flow → shows account name when connected
- **Ingest status**: "Last sync: 2 hours ago | 487 posts ingested" with manual "Sync Now" button

### Verification

- [ ] Meta OAuth flow completes, tokens stored in `meta_tokens`
- [ ] YouTube token refresh works (existing flow)
- [ ] `POST /api/ingest/meta` pulls all IG posts with insights, stores in `content_ingest`
- [ ] `POST /api/ingest/youtube` pulls all videos with stats, stores in `content_ingest`
- [ ] Rate limits respected (no 429 errors on initial ingest)
- [ ] Duplicate protection: re-running ingest doesn't create duplicate rows
- [ ] Build passes, no type errors

---

## Sub-phase 3.5b: AI Content Classification

### Goal
For each ingested piece of content, run AI classification to tag it with hook type, structure, topic, visual style, CTA type, and other attributes.

### Classification Schema

```typescript
interface ContentClassification {
  // Core classification
  hook_type: string              // "Curiosity Gap", "Question", "Bold Claim", "Comparison", etc.
  hook_confidence: number        // 0-1
  structure: string              // "Tutorial", "Story Arc", "Listicle", "Behind the Scenes", etc.
  structure_confidence: number
  topic_category: string         // "Planner Organization", "Product Launch", "Craft Tutorial", etc.
  content_purpose: 'educate' | 'story' | 'sell' | 'prove' | 'inspire' | 'trend'
  
  // Visual/format
  visual_style: string           // "Talking Head", "B-Roll Heavy", "Text Overlay", "Product Demo"
  text_overlay_style: string     // "Bold Sans Center", "Subtitle Bottom", "None"
  production_quality: string     // "Phone/Casual", "Lit/Styled", "Studio/Pro"
  
  // Engagement drivers
  cta_type: string               // "Follow", "Save", "Comment", "Link in Bio", "Subscribe"
  emotional_tone: string         // "Warm/Personal", "Professional", "Excited", "Calm"
  taglish_ratio: string          // "80% English / 20% Filipino"
  
  // Derived
  key_elements: string[]         // Notable elements: "before/after", "numbers in title", "face close-up"
}
```

### Classification Approach

- **Model:** Gemini Flash (cheap, fast, good enough for classification)
- **Input:** Caption/title + description + content type + media URL (for visual classification)
- **Prompt:** Structured JSON output with classification schema + examples from KB vocabulary
- **Batch:** Process in batches of 10-20 (to manage API costs)
- **Tony guardrail — Gold set validation:** Before classifying all 500+ posts, manually classify 20-30 posts as a gold set. Run AI on the same set. Measure agreement. If <80% agreement on any field, refine prompts before proceeding.

### Database: `content_analysis` table

```sql
CREATE TABLE content_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ingest_id UUID NOT NULL REFERENCES content_ingest(id) ON DELETE CASCADE,
  
  -- Classification results
  classification JSONB NOT NULL,     -- Full ContentClassification object
  
  -- Quality tracking
  model_used TEXT NOT NULL,           -- e.g. "gemini-3-flash-preview"
  classification_version INT DEFAULT 1,  -- bump when re-classifying with improved prompts
  confidence_avg FLOAT,               -- average confidence across fields
  
  -- Manual override (Grace's annotations — future)
  manual_overrides JSONB,            -- fields Grace corrected
  user_notes TEXT,                   -- Grace's qualitative notes ("shared in FB group")
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ingest_id, classification_version)
);

ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content analysis"
  ON content_analysis FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### API Routes

```
POST /api/classify/batch        — Classify a batch of unclassified ingest items
POST /api/classify/validate     — Run classification on gold set, return agreement metrics
GET  /api/classify/status       — Classification progress (N classified / N total)
```

### Classification Prompt Strategy

The classification prompt must use KB vocabulary — not generic terms. Pull hook types and framework names from `knowledge_entries` so classification labels match what the generation system already knows.

```
You are analyzing a social media post from a Filipina paper crafting / planning content creator.

Classify this content using ONLY the following vocabulary:

HOOK TYPES (from our knowledge base):
- Curiosity Gap
- Comparison Hook
- The Iceberg Effect
- Question Hook
- Bold Claim
[...populated from knowledge_entries where category = 'hook_library']

CONTENT STRUCTURES:
- Step-by-Step Tutorial
- Story Arc / Transformation
- Listicle
- Before/After
[...populated from knowledge_entries where category = 'scripting_framework']

[...rest of classification fields with constrained options]
```

### Verification

- [ ] Gold set: 20-30 manually classified posts created
- [ ] AI classification achieves >80% agreement on gold set for each field
- [ ] All ingested posts classified, stored in `content_analysis`
- [ ] Classification uses KB vocabulary (labels match `knowledge_entries`)
- [ ] Batch processing handles rate limits gracefully
- [ ] Build passes, no type errors

---

## Sub-phase 3.5c: Performance Correlation + Profile

### Goal
Cross-reference classifications with metrics to build Grace's Performance Profile — the data structure that drives V2's intelligent suggestions.

### Performance Profile Structure

```typescript
interface PerformanceProfile {
  user_id: string
  generated_at: string           // ISO timestamp
  sample_size: number            // total classified posts with metrics
  
  // By classification dimension
  hook_performance: RankedMetric[]
  structure_performance: RankedMetric[]
  topic_performance: RankedMetric[]
  purpose_performance: RankedMetric[]
  visual_style_performance: RankedMetric[]
  cta_performance: RankedMetric[]
  
  // Timing
  best_posting_times: PostingTimeSlot[]
  best_posting_days: { day: string, avg_engagement: number }[]
  
  // Content mix
  content_mix_actual: Record<string, number>     // what Grace actually posts
  content_mix_optimal: Record<string, number>    // from KB + performance data
  
  // Topic freshness
  topic_freshness: TopicFreshness[]
  
  // Platform breakdown
  platform_performance: Record<string, PlatformMetrics>
  
  // Confidence
  confidence_level: 'low' | 'medium' | 'high'   // based on sample size
  // <50 posts = low, 50-200 = medium, 200+ = high
}

interface RankedMetric {
  label: string                   // e.g. "Comparison Hook"
  sample_size: number
  avg_engagement_rate: number
  avg_reach: number
  avg_saves: number               // saves = strong signal
  confidence: 'low' | 'medium' | 'high'
  trend: 'rising' | 'stable' | 'declining'  // based on recent vs historical
}
```

### Database: `performance_profile` table

```sql
CREATE TABLE performance_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  profile JSONB NOT NULL,            -- Full PerformanceProfile object
  version INT NOT NULL DEFAULT 1,    -- incremented on each recalculation
  
  -- Summary stats for quick access
  total_posts_analyzed INT,
  confidence_level TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, version)
);

-- Keep only latest + one previous per user
ALTER TABLE performance_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"
  ON performance_profile FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Correlation Logic

```
For each classification dimension (hook_type, structure, topic, etc.):
  1. Group ingested content by that dimension's label
  2. For each group:
     a. Calculate avg engagement rate (engagement / reach)
     b. Calculate avg saves (strongest signal for "this was valuable")
     c. Calculate avg reach (distribution signal)
     d. Calculate sample size
     e. Determine confidence (n < 5 = low, 5-15 = medium, 15+ = high)
     f. Calculate trend (compare last 90 days vs all-time)
  3. Rank groups by avg engagement rate
  4. Filter out groups with confidence = low from recommendations
```

### Multi-Factor Correlation (V1 = single factor, V2 = combinations)

Start with single-factor only. Log multi-factor combinations for future use:
- When a post has high performance, record the combination of (hook + structure + topic + time)
- After enough data, surface patterns like: "Comparison hook + Tutorial structure = your best combo"
- **Not in this phase** — just collect the data, don't surface multi-factor yet

### API Routes

```
POST /api/profile/generate       — Calculate performance profile from classified data
GET  /api/profile/current        — Get latest performance profile
GET  /api/profile/insights       — Get human-readable insights (for future UI)
```

### Verification

- [ ] Profile generated from classified data
- [ ] Rankings match intuition when spot-checked (ask Grace: "does this look right?")
- [ ] Confidence levels correctly reflect sample sizes
- [ ] Profile stored in `performance_profile` table
- [ ] API returns profile data correctly
- [ ] Build passes, no type errors

---

## Sub-phase 3.5d: Continuous Pipeline

### Goal
New content auto-ingested, classified, and folded into the performance profile. Metrics refreshed at intervals as they stabilize.

### New Post Detection

**Option A: Polling (simpler, recommended for V1)**
- Cron job runs daily (or every 12 hours)
- Pulls latest posts from Meta + YouTube since `last_ingest_at`
- Classifies new posts
- Stores in `content_ingest` + `content_analysis`

**Option B: Webhooks (future)**
- Meta: Webhooks for `feed` updates (requires app review)
- YouTube: PubSubHubbub for new video notifications
- More complex setup, do after polling is proven

### Metrics Refresh Schedule

Metrics change over time. A post's reach at 1 hour vs 7 days is very different.

```
Post age     | Refresh frequency
0-24 hours   | Every 6 hours (metrics volatile)
1-7 days     | Daily
7-30 days    | Weekly  
30+ days     | Monthly (metrics stabilized)
```

Implementation: Background job checks `content_ingest.metrics_updated_at` and `published_at` to determine which posts need a metrics refresh.

### Profile Recalculation

- Trigger: After new classifications are added OR after metrics refresh completes
- Frequency: At most once per day (debounce multiple triggers)
- Keep previous version for comparison ("your engagement improved this month")

### API Routes

```
POST /api/pipeline/run            — Trigger full pipeline cycle (ingest → classify → refresh metrics → recalc profile)
GET  /api/pipeline/status         — Pipeline health (last run, next scheduled, any errors)
POST /api/pipeline/schedule       — Set up recurring schedule
```

### Tony Guardrail: Token Lifecycle

- Check token validity before every API call
- Auto-refresh expired tokens (Meta: refresh flow, YouTube: refresh_token grant)
- If refresh fails: mark account as "disconnected", notify user in UI
- **Revocation endpoint:** `POST /api/meta/disconnect` and `POST /api/youtube/disconnect` — deletes tokens, optionally purges ingested data
- **Data purge:** If user disconnects an account, offer to delete all ingested data from that platform

### Tony Guardrail: Rate Limit Safety

- Implement exponential backoff with jitter on all external API calls
- Track daily quota usage for YouTube Data API (10k units/day)
- If approaching 80% of daily quota, pause non-critical operations
- Log all API calls with unit cost for YouTube quota tracking
- **Never use `search.list` in recurring jobs** — it's 100 units/call

### Verification

- [ ] New posts auto-detected and ingested within 24 hours
- [ ] Metrics refreshed on schedule (not stale)
- [ ] Profile recalculated after new data
- [ ] Token refresh works (simulate expired token)
- [ ] Rate limits respected over multiple days
- [ ] Disconnect flow works (tokens deleted, data optionally purged)
- [ ] Build passes, no type errors

---

## Task Breakdown (for SPEC-QUEUE)

| Task ID | Sub-phase | Description | Track | Est. |
|---------|-----------|-------------|-------|------|
| TASK-041 | 3.5a | Meta OAuth flow + `meta_tokens` table + Settings UI | SECURITY | 1d |
| TASK-042 | 3.5a | `content_ingest` table + Meta content ingest API | DEFAULT | 1d |
| TASK-043 | 3.5a | YouTube content ingest API (extend existing OAuth) | DEFAULT | 0.5d |
| TASK-044 | 3.5b | Classification prompt + gold set validation | DEFAULT | 1d |
| TASK-045 | 3.5b | Batch classification pipeline + `content_analysis` table | DEFAULT | 1d |
| TASK-046 | 3.5c | Performance correlation engine + `performance_profile` table | DEFAULT | 1d |
| TASK-047 | 3.5c | Profile API + basic insights endpoint | DEFAULT | 0.5d |
| TASK-048 | 3.5d | Continuous polling + metrics refresh jobs | DEFAULT | 1d |
| TASK-049 | 3.5d | Token lifecycle + disconnect + rate limit safety | SECURITY | 0.5d |

**Total estimate: ~7.5 days**

### Dependency order
```
TASK-041 → TASK-042 → TASK-045 → TASK-046 → TASK-048
                    ↘ TASK-044 (parallel with 042)
TASK-043 ──────────→ TASK-045
TASK-046 → TASK-047
TASK-041 → TASK-049 (parallel with others)
```

### Critical path: 041 → 042 → 045 → 046 → 048

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta API app review required for insights | Blocks Meta ingest | Check if existing app has needed scopes. If not, apply early — can take 2-5 business days. YouTube ingest can proceed independently. |
| Instagram insights only go back ~2 years | Limits historical analysis | Accept it. 2 years of data is still ~200+ posts. YouTube has no limit. |
| AI classification accuracy < 80% | Bad labels poison profile | Gold set validation gate. Don't proceed to correlation until accuracy is proven. Iterate on prompts. |
| YouTube quota exhaustion | Blocks video analytics | Track quota usage. Initial ingest is low-cost (~300 units). Keep daily polling under 1000 units. |
| Grace's content is atypical / niche | Generic classification misses nuances | Use KB vocabulary in prompts. Grace's own annotations (future) as correction mechanism. |
| Token expiry during long ingest | Partial ingest | Checkpoint progress. Resume from last successful cursor. Auto-refresh before each batch. |

---

## Success Criteria

Phase 3.5 is DONE when:
1. ✅ Grace's Meta + YouTube accounts connected via OAuth
2. ✅ All historical content ingested (500+ pieces)
3. ✅ All content classified with >80% accuracy vs gold set
4. ✅ Performance profile generated with meaningful rankings
5. ✅ New content auto-ingested within 24 hours of publishing
6. ✅ Metrics refreshed on schedule
7. ✅ Profile recalculated weekly
8. ✅ Token lifecycle handles refresh/revocation gracefully
9. ✅ All data properly isolated per user (RLS)

---

## References

- Vision doc: `specs/CONTENT-ENGINE-V2-VISION.md`
- Tony's red-team review: `reviews/V2-VISION-REVIEW.md` (pending)
- Existing YouTube OAuth: `app/api/youtube/callback/route.ts`
- Existing Meta API: `lib/meta/client.ts`, `app/api/meta/sync/route.ts`
- FB Ads skill (auth pattern): `skills/fb-ads/SKILL.md`
- Supabase RLS patterns: `references/supabase-rls-patterns.md`
