# UI/UX Audit Report — GH Creative Dashboard

**Date:** March 18, 2026
**Project:** Papers to Profits — GH Creative Dashboard
**Reviewer:** Shuri (UI/UX Designer)

## Executive Summary
The GH Creative Dashboard has a solid functional foundation but suffers from significant "technical design debt." The primary issues are **inconsistent component styling** (prevalence of inline styles over design tokens) and a **thematic mismatch** between utility components (like the Quality Badge) and the dark-mode brand identity.

---

## 🔴 P0 — Critical Issues (Action Required Immediately)

### 1. Design System Bypassing (Inline Styles)
**Severity:** P0 | **Area:** Core Components
**Observation:** `SceneCard.tsx`, `QualityBadge.tsx`, and `app/create/ads/page.tsx` rely heavily on inline `style={{ ... }}` objects and hardcoded hex values. 
**Impact:** 
- Impossible to maintain a consistent look as the app grows.
- Bypasses the `globals.css` theme variables.
- Makes it difficult to implement true responsive design via media queries.
**Recommendation:** Move all inline styles to their respective CSS modules or Tailwind classes. Reference `var(--color-*)` variables from `globals.css`.

### 2. High-Contrast Light-Mode Components in Dark-Mode
**Severity:** P0 | **Area:** QualityBadge.tsx
**Observation:** The `QualityBadge` uses light-mode alert colors (e.g., `#dcfce7` for background, `#166534` for text). In a dark OLED theme, this creates a "blinding" effect and breaks the visual harmony.
**Impact:** Jarring user experience; does not feel like a cohesive product.
**Recommendation:** Update `QualityBadge` to use dark-mode variant colors (e.g., translucent background with colored borders/text) that match the Mission Control design system.
**File:** `components/create/QualityBadge.tsx`

---

## 🟠 P1 — High Priority Issues

### 3. Redundant & Unused CSS Modules
**Severity:** P1 | **Area:** Ad Copy Generator
**Observation:** `app/create/ads/page.module.css` is a literal copy of the short-form generator's CSS. It contains styles for "Script Preview" (not used in Ads) but lacks styles for "Ad Variant Cards" (which are currently styled inline).
**Impact:** Bloated code; confusing for future development.
**Recommendation:** Refactor `page.module.css` for Ads to reflect its actual content. Create a shared `Layout.module.css` for the 3-column pattern.
**File:** `app/create/ads/page.module.css`

### 4. Knowledge Panel Overflow
**Severity:** P1 | **Area:** Layout
**Observation:** In the Short-form Script Generator, the "Knowledge Used" list grows vertically without bound. On a screen with many references, it pushes the critical "Actions" panel (Regenerate, Save) completely off-screen.
**Impact:** Critical CTAs become hard to find.
**Recommendation:** Set a `max-height` with `overflow-y: auto` for the `itemList` in the sidebar, or swap the order of "Actions" and "Knowledge Used."
**File:** `app/create/short-form/page.module.css`

---

## 🟡 P2 — Medium Priority (Polish & Consistency)

### 5. Inconsistent Typography & Hierarchy
**Severity:** P2 | **Area:** Text System
**Observation:** 
- `SceneCard` uses `1.05rem` for body text, while `AdVariantCard` uses `0.95rem`.
- Header weights are inconsistent between mono and sans-serif fonts.
**Recommendation:** Standardize text sizes using a scale (e.g., `text-xs`, `text-sm`, `text-base`).
**Files:** `app/globals.css`, `components/create/SceneCard.tsx`

### 6. Hardcoded Icon Colors
**Severity:** P2 | **Area:** Knowledge Panel
**Observation:** Icons in the knowledge panel use hardcoded colors like `var(--accent-purple-dark, #6b21a8)`. This variable is not defined in `globals.css`.
**Recommendation:** Add accent colors to `:root` in `globals.css` and use those variables exclusively.
**File:** `app/globals.css`, `app/create/short-form/page.tsx`

---

## 🔵 P3 — Low Priority (Visual Refinements)

### 7. Empty State Visuals
**Severity:** P3 | **Area:** Information Design
**Observation:** Empty states are simple icons. While functional, they lack the "warm neutral" brand voice of Papers to Profits.
**Recommendation:** Use subtle SVG illustrations or localized copy (Taglish) in empty states to make the brand feel more present.

---

## Responsive & Layout Check
| Breakpoint | Status | Note |
|------------|--------|------|
| Desktop (1440px+) | ✅ | 3-column layout works well. |
| Desktop (1200px) | ⚠️ | Right column drops; "Actions" move to bottom? Check flow. |
| Tablet (900px) | ⚠️ | Single column; very long scroll. |
| Mobile (375px) | ⚠️ | Sidebar needs to collapse properly (Layout check). |

## Screen-Specific Audit Notes

### Short-form Script Generator (`/create/short-form`)
- **Visual Flow:** Good. The Hook banner provides a clear entry point for the reading flow.
- **Padding:** The central panel padding increases from 24px to 32px when content is present, which causes a slight visual "jump" in the layout.

### Ad Copy Generator (`/create/ads`)
- **Variant Cards:** The 2px border on selection is good, but the "Generate Image" placeholder is quite dark and low-contrast against the surface background.
- **Call to Action Preview:** The CTA preview box is a good touch, but the font size for "Button CTA" (0.8rem) is too small compared to the headline.

---

## Suggested Implementation Plan
1. **Refactor Design Tokens:** Ensure all used colors in `globals.css` cover the needs of badges and cards.
2. **Component Cleanup:** Rewrite `SceneCard` and `QualityBadge` to use CSS Modules and CSS variables.
3. **Layout Standardization:** Create a shared layout component or utility classes for the common 3-panel generator structure.
