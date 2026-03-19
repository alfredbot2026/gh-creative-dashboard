# Product Vision V2 — GH Creative Dashboard
## "AI Content Engine for Filipino Social Commerce Creators"

> Draft: 2026-03-19 | Author: Dr. Strange | Status: BRAINSTORM → RED TEAM

---

## 1. Market Context

**Philippines Social Commerce:** $28.4B (2025), projected $88.7B by 2033 (260% growth)
**PH E-commerce:** $17.6B (2025) → $37.9B by 2031 (13.6% CAGR)
**Key trend:** Licensed teachers and mothers turning to social media platforms for selling products — microentrepreneurs who need content but can't afford agencies.

**Target user:** Grace = Filipino mompreneur/solopreneur who:
- Sells physical products (paper crafts, skincare, food, etc.) on FB/IG/TikTok
- Has 0-2 years business experience
- Budget: ₱500-2,000/mo for tools (NOT ₱5k+ for agencies)
- Speaks Taglish, creates content on mobile, manages everything solo
- Biggest pain: "I know I need to post content but I don't know what to make"

---

## 2. Competitive Landscape

| Tool | What it does | Strengths | Weaknesses for our market |
|------|-------------|-----------|--------------------------|
| **Kong** (getkong.ai) | AI ad copy from $200M ad spend data | Proven frameworks, ROAS guarantee, 155 templates | English-only, US/AU focused, $297/mo, no Filipino voice, no content strategy |
| **AdCreative.ai** | AI ad images + copy, BrandKit | Beautiful output, multi-format, A/B testing, big template library | $29-149/mo, generic templates, no cultural context, no content planning |
| **Predis.ai** | Social media post gen + scheduling | End-to-end (create → schedule → analyze), mobile app | Generic, no deep brand voice, no knowledge base, no learning loop |
| **Canva** | Design tool + templates | Massive template library, free tier, mobile-friendly | Not AI-driven, no copy generation, no strategy, manual work |
| **ChatGPT/Claude** | General AI | Cheap/free, flexible | No brand memory, no visual output, no templates, starts from zero every time |

### Our Unique Position
None of these tools have:
1. **Knowledge Base that learns** — curated techniques extracted from research, scored by actual performance
2. **Cultural + language awareness** — Taglish voice scoring, Filipino pricing psychology, local references
3. **Full content pipeline** — from strategy (what to post) → creation (copy + images) → learning (what worked)
4. **Brand character system** — not just colors/fonts, but a persona with a voice, story, and visual identity

---

## 3. Product Architecture — "The Content Engine"

### 3a. Brand Setup (the foundation everything builds on)

**Current state:** Settings page with Business Profile + Brand Style Guide tabs. Functional but raw — form fields, no guidance, no preview.

**Proposed: Two-track onboarding**

#### Track A — "I have a brand" (Grace's path)
Guided setup wizard:
1. **Brand basics** — Name, what you sell, who you sell to
2. **Visual identity** — Upload logo/colors OR pick from curated palettes (Rose Gold Minimalist, Bold Tropical, Clean Professional, etc.)
3. **Font pairing** — 3-5 curated pairs per palette (with preview)
4. **Brand character** — Name, description, photo/avatar, backstory snippet
5. **Voice setup** — Pick from voice presets (Ate Energy, Professional Mommy, Bestie Vibes, Hustle Queen) → auto-configures tone descriptors, Taglish ratio, vocabulary, example phrases
6. **Test drive** — Generate one sample post. "Does this sound like you?" → tweak → save

#### Track B — "Help me create a brand" (new creator path)
AI-assisted brand generation:
1. **What do you sell?** → "Paper crafting supplies and tutorials"
2. **Who's your customer?** → Picks from archetypes OR describes
3. **What vibe?** → Mood board selection (5-6 visual mood boards)
4. AI generates: brand name suggestions, color palette, voice profile, sample taglines
5. User picks/tweaks → saves as their brand guide
6. **Test drive** — same as Track A

### 3b. Content Strategy Layer (the "what to post" problem)

**Current state:** User must know what topic/angle to use. No guidance on content mix, funnel position, or posting cadence.

**Proposed: Content Planner**

**Content Purpose Picker** (replaces bare "topic" input):
| Purpose | KB Categories Used | Output Optimized For |
|---------|-------------------|---------------------|
| 📚 Educate | hook_library, scripting_framework, virality_science | Teaching, authority building |
| 📖 Story | hook_library, brand_identity | Founder narrative, relatability |
| 🎯 Sell | ad_creative, cro_patterns, content_funnel (BOFU) | Conversions, urgency |
| 🤝 Prove | virality_science (social proof), competitor_intel | Testimonials, results |
| 🔥 Trend | platform_intelligence, virality_science | Timeliness, reach |
| 💡 Inspire | content_funnel (TOFU), brand_identity | Awareness, shares |

