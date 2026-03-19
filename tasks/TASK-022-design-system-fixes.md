# TASK-022: Design System Fixes (Shuri Audit P0/P1)

## Priority: P0/P1
## Track: DEFAULT

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`
- `active/gh-creative-dashboard/UIUX-AUDIT.md` — Shuri's full audit report

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `app/globals.css` — existing theme variables
3. `app/create/short-form/page.tsx` and `page.module.css`
4. `app/create/ads/page.tsx` and `page.module.css`
5. `components/create/QualityBadge.tsx`
6. `components/create/SceneCard.tsx`

## Wave 1: Design Token Foundation (P0)

### File: `app/globals.css`
Add missing CSS variables to `:root` (dark theme):
```css
/* Badge colors — dark mode variants */
--badge-success-bg: rgba(34, 197, 94, 0.15);
--badge-success-text: #4ade80;
--badge-success-border: rgba(34, 197, 94, 0.3);

--badge-warning-bg: rgba(234, 179, 8, 0.15);
--badge-warning-text: #facc15;
--badge-warning-border: rgba(234, 179, 8, 0.3);

--badge-danger-bg: rgba(239, 68, 68, 0.15);
--badge-danger-text: #f87171;
--badge-danger-border: rgba(239, 68, 68, 0.3);

/* Accent colors */
--accent-purple: #a855f7;
--accent-purple-dark: #7c3aed;

/* Text scale */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
```

## Wave 2: QualityBadge Dark Mode Fix (P0)

### File: `components/create/QualityBadge.tsx`
Replace all hardcoded light-mode colors with CSS variables:
- Green badges: use `var(--badge-success-bg)`, `var(--badge-success-text)`, `var(--badge-success-border)`
- Yellow badges: use `var(--badge-warning-*)` 
- Red badges: use `var(--badge-danger-*)`
- Remove ALL inline `style={{ }}` objects — use CSS classes or Tailwind

The badges should look like translucent pills with colored borders, not bright solid blocks.

## Wave 3: Inline Style Cleanup (P0)

### File: `components/create/SceneCard.tsx`
- Move ALL inline styles to CSS module or Tailwind classes
- Use `var(--text-base)` for body text (not `1.05rem`)
- Reference theme colors from globals.css

### File: `app/create/ads/page.tsx`  
- Move ALL inline styles to `page.module.css`
- Use `var(--text-base)` for body text (not `0.95rem`)
- Reference theme colors from globals.css

## Wave 4: CSS Module Cleanup (P1)

### File: `app/create/ads/page.module.css`
- Remove all unused classes copied from short-form (e.g., `.scriptPreview`, `.sceneCard`)
- Add proper classes for: `.variantCard`, `.variantHeader`, `.variantBody`, `.ctaPreview`, `.imageSection`
- Create shared layout classes that both generators use

## Wave 5: Knowledge Panel Overflow (P1)

### File: `app/create/short-form/page.module.css` (and ads equivalent)
Add to the knowledge items list container:
```css
.itemList {
  max-height: 300px;
  overflow-y: auto;
}
```

Also: move "Actions" section ABOVE "Knowledge Used" in both pages — actions are more important than context attribution.

## Wave 6: Typography Consistency (P2)

Standardize across both generators:
- Scene/variant body text: `var(--text-base)` (1rem)
- Labels and metadata: `var(--text-sm)` (0.875rem)  
- Small captions: `var(--text-xs)` (0.75rem)
- Headings: keep current weights but ensure consistency between screens

## Verification
- [ ] No inline `style={{ }}` in QualityBadge, SceneCard, or ads page
- [ ] Badges look correct in dark mode (translucent, not blinding)
- [ ] Knowledge panel scrolls at 300px, doesn't push Actions off-screen
- [ ] Actions section appears ABOVE Knowledge Used
- [ ] Text sizes consistent between short-form and ads screens
- [ ] `next build` passes
- [ ] No unused CSS classes in ads page.module.css

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `app/globals.css` | Modify | Add badge/accent/text CSS variables |
| `components/create/QualityBadge.tsx` | Modify | Dark mode colors, remove inline styles |
| `components/create/SceneCard.tsx` | Modify | Remove inline styles, use CSS module |
| `app/create/ads/page.tsx` | Modify | Remove inline styles, use CSS module |
| `app/create/ads/page.module.css` | Modify | Remove unused classes, add variant-specific ones |
| `app/create/short-form/page.module.css` | Modify | Add itemList max-height |
| `app/create/short-form/page.tsx` | Modify | Move Actions above Knowledge Used |
