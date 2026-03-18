# Phase 2b — Carousel Generation + Ad Performance Learning

## Goal
Enable multi-slide carousel ad creation with consistent visuals, and build the feedback loop that makes the system smarter over time.

## Scope

### 2b-1: Carousel Generation API
**API:** `POST /api/create/carousel`

**Input:**
```typescript
{
  product_name: string
  offer_details?: string
  objective: 'conversions' | 'awareness' | 'traffic'
  platform: 'facebook' | 'instagram'
  slide_count: number // 3-7, default 5
  style: 'educational' | 'storytelling' | 'product-showcase' | 'testimonial'
}
```

**Output:**
```typescript
{
  slides: Array<{
    slide_number: number
    role: 'hook' | 'problem' | 'agitate' | 'solution' | 'proof' | 'cta'
    headline: string
    body_text: string
    visual_description: string  // what should be shown
    image_prompt: string        // Gemini prompt for image gen
    text_overlay: string        // text to overlay on the image
    cta_text?: string          // only on CTA slide
  }>
  carousel_theme: string       // unifying visual concept
  caption: string              // post caption (Taglish)
  hashtags: string[]
  techniques_used: Array<{ entry_id: string, entry_title: string, category: string, how_applied: string }>
}
```

**Narrative Arc (mandatory):**
Each carousel MUST follow a story arc:
1. **Hook slide** — pattern interrupt, curiosity driver
2. **Problem slide** — identify the pain point
3. **Agitate slide** — make the pain vivid/relatable
4. **Solution slide** — present the product/offer
5. **Proof slide** — social proof, results, testimonials
6. **CTA slide** — clear call to action

For shorter carousels (3-4 slides), combine Problem+Agitate and Solution+Proof.

**KB Categories to load:** ad_creative, hook_library, cro_patterns, content_funnel, virality_science

### 2b-2: Carousel Image Generation
Each slide generates an image via the existing Gemini image API (`/api/create/image`).

**Consistency requirements:**
- All slides share a `carousel_theme` (color palette, style, mood)
- Brand style guide prefix on every image prompt
- Visual continuity cues: same background style, same text placement zone, same filter/treatment

**Implementation approach:**
- Generate slide 1 image first
- Use slide 1's visual description as a "style reference" in subsequent slide prompts
- Add to each prompt: "Maintain the same visual style, color palette, and composition as previous slides in this carousel"

### 2b-3: Carousel UI (update `/create/ads`)
Enable the "Carousel" format option (currently disabled with "Coming in Phase 2b").

**UI changes:**
- When format = Carousel: show slide count selector (3-7)
- Show carousel style picker (educational/storytelling/product-showcase/testimonial)
- Preview: horizontal scrollable card strip showing all slides
- Each slide card shows: role badge, headline, body text, image placeholder (or generated image)
- "Generate Images" button: generates all slide images sequentially
- Individual slide regeneration (text or image independently)
- Download all as zip

### 2b-4: Ad Performance Learning Loop
**New table:** `ad_performance_insights` (migration 009)

```sql
CREATE TABLE ad_performance_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('framework_performance', 'hook_performance', 'format_performance', 'audience_insight')),
  framework TEXT,           -- e.g., 'PAS', 'Before/After'
  metric_name TEXT NOT NULL, -- e.g., 'avg_roas', 'avg_ctr', 'avg_cpc'
  metric_value NUMERIC NOT NULL,
  sample_size INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kb_entries_used UUID[],  -- which KB entries were used in top performers
  raw_data JSONB,          -- underlying ad IDs and their metrics
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Learning API:** `POST /api/analytics/learn`
- Analyzes `ad_performance` data linked to `content_items`
- Groups by framework, hook type, format
- Calculates: avg ROAS, CTR, CPC, CPM per group
- Identifies top 20% and bottom 20% performers
- For top performers: extracts which KB entries were used
- Stores insights in `ad_performance_insights`

**Insights display:** Add section to `/ads` (Ad Performance page):
- "🏆 Top Performing Frameworks" — ranked by ROAS
- "📈 Trending Up" — frameworks improving over time
- "⚠️ Underperforming" — consider retiring these approaches
- Sample: "PAS framework averaged 3.2x ROAS (12 ads) vs Before/After at 1.8x (8 ads)"

**KB feedback:** When insights are generated:
- Top performer KB entries: boost `effectiveness_score` by 0.05 (capped at 1.0)
- Bottom performer KB entries: reduce by 0.02 (floored at 0.0)
- This affects which entries are loaded for future generation (sorted by effectiveness_score)

## Task Breakdown

| Task | Description | Track | Depends On |
|------|-------------|-------|------------|
| TASK-023 | Carousel generation API + prompt | DEFAULT | - |
| TASK-024 | Carousel image generation (sequential, consistent) | DEFAULT | TASK-023 |
| TASK-025 | Carousel UI (enable format, preview, download) | DEFAULT | TASK-023 |
| TASK-026 | Ad performance learning API + insights table | DEFAULT | - |
| TASK-027 | Insights display on /ads page + KB score feedback | DEFAULT | TASK-026 |

TASK-023/024/025 (carousel) and TASK-026/027 (learning) are independent tracks — can run in parallel.

## Out of Scope (Phase 2b)
- A/B testing automation (Phase 4)
- Auto-posting to Meta (deferred)
- Video ad rendering (Phase 3 prerequisite)
- Multi-user support (Phase 5)