**Technique Surfacing** — After picking purpose, show the user:
- "Best hooks for Educational content: [Iceberg Effect ⭐0.85] [Comparison Hook ⭐0.78] [Data Shock ⭐0.72]"
- User clicks one → it's locked in as the primary technique
- AI follows that specific technique, not random selection

**Content Calendar Suggestions:**
- "This week you've posted 3 Educational, 0 Stories, 0 Sales → suggest: Founder Story or Sales post"
- Based on optimal content mix ratios from KB (e.g., 70/20/10 rule)

### 3c. Creation Engine (the "how to make it" layer)

**Current state:** Short-form scripts, ad copy (static + carousel), image generation. All functional.

**Proposed additions:**

#### Quality / Aesthetic Toggle
| Style | Visual Treatment | Best For | Image Prompt Modifier |
|-------|-----------------|----------|----------------------|
| **Polished** | Clean, branded, studio look | Sales, Brand Awareness | Current default |
| **UGC-style** | Phone-shot aesthetic, casual, authentic | TOFU, Engagement | "shot on iPhone, natural lighting, casual selfie style, slightly imperfect framing" |
| **Raw/Screenshot** | Text-heavy, reaction-style, meme-adjacent | Trending, Social Proof | "screenshot aesthetic, text overlay, raw phone capture" |
| **Editorial** | Magazine-quality, aspirational | Premium products, Brand building | "editorial photography, studio lighting, magazine layout" |

Research shows UGC-style outperforms polished by 38% on Meta for interactions. Different funnel stages need different aesthetics.

#### Template System (the flywheel)
1. **Save as Template** — Any generated output can be saved as a template
2. **Template = structure + slots** — Same hook pattern, narrative arc, visual style; swap product/offer/price
3. **Auto-template from winners** — Learning loop identifies top performers → suggests "Save this as a template?"
4. **Community templates** (future) — Share/sell templates between users
5. **Quick Generate** — Pick a template → fill 2-3 fields → done in 30 seconds

#### Format Matrix
| Content Type | Formats Available | Current | Proposed |
|-------------|-------------------|---------|----------|
| Short-form script | Reel/TikTok/Shorts | ✅ | Add: voiceover audio export |
| Ad copy | Static, Video Script, Carousel | ✅ | Add: quality toggle per format |
| YouTube | Long-form script, thumbnail | ⏳ Phase 3 | — |
| Social post | — | ❌ | Caption + image for FB/IG feed |
| Story/Ephemeral | — | ❌ | 3-5 slide story sequence |

### 3d. Learning Engine (the "what works" feedback loop)

**Current state:** Migration 009 ready. Learning API built. Tracks framework performance, adjusts KB scores.

**Proposed expansion:**

1. **Manual feedback** — After using generated content, Grace marks: "Used it ✅" "Edited it ✏️" "Skipped it ❌"
2. **Performance import** — Connect Meta Ads account → auto-import ROAS, CTR, CPM per ad
3. **Insight dashboard** — "Your best-performing content type is Educational + Iceberg Effect hook on Instagram Reels"
4. **KB auto-tuning** — Top performers boost KB entry scores. Bottom performers demoted. Self-improving system.
5. **Template promotion** — Content that performs 2x above baseline → auto-suggested as template

---

## 4. User Journey (Grace's typical week)

### Monday — Planning
1. Opens dashboard → sees content calendar with suggested mix
2. "You haven't posted a Founder Story in 8 days" → clicks "Create Story"
3. Picks technique: "Time-Lapse Hook" (⭐ her top performer)
4. Generates 3 script variants → picks one → generates UGC-style image
5. Schedules for Tuesday 7pm (peak engagement time from platform intelligence)

### Wednesday — Ad Creation
1. New product launch → "Create Ad" → Carousel → 5 slides
2. Picks "Product Showcase" style, "Polished" aesthetic
3. Generates copy + images → tweaks slide 3 headline → downloads
4. Uploads to Meta Ads Manager

### Friday — Learning
1. Checks Ad Performance page → Tuesday's reel got 2.3x avg engagement
2. System suggests: "Save 'Time-Lapse + Iceberg' as a template?"
3. Grace clicks "Save" → it's now a reusable template
4. KB automatically boosts "Time-Lapse Hook" effectiveness score

### Saturday — Quick Content
1. Sees trending topic in her niche
2. Opens "Quick Generate" → picks trending template → fills in topic
3. 30 seconds → post ready → publishes directly

---

## 5. Technical Architecture Changes

