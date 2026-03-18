# TASK-018: Design System Debt Cleanup

## Priority: P1 (P0 components)
## Track: DEFAULT
## Depends on: TASK-017

## Overview
Shuri's UI/UX audit (UIUX-AUDIT.md) found critical design system violations across core components. This task cleans them up before Phase 2b begins.

## Reference Files to Read
1. `references/ARCHITECTURE.md` — project structure
2. `active/gh-creative-dashboard/UIUX-AUDIT.md` — full audit findings (READ THIS FIRST)
3. `app/globals.css` — design tokens / CSS variables
4. `components/create/QualityBadge.tsx` — primary P0 offender
5. `components/create/SceneCard.tsx` — P0 inline styles
6. `app/create/ads/page.module.css` — P1 redundant CSS
7. `app/create/short-form/page.module.css` — P1 layout overflow

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

---

## Wave 1: Fix P0 — Design Token Foundation

### Step 1: Audit & extend `app/globals.css`
Add any missing CSS variables that components need:
- Badge/alert dark-mode colors (translucent backgrounds + colored borders)
- Accent colors (`--accent-purple`, `--accent-blue`, `--accent-green`, etc.)
- Any `var(--accent-purple-dark, #6b21a8)` fallbacks → define them properly in `:root`

**Rule:** Every color in the app must trace back to a `:root` variable in `globals.css`. No hardcoded hex values anywhere.

---

## Wave 2: Fix P0 — QualityBadge Dark-Mode

### File: `components/create/QualityBadge.tsx`
**Problem:** Uses light-mode alert colors (`#dcfce7` bg, `#166534` text) — blindingly bright in dark OLED theme.

**Fix:** Replace all hardcoded hex values with dark-mode variants:
- Background: translucent colored border approach (`rgba` or `var(--color-*)` with low opacity)
- Text: use light-on-dark (e.g., green text on dark background, not dark text on bright green)
- Match the "Mission Control" dark theme aesthetic

**Example pattern (green pass):**
```css
/* Before (light-mode) */
background: #dcfce7;
color: #166534;

/* After (dark-mode) */
background: rgba(var(--color-success-rgb), 0.15);
border: 1px solid var(--color-success);
color: var(--color-success-light);
```

No inline `style={{ ... }}` objects — move all styles to `QualityBadge.module.css`.

---

## Wave 3: Fix P0 — SceneCard Inline Styles

### File: `components/create/SceneCard.tsx`
**Problem:** Inline `style={{ ... }}` objects with hardcoded hex values.

**Fix:**
- Move ALL inline styles to `SceneCard.module.css`
- Replace hardcoded hex values with `var(--color-*)` references
- Standardize text size to `1rem` (body text) using Tailwind or CSS module class

---

## Wave 4: Fix P1 — Ads CSS Module

### File: `app/create/ads/page.module.css`
**Problem:** Literal copy of short-form CSS, includes unused `.scriptPreview` styles, missing `.adVariantCard` styles.

**Fix:**
- Remove all styles that reference short-form concepts (`.scriptPreview`, `.hookBanner`, etc.)
- Add proper `.adVariantCard`, `.frameworkBadge`, `.imagePreview` styles
- Extract shared 3-column layout pattern into a new file:

### New File: `app/create/layout.module.css` (or `components/create/GeneratorLayout.module.css`)
Shared styles for the 3-panel generator layout (left settings, center output, right actions). Both short-form and ads pages import from this.

---

## Wave 5: Fix P1 — Knowledge Panel Overflow

### File: `app/create/short-form/page.module.css`
**Problem:** Knowledge Used list grows unbounded, pushes Actions panel off-screen.

**Fix:**
```css
.knowledgeList {
  max-height: 240px;
  overflow-y: auto;
}
```
Or reorder the right panel so Actions appear above Knowledge Used.

Also apply same fix to the ads page right panel (TASK-017 may have same issue — fix proactively).

---

## Wave 6: Fix P2 — Typography Consistency

### Files: `app/globals.css`, `components/create/SceneCard.tsx`
- Standardize body text to a single scale (`text-sm` / `0.875rem` for secondary, `text-base` / `1rem` for primary)
- Ensure font-weight is consistent between headers
- Fix `AdVariantCard` font-size mismatch (`0.95rem` → `text-base`)

---

## Verification

```bash
# Visual check
npx next dev --port 3100
```

1. Login, navigate to `/create/short-form` — run a generation
   - [ ] QualityBadge uses dark-mode colors (no blinding bright green)
   - [ ] SceneCard has no inline styles in DOM inspector
   - [ ] Knowledge Used list scrolls (doesn't overflow)
2. Navigate to `/create/ads` — run an ad generation
   - [ ] AdVariantCard styled via CSS module (not inline styles)
   - [ ] Framework badges display correctly
   - [ ] Same dark-mode badge styles as QualityBadge
3. Open browser DevTools → Inspect any badge or card
   - [ ] No `style="..."` attributes on any component
   - [ ] All colors reference CSS variables
4. `next build` passes (0 TypeScript errors)
5. Screenshot both pages and save to `qa/TASK-018-*.png`

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `app/globals.css` | Modify | Add missing CSS variables (accents, dark-mode badge colors) |
| `components/create/QualityBadge.tsx` | Modify | Dark-mode colors, move styles to CSS module |
| `components/create/QualityBadge.module.css` | Create | CSS module for badge |
| `components/create/SceneCard.tsx` | Modify | Remove all inline styles |
| `components/create/SceneCard.module.css` | Modify | Add styles moved from inline |
| `app/create/ads/page.module.css` | Modify | Remove copied short-form styles, add ad-specific styles |
| `app/create/layout.module.css` | Create | Shared 3-panel generator layout styles |
| `app/create/short-form/page.module.css` | Modify | Knowledge panel max-height overflow fix |
| `app/create/short-form/page.tsx` | Modify | Use shared layout module + fix icon color variables |
