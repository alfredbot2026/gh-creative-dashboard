# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Mission Control
**Generated:** 2026-03-09
**Category:** Ad Analytics Dashboard
**Theme:** Dark Mode (OLED)

---

## Global Rules

### Color Palette (Dark Theme)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background (base) | `#0A0E17` | `--color-bg` |
| Background (surface) | `#111827` | `--color-surface` |
| Background (elevated) | `#1F2937` | `--color-elevated` |
| Border | `#374151` | `--color-border` |
| Text (primary) | `#F9FAFB` | `--color-text` |
| Text (muted) | `#9CA3AF` | `--color-text-muted` |
| Primary (blue) | `#3B82F6` | `--color-primary` |
| Primary hover | `#60A5FA` | `--color-primary-hover` |
| CTA/Accent (orange) | `#F97316` | `--color-cta` |
| Success (green) | `#22C55E` | `--color-success` |
| Warning (amber) | `#F59E0B` | `--color-warning` |
| Danger (red) | `#EF4444` | `--color-danger` |

**Semantic Status:**
- Scale = `--color-success` (#22C55E)
- Monitor = `--color-warning` (#F59E0B)
- Kill = `--color-danger` (#EF4444)
- Pause = `--color-text-muted` (#9CA3AF)

**Content Type Colors:**
- Reels = `#06B6D4` (cyan)
- YouTube = `#EF4444` (red)
- Ads = `#3B82F6` (blue)

### Typography

- **Heading Font:** Fira Code
- **Body Font:** Inter
- **Mood:** mission control, data, analytics, technical, precise
- **Google Fonts:** `Inter:wght@300;400;500;600;700` + `Fira+Code:wght@400;500;600;700`

### Spacing (8pt Grid)

| Token | Value |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |
| `--space-2xl` | `48px` |

### Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `6px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |

### Shadows (Dark Mode)

| Level | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` |

---

## Anti-Patterns (Do NOT Use)

- ❌ Light mode default
- ❌ Purple/violet colors (Purple Ban)
- ❌ Emojis as UI icons — use Lucide SVG icons
- ❌ Missing `cursor: pointer` on clickable elements
- ❌ Layout-shifting hover transforms
- ❌ Low contrast text (< 4.5:1 ratio)
- ❌ Instant state changes — always use transitions (150–300ms)
- ❌ Mesh/Aurora gradient blobs
- ❌ Generic SaaS template layouts
