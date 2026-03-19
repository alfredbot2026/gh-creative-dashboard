# DESIGN-SPEC.md — Creative Studio Visual Language

> Based on 2026 Awwwards SOTD patterns, Webby winners, and SaaSUI design trends analysis.
> Target user: Grace — Filipino mompreneur, zero tech background, uses phone + laptop.

## Design Philosophy: "Calm Creative"

**Reference products:** Linear (calm focus), Duna (warm serenity), Attio (bold typography), Notion (simplicity), Calendly (zero-clutter workflows)

**Core principle:** The tool should feel like opening a beautiful notebook, not an airplane cockpit.

---

## 1. Color System (Warm, Not Tech)

Current: Cold tech blue (`--color-primary: #3b82f6`) — feels like a dev tool.

**New palette — "Warm Indigo":**
```css
--color-primary: #6366f1;        /* Indigo-500 — warmer than blue */
--color-primary-soft: rgba(99, 102, 241, 0.08);
--color-bg: #0f0f12;             /* Near-black with warm undertone */
--color-surface: #18181f;        /* Slightly elevated */
--color-surface-hover: #1f1f28;  /* Subtle lift on hover */
--color-border: rgba(255,255,255,0.06); /* Ultra-subtle borders */
--color-text: #f0f0f3;           /* Warm white */
--color-text-muted: #71717a;     /* Zinc-500 */
--color-text-dim: #52525b;       /* Zinc-600 — for hints/captions */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--radius-lg: 12px;               /* Friendlier corners */
--radius-md: 8px;
--radius-sm: 6px;
```

## 2. Typography Scale

**Problem:** Headers, labels, and body text are too close in size. Flat hierarchy.

**New scale:**
```
Page title:    1.5rem / 700 / -0.02em tracking    (one per page)
Section head:  0.6875rem / 600 / uppercase / 0.06em tracking / muted color
Card title:    0.9375rem / 600 / normal
Body:          0.8125rem / 400 / 1.6 line-height
Label:         0.75rem / 500 / muted color
Caption:       0.6875rem / 400 / dim color
```

## 3. Spacing Scale

**Generous whitespace. Let things breathe.**
```
Page padding:    2rem (desktop) / 1rem (mobile)
Section gap:     1.5rem
Card padding:    1.25rem
Form field gap:  0.75rem
Inline gap:      0.5rem
```

## 4. Component Patterns

### Generator Pages (Create → Ads, Scripts, Social, YouTube)

**Current:** 3 dense panels side by side. Settings | Results | Knowledge.

**New:** 2-panel layout with progressive disclosure.
- **Left:** Clean settings panel — only show what's needed NOW
  - Product dropdown visible by default
  - Topic/idea input visible
  - Purpose picker visible (optional, clear it's optional)
  - "Advanced" accordion for: objective, format, platform, style mode
  - Big CTA button: "✨ Create" (not "Generate Ad Variants")
- **Right:** Full-width results area
  - Knowledge Used → collapsed into a small "📚 5 sources used" badge
  - Actions → floating bottom bar (not sidebar)

### Empty States

**Current:** Dashed border box with generic text.

**New:** Centered, soft, encouraging.
```
[sparkle icon, 48px, 0.2 opacity]
"Ready when you are"
"Pick a product and hit Create — we'll handle the rest."
```

### Buttons

**Primary CTA:** Full-width, 48px height, 600 weight, rounded-lg
**Secondary:** Ghost style, 1px border, hover → subtle fill
**Chips (purpose picker):** Pill shape, 32px height, soft background on select

### Cards (Generated results)

**Current:** Dense blocks with inline metadata.

**New:**
- 16px padding, 12px radius
- Subtle left border accent (framework color)
- Title → body → meta footer (model, score as subtle badge)
- Image preview floats right if generated
- Actions (copy, regenerate) appear on hover, not always visible

## 5. Sidebar (Already Updated)

✅ Grouped nav with collapsible sections
- Consider: bottom tab bar on mobile with 4 icons only (Home, Create, Calendar, Settings)

## 6. Micro-interactions

- Button press: scale(0.98) for 100ms
- Panel transitions: opacity 0→1 over 200ms
- Chip selection: background-color transition 150ms
- Loading: pulse animation on CTA button, not a spinner replacing the whole UI

## 7. Mobile Considerations

- Stack everything vertically
- Bottom sticky CTA bar on generator pages
- Swipeable result cards
- Hide sidebar → bottom tab bar (4 icons max)

---

## Implementation Priority

1. **globals.css** — Update color system, typography scale, spacing
2. **layout.module.css** — 2-panel responsive grid, progressive disclosure
3. **Generator pages** — Simplify settings, "Advanced" accordion, better CTAs
4. **Empty states** — Soft, encouraging, on-brand
5. **Result cards** — Cleaner hierarchy, hover actions
6. **Mobile** — Bottom tab, sticky CTA, stacked layout
