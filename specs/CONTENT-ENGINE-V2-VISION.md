# Content Engine V2 — Vision Document

> Written: 2026-03-21 | Status: BRAINSTORMING | Author: Dr. Strange + Rob
> This document captures the full vision before any implementation begins.
> Must be red-teamed by Tony before roadmap finalization.

---

## The Big Picture

The Creative Dashboard evolves from a **content generator** (input → output) into a **content production system** that:
1. **Knows what works** — from KB best practices, Grace's own performance data, AND top creators
2. **Suggests what to create next** — intelligent topic recommendations with spacing/mix awareness
3. **Structures content using proven techniques** — invisible to the user, surfaced as simple options
4. **Produces ready-to-use outputs** — scripts with production sheets, images with text overlays
5. **Learns continuously** — every published piece feeds back into the system

---

## Three Knowledge Layers

### Layer 1: KB Best Practices (exists)
- Sourced from courses, books, creator education content
- Hooks, frameworks, superhooks, TAM, virality science, platform intelligence
- Generic — "what works in general"
- Already ingested into `knowledge_entries` table

### Layer 2: Grace's Performance History (NEW — foundational)
- Ingested from Meta Graph API + YouTube Data API
- Every historical post reverse-engineered: hook type, structure, topic, visual style, CTA
- Correlated with actual metrics: engagement, reach, saves, watch time, retention
- Grace-specific — "what works for YOUR audience"
- Continuous: new posts auto-analyzed as they're published

### Layer 3: Top Creator Intelligence (NEW)
- Analyze top-performing content in Grace's niche
- What hooks are trending? What structures are getting views?
- What visual styles are working right now?
- Competitive — "what's working in the market right now"
- Sources: YouTube trending in niche, top creator channels, viral content analysis

### How the layers interact
```
Generation request comes in:
  1. KB says: "Question hooks work well for education content"
  2. Grace's data says: "Actually, Comparison hooks get 2.5x more saves for YOUR audience"
  3. Top creator layer says: "This week, 'myth-busting' hooks are trending in your niche"
  
  → System weighs all three, Grace's data highest, suggests: Comparison hook with myth-busting angle
```

---

## Learning Pipeline (Phase 3.5 — MUST ship before V2)

### Step 1: Content Ingest
- **Meta Graph API**: Pull all historical Instagram posts + Facebook posts
  - Post content (caption, media URL, media type)
  - Insights (reach, impressions, engagement, saves, shares, profile visits)
  - Stories insights if available
  - Reels insights (plays, reach, likes, comments, shares, saves)
- **YouTube Data API**: Pull all historical videos
  - Title, description, tags, thumbnail
  - Analytics: views, watch time, avg view duration, avg view percentage
  - Retention curve data (where viewers drop off)
  - CTR, impressions
  - Subscriber impact
  - Revenue if applicable
- **Metadata**: Posting time, day of week, platform, format (reel/post/story/video)
- **Historical depth**: Grace has 5+ years of content, 500+ pieces. Pull everything available.

### Step 2: Content Analysis (AI Classification)
For each ingested piece of content, AI analyzes and tags:

| Field | Description | Example |
|-------|-------------|---------|
| `hook_type` | What hook technique was used | "Curiosity Gap", "Question", "Bold Claim" |
| `structure` | What content framework | "Tutorial", "Story Arc", "Comparison", "Listicle" |
| `topic_category` | What the content is about | "Planner Organization", "Product Launch", "Behind the Scenes" |
| `content_purpose` | educate / story / sell / prove / inspire / trend | "educate" |
| `visual_style` | Visual approach | "Talking Head", "B-Roll Heavy", "Text Overlay", "Product Demo" |
| `text_overlay_style` | If text on image: what style | "Bold Sans Center", "Subtitle Bottom", "None" |
| `cta_type` | What call to action | "Follow", "Save", "Comment", "Link in Bio", "Subscribe" |
| `emotional_tone` | The vibe | "Warm/Personal", "Professional", "Excited", "Calm" |
| `taglish_ratio` | Language mix | "80% English / 20% Filipino" |
| `production_quality` | Rough assessment | "Phone/Casual", "Lit/Styled", "Studio/Pro" |

### Step 3: Performance Correlation
Cross-reference classifications with metrics to build Grace's Performance Profile:

- **By hook type**: Which hooks get the best engagement rate? Best saves? Best reach?
- **By structure**: Which content structures get the best watch time / retention?
- **By topic**: Which topics drive follower growth vs engagement vs revenue?
- **By visual style**: Which visual approaches get more reach?
- **By posting time**: Best days/times for each content type
- **By content purpose**: What's the actual ratio that works? (educate vs sell vs story)
- **By platform**: What works on Instagram vs YouTube vs Facebook?
- **Trends over time**: Is her audience shifting? Are certain topics growing/declining?

