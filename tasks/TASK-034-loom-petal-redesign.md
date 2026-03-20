# TASK-034: Loom & Petal Redesign — Full UI + 3-Variant Generation

## Overview
Complete UI redesign from current "Calm Creative" to "Loom & Petal" (Editorial Nurture) design system, plus rebuild the Create flow as tap-only selection and API to return 3 variants.

## Reference Files to Read FIRST
- `app/globals.css` — Current CSS tokens (replace entirely)
- `app/create/page.tsx` + `app/create/create.module.css` — Current Create page (rebuild)
- `app/page.tsx` + `app/page.module.css` — Home/Today page (restyle)
- `app/library/page.tsx` + `app/library/page.module.css` — Library page (restyle)
- `app/library/[id]/page.tsx` + `app/library/[id]/page.module.css` — Library detail (restyle)
- `components/layout/Sidebar.tsx` + `components/layout/Sidebar.module.css` — Sidebar (restyle)
- `components/layout/BottomNav.tsx` + `components/layout/BottomNav.module.css` — Bottom nav (restyle)
- `lib/create/kb-retriever.ts` — KB retrieval (add funnel-stage mapping)
- `app/api/create/short-form/route.ts` — Short-form API (add 3-variant support)
- `app/api/create/ad/route.ts` — Ad API (already has variants param)
- `app/api/create/social-post/route.ts` — Social post API (add 3-variant support)
- `app/api/create/youtube-script/route.ts` — YouTube API (add 3-variant support)
- `specs/DESIGN-SYSTEM.md` — Loom & Petal design system spec
- `.stitch/designs/create-screen.html` — Stitch-generated Create screen HTML reference
- `.stitch/designs/results-screen.html` — Stitch-generated Results screen HTML reference

## Design System: "Loom & Petal" (Editorial Nurture)

### Color Tokens (replace ALL existing tokens)
```css
:root {
  /* -- Loom & Petal: Surface Philosophy -- */
  --color-bg: #fbf9f7;                    /* warm paper background */
  --color-surface: #ffffff;                /* cards, inputs */
  --color-surface-low: #f5f3f1;           /* secondary sections */
  --color-surface-high: #eae8e6;          /* section wrappers */
  --color-surface-highest: #e4e2e0;       /* deep nesting */
  --color-surface-container: #efedec;     /* neutral containers */
  --color-surface-dim: #dbdad8;           /* disabled/dim */

  /* -- Brand Colors (GH brand guide) -- */
  --color-primary: #765163;               /* dusty mauve - buttons, headings */
  --color-primary-container: #91697c;     /* deeper mauve - hover, gradient end */
  --color-primary-fixed: #ffd8e8;         /* pink tint backgrounds */
  --color-primary-fixed-dim: #e8bace;     /* muted pink */
  --color-secondary: #49626a;             /* sage teal - accents, scores */
  --color-secondary-container: #cbe7f1;   /* light teal backgrounds */
  --color-tertiary: #7b514d;              /* warm terracotta - links, tertiary */
  --color-tertiary-container: #976965;    /* deeper terracotta */
  --color-tertiary-fixed: #ffdad6;        /* soft pink fixed */
  --color-accent: #EDB6B1;               /* soft pink - underlines, highlights */

  /* -- Text -- */
  --color-text: #1b1c1b;                 /* on-surface - headings (NOT pure black) */
  --color-text-muted: #4f4448;           /* on-surface-variant - body text */
  --color-text-dim: #807478;             /* outline - labels, metadata */

  /* -- Borders (Ghost Border philosophy) -- */
  --color-border: rgba(210, 195, 200, 0.2);  /* outline-variant at 20% */
  --color-border-focus: #765163;          /* primary on focus */

  /* -- Status -- */
  --color-success: #49626a;              /* sage teal for positive */
  --color-warning: #7b514d;              /* terracotta for warning */
  --color-danger: #ba1a1a;               /* error red */
  --color-error-container: #ffdad6;      /* error background */

  /* -- Shadows (Mauve-Tinted, not grey) -- */
  --shadow-sm: 0 1px 3px rgba(118, 81, 99, 0.04);
  --shadow-md: 0 0 20px 4px rgba(118, 81, 99, 0.06);
  --shadow-lg: 0 8px 32px rgba(118, 81, 99, 0.08);
  --shadow-glow: 0 0 20px 4px rgba(118, 81, 99, 0.06);  /* ambient glow */

  /* -- Spacing (8pt grid) -- */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* -- Border Radius (nurturing = rounded) -- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;       /* cards */
  --radius-xl: 24px;       /* pill buttons */
  --radius-full: 9999px;   /* avatars only */

  /* -- Typography -- */
  --font-display: 'Noto Serif', 'Playfair Display', Georgia, serif;
  --font-body: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
  --font-label: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;

  /* -- Aliases for backward compatibility -- */
  --bg-surface: var(--color-surface);
  --bg-elevated: var(--color-surface-low);
  --border-color: var(--color-border);
  --text-primary: var(--color-text);
  --text-secondary: var(--color-text-muted);
  --primary-color: var(--color-primary);
  --primary-hover: var(--color-primary-container);
  --bg-input: var(--color-surface);
  --bg-hover: rgba(118, 81, 99, 0.04);
  --error-color: var(--color-danger);
  --surface: var(--color-surface);
  --surface-hover: var(--bg-hover);
  --border: var(--color-border);
  --text: var(--color-text);
  --text-muted: var(--color-text-muted);
  --primary: var(--color-primary);
  --background: var(--color-bg);

  /* -- Sidebar -- */
  --sidebar-width: 180px;
}
```

