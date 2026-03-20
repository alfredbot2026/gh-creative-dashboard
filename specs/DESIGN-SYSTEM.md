# Design System — GH Creative Studio
**Version:** 1.1 (updated from REAL brand guide)
**Direction:** "Grace's Studio" — warm, personal, brand-native
**Persona:** Grace — Filipino mompreneur, homeschooling + paper crafting, mobile-heavy, non-technical
**Brand source:** GH Brand Guide June 2025 (attached image from Rob)

---

## 1. Design Principles

1. **It's Grace's studio, not a SaaS dashboard.** Every pixel should feel like it belongs to her brand, not to a software company.
2. **One thing at a time.** Never show more than one decision on screen. Reduce cognitive load to zero.
3. **Warm over cool.** Cream over white. Dusty mauve over blue. Rounded over sharp. Soft over hard.
4. **Show, don't label.** If something needs a label to explain it, the design has failed.
5. **Mobile is the real product.** Desktop is a nice-to-have. Grace creates content on her phone.

---

## 2. Color Tokens

### Source: GH Brand Guide June 2025 (3 brand colors)

| Token | Hex | Swatch | Usage |
|-------|-----|--------|-------|
| `--mauve` | `#A37A8D` | Dusty mauve/purple | **Primary** — buttons, active states, header accents, brand color |
| `--sage` | `#91ACB5` | Sage teal blue | **Secondary** — success states, secondary buttons, subtle highlights |
| `--blush` | `#EDB6B1` | Soft pink | **Accent** — hover states, chip backgrounds, warm highlights |

### Derived tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#FAF8F6` | Page background — warm off-white (derived from brand warmth) |
| `--surface` | `#FFFFFF` | Cards, elevated surfaces |
| `--surface-hover` | `#FDF5F3` | Card hover — blush-tinted |
| `--border` | `rgba(163, 122, 141, 0.12)` | Borders — mauve tinted, not gray |
| `--border-strong` | `rgba(163, 122, 141, 0.25)` | Active/focus borders |
| `--text` | `#3D3539` | Body text — warm charcoal derived from mauve |
| `--text-muted` | `#8A7D83` | Secondary text — warm gray with mauve undertone |
| `--text-dim` | `#B8AEB2` | Placeholder text, disabled states |
| `--mauve-soft` | `rgba(163, 122, 141, 0.08)` | Mauve tint for backgrounds |
| `--blush-soft` | `rgba(237, 182, 177, 0.15)` | Blush tint for chip backgrounds |
| `--danger` | `#C45D5D` | Errors — warm red |
| `--success` | `#91ACB5` | Success — uses sage (brand color) |