Output: A **Performance Profile** JSON stored per tenant:
```json
{
  "best_hooks": [
    { "type": "Comparison", "avg_engagement_rate": 8.2, "sample_size": 45, "confidence": "high" },
    { "type": "Question", "avg_engagement_rate": 5.1, "sample_size": 38, "confidence": "high" }
  ],
  "best_structures": [...],
  "best_posting_times": [...],
  "content_mix_actual": { "educate": 0.45, "sell": 0.20, "story": 0.25, "inspire": 0.10 },
  "content_mix_optimal": { "educate": 0.40, "sell": 0.15, "story": 0.30, "inspire": 0.15 },
  "topic_freshness": {
    "planner_organization": { "last_posted": "2026-03-15", "frequency_days": 14, "performance": "above_avg" }
  }
}
```

### Step 4: Continuous Pipeline
- **New post webhook/poll**: When Grace publishes, ingest within 24h
- **Metrics update**: Re-pull metrics at 24h, 48h, 7d, 30d post-publish (metrics stabilize over time)
- **Profile refresh**: Recalculate performance profile weekly
- **Drift detection**: Alert if audience behavior is shifting significantly

### Step 5: Top Creator Analysis
- Identify 10-20 top creators in Grace's niche (paper crafting, planning, stationery)
- Pull their public YouTube content via YouTube Data API (public data only)
- Analyze their top-performing videos with the same classification framework
- Extract: what hooks, structures, topics are working in the niche RIGHT NOW
- Update weekly/monthly

---

## Content Engine V2 — Creation Flows

### Universal Pattern (all content types)
1. **Smart topic suggestion** (from topic intelligence — Layer 2 + 3 driven)
2. **Simple input** (topic + purpose — Grace never configures techniques)
3. **Visual structure** (timeline blocks, not walls of text)
4. **Tap-to-swap** (alternatives for any block, generated on-demand, keep previous version for comparison)
5. **Progressive detail** (outline → full content → polish)
6. **Knowledge is invisible** (system applies best techniques; Grace just sees good options)

### Reels / Short-Form (AI-first, short)
- AI generates complete script immediately (short enough)
- Displayed as visual timeline with color-coded blocks (Hook / Setup / Content / Bridge / CTA)
- Tap any block → on-demand alternatives slide up from bottom
- Previous version kept for comparison
- Text overlay style picker (data-driven — shows styles that perform best for Grace)
- Export to PDF production sheet

### YouTube (Outline-first, longer)
- **Step 1**: Topic + params (type, length)
- **Step 2**: AI generates outline with 2-3 structural approaches → Grace picks one
- **Step 3**: Outline editor — reorder sections, tap-to-swap techniques, add/remove sections
- **Step 4**: "Generate Full Script" from approved outline
- **Step 5**: Full script view with retention indicators, B-roll notes, chapter markers
- **Step 6**: Thumbnails (3 variants) + metadata (title, description, tags, chapters)
- Export to PDF production sheet with shooting checklist

### Ads / Social Posts (Image + Text)
- AI generates copy AND image simultaneously
- Image follows text placement rules from KB (where to put text, contrast, composition)
- Text overlay as separate editable layer (not baked into image)
- **Overlay style picker**: 5-6 styles, ranked by performance data
  - e.g., "Bold" (sans-serif, center, high contrast), "Clean" (minimal, bottom third), "Story" (handwritten feel, corner)
  - Styles evolve based on what gets engagement for Grace
- Grace can edit text, swap style, regenerate image
- Composited export (final image with text baked in for posting)

### Topic Intelligence Engine
When Grace opens the app, instead of blank inputs:
```
📋 Suggested Topics for Today

🟢 "Weekly planning ritual" — Educate — last covered 12 days ago
🟡 "Customer transformation story" — Story — haven't posted a story in 5 days  
🔵 "New washi tape collection" — Sell — product launch in 3 days
```

