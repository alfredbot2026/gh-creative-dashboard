# SHURI-AUDIT.md — GH Creative Dashboard

## Executive Summary
The dashboard is functional but currently feels like a "technical tool" rather than a premium content studio. For a non-technical user like Grace, the visual noise (18 sidebar items) and the dense 3-column layouts on mobile-heavy pages are major friction points.

**Overall Vibe:** Needs transition from "Admin Panel" to "Creative Workspace."
**Inspiration Sources:** Linear (spacing/clarity), Framer (typography), Notion (simplicity).

---

## P0: Critical (Fix Immediately)

### 1. Sidebar Overload & Information Architecture
- **Issue:** 18+ items in the sidebar. "Mission Control" and "Dashboard" are redundant. Multiple "Analytics" and "Create" sub-items create a tall, intimidating list.
- **Micro-Audit:** 
  - Redundant: "Mission Control" vs "Dashboard".
  - Fragmented: "Short-form Performance" should be inside "Analytics".
  - Scattered: "Brand Setup" is under settings but also a main item.
- **Fix:** 
  - **Group items:** Use collapsible sections or a simplified top-level nav.
  - **The "Linear" Approach:** Only show active workspace items. Hide administrative settings in a profile menu.
  - **New Sidebar Map:**
    - `Dashboard` (Home)
    - `Calendar`
    - `Create` (Dropdown: Ads, Social, Scripts)
    - `Knowledge` (Knowledge Base + Extract)
    - `Analytics` (All performance data)
    - ---
    - `Settings` (Includes Brand Setup)

### 2. 3-Column Generator Layout (Ads, Social, YouTube)
- **Issue:** The 3-column layout is too dense. On smaller screens or even 13" laptops, the middle "Preview" area is squeezed. Grace likely uses a phone or tablet; this layout will completely break.
- **Fix:** 
  - **Progressive Disclosure:** Use a 2-column layout (Settings | Result). 
  - **Mobile:** Stack them vertically.
  - **CSS:** Shift from fixed columns to `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))`.

---

## P1: Important (User Experience Polish)

### 3. Onboarding Wizard Visual Feedback
- **Issue:** The onboarding step indicator (`button` based) doesn't feel like a progress journey. It looks like a secondary menu.
- **Award-Winning Pattern:** Use a proper horizontal progress bar with "soft" transitions (framer-motion).
- **Fix:** Update `components/onboarding/StepIndicator.tsx` to use a connector line and active/done states (checkmarks).

### 4. Style Mode Toggle & Component Hierarchy
- **Issue:** "AI Polished" vs "UGC" toggle is a simple button group. It lacks "intent."
- **Fix:** Add micro-descriptions or icons that explain the *outcome*.
  - *Polished:* "Studio quality, high production feel."
  - *UGC:* "Authentic, raw, phone-camera feel."

---

## P2: Visual & Typography (The "Awwwards" Touch)

### 5. Typography Hierarchy
- **Issue:** Headers and labels are very similar in weight and size. Visual hierarchy is flat.
- **Fix:**
  - Increase `h1` weight to `font-bold`.
  - Use `text-slate-400` for secondary labels to create depth.
  - Implement a consistent spacing scale (e.g., `space-y-8` between major sections).

### 6. Empty States
- **Issue:** "No Variants Generated" uses a generic dashed box.
- **Fix:** Use more illustrative or "magical" empty states. A simple sparkle icon with a more encouraging CTA ("Your first ad is one click away").

---

## Specific Component Recommendations

### `components/layout/Sidebar.tsx`
- **Action:** Implement "Categories" (Workspace, Tools, Management).
- **CSS:** Use `backdrop-blur` and a slightly more transparent background to make the dashboard feel "lighter."

### `globals.css`
- **Action:** Define a semantic color palette. 
  - `--color-primary`: Use a warmer, "Grace-friendly" tone (e.g., a soft indigo or violet, not harsh tech blue).
  - `--radius-xl`: 12px or 16px for a friendlier, modern feel.

---
**Audit Complete.** 
*Note: Priority 0 items should be addressed before the next user testing session with Grace.*
