# Full Redesign Proposal — "Creative Studio"

> Written 2026-03-19 by Dr. Strange  
> Status: PROPOSAL — awaiting Rob's review before any code  
> Design philosophy: Apple HIG + Dieter Rams + 2026 Awwwards patterns

---

## The Problem

The app currently feels like an **admin panel with generators bolted on**. It has 19 page routes, a sidebar with 4 groups, and every feature is equally prominent. Grace — a non-technical Filipino mompreneur — opens this and sees a dashboard with stats she doesn't have, analytics she doesn't understand, and a knowledge base she didn't ask for.

**The "templated" feeling comes from:**
1. Every page follows the same 3-column layout (settings | content | sidebar)
2. Forms look like forms — labels, inputs, dropdowns, submit buttons
3. No visual hierarchy between "this is what you do daily" vs "this exists if you're curious"
4. No personality — it could be any SaaS product for anyone
5. Too many choices presented simultaneously (paradox of choice)

**Apple's core insight:** The product should feel like it already knows what you want. Not "here are 50 templates, pick one" but "here's what you should post today."

---

## Design Philosophy: "Opinionated Simplicity"

Borrowing from Dieter Rams and Apple HIG:

1. **Good design makes a product understandable** — Grace should never wonder "what do I click?"
2. **Good design is as little design as possible** — every element must justify its existence
3. **One primary action per screen** — there's always ONE thing you're supposed to do next
4. **Progressive disclosure** — complexity exists but only appears when you reach for it
5. **Personality over neutrality** — this is Grace's creative partner, not a SaaS dashboard

---

## Grace's Real Day (User Journey)

Before redesigning screens, we need to understand what Grace actually does:

### Morning (7-8am, phone, coffee, kids getting ready)
```
Opens app → "What should I post today?"
Sees suggestion → Taps it → Content appears in 15 seconds
Reviews → Copies to clipboard → Pastes into Instagram/FB
Done. Total time: under 2 minutes.
```

### Afternoon (2-3pm, laptop, kids napping)
```
Opens app → Creates an ad for this week's promo
Picks product → Picks style → One tap to generate
Reviews variants → Picks best one → Downloads image
Schedules it in Meta → Done.
```

### Weekly (Sunday evening, phone)
```
Opens app → Checks what performed well this week
Sees "Your top post got 3x more engagement"
Taps "Create more like this" → New content generated
Plans next week's content in 5 minutes
```

### Key insight:
Grace **never** needs to:
- Visit a "Knowledge Base" page
- Manually extract content from notebooks  
- Look at analytics charts with numbers
- Configure settings unless something's wrong
- Think about "objectives" or "frameworks"

---

## Screen Architecture (Proposed)

### Current: 19 routes, flat hierarchy
```
/ (Dashboard — stats nobody has)
/calendar
/create/short-form
/create/ads  
/create/social-post
/create/youtube
/analytics
/analytics/short-form
/ads (ad performance)
/knowledge
/knowledge/extract
/onboarding
/settings
/login
/signup
/chat
/eval
/research
/upload
/youtube
```

### Proposed: 5 core screens + settings drawer

```
/               → "Today" — Grace's daily creative hub
/create         → Unified creator (not 4 separate pages)
/calendar       → Visual content calendar
/library        → Past creations (searchable, filterable)
/settings       → Drawer/modal, not a page
```

Everything else is either:
- **Absorbed** (analytics → subtle indicators on Today page)
- **Hidden** (knowledge base, eval, research → admin-only, accessed via Cmd+K or settings)
- **Removed** (chat, upload, youtube duplicate routes)

---

## Screen-by-Screen Design

### 1. TODAY (Home — `/`)

**Current:** Empty dashboard with stat cards showing zeros.  
**Proposed:** Grace's daily creative companion.