Powered by:
- Content history (what's been posted, when)
- Content mix targets from KB (optimal ratios)
- Topic freshness (days since last coverage)
- Performance data (suggest topics that historically perform well)
- Upcoming events/launches (from calendar)
- Top creator trends (what's working in the niche right now)

---

## Working Documents + Cross-Device

### Content Lifecycle
`draft` → `in_progress` → `ready` → `published` → `analyzing`

- **Draft**: Created but not finished (outline saved, script partially edited)
- **In Progress**: Being actively worked on
- **Ready**: Complete, waiting to be posted
- **Published**: Posted, metrics being tracked
- **Analyzing**: Performance data being collected (24h/48h/7d windows)

### Cross-Device Flow
1. Grace on phone → taps suggested topic → generates outline → saves as draft
2. Grace on computer → opens draft → edits script → generates thumbnails → marks as Ready
3. Grace exports PDF production sheet → films content using the sheet
4. Grace publishes → marks as Published → system starts tracking metrics

### PDF Production Sheet
Practical, not pretty. For printing or phone-while-filming:
```
═══════════════════════════════════════
📹 PRODUCTION SHEET
"How I Plan My Week in 30 Minutes"
Duration: 8:30 | Type: Tutorial | Purpose: Educate
═══════════════════════════════════════

SCENE 1 — HOOK (0:00–0:15)
📷 Close-up of planner, then look up at camera
🗣️ "Everyone asks me how I plan my entire week 
    in just 30 minutes. Here's exactly how."
📌 Technique: Question Hook (your best performer — 8.2% avg engagement)

SCENE 2 — INTRO (0:15–0:45)
📷 Medium shot at desk
🗣️ "Before I started this system..."
📋 Props: Old messy planner (for contrast)

[...etc...]

SHOOTING CHECKLIST:
☐ Planner + colorful pens
☐ Coffee mug (for B-roll)
☐ Ring light on
☐ Phone tripod set
☐ Washi tape collection visible on desk
═══════════════════════════════════════
```

---

## Image Generation

### Consistency System (shipped in TASK-035)
- Multi-turn Gemini session with golden anchor image
- Model: gemini-3.1-flash-image-preview (Nano Banana 2)
- Waiting on Rob for proper 6-angle reference photos of Grace
- Target: 9/10 consistency with proper refs + creative director prompting

### Text Overlay Compositor (NEW)
- Image generated by AI (scene, composition leaves space for text per KB rules)
- Text overlay as **separate editable layer**
- 5-6 preset overlay styles, ranked by performance data
- User can: edit text, change style, reposition (simple — not full Canva)
- Export: composited PNG/JPG with text baked in
- Implementation: HTML Canvas or server-side Sharp/Canvas composition
- **NOT Canva API** — keep in our ecosystem, avoid external dependency

### Performance-Driven Style Evolution
- Track which overlay styles get better engagement
- Rerank style options based on Grace's data
- Over time, the "suggested" style becomes genuinely optimized for her audience

---

## Data Architecture Implications

### New Tables Needed
- `content_ingest` — Raw ingested posts from Meta/YouTube APIs
- `content_analysis` — AI classification per ingested post
- `performance_profile` — Aggregated performance rules per tenant
- `creator_benchmarks` — Top creator analysis data
- `topic_history` — Topic tracking for freshness/spacing
- Extend `content_items` — Add lifecycle status, re-edit support

### New API Integrations
- Meta Graph API (Instagram + Facebook insights)
- YouTube Data API (video analytics + retention)
- Webhooks or polling for new post detection

### New Background Jobs
- Content ingest (initial historical pull + ongoing)
- Metrics refresh (24h/48h/7d windows)
- Performance profile recalculation (weekly)
- Top creator analysis (weekly/monthly)
- Content analysis (per new ingest)

---

## Phasing (PROPOSED — needs Tony red team + Rob approval)

### Phase 3.5: Learning Pipeline (FOUNDATION — must ship first)
1. Meta Graph API integration (Instagram + Facebook ingest)
2. YouTube Data API integration (video + analytics ingest)
3. AI content classification engine
4. Performance correlation + profile generation
5. Topic history tracking
6. Continuous pipeline (new post detection + metrics refresh)

### Phase 4a: Content Engine V2 — Core
1. Topic Intelligence Engine (smart suggestions on create page)
2. Outline-first YouTube flow (outline → edit → generate)
3. Block swap UI (tap-to-swap with on-demand generation)
4. Working documents (draft lifecycle + re-edit)
5. PDF production sheet export

### Phase 4b: Content Engine V2 — Visual
1. Text overlay compositor
2. Performance-driven overlay styles
3. Image + text composition for ads/social posts
4. Thumbnail generation improvements (with proper Grace refs)

### Phase 4c: Competitive Intelligence
1. Top creator identification + tracking
2. Niche trend analysis
3. Integration into topic suggestions + technique recommendations

---

## Additional Design Decisions (from brainstorm 2026-03-21)

### Multi-Factor "Why" Analysis
Don't just correlate single factors. The system should surface **combinations**:
- "This video performed well because it combined a comparison hook WITH a tutorial structure AND was posted on Tuesday morning AND the thumbnail had bold text"
- Start with single-factor correlations, then layer in multi-factor as data grows
- Present insights in plain language Grace can understand

### Grace's Qualitative Annotations
Grace knows things metrics don't — "that video did well because I shared it in a Facebook group" or "that flopped because I posted during a holiday." 
- Add an annotation field to published content items
- Grace can add notes that the system factors into analysis
- Helps distinguish organic performance from externally-boosted posts

### Cross-Platform Topic Awareness
A topic might be "fresh" on YouTube but "stale" on Instagram.
- Topic intelligence must be **platform-aware**
- Track topic freshness per platform, not just globally
- "Weekly planning" posted on IG 3 days ago ≠ can't post on YouTube

### Seasonal Pattern Intelligence
Paper crafting/planning has strong seasonality:
- Back to school (July-August)
- New year planning (November-January)
- Holiday crafting (October-December)
- Spring organization (March-April)
- The system should recognize seasonal cycles from historical data
- Suggest seasonal content **ahead of the curve**, not reactively
- Pre-populate topic suggestions with upcoming seasonal opportunities

### Top Creator Discovery (Programmatic)
- **Rob's decision**: Discover top creators programmatically, not from a seed list
- Search YouTube API for niche keywords: paper crafting, planner, stationery, bullet journal, washi tape, etc.
- Rank by: subscriber count, avg views per video, engagement rate, upload frequency
- Filter for: English + Filipino language creators (Grace's market)
- Auto-discover 10-20 top channels, refresh monthly
- Track their content with the same classification framework used for Grace

### Overlay Styles — Data-Driven Evolution
- **Rob's decision**: Styles should depend on what's currently working, not arbitrary presets
- Initial styles based on KB best practices
- As performance data flows in, rerank styles by engagement
- System surfaces: "Bold style got 2.3x more engagement for your Educate posts"
- Styles evolve over time — not static presets

### Topic Intelligence — KB-Sourced Distribution Rules
- **Rob's decision**: Content mix ratios come from the KB, not hardcoded
- KB notebooks contain standards like 70/20/10 rule (value/personal/promotional)
- Topic intelligence reads these as configurable rules
- If Grace uploads new methodology with different ratios, system adapts

### Cross-Device + Export Details
- **Mobile-first creation**: Grace generates scripts on phone (bus, couch, etc.)
- **PDF production sheet**: Exported for offline filming — practical format, not pretty report
- **Continue on desktop**: Re-open any saved script, continue editing, generate thumbnails
- **Living documents**: Scripts are never "done" — can always be re-edited
- **Content lifecycle**: draft → in_progress → ready → published → analyzing

---

## Open Questions
1. ~~What platforms is Grace active on?~~ → **Meta (Instagram + Facebook) + YouTube**
2. ~~How much history?~~ → **5+ years, 500+ pieces**
3. ~~Business/creator accounts?~~ → **Yes, has Meta Business + YouTube Studio**
4. What niche keywords define Grace's space for top creator discovery? (paper crafting, planner, stationery, bullet journal, washi tape — confirm/expand)
5. Does Grace use a content calendar tool currently, or is the dashboard her first?
6. For the text overlay editor — how much control does Grace need? Just text editing + style swap? Or also repositioning?
7. ~~How do we handle content that was posted BEFORE the dashboard existed?~~ → **Retroactive classification**: "ingest each one of them and understand why they perform" (Rob, 2026-03-21)
8. For the continuous pipeline — polling interval? Daily check for new posts? Or near-real-time webhook?
9. For Grace's annotations — free text or structured tags? (e.g., "shared in FB group" vs a dropdown of boost factors)
10. Does Grace cross-post the same content to multiple platforms, or does she create platform-specific content?

---

## Conversation Log (Key Quotes — Rob, 2026-03-21)

These are direct quotes/paraphrases from the brainstorm session to preserve intent:

- "We're really trying to build something that understands the elements that make a reel viral and we're able to add elements to a script or to a reel or to a video or to an image that can make it viral"
- "Even the way we put text, where we should put the text, outline overlay, what font to use — that should be baked in"
- "It's gonna be like CapCut in a sense that they have an idea of what it should look like"
- "For non-video stuff I think we should be able to do that on our own using AI only, without the need for Grace shooting video content"
- "Remember we're building this for a non-technical person"
- "Before we even upgrade, the learning pipeline is foundational. We need to get this right first."
- "I'd love for this to be exported to a PDF so she can actually run with it and create content out of it. She doesn't need to be glued to the computer."
- "Most probably she'd be generating scripts on the phone and continuing that on the computer"
- "We want to be able to come up with topics for her so she doesn't have to think about it. We want to make sure that the topics are not recycled and that we have even spacing."
- "I think the overlay style is going to depend on what is currently working and what's not working"
- "We also have knowledge, based on the notebooks, on how much percent of content should be about education, how much about this"
- "For top creator analysis I'd love for us to discover them programmatically"
- "Be very very detailed when it comes to vision documents — this is basically the source of truth of all conversations"

---

## What This Doc Does NOT Cover (future phases)
- Video editing / CapCut-style timeline editor
- Automated posting (publishing to platforms directly)
- Team collaboration / multi-user
- Paid ads optimization (separate from organic content)
- Email/newsletter content generation
- Affiliate/partnership content tracking
- Multi-brand management (other clients beyond Grace)
