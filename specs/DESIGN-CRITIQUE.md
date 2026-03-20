# Design Critique — GH Creative Studio
**Evaluator:** Design Director perspective (Apple HIG + Nielsen Heuristics)
**Date:** 2026-03-20
**Persona:** Grace — Filipino mompreneur, non-technical, mobile-heavy, paper crafting business
**Product:** AI content creation tool for social media

---

## Nielsen's 10 Heuristics Evaluation

### 1. Visibility of System Status — 2/5
**Problem:** No loading skeletons, no progress indicators during generation, no feedback when chips/platforms are selected beyond a border change. Grace has no idea if the AI is "thinking" or if her tap registered.
**Example:** Tapping "Teach something" only changes a border color — no haptic, no animation, no confirmation. During generation, just "Creating..." text — no progress bar, no elapsed time, no sense of how long to wait.

### 2. Match Between System and Real World — 3/5  
**Problem:** "What do you want to create?" is developer language. Grace thinks: "I need to post something today." The purpose chips are good ("Teach something", "Share a story") — those match her mental model. But "Where is this going?" followed by platform cards is still too structured.
**What Grace actually says:** "I need a Reels para sa course ko" or "Magandang post para sa weekend."

### 3. User Control and Freedom — 2/5
**Problem:** No undo, no back button, no way to save a draft. If generation fails, the error sits there — no retry button is obvious. No way to edit a generated result — it's read-only. No "I don't like this, try again with different approach."

### 4. Consistency and Standards — 3/5
**Problem:** The monospace font (Fira Code) on the greeting feels like a code editor, not a creative tool. Mixed font weights — the page title is 400 but section labels are 600 uppercase with letter-spacing. The black "Create" button is the only element using black-on-white; everything else uses border-based styling. The suggestion cards on Home use emoji icons (📱🎯) while the Create page uses no icons at all — inconsistent language.

### 5. Error Prevention — 2/5
**Problem:** Nothing prevents Grace from hitting "Create" with no purpose, no platform context, and no idea — what happens then? Does the AI hallucinate? Is there a default? The "optional" label on the idea field is vague — Grace might think she HAS to fill it or she might skip the purpose entirely. No validation feedback.

