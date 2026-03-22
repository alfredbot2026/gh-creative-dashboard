# Content Evaluation Framework — Platform-Specific
> Synthesized from KB notebooks. Each platform has its own algorithm, metrics, and criteria.
> Never mix frameworks across platforms.

---

## A. YOUTUBE LONG-FORM (>60 seconds)

### Algorithm Priority
YouTube rewards **watch time** above all. A video that keeps viewers for 5+ minutes builds "trust at mass." YouTube content has a long shelf life — evergreen videos drive traffic for 1+ years.

### Primary Metrics (in order of importance)
| Metric | Source | Target | What it tells you |
|--------|--------|--------|-------------------|
| **Watch time (minutes)** | YT Analytics | Maximize | #1 algorithm signal — total engagement |
| **Avg view percentage** | YT Analytics | >50% | Retention quality — did they stay? |
| **CTR** | YT Analytics | >5% good, >10% great | Thumbnail + title effectiveness |
| **Avg view duration** | YT Analytics | >50% of length | Content holding power |
| **Subscribers gained** | YT Analytics | Track per video | Trust conversion — did they commit? |
| **Audience retention curve** | YT Analytics | Flat = good, cliff = problem | WHERE they leave and WHY |

### Retention Curve Diagnosis
- **Cliff at 0-3s:** Hook failed completely
- **Drop at 5-10s:** Hook worked but didn't transition into value
- **Gradual decline:** Normal — but steeper = less engaging body
- **Spike mid-video:** Viewers rewinding = high-value moment
- **Drop at specific point:** Identify what happened at that timestamp (topic change? tangent? dead air?)

### Evaluation Scorecard (YouTube Long-Form)
| Component | Weight | What to evaluate |
|-----------|--------|-----------------|
| **Hook** | 20% | First 10-15s. Does it set up the video's promise? Clear context for new viewers? |
| **HEIT Structure** | 25% | Hook → Explain problem → Illustrate with story/analogy → Teach actionable lesson |
| **Value Density** | 20% | Specific, actionable, with real numbers/examples. No filler, no jargon |
| **Retention Design** | 15% | B-roll, screen recordings, visual changes. Curiosity stacking (resolve one gap, open another) |
| **CTA** | 10% | Subscribe prompt + specific action (comment, link). Timed appropriately |
| **Topic-Market Fit** | 10% | CCN: Core (buyers) + Casual (watchers) + New (never seen you). Broad TAM |

### Multiplier Scoring
- Baseline: Median views across all long-form videos in last 90 days
- Score: `video_views / median`
- Tiers: `<0.5x` Below | `0.5-1x` Average | `1-2x` Above | `>2x` Top | `>5x` Viral outlier

### What's unique to YouTube
- Dense, technical, lecture-style content works here (fails on IG)
- Trust builds over longer watch times → higher monetization potential
- A creator on YouTube makes ~5x more than same audience on IG (same niche, same price)
- Content lifespan: months to years (not days)

---

## B. INSTAGRAM REELS / SHORT-FORM (<60 seconds)

### Algorithm Priority
Instagram's algorithm evaluates: **watch time, shares per view, saves per view** (per Adam Mosseri).
Two sub-algorithms:
- **Connected reach** (your followers): evaluates on **likes + retention**
- **Unconnected reach** (discovery): evaluates on **shares + retention**

### Primary Metrics (in order of importance)
| Metric | Source | Target | What it tells you |
|--------|--------|--------|-------------------|
| **Sends per reach** | IG Insights | Maximize | #1 algorithm signal — shareability |
| **Saves per reach** | IG Insights | Maximize | Value indicator — "I need this later" |
| **Completion rate** | IG Insights | >60% | Did they watch the whole thing? |
| **3-second hold rate** | IG Insights | >60%, top: 70-80% | Hook effectiveness |
| **Watch time** | IG Insights | Maximize total | 30s Reel watched fully > 15s Reel watched fully |
| **Followers added** | IG Analytics | Track per Reel | Conversion — 1% = banger, 0.5% = good |

### Evaluation Scorecard (Instagram Reels)
| Component | Weight | What to evaluate |
|-----------|--------|-----------------|
| **Hook (0-3s)** | 30% | Pattern interrupt, curiosity gap, bold claim. Triple hook: written + verbal + visual. NO "Hi guys" |
| **Value Compression** | 20% | Max actionable value in min time. Specific, not fluffy. No jargon |
| **Retention Design** | 20% | Visual changes every 2-4s. Jump cuts, text overlays, B-roll. Curiosity stacking |
| **Shareability** | 15% | Communal language ("me and the boys"), relatable concepts, high-arousal emotion |
| **CTA** | 10% | Follow CTA for story content, Freebie/Offer for educational, Comment for engagement |
| **Production** | 5% | Captions (90% watch muted), clean audio, vertical, good lighting |