### New DB tables needed:
- `brand_personas` — character name, backstory, avatar_url, voice_preset_id
- `voice_presets` — pre-built voice configurations (Ate Energy, Professional Mommy, etc.)
- `content_templates` — saved winning formats with slot definitions
- `content_calendar` — planned posts with suggested mix tracking
- `content_feedback` — manual feedback (used/edited/skipped) per generated item
- `meta_ads_connection` — OAuth token for Meta Ads API import

### New API routes:
- `POST /api/brand/onboard` — guided brand setup
- `POST /api/brand/generate` — AI brand creation (Track B)
- `GET /api/calendar/suggest` — content mix recommendations
- `POST /api/templates/save` — save generated content as template
- `POST /api/templates/generate` — generate from template
- `POST /api/meta/connect` — Meta Ads OAuth flow
- `GET /api/meta/import` — import ad performance data

### Prompt changes:
- Content purpose → technique selection feeds into all generation prompts
- Quality/aesthetic toggle modifies image prompts
- Template slots become constrained generation (fill X, keep Y fixed)

---

## 6. Pricing Model (if selling)

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | ₱0 | 5 generations/mo, 1 brand, no templates, no learning |
| **Starter** | ₱499/mo (~$9) | 50 generations/mo, 1 brand, 5 templates, basic learning |
| **Pro** | ₱1,499/mo (~$27) | Unlimited generations, 3 brands, unlimited templates, full learning, Meta Ads import |
| **Agency** | ₱4,999/mo (~$90) | 10 brands, team access, white-label, API access |

**Comparable pricing:** AdCreative.ai = $29-149/mo, Kong = $297/mo. We're 3-10x cheaper, culture-specific.

---

## 7. Phasing

| Phase | What | Dependencies | Est. Effort |
|-------|------|-------------|-------------|
| **3** | YouTube scripts + Content Purpose picker + Technique surfacing | None (KB data exists) | 1 week |
| **4a** | Brand Onboarding Track A (guided setup wizard) | None | 3-4 days |
| **4b** | Quality/aesthetic toggle (UGC, polished, raw, editorial) | None | 2 days |
| **5** | Template system (save, reuse, auto-promote) | Learning loop (done) | 1 week |
| **6** | Content Calendar + mix suggestions | Template system | 3-4 days |
| **7** | Brand Onboarding Track B (AI brand generation) | Track A | 3-4 days |
| **8** | Meta Ads import + auto-learning | Meta API OAuth | 1 week |
| **9** | Social post format (FB/IG feed captions + images) | Quality toggle | 2-3 days |
| **10** | Story format (ephemeral sequences) | Social post format | 2-3 days |
| **11** | Multi-tenancy + auth + billing (SaaS readiness) | All above | 2 weeks |

---

# RED TEAM REVIEW

## Challenge 1: "Are we building a feature factory or a product?"

**Concern:** The vision has ~15 major features across 11 phases. That's 2-3 months of work. By the time we ship, the market may have moved.

**Counter-argument:** Not all phases are equal. Phase 3-4 alone (Purpose picker + Brand onboarding + Quality toggle) makes this dramatically better than ChatGPT for the target user. That's 1.5 weeks of work, not 3 months.

**Verdict:** ⚠️ VALID. We should define an **MVP for selling** = Phases 3 + 4a + 4b + 5. Everything else is growth.

## Challenge 2: "Is the Knowledge Base actually good enough?"

**Concern:** The KB was extracted from NotebookLM research. It's Grace's research, not $200M in ad spend data like Kong. Is it actually better than what ChatGPT knows natively?

**Counter-argument:** Kong's data is generic (US/AU market). Our KB has:
- Filipino-specific hooks and language patterns
- Taglish voice scoring (no competitor has this)
- Cultural context (mompreneur community, PH pricing psychology)
- Performance scoring that improves over time

**But the real question is:** How many entries are actually in the KB right now? If it's 20 entries, that's thin. If it's 200+, that's a real moat.

**Verdict:** ⚠️ MUST VERIFY. Need to audit KB entry count + quality before selling. If thin, Grace needs to extract more from her research.

## Challenge 3: "Brand onboarding is hard to get right"

**Concern:** Guided wizards sound great but often create friction. Users might prefer a simple form they can fill out quickly over a 6-step wizard.

**Counter-argument:** The target user (mom with limited time) needs guidance more than power. A blank form is intimidating. Voice presets ("Pick: Ate Energy or Professional Mommy") are faster than configuring tone descriptors manually.

**Verdict:** ✅ PROCEED but make the wizard skippable. Power users can go straight to the raw form (which already exists).

## Challenge 4: "UGC-style images from AI look fake"

**Concern:** AI-generated "UGC-style" images will look like AI trying to look casual. Real UGC means real photos. The uncanny valley of fake-authentic could hurt trust.