### Typography Rules
- Import Google Fonts: `Noto+Serif:wght@400;600;700` and `Plus+Jakarta+Sans:wght@300;400;500;600;700`
- REMOVE all Fira Code and Inter imports
- `h1, h2, h3, h4` → `font-family: var(--font-display)`
- Body, labels, buttons → `font-family: var(--font-body)`
- Body text color: `var(--color-text-muted)` (#4f4448), NOT pure black
- Headings: `var(--color-text)` (#1b1c1b)
- Display headings (h1): `letter-spacing: -0.02em` for masthead feel
- `h1`: 1.75rem, `h2`: 1.375rem, `h3`: 1.125rem

### Design Rules
- **NO 1px solid borders for sections** — use tonal shifts (background color changes) and whitespace
- Ghost borders only when needed for accessibility (inputs, etc.) — `outline-variant` at 20% opacity
- All cards: `border-radius: var(--radius-lg)` (16px)
- Buttons: pill shape `border-radius: var(--radius-xl)` (24px)
- No pure black (#000000) anywhere
- No Material Design blue for links — use `var(--color-tertiary)` (#7b514d)
- Touch targets: minimum 44px height on all interactive elements
- Generous whitespace — when in doubt, add more padding

---

## Wave 1: Design System Foundation

### File: `app/globals.css`
**Action:** Replace entirely with new design system tokens + base styles.
- Replace font imports with Noto Serif + Plus Jakarta Sans
- Replace ALL `:root` variables with the tokens above
- Update typography rules: headings use `var(--font-display)`, body uses `var(--font-body)`
- Remove `--font-mono` references (kill Fira Code)
- Update scrollbar colors to mauve-tinted
- Update focus-visible to use `var(--color-primary)` (dusty mauve)
- Keep all layout rules (`.app-layout`, `.main-content`, responsive breakpoints)
- Keep accessibility rules (prefers-reduced-motion)

### File: `app/layout.tsx`
**Action:** Verify font imports match new system. If it uses `next/font/google`, update to Noto Serif + Plus Jakarta Sans.

**Verify:** `npx next build` passes after Wave 1.

---

## Wave 2: Navigation Restyle

### File: `components/layout/Sidebar.tsx` + `Sidebar.module.css`
**Action:** Restyle sidebar to match Loom & Petal.
- Background: `var(--color-surface-low)` (#f5f3f1)
- Text: `var(--color-text-muted)`, active item: `var(--color-primary)` with `font-weight: 600`
- No borders between items — use spacing
- Active indicator: left 3px bar in `var(--color-primary)`, or background tint `var(--bg-hover)`
- Font: `var(--font-body)` (Plus Jakarta Sans)
- Settings link at bottom in `var(--color-text-dim)`
- Width stays 180px fixed

### File: `components/layout/BottomNav.tsx` + `BottomNav.module.css`
**Action:** Restyle bottom nav.
- Background: `var(--color-surface)` with frosted glass effect: `backdrop-filter: blur(12px); opacity: 0.9`
- Text: `var(--font-body)`, `var(--color-text-dim)`, active: `var(--color-primary)`
- Minimum 44px touch targets
- No top border — use subtle shadow instead

**Verify:** Both navigations render correctly on desktop and mobile.

---

## Wave 3: Create Page — Tap-Only Selection Flow

### File: `app/create/page.tsx`
**Action:** Complete rewrite. The new Create page is a TAP-ONLY selection flow. Grace doesn't type — she selects.

**New Flow:**
1. **Header:** Serif heading "What are you creating?" in `var(--color-primary)`. Subtitle in `var(--color-text-muted)`.
2. **Platform Selection** (tap one): Vertical stack of selection rows. Each has label + description.
   - Reels / TikTok → lane: `short-form`
   - Facebook Post → lane: `social_media` (NOTE: not ads — regular posts)
   - Facebook Ad → lane: `ads`
   - YouTube Video → lane: `youtube`
   - Instagram Carousel → lane: `short-form` (carousel format)
   - Static Image → lane: `ads` (image format)
   Selected item: `var(--color-accent)` (#EDB6B1) left border + blush background tint.
3. **Content Type chips** (tap one): Horizontal scrollable chips showing funnel-friendly labels:
   - "Teach something" → categories: `['content_funnel', 'scripting_framework']`, tags filter: `educational`
   - "Tell a story" → categories: `['scripting_framework', 'virality_science']`, tags filter: `storytelling`
   - "Show proof" → categories: `['cro_patterns', 'ad_creative']`, tags filter: `social_proof`
   - "Promote & sell" → categories: `['ad_creative', 'cro_patterns', 'content_funnel']`, tags filter: `sales`
   Selected chip: filled `var(--color-primary)` background, white text.
4. **Product selector** (only if "Promote & sell" selected AND platform is Facebook Ad): Dropdown of products from `product_catalog`.
5. **Generate button:** "Create 3 Variants" — full-width pill button, `var(--color-primary)` background, white text. 44px min height.
6. **Loading state:** Show skeleton cards with gentle pulse animation. Text: "Creating your content..." in serif.
7. **Results view** (inline, replaces selections after generation):
   - Header: "Your [Platform] Scripts" in serif, with variant count + content type badge
   - 3 variant cards stacked vertically. Each card:
     - White background, `var(--radius-lg)` corners, `var(--shadow-md)` glow
     - Variant number badge (small circle in `var(--color-primary)`)
     - HOOK text in bold serif
     - Scene/content breakdown with visual directions in muted text, voiceover/copy in regular
     - Bottom: "Copy" (outlined) + "Save to Library" (filled `var(--color-secondary)`)
     - Quality score badge in `var(--color-secondary)` (#49626a)
   - Below cards: "Create 3 More" secondary button (outlined)
   - "Start Over" link to go back to selection

**State management:**
- `step`: 'select' | 'loading' | 'results'
- `platform`: string (one of the platforms above)
- `contentType`: 'educate' | 'story' | 'prove' | 'sell'
- `results`: array of 3 variant objects
- `selectedProduct`: string (product ID, only for sell)

**API call:** POST to a NEW unified endpoint `/api/create/generate` (see Wave 4).

### File: `app/create/create.module.css`
**Action:** Complete rewrite matching Loom & Petal design system.
- Use CSS variables exclusively (no hex literals)
- Card styles: white bg, 16px radius, mauve glow shadow
- Chip styles: pill shape, 44px min-height, transitions
- Platform row styles: subtle left border accent on selection
- Result card styles: editorial layout with generous spacing
- Loading skeleton styles with pulse animation
- Responsive: single column, max-width 520px centered

---

## Wave 4: Unified Generation API

### File: `app/api/create/generate/route.ts` (NEW)
**Action:** Create a new unified generation endpoint that returns 3 variants.

```typescript
// POST body:
interface GenerateRequest {
  platform: 'reels' | 'tiktok' | 'facebook-post' | 'facebook-ad' | 'youtube' | 'carousel' | 'static-image'
  contentType: 'educate' | 'story' | 'prove' | 'sell'
  productId?: string  // only for sell
  variants?: number   // default 3
}

// Response:
interface GenerateResponse {
  variants: Variant[]
  platform: string
  contentType: string
  generatedAt: string
}

interface Variant {
  id: string          // uuid
  number: number      // 1, 2, 3
  hook: string        // the attention-grabbing opener
  content: VariantContent  // platform-specific
  qualityScore: number     // 0-100
}

// VariantContent varies by platform:
// For reels/tiktok: { scenes: Array<{sceneNumber, visual, voiceover, duration}> }
// For facebook-ad: { headline, primaryText, cta, imagePrompt }
// For facebook-post: { caption, hashtags, imageIdea }
// For youtube: { title, hook, sections: Array<{timestamp, content, visual}> }
// For carousel: { slides: Array<{text, imagePrompt}> }
// For static-image: { headline, subtext, imagePrompt }
```

**Implementation:**
1. Map `platform` to KB `lane` (`reels/tiktok` → `short-form`, `facebook-ad` → `ads`, etc.)
2. Map `contentType` to KB categories:
   - `educate` → `['content_funnel', 'scripting_framework']`
   - `story` → `['scripting_framework', 'virality_science']`
   - `prove` → `['cro_patterns', 'ad_creative']`
   - `sell` → `['ad_creative', 'cro_patterns', 'content_funnel']`
3. Call `getGenerationContext(lane, categories, 25)` from `lib/create/kb-retriever.ts`
4. Also call `getBrandContext()` for brand style guide
5. If `productId` provided, fetch product from `product_catalog`
6. Build prompt requesting 3 distinct variants (each with different hook style from KB)
7. Call Gemini via existing `lib/llm/client.ts`
8. Parse response into typed `GenerateResponse`
9. Return JSON

**Important:** Each variant should use a DIFFERENT hook style from the KB. The KB has `hook_library` entries with many different hook types (contrarian, curiosity gap, story-leading, etc.). Pull 3 different hooks and apply one to each variant.

### File: `lib/create/kb-retriever.ts`
**Action:** Add a new function:
```typescript
export async function getContentTypeContext(
  lane: 'short-form' | 'ads' | 'youtube' | 'social_media',
  contentType: 'educate' | 'story' | 'prove' | 'sell',
  limit: number = 25
): Promise<{ entries: KnowledgeEntry[], hooks: KnowledgeEntry[], tier: 'approved' | 'candidate' }>
```
This function:
1. Maps contentType to categories (as above)
2. Calls `getGenerationContext(lane, categories, limit - 5)` for main entries
3. Also fetches 5 entries from `hook_library` category for that lane (for diverse hooks)
4. Returns both sets

---

## Wave 5: Home + Library Restyle

### File: `app/page.tsx` + `app/page.module.css`
**Action:** Restyle Today/Home page.
- Greeting: "Good morning, Grace" in `var(--font-display)`, `var(--color-primary)` (FIX: must show "Grace" not "Graceful")
- Background: `var(--color-bg)` (#fbf9f7)
- "Create something new →" button: pill shape, `var(--color-primary)` bg
- Suggestion cards: white bg, radius-lg, mauve glow shadow
- Stats: text-only, `var(--font-body)`
- All text: `var(--color-text-muted)` for body, `var(--color-text)` for headings

### File: `app/library/page.tsx` + `app/library/page.module.css`
**Action:** Restyle Library page.
- Page title in serif
- Cards: white bg, radius-lg, mauve glow shadow, generous padding
- Metadata (date, type) in `var(--color-text-dim)`, `var(--font-label)` uppercase
- No dividers between cards — use spacing
- Quality score in `var(--color-secondary)` (sage teal)

### File: `app/library/[id]/page.tsx` + `app/library/[id]/page.module.css`
**Action:** Restyle Library detail page.
- Editorial layout with generous whitespace
- Content displayed with proper serif/sans typography pairing
- Copy + Share buttons in component style from design system

---

## Wave 6: Login + Settings Restyle

### File: `app/login/page.tsx` + `app/login/page.module.css`
**Action:** Restyle login page.
- Centered card on `var(--color-bg)` background
- Logo/brand name in serif
- Input fields: white bg, ghost border, focus state with primary color
- Login button: pill shape, primary color

### File: `app/settings/page.tsx` + `app/settings/page.module.css`
**Action:** Restyle settings page.
- Section headings in serif
- Form elements with ghost borders
- Save button: pill shape, primary color

---

## Final Verification
1. `npx next build` — must pass with zero errors
2. Run dev server on port 3100
3. Check ALL pages: Home, Create (full flow), Library, Library detail, Settings, Login
4. Check mobile responsive (375px width)
5. Check that generation actually works end-to-end (tap platform → content type → generate → see 3 results)
6. Verify no hex literals in CSS modules (only CSS variables)
7. Verify no Fira Code / Inter font remnants
8. Verify touch targets ≥ 44px on all buttons/chips
9. Verify the greeting shows "Grace" not "Graceful"

## Git
Commit message: `feat: Loom & Petal redesign + tap-only Create flow + 3-variant generation`
Push to origin/main.
