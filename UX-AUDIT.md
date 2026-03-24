# UX Audit — Creative Dashboard

## The Problem

Grace sees 7 sidebar items + Settings. But behind those are 28 total pages, many doing overlapping things. The app feels like it was built feature-by-feature without stepping back to ask "how does Grace actually use this?"

## Current Page Map

### Creation (4 DUPLICATE paths to make content)
| Page | What it does | Status |
|------|-------------|--------|
| `/create` | Main wizard (platform → goal → structure → topic → generate) | ✅ Primary — keep |
| `/create/short-form` | Separate short-form script page | ❌ REDUNDANT — wizard does this |
| `/create/ads` | Separate ad/carousel creation page | ❌ REDUNDANT — wizard does this |
| `/create/social-post` | Separate social post page | ❌ REDUNDANT — wizard does this |
| `/create/youtube` | Separate YouTube script page | ❌ REDUNDANT — wizard does this |
| `/studio` | Image generation + visual carousel builder | ⚠️ SEPARATE PURPOSE — but confusing placement |

**Problem:** Grace has to figure out: "Do I use Create? Or Create Ads? Or Studio? Or the short-form page?" They all generate content but with different interfaces.

**Fix:** ONE entry point — `/create`. Delete the 4 sub-pages. Studio becomes a tab or step within Create, not a separate nav item.

### Insights (3 pages — OK but scattered)
| Page | What it does |
|------|-------------|
| `/insights` | Content performance dashboard + library |
| `/insights/topics` | Topic cluster analysis |
| `/insights/competitive` | Competitive intelligence |

**Verdict:** These are fine as sub-pages. But the main `/insights` page should link clearly to topics and competitive.

### Internal/Admin tools (shouldn't be in Grace's nav)
| Page | What it does | Who needs it |
|------|-------------|-------------|
| `/knowledge` | KB management | Admin (Rob) |
| `/knowledge/extract` | KB extraction pipeline | Admin (Rob) |
| `/pipeline` | Data pipeline dashboard | Admin (Rob) |
| `/pipeline/content` | Content browser | Admin (Rob) |
| `/eval` | Eval harness | Admin (Rob) |
| `/research` | Research page | Admin (Rob) |
| `/upload` | Upload page | Admin (Rob) |
| `/youtube` | YouTube analytics detail | Admin (Rob) |
| `/ads` | Old ads page | Legacy? |
| `/analytics/short-form` | Analytics | Admin (Rob) |
| `/chat` | AI chat | Could be useful for Grace but hidden |

**Problem:** Grace doesn't need to see pipeline dashboards or KB management. These are power-user/admin tools.

### What Grace actually needs (5 things)

1. **Create** — make content (scripts, carousels, images, everything in one flow)
2. **My Content** — see what she's created, scheduled, published (currently split between Calendar and Library)
3. **Insights** — how her content is performing + competitive intel
4. **Settings** — business profile, brand, accounts
5. **Maybe: Chat** — talk to the AI assistant about her content strategy

That's it. 5 nav items max.

---

## Proposed Simplified Navigation

```
Sidebar:
  📝 Create          → /create (unified wizard — scripts, carousels, images)
  📚 My Content      → /library (saved content + calendar view toggle)
  📊 Insights        → /insights (performance + competitive + topics)
  ⚙️ Settings        → /settings (business + brand + accounts)
```

### What changes:
1. **Kill Studio as separate nav** — move image/carousel tools into Create as an output option
2. **Kill Structures as separate nav** — structures are shown during the Create wizard, that's enough
3. **Merge Calendar into Library** — "My Content" with a list/calendar toggle
4. **Hide admin pages** — Knowledge, Pipeline, Eval, Research, Upload, YouTube analytics → accessible via URL but not in nav. Or put behind an "Admin" section if Rob needs quick access.
5. **Kill duplicate Create sub-pages** — `/create/ads`, `/create/short-form`, `/create/social-post`, `/create/youtube` all redirect to `/create`

### Create flow simplified:
```
/create
  Step 1: What? (Reel, YouTube, Facebook Post, Ad, Carousel, Image)
  Step 2: Goal? (Teach, Sell, Story, etc.)
  Step 3: Structure? (optional — or AI decides)
  Step 4: Topic? (auto-suggested cards + type your own)
  Step 5: Generate → results with edit/regenerate
  Step 6: Save / Download / Send to Calendar
```

All in one page. No separate flows. No confusion about "where do I make a carousel?"