### 6. Recognition Over Recall — 4/5
**Good:** Purpose chips are visible (don't need to remember categories). Platform descriptions help. Suggestion cards on Home show previous topics.
**Problem:** Generated results disappear on page refresh — no way to recall them. No recent history. Library is separate and doesn't feel connected.

### 7. Flexibility and Efficiency — 2/5
**Problem:** Only one path to create: Home → Create → fill form → generate. No shortcuts. Power users can't skip steps. No keyboard shortcuts. No "create another like this." No templates.

### 8. Aesthetic and Minimalist Design — 3/5
**Good:** The text-only sidebar is clean. The overall layout is sparse.
**Problem:** It's sparse in a way that feels EMPTY, not intentional. The Home page is 70% whitespace with no clear visual center. The suggestion cards look like wireframes, not a finished product. No visual warmth, no brand personality, no delight. It could be any SaaS app. Where is Grace's brand? Where are her colors (Cream White, Rose Gold, Soft Blush Pink)?

### 9. Help Users Recognize and Recover from Errors — 1/5
**Problem:** Error states are a red box with text. No recovery guidance, no "try this instead", no fallback behavior. If Gemini is down (503), Grace sees a technical error. No offline handling. No empty state education.

### 10. Help and Documentation — 1/5
**Problem:** No onboarding flow for the create page. No tooltips. No "how does this work?" No first-run experience. Grace is dropped into a form with 6 purpose chips and 4 platform cards with zero context about what the AI will actually do.

---

## Overall Heuristic Score: 23/50 — Needs significant improvement

---

## Visual Hierarchy Assessment

### Current Problems
1. **No focal point.** The Home page has a greeting, two suggestion cards, and a button — all equal weight. Nothing draws the eye. The greeting is the largest element but it's not actionable.

2. **Typography is flat.** Everything is 0.8125rem body text. The greeting is larger but uses the same font-family. No typographic rhythm — no contrast between display text, body text, and labels.

3. **Color is absent.** The page is white, gray borders, black text, and one black button. Grace's brand has 7 beautiful colors (Rose Gold #C9956A, Soft Blush Pink #F2D0C8, Deep Mauve #7C4F5A). None of them appear. The app has no personality.

4. **Spacing is uniform.** Everything is 2rem apart. No rhythm, no grouping. The suggestion cards float with identical spacing to everything else.

5. **The sidebar is invisible.** The text-only nav is so minimal it feels unfinished. It lacks presence without being intentionally absent (like Linear's sidebar which uses color and weight to create hierarchy even in minimal mode).

---

## Typography Assessment

**Current:** Inter 400/500/600 body, Fira Code for headings.
**Problem:** Fira Code (monospace) for a creative tool is wrong. Monospace conveys "code" not "creativity." The greeting "Good morning, Graceful" in monospace feels cold and technical.

**Recommendation:** 
- **Display:** Inter or a display serif (Playfair Display, Libre Baskerville) for greeting/titles — conveys warmth and creativity
- **Body:** Inter stays — it's excellent for UI
- **Kill monospace entirely** — this isn't a developer tool

---

## Color Assessment

**Current:** White bg, gray borders, black text, one black button. Zero brand color.
**Problem:** Grace spent time defining her brand colors. None appear in the tool she uses every day. The app feels generic and institutional.

**Recommendation:**
- Use Grace's Rose Gold (#C9956A) as the primary accent (not indigo — this isn't a dev tool)
- Warm the background: #FDFCFA instead of #FAFAFA (cream undertone)
- Use Soft Blush Pink (#F2D0C8) for hover/active states
- Deep Mauve (#7C4F5A) for important text/buttons
- Reserve black for text only, never for buttons

---

## Strategic Alignment Assessment

**The core problem:** This app looks like it was designed by engineers for engineers. Grace is a creative, a mom, a paper crafter. She thinks in color, texture, and warmth. The app gives her gray borders and monospace fonts.

**What's missing:**
1. **Personality.** The app should feel like opening a favorite notebook, not logging into a SaaS dashboard.
2. **Confidence.** Grace should feel guided, not presented with a form. "What do you want to create?" is a test question. It should feel like a conversation.
3. **Delight.** No micro-interactions, no transitions that feel alive, no moments of surprise.
4. **Grace's brand.** Her colors, her photography style, her tone of voice should permeate the tool. It should feel like HER studio, not a generic template.

---

## WCAG / Accessibility Assessment

1. **Color contrast:** Gray text (#6b7280) on white (#fafafa) = 4.6:1 — barely passes AA for normal text, fails for small text
2. **Touch targets:** Purpose chips are ~34px tall — below the 44px minimum for mobile (WCAG 2.5.5)
3. **Focus indicators:** Using default browser focus — not tested with keyboard navigation
4. **Screen reader:** No aria-labels on chips, no live regions for generation status
5. **Motion:** fadeIn animation has no prefers-reduced-motion check

---

## Prioritized Fixes

### 🔴 Critical (Must fix before user testing)
1. **Loading/generation feedback** — skeleton → progress → result animation
2. **Touch targets on mobile** — minimum 44px for all interactive elements  
3. **First-run experience** — Grace needs to understand what happens when she taps "Create"
4. **Error recovery** — friendly messages with suggested actions, not raw errors
5. **The greeting should show her name** — "Good morning, Grace" not "Good morning, Graceful" (that's the business name)

### 🟡 Important (Before selling to others)
6. **Brand color integration** — use Grace's palette, not generic white/gray/black
7. **Kill monospace font** — use Inter or a display serif for personality
8. **Connected Library** — results should save to library automatically with a visible "Saved" confirmation
9. **Warm the background** — cream undertone instead of cold gray-white
10. **Conversational flow** — remove labels, make it feel like a chat not a form

### 🔵 Polish (Delightful details)
11. **Micro-interactions** — chip selection animation, button press feedback, result reveal
12. **Empty state illustrations** — not just text, custom illustrations that match Grace's craft world
13. **Sound design** — subtle audio feedback on generation complete (optional)
14. **Gradient touches** — Rose Gold to Blush Pink gradients on key elements
15. **"Inspiration" section** — show trending content in her niche (paper crafting PH)

---

## Redesign Direction A: "Grace's Studio"

**Concept:** The app IS Grace's creative studio. Her brand colors permeate everything. The background uses her Cream White (#FAF6F1). Accent in Rose Gold (#C9956A). Cards float on Soft Blush Pink (#F2D0C8). The greeting uses a warm serif font. The Create flow is a CONVERSATION — one question at a time, full-screen, with large tap targets. Results appear like a beautifully formatted card she can screenshot and share directly.

**Key interaction:** Instead of showing all options at once, the Create page asks ONE question at a time:
1. "What's on your mind today?" (optional text or pick from suggestions)
2. "Where should this go?" (large platform buttons with icons)
3. "Creating your content..." (beautiful loading with her brand colors)
4. Result card — ready to copy/share

**Navigation:** Bottom tab only (no sidebar). 3 tabs: Home, Create (+), Library. Settings is a profile icon in the corner.

**Personality tokens:** Rounded corners (16px+), soft shadows, warm color palette, serif display font, generous padding.

---

## Redesign Direction B: "The Typewriter"

**Concept:** Ultra-minimal, text-forward, monochrome with ONE accent color (Rose Gold). Inspired by iA Writer, Bear Notes, and Hemingway Editor. The app is essentially a blank page where Grace types or dictates what she wants to say, and the AI formats it for the right platform. No chips, no platform selection upfront — the AI detects intent.

**Key interaction:** A single large text input fills the screen. Grace types "I want to show how to make paper flowers" or speaks it. The AI responds: "Here's a Reels script, an Instagram caption, and a Facebook ad — all ready." Three tabs of output, each formatted for its platform. One tap to copy.

**Navigation:** None visible. Swipe or tap to access Library (left) and Settings (right). The entire screen is the creative canvas.

**Personality tokens:** System font (SF Pro/Inter), pure white background, Rose Gold accent on interactive elements only, zero decoration, maximum content density.

---

## Recommendation

**Direction A ("Grace's Studio")** is better for THIS user. Grace is not a minimalist power user — she's a creative who responds to color, warmth, and guidance. Direction B is intellectually appealing but would feel cold and intimidating to a non-technical user. Grace needs the app to feel like her, not like a text editor.

The single most impactful change we can make RIGHT NOW: **use her brand colors as the app theme.** This alone will transform the feeling from "generic SaaS" to "my creative tool."