### What we're NOT using
- Pure white (#FFFFFF) as background — too cold
- Pure black (#000000) for anything — too harsh
- Blue/indigo (#6366F1) — not Grace's brand
- Cool grays — always warm (mauve-derived)
- Rose Gold (#C9956A) — was from the Hormozi audit, not the real brand guide

---

## 3. Typography

### Source: GH Brand Guide June 2025

| Role | Font | Weight | Size | Tracking | Notes |
|------|------|--------|------|----------|-------|
| **Display** | Playfair Display | 400 | 28px (1.75rem) | -0.02em | Greeting, result titles, celebratory moments |
| **Heading** | Glacial Indifference | 700 | 18px (1.125rem) | 0 | Page titles, section headings |
| **Body** | Glacial Indifference | 400 | 15px (0.9375rem) | 0.01em | All body text, form labels |
| **Label** | Glacial Indifference | 700 | 13px (0.8125rem) | 0.02em | Chips, small labels |
| **Caption** | Glacial Indifference | 400 | 12px (0.75rem) | 0.02em | Timestamps, meta |

### Key decisions
- **Playfair Display** — display/greeting font. Matches the brand guide exactly. Used for "Good morning, Grace" and result titles.
- **Glacial Indifference** — clean geometric sans-serif, replaces Inter. This is their actual brand body font. Slightly wider letterforms with a gentle, approachable feel.
- **Safira March** — script/decorative. Reserve for the logo only or very special branding moments. Not for UI.
- **Kill Fira Code and Inter entirely** — neither is part of the brand.
- **No ALL CAPS section labels** — feels institutional. Use sentence case.

### Font loading
```
Playfair Display: Google Fonts (already importing)
Glacial Indifference: Self-host (free font, not on Google Fonts)
Safira March: Self-host for logo usage only
```

### Type scale (mobile)
- Display: 24px (scaled down from 28px)
- Body: 15px (stays same)
- Touch labels: 14px minimum

---

## 4. Spacing

8px base grid. Generous on mobile — breathing room reduces anxiety.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Inline gaps, icon padding |
| `--space-sm` | 8px | Chip gaps, tight grouping |
| `--space-md` | 16px | Section padding, card padding |
| `--space-lg` | 24px | Between sections |
| `--space-xl` | 32px | Page padding desktop |
| `--space-2xl` | 48px | Major section breaks |

### Mobile page padding: 20px horizontal (not 16 — slightly more generous)
### Desktop max-width: 480px (not 520 — tighter for intimacy)

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Chips, small buttons |
| `--radius-md` | 12px | Cards, inputs, buttons |
| `--radius-lg` | 16px | Large cards, modals |
| `--radius-full` | 9999px | Pills, avatars |

**Everything is rounded.** No sharp corners. Grace's world is paper flowers and crafts — organic and soft.

---

## 6. Shadows

Warm-tinted shadows (not black). Rose gold undertone.

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(124, 79, 90, 0.06)` |
| `--shadow-md` | `0 4px 12px rgba(124, 79, 90, 0.08)` |
| `--shadow-lg` | `0 8px 24px rgba(124, 79, 90, 0.12)` |
| `--shadow-glow` | `0 0 20px rgba(201, 149, 106, 0.15)` |

---

## 7. Component Specs

### Button — Primary
- Background: `--mauve` (#A37A8D)
- Text: `#FFFFFF`
- Radius: `--radius-md` (12px)
- Padding: 14px 24px
- Font: Glacial Indifference 700, 15px
- Hover: darken 8% (#8E6A7A)
- Active: scale(0.98)
- Min touch target: 48px height
- **Never black.** Black buttons feel like a developer tool.

### Button — Secondary
- Background: transparent
- Border: 1px solid `--border`
- Text: `--text`
- Hover: background `--surface-hover`

### Button — Accent
- Background: `--blush` (#EDB6B1)
- Text: `--text` (#3D3539)
- For softer CTAs, less prominent actions

### Input / Textarea
- Background: `--surface`
- Border: 1px solid `--border`
- Focus: border `--border-strong`, box-shadow `0 0 0 3px var(--mauve-soft)`
- Radius: `--radius-md`
- Padding: 14px 16px
- Placeholder: `--text-dim`
- Font: Glacial Indifference 400, 15px

### Card
- Background: `--surface`
- Border: 1px solid `--border`
- Radius: `--radius-lg` (16px)
- Shadow: `--shadow-sm`
- Hover: shadow `--shadow-md`, border `--border-strong`
- Padding: 20px

### Chip (selectable)
- Default: background transparent, border `--border`, text `--text-muted`
- Hover: border `--mauve` at 40% opacity, text `--text`
- Active: background `--blush-soft`, border `--mauve`, text `--mauve`, font-weight 700
- Radius: `--radius-full`
- Padding: 10px 18px
- Min height: 44px (mobile touch target)

### Platform Card (in Create flow)
- Same as Card but:
- Active: border `--mauve`, background `var(--mauve-soft)`, left border 3px solid `--mauve`
- Contains: platform name (Glacial Indifference 700), one-line description (caption)

---

## 8. Navigation

### Mobile (primary — this IS the product)
- **Bottom tab bar:** 3 items only
  - Home (house or just text)
  - **Create** (center, emphasized — larger touch target, rose gold accent)
  - Library
- Settings accessible from profile avatar in Home header
- Calendar is a section within Home, not a separate tab
- **No sidebar on mobile.** Ever.

### Desktop (secondary)
- Left sidebar, 200px, always visible
- Text-only navigation (current approach is correct)
- Brand name at top: "Creative Studio" in Inter 700
- Nav items: Home, Create, Library, Calendar, Settings
- Active state: text color `--mauve`, font-weight 600, rose gold left border (2px)
- Hover: text color `--text`

---

## 9. Screen Layouts

### Home
```
┌─────────────────────────┐
│ Good morning, Grace      │  ← Playfair Display, 28px
│ Friday, March 20         │  ← Inter 400, 13px, --text-muted
│                          │
│ ┌─ Suggested ──────────┐ │
│ │ Share a paper flower  │ │  ← Suggestion card
│ │ tip • Reels          │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Weekend promo for     │ │
│ │ your course • FB Ad  │ │
│ └──────────────────────┘ │
│                          │
│ ┌── This week ─────────┐ │
│ │ 3 published · 2 draft │ │
│ └──────────────────────┘ │
│                          │
│  [  Create something  ]  │  ← Rose gold button, full width
│                          │
├─────────────────────────┤
│  Home    Create   Library │  ← Bottom tab bar
└─────────────────────────┘
```

### Create (step-by-step, one question at a time)
```
Step 1:
┌─────────────────────────┐
│ What's the goal?         │  ← Inter 500, 18px
│                          │
│ [Teach]  [Tell a story]  │  ← Chips, large touch
│ [Promote] [Show results] │
│ [Ride a trend] [Inspire] │
│                          │
│         [ Next → ]       │  ← Only appears after selection
└─────────────────────────┘

Step 2:
┌─────────────────────────┐
│ Where's it going?        │
│                          │
│ ┌── Reels / TikTok ───┐ │
│ │ Short video script    │ │  ← Platform cards
│ └──────────────────────┘ │
│ ┌── Instagram Post ───┐  │
│ │ Caption + hashtags   │ │
│ └──────────────────────┘ │
│ ┌── Facebook Ad ──────┐  │
│ │ Ad copy + image      │ │
│ └──────────────────────┘ │
│ ┌── YouTube ──────────┐  │
│ │ Full script          │ │
│ └──────────────────────┘ │
└─────────────────────────┘

Step 3 (optional):
┌─────────────────────────┐
│ Any specific idea?       │
│                          │
│ ┌──────────────────────┐ │
│ │ Type or leave blank   │ │  ← Textarea
│ └──────────────────────┘ │
│                          │
│ Or try one of these:     │
│ · Paper flower tutorial  │  ← Tappable suggestions
│ · Course sneak peek     │
│ · Behind-the-scenes     │
│                          │
│     [ ✨ Create ]        │  ← Rose gold, prominent
└─────────────────────────┘

Loading:
┌─────────────────────────┐
│                          │
│    Creating your Reels   │
│       script...          │
│                          │
│    ████████░░░░  65%     │  ← Animated progress
│                          │
│  Finding the best hooks  │  ← Rotating status messages
│  from your knowledge...  │
│                          │
└─────────────────────────┘

Result:
┌─────────────────────────┐
│ Your Reels Script ✨     │
│                          │
│ Hook: "Did you know you  │
│ can make ₱2,997 from     │
│ paper flowers?"          │
│                          │
│ Scene 1: ...             │
│ Scene 2: ...             │
│ Scene 3: ...             │
│                          │
│ [Copy text] [Try again]  │
│ [Save to Library]        │
└─────────────────────────┘
```

### Library
```
┌─────────────────────────┐
│ Library                  │  ← Inter 600, 18px
│ 25 creations             │
│                          │
│ ┌──────────────────────┐ │
│ │ 📱 Script · Mar 19   │ │
│ │ "Did you know you     │ │
│ │ can make..."          │ │
│ │ Reels · Published     │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 🎯 Ad · Mar 18       │ │
│ │ "Papers to Profits    │ │
│ │ — Limited..."         │ │
│ │ Facebook · Draft      │ │
│ └──────────────────────┘ │
└─────────────────────────┘
```

---

## 10. Motion / Interaction

| Action | Animation |
|--------|-----------|
| Page enter | fadeIn 250ms ease-out (translateY 6px) |
| Chip select | scale(0.96) → scale(1), background cross-fade 150ms |
| Button press | scale(0.98), 100ms |
| Card hover | shadow transition 150ms, border color 150ms |
| Step transition | slideLeft 200ms ease-out (Create flow) |
| Result reveal | fadeIn 300ms, staggered children (50ms delay each) |
| Loading progress | Linear animation, 15-45s estimated |
| Copy confirmation | checkmark fade-in 200ms, auto-dismiss 2s |

All animations respect `prefers-reduced-motion`.

---

## 11. Accessibility

- **Touch targets:** 44px minimum height on all interactive elements
- **Color contrast:** Charcoal (#3A3535) on Cream (#FAF6F1) = 10.5:1 ✓ AAA
- **Rose Gold (#C9956A) on white:** 3.3:1 — fails AA for text. Use on buttons with white text (white on rose gold = 3.7:1, passes AA Large). For small text, use Mauve (#7C4F5A) = 6.2:1 ✓ AA
- **Focus visible:** 2px rose gold outline with 2px offset
- **Screen reader:** aria-labels on all chips, live regions for generation status
- **Dynamic type:** All text in rem, scales with browser font size
- **Reduced motion:** All animations gated behind `@media (prefers-reduced-motion: no-preference)`

---

## 12. What This Means for Implementation

Before writing ANY code:
1. Rob approves this spec (or modifies it)
2. Update `globals.css` with new tokens
3. Create component CSS modules that reference tokens
4. Build screens in order: Home → Create → Library
5. Test on mobile FIRST (390px), then desktop

**Total implementation estimate:** 4-6 hours if approved now.

---

## Open Questions for Rob

1. **Playfair Display for greeting** — or should everything stay Inter? (I think the serif adds warmth but it's a subjective call)
2. **3-tab mobile nav vs 5-tab?** — I recommend 3 (Home, Create, Library) with Settings in a corner. Less is more on a 390px screen.
3. **Step-by-step Create vs all-on-one-page?** — Steps feel more guided but add taps. All-on-one-page is faster but more overwhelming. I recommend steps.
4. **Should the app theme dynamically use Grace's brand colors?** — If we're selling this to other creators, each person's app should look like THEIR brand. This is a huge differentiator but adds complexity.