```
┌──────────────────────────────────────────────────┐
│  ✨ Creative Studio                    [avatar]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Good morning, Grace 👋                          │
│  Thursday, March 20                              │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  📱 TODAY'S CONTENT                       │   │
│  │                                           │   │
│  │  ┌─────────────────────────────────────┐ │   │
│  │  │ "Share your paper crafting journey"  │ │   │
│  │  │  Story • Educate • Instagram Reel   │ │   │
│  │  │                                     │ │   │
│  │  │  [✨ Create This]                    │ │   │
│  │  └─────────────────────────────────────┘ │   │
│  │                                           │   │
│  │  ┌─────────────────────────────────────┐ │   │
│  │  │ "P2P Starter Kit — weekend promo"   │ │   │
│  │  │  Ad • Sell • Facebook               │ │   │
│  │  │                                     │ │   │
│  │  │  [✨ Create This]                    │ │   │
│  │  └─────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  📊 THIS WEEK                             │   │
│  │  3 posts created • 1 scheduled • 2 ideas │   │
│  │                                           │   │
│  │  ★ Best performer: "Paper flower          │   │
│  │    tutorial" — 2.4x avg engagement        │   │
│  │    [Create more like this →]              │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  [+ Create something new]                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Key decisions:**
- No stat cards with numbers. Grace doesn't think in "ROAS" or "CTR"
- Content suggestions are pre-generated (from calendar + KB + past performance)
- "Create This" is one tap — pre-fills the generator, Grace just reviews + copies
- "This Week" is a gentle progress indicator, not analytics
- The page answers ONE question: "What should I create right now?"

### 2. CREATE (Unified Creator — `/create`)

**Current:** 4 separate generator pages with identical layouts.  
**Proposed:** One creative workspace with type selection built in.

```
┌──────────────────────────────────────────────────┐
│  ← Back                              Create      │
├──────────────────────────────────────────────────┤
│                                                  │
│  What are you creating?                          │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  📱    │ │  🎯    │ │  📸    │ │  🎬    │   │
│  │ Script │ │  Ad    │ │ Post   │ │YouTube │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Product: [Papers to Profits Course ▾]    │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  What's the idea? (optional)              │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │ e.g., "weekend sale for starter     │  │   │
│  │  │ kit" or leave empty for AI to       │  │   │
│  │  │ suggest...                          │  │   │
│  │  └────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Purpose:  [Educate] [Story] [Sell] [Prove]     │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  ⚙️ More options                    [▾]  │   │
│  │  (platform, format, style mode, length)  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │          ✨ Create                        │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**After generation — results appear BELOW the form (not in a panel):**

```
│  ┌──────────────────────────────────────────┐   │
│  │  ✅ Script ready                          │   │
│  │                                           │   │
│  │  "Alam mo ba na pwedeng kumita sa..."    │   │
│  │                                           │   │
│  │  [Copy] [Edit] [Save as Template]        │   │
│  │                                           │   │
│  │  ── 📚 Sources (5) ──────────── [▾] ──  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Variant 2                                │   │
│  │  "Grabe, this paper flower tutorial..."  │   │
│  │  [Copy] [Edit]                            │   │
│  └──────────────────────────────────────────┘   │
```

**Key decisions:**
- **One page, not four.** Type selection is just 4 taps at the top.
- **Results flow below the form**, not in a separate panel. Like a chat — input at top, output below.
- **Maximum 3 visible fields** before generation. Product, Idea, Purpose. Everything else behind "More options."
- **No right sidebar.** Knowledge Used is a collapsible footer on results, not a permanent panel.
- The 3-column layout is gone. Single column, generous padding, vertical scroll.

### 3. CALENDAR (Visual Planner — `/calendar`)

**Current:** Table-style calendar with status badges.  
**Proposed:** Visual grid calendar, Instagram-style.

```
┌──────────────────────────────────────────────────┐
│  ← Back                           March 2026     │
├──────────────────────────────────────────────────┤
│                                                  │
│  Content Mix: ████████░░ 80% balanced            │
│                                                  │
│  Mon   Tue   Wed   Thu   Fri   Sat   Sun        │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│  │ 📱│ │   │ │ 🎯│ │ 📱│ │   │ │ 📸│ │   │   │
│  │ ✓ │ │ + │ │ ✓ │ │ · │ │ + │ │ · │ │   │   │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │
│                                                  │
│  ✓ = published  · = draft  + = tap to create    │
│                                                  │
│  ── Today ──────────────────────────────────     │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 📱 "Paper flower reel" — Educate          │   │
│  │    Draft • Instagram Reel                  │   │
│  │    [Edit] [Schedule] [Publish]             │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  [+ Suggest content for empty days]              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4. LIBRARY (Past Creations — `/library`)

**Current:** Doesn't exist. Content is scattered across generator history.  
**Proposed:** Searchable archive of everything Grace has created.

```
┌──────────────────────────────────────────────────┐
│  Library                    [🔍 Search]          │
├──────────────────────────────────────────────────┤
│                                                  │
│  [All] [Scripts] [Ads] [Posts] [YouTube]         │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 📱 "Paper flower tutorial hook"           │   │
│  │    Mar 19 • Script • Educate • ★ 8.5      │   │
│  │    [Copy] [Remix] [Delete]                │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 🎯 "P2P Course — weekend sale"            │   │
│  │    Mar 18 • Ad • Sell • 3 variants        │   │
│  │    [View] [Remix]                         │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 5. NAVIGATION

**Current:** Sidebar with 4 collapsible groups.  
**Proposed:** Minimal bottom bar (mobile) + slim sidebar (desktop).