**Counter-argument:** True for product photos. Less true for text-overlay graphics, comparison charts, and data visualizations. Also, the UGC toggle should primarily affect *copy tone and layout*, not just images.

**Better approach:** UGC toggle should mean:
- Copy: more casual, first-person, imperfect grammar OK
- Layout: text-heavy, less white space, reaction-style
- Images: optional (encourage using own photos), but if generating → phone-camera aesthetic
- The REAL win is a "upload your own photo, we add the text overlay and copy" feature

**Verdict:** ⚠️ PIVOT. UGC quality toggle should focus on copy + layout, not AI-generated "fake casual" photos. Add an **"Upload your own photo"** option alongside AI generation.

## Challenge 5: "Templates might kill creativity"

**Concern:** If every post follows a template, the feed becomes repetitive. Algorithm penalizes repetitive content.

**Counter-argument:** Templates define structure, not exact content. "Use Iceberg Effect hook + educational body + soft CTA" is a template — but the actual words, topic, and images change every time. Kong's entire business model is templates + $200M in data.

**Verdict:** ✅ PROCEED. Templates define technique, not words. Add a "freshness score" — warn if a template has been used 3x in the last week.

## Challenge 6: "Meta Ads import is a huge scope creep"

**Concern:** OAuth with Meta Business API is notoriously painful (app review, permissions, token management). This could take 2 weeks alone and isn't needed for content creation.

**Counter-argument:** The learning loop can work with manual feedback first (used/edited/skipped). Meta import is a growth feature, not MVP.

**Verdict:** ✅ DEFER. Phase 8 is correct placement. Manual feedback (Phase 5) is sufficient for learning loop MVP.

## Challenge 7: "We're not addressing distribution"

**Concern:** We create content, but don't help post it. Predis.ai has scheduling built in. Our user still has to manually copy-paste to FB/IG.

**Counter-argument:** V1 doesn't need scheduling. The user is already on their phone posting. "Copy All Text" + "Download Images" → paste into FB app is fine for MVP. Scheduling is Phase 10+ and there are good free tools (Later, Buffer free tier).

**Verdict:** ✅ DEFER. Distribution is important but not differentiating. Content quality is.

## Challenge 8: "Is ₱499/mo too expensive for a mompreneur?"

**Concern:** Target user has ₱500-2,000/mo tool budget. ₱499 is at the floor of that range. Canva Free exists. ChatGPT free tier exists.

**Counter-argument:** ₱499 = cost of 2 milk teas. If it saves 10+ hours/month of content creation, that's ₱50/hour value. The real comparison is: ₱499/mo vs hiring a VA (₱5,000+/mo) or an agency (₱15,000+/mo).

**Better approach:** Generous free tier (10 generations/mo) that's genuinely useful. Starter at ₱299/mo. Pro at ₱999/mo.

**Verdict:** ⚠️ ADJUST PRICING. Lower the floor. Free tier must be useful enough to create habit.

---

## RED TEAM SUMMARY

| # | Challenge | Severity | Action |
|---|-----------|----------|--------|
| 1 | Feature factory risk | ⚠️ HIGH | Define MVP = Phase 3+4a+4b+5. Ship that first. |
| 2 | KB quality unknown | ⚠️ HIGH | Audit KB entry count + coverage before selling |
| 3 | Wizard friction | ⚠️ LOW | Make wizard skippable, keep raw form as fallback |
| 4 | Fake UGC images | ⚠️ MED | Pivot: UGC = copy+layout, not fake photos. Add "upload your own" |
| 5 | Template repetition | ✅ LOW | Add freshness score warning |
| 6 | Meta Ads scope | ✅ LOW | Correctly deferred to Phase 8 |
| 7 | No distribution | ✅ LOW | Correctly deferred, not differentiating |
| 8 | Pricing too high | ⚠️ MED | Lower free tier to 10 gens, Starter to ₱299 |

### Top 3 Changes from Red Team:
1. **MVP scope = Phase 3 + 4a + 4b + 5** — that's the sellable product
2. **UGC toggle = copy tone + layout + "upload your own photo"** — not AI-generated fake casual
3. **Audit KB before selling** — we need 100+ quality entries across all categories to have a real moat

---

## OPEN QUESTIONS FOR ROB

1. How many KB entries does Grace currently have? Is she willing to do more NotebookLM extraction sessions?
2. Track B (AI brand generation) — is this a real need from Grace's community, or speculative?
3. Pricing: ₱299 or ₱499 for Starter? What do Grace's peers pay for tools currently?
4. Is Grace willing to be the beta tester for the onboarding wizard?
5. Should we build for mobile-first? (Likely yes if target is mompreneurs on phones)
