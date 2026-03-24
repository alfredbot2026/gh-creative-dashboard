# Phase 4c: Competitive Intelligence
> Status: IN_PROGRESS | Started: 2026-03-24

## Goal
Discover top creators in Grace's niche, analyze their content with the same classification framework,
surface what's working in the market right now, and inject those insights into topic suggestions and
structure recommendations in /create.

## DB Schema

### `competitor_channels` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| channel_id | text UNIQUE | YouTube channel ID |
| channel_title | text | |
| channel_description | text | |
| subscriber_count | int | |
| video_count | int | |
| avg_views | int | computed avg views of top 20 videos |
| niche_tags | text[] | keywords used to discover this channel |
| language | text | 'en', 'tl', 'mixed' |
| last_analyzed_at | timestamptz | |
| discovery_source | text | 'auto' or 'manual' |
| is_active | boolean | include in analysis? |
| created_at | timestamptz | |

### `competitor_videos` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| channel_id | text FK → competitor_channels.channel_id | |
| video_id | text UNIQUE | YouTube video ID |
| title | text | |
| description | text | |
| published_at | timestamptz | |
| view_count | int | |
| like_count | int | |
| comment_count | int | |
| duration_seconds | int | |
| thumbnail_url | text | |
| tags | text[] | |
| analysis | jsonb | AI classification (same schema as content_analysis) |
| analyzed_at | timestamptz | |
| created_at | timestamptz | |

### `niche_trends` table (materialized weekly)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| computed_at | timestamptz | |
| top_hooks | jsonb | [{hook_type, frequency, avg_views}, ...] |
| top_structures | jsonb | [{structure, frequency, avg_engagement}, ...] |
| top_topics | jsonb | [{topic, frequency, velocity}, ...] |
| trending_now | jsonb | topics/hooks spiking this week vs last 4 weeks |
| sample_size | int | number of videos analyzed |

## Niche Keywords (for auto-discovery)
Primary: "paper crafting business", "handmade planner", "stationery business", "journal making"
Filipino niche: "notebook business philippines", "planner philippines", "papel negosyo"
English niche: "bullet journal", "washi tape crafts", "DIY planner", "bookbinding tutorial"

## Waves

### Wave 1: DB + Discovery
- Migration: competitor_channels, competitor_videos, niche_trends tables
- Discovery API: search YouTube by niche keywords → rank by avg_views → store top 20 channels
- `/api/competitive/discover` — manual trigger for discovery
- `/api/competitive/channels` — list tracked channels

### Wave 2: Analysis Cron
- Pull top 20 videos per channel (by view count)
- Analyze each with Gemini: same fields as content_analysis
  (hook_type, structure, topic_category, content_purpose, emotional_tone)
- Store in competitor_videos.analysis
- Cron: runs weekly, batch 5 videos per run to respect rate limits

### Wave 3: Insights + Integration
- `/insights/competitive` page — top hooks, structures, topics trending in niche
- Inject into /create: "Trending in your niche" section on topic step
- Trending topics shown as suggestions with "X creators using this"
- Structure picker: badge "Trending" on structures being used by top creators