**Mobile (phone — Grace's primary device):**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│                  [page content]                   │
│                                                  │
├──────────────────────────────────────────────────┤
│   🏠        ✨        📅       📚       ⚙️     │
│  Today    Create   Calendar  Library  Settings   │
└──────────────────────────────────────────────────┘
```

**Desktop (laptop — 13" typical):**
```
┌────────┬─────────────────────────────────────────┐
│        │                                         │
│  ✨    │                                         │
│        │                                         │
│  🏠    │          [page content]                  │
│  ✨    │                                         │
│  📅    │                                         │
│  📚    │                                         │
│        │                                         │
│  ⚙️    │                                         │
│        │                                         │
└────────┴─────────────────────────────────────────┘
```

- Desktop sidebar: **icon-only by default** (48px wide), expands on hover to show labels
- 5 items max. No groups. No collapse.
- Settings is a drawer/modal, not a page

---

## Typography System

**Font: Inter (keep it — it's what the best products use)**

But apply it with intention:

| Element | Size | Weight | Tracking | Color |
|---------|------|--------|----------|-------|
| Greeting | 1.75rem | 300 | -0.02em | --color-text |
| Page title | 1.125rem | 600 | -0.01em | --color-text |
| Section label | 0.6875rem | 600 | 0.08em, uppercase | --color-text-muted |
| Card title | 0.875rem | 500 | normal | --color-text |
| Body text | 0.8125rem | 400 | normal, 1.6 lh | --color-text |
| Button text | 0.8125rem | 600 | 0.01em | white |
| Caption/meta | 0.75rem | 400 | normal | --color-text-dim |
| Chip text | 0.75rem | 500 | normal | varies |

**Key rule:** Only 2 font weights visible at any time (400 + 600). 300 reserved for the greeting only. 500 for interactive elements (buttons, chips, card titles).

---

## Icon System

**Library: Lucide (already installed)**

Rules:
- **18px** for navigation icons
- **16px** for inline/form icons  
- **24px** for empty state illustrations
- **Stroke width: 1.5px** (Lucide default) — lighter than most defaults, matches "calm" aesthetic
- **Color: --color-text-muted** for inactive, **--color-text** for active/important
- **Never mix icons with emoji.** Pick one. (Recommendation: icons everywhere, emoji only in content suggestions from AI)

---

## Color System (Refined)

The warm indigo palette is correct. But usage rules matter more than the hex codes:

| Usage | Variable | When |
|-------|----------|------|
| Primary action | `--color-primary` | One CTA per screen. "Create", "Copy", "Save" |
| Hover/selected | `--color-primary-soft` | Chip selected state, nav active bg |
| Surface | `--color-surface` | Cards, panels |
| Background | `--color-bg` | Page background |
| Border | `--color-border` | Dividers only — not card borders. Cards float with shadow. |
| Text | `--color-text` | Headings, primary content |
| Muted | `--color-text-muted` | Labels, secondary info, timestamps |
| Dim | `--color-text-dim` | Hints, placeholders, metadata |
| Success | `--color-success` | Published status, performance indicators |

**Anti-pattern:** Never use color for decoration. Every color should communicate something.

**Card style:**
```css
/* Cards don't have borders. They float. */
.card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  /* No border */
}
```

---

## Animation & Motion

The difference between "template" and "premium" is often just motion:

| Action | Animation | Duration |
|--------|-----------|----------|
| Page transition | Fade in + slide up 8px | 200ms ease-out |
| Card appear | Fade in, staggered 50ms per card | 150ms |
| Button press | scale(0.97) | 100ms |
| Button hover | translateY(-1px) + shadow lift | 150ms |
| Chip select | Background color + scale(1.02) | 150ms |
| Results appear | Fade in + slide up 12px | 300ms ease-out |
| Drawer open | Slide in from right + backdrop fade | 250ms |
| Loading | Skeleton pulse (not spinner) | continuous |
| Success | Checkmark draw animation | 400ms |

**Anti-pattern:** No spinners. No loading bars. Use skeleton screens (gray pulsing shapes matching the content layout).

---

## What Gets Removed/Hidden

| Feature | Current | Proposed | Reason |
|---------|---------|----------|--------|
| Knowledge Base page | Sidebar nav | Cmd+K only | Grace never manages KB manually |
| Knowledge Extract | Sidebar nav | Settings → Advanced | Admin feature |
| Analytics page | Sidebar nav | Subtle indicators on Today | Grace doesn't read charts |
| Ad Performance page | Sidebar nav | Subtle indicators on Today | Same |
| Script Performance | Sidebar nav | Subtle indicators on Today | Same |
| Eval harness | Route exists | Remove from nav | Dev tool |
| Research page | Route exists | Remove from nav | Dev tool |
| Upload page | Route exists | Remove from nav | Unused |
| Chat page | Route exists | Remove from nav | Unused |
| YouTube duplicate | Route exists | Remove | Duplicate of /create/youtube |

**From 19 routes → 5 visible routes** (Today, Create, Calendar, Library, Settings drawer)

The other routes still work (bookmarkable URLs) but aren't in navigation.

---

## Component-Level Changes

### Forms → Conversations
Instead of "label above input, input, label above input, input, submit":
```
What are you creating?    [Script] [Ad] [Post] [YouTube]