### Short-Form Specific Techniques
- **Audio sweetening:** Speed up 1.05x + slight pitch up = subconsciously prevents boredom
- **Floating text stickers:** Visual hook that keeps watching without verbal intro
- **Comment farming:** Passive visual anomalies drive comments (not rage bait)
- **Reply with question:** Doubles comment count
- **A/B hook testing:** 10-20 variations, same video, different 3-second hooks (Trial Reels)
- **Re-loop:** Add "But..." near end to loop retention

### Reel Anatomy (from KB)
1. **Hook** (Pain + Benefit + Curiosity)
2. **Super Hook** (second sentence — credibility/social proof)
3. **Curiosity Gap** (open a loop)
4. **Climax** (deliver the value)
5. **Re-loop** ("But..." to retain)
6. **CTA** (Follow/Save/Share)

### Multiplier Scoring
- Baseline: Median views across all Reels in last 90 days
- Score: `reel_views / median`
- Same tiers as YouTube

---

## C. YOUTUBE SHORTS

### Algorithm Priority
Similar to IG Reels but YouTube-specific. YouTube Shorts algorithm favors:
- Completion rate
- Swipe-away rate (inverse of retention)
- Subscriber conversion

### Primary Metrics
| Metric | Source | Target | What it tells you |
|--------|--------|--------|-------------------|
| **Views** | YT Analytics | Track | Reach |
| **Watch time** | YT Analytics | Maximize | Engagement depth |
| **Subscribers gained** | YT Analytics | Track per Short | Trust conversion |
| **Swipe-away rate** | YT Analytics | Minimize | Content quality signal |

### Evaluation
Use the same scorecard as Instagram Reels but:
- Subscriber conversion matters more than sends/saves (YouTube values commitment over sharing)
- Shorts can funnel to long-form (IG Reels cannot)
- Shorts don't get CTR/impressions data the same way

### Multiplier Scoring
- Separate median from long-form YouTube
- Shorts and long-form should NEVER share a baseline

---

## D. FACEBOOK POSTS / REELS

### Algorithm Priority
Limited KB data on Facebook-specific algorithm. Based on available metrics:
- **Shares** = primary viral signal (equivalent to sends on IG)
- **Reactions** (not just likes — love, haha, wow, angry carry more weight)
- **Engaged users** = people who clicked, commented, shared
- **Comments with replies** = conversation depth

### Primary Metrics
| Metric | Source | Target | What it tells you |
|--------|--------|--------|-------------------|
| **Shares** | FB Insights | Maximize | Viral distribution signal |
| **Reactions (by type)** | FB Insights | Track | Emotional resonance |
| **Engaged users** | FB Insights | Maximize | Active audience |
| **Impressions** | FB Insights | Track | Reach |
| **Comments** | FB Insights | Track | Conversation quality |

### Cross-Post Context
Grace's IG Reels are mostly cross-posted from Facebook. For cross-posted content:
- Compare performance on BOTH platforms for same content
- If a Reel does 10x on FB but 1x on IG, the audience difference is the insight
- Deduplication needed to avoid double-counting in aggregate stats

### Multiplier Scoring
- Separate median for FB posts
- Separate by content type (Reel vs image post vs text post)

---

## E. UNIVERSAL: The Multiplier Tracking System

### How to calculate (per platform, per format)
```
1. Collect all posts from last 90 days for [platform] [format]
2. Sort by primary metric (views for YT, reach for IG, impressions for FB)
3. Find the MEDIAN (not average — outliers skew average)
4. Score each post: metric_value / median = Nx multiplier
5. Tier: <0.5x Below | 0.5-1x Average | 1-2x Above | >2x Top | >5x Viral
```

### Monthly Audit Process
1. Sort all content by multiplier
2. Top 10% → What do they have in common? (topic, hook type, format, time posted)
3. Bottom 10% → What went wrong? (weak hook, wrong topic, poor retention)
4. Content mix check: Is it 70% proven / 20% iteration / 10% experiment?
5. Action: Double down on one winning pattern, eliminate one losing pattern

---

## F. WHAT WE NEED TO PULL (Data Gaps)

### YouTube (have partial, need complete)
- [ ] Audience retention curve per video (YouTube Analytics audienceRetention report)
- [ ] CTR + impressions for all videos (have for 87, need for all)
- [ ] Subscribers gained per video
- [ ] Avg view duration + avg view percentage for all

### Instagram (have basic, need insights)
- [ ] Sends per reach (shares via DM)
- [ ] Saves per reach
- [ ] Completion rate (for Reels)
- [ ] 3-second hold rate
- [ ] Followers gained per post (if available via API)

### Facebook (have basic)
- [ ] Reaction breakdown by type (love/wow/angry — not just total)
- [ ] Share count (have this ✅)
- [ ] Comment replies / conversation depth

### Cross-Platform
- [ ] Cross-post deduplication (IG ↔ FB same content)
- [ ] Comparative performance (same content, different platform)