For which product?        [Papers to Profits Course ▾]

What's the idea?          [                          ]

                          [✨ Create]
```

Each step flows like a conversation. Questions, not labels. Generous vertical spacing between each question (2rem). The form should feel like the app is *asking Grace* what she wants, not presenting a form to fill out.

### Results → Cards with personality
Instead of bordered boxes with metadata:
- Soft floating cards with generous padding
- The content (script text, ad copy) is the star — large, readable, 0.875rem
- Metadata (model, score, sources) is tiny caption text at the bottom
- Actions (Copy, Edit) appear on hover on desktop, always visible on mobile
- "📚 5 sources used" is a subtle collapsed line, not a sidebar

### Buttons → Intentional hierarchy
- **ONE primary button per screen.** Always the same indigo. Always full-width or prominent.
- **Secondary actions:** Ghost style. No background, just text + icon.  
- **Destructive:** Red text, no background. Confirms with a modal.
- **NO outline buttons.** They look templated. Either filled or ghost.

### Empty States → Encouraging invitations
Instead of "No content yet":
```
                    ✨
         Ready to create something?
    
    Pick a product and hit Create — we'll
    handle the rest. Your first post takes
    less than 30 seconds.
    
              [✨ Let's go]
```

---

## Mobile-First Approach

Grace uses her phone more than her laptop. Every design starts mobile:

1. **Single column.** Always. No sidebars, no 3-panel layouts on mobile.
2. **Bottom navigation.** 5 icons, always visible, 56px touch targets.
3. **Thumb-friendly CTAs.** Primary buttons always within thumb reach (bottom 40% of screen).
4. **Swipeable cards.** Results can be swiped horizontally to see variants.
5. **Pull to refresh.** Refresh suggestions on Today page.
6. **Full-screen generator.** Create page is immersive — no nav visible during creation.

---

## Implementation Plan

### Phase 1: Foundation (2-3 days)
- [ ] Finalize typography system in globals.css
- [ ] Finalize color usage rules
- [ ] Create base components: Card, Button (primary/ghost/danger), Chip, Skeleton
- [ ] Motion system: page transitions, card animations
- [ ] Icon audit: replace all emoji with Lucide, standardize sizes

### Phase 2: Today Page (2-3 days)
- [ ] Redesign home page as "Today" — greeting, suggestions, weekly summary
- [ ] Content suggestion engine (from calendar + KB + past performance)
- [ ] "Create This" one-tap flow (pre-fills generator)

### Phase 3: Unified Creator (3-4 days)
- [ ] Merge 4 generator pages into 1 unified `/create`
- [ ] Conversational form layout
- [ ] Progressive disclosure (3 fields visible, rest behind "More options")
- [ ] Results below form (vertical flow, not side panel)
- [ ] Skeleton loading states

### Phase 4: Navigation Overhaul (1-2 days)
- [ ] Icon-only sidebar on desktop (48px, expand on hover)
- [ ] Bottom tab bar on mobile (5 items)
- [ ] Settings as drawer/modal
- [ ] Remove hidden routes from navigation

### Phase 5: Library + Calendar Polish (2-3 days)
- [ ] Library page (past creations archive)
- [ ] Calendar visual grid redesign
- [ ] "Suggest content for empty days" feature

### Phase 6: Polish & Motion (2-3 days)
- [ ] Page transitions
- [ ] Card stagger animations
- [ ] Skeleton screens
- [ ] Success animations
- [ ] Mobile gestures (swipe, pull to refresh)

**Total estimate: 12-18 days**

---

## The Test

When it's done, hand Grace the phone. Don't explain anything. If she can create her first post in under 60 seconds without asking a question — we shipped the right thing.

---

## Rob's Decisions (2026-03-19)

1. **Settings = separate page.** Not a drawer. Keep current settings page.
2. **Grace sees analytics** — but translated into plain language ("your paper flower tutorial got 3x more engagement") not charts/numbers. Actionable suggestions, not dashboards.
3. **Rob keeps admin dashboard** — separate `/admin` route with full stats, KB management, etc.
4. **Ship incrementally** — layer by layer, not big bang. Grace tests with current UI while we iterate.
5. **Timeline: days, not weeks.** Move fast.
