# Image Consistency Research — Grace (Gemini)
> 2026-03-20

## Problem
Grace (the brand persona) doesn't look like the same person across generated images. Current app scores ~5/10 consistency.

## Root Causes Found

### 1. Reference images not reaching Gemini (P0 bug)
Supabase storage signed URLs fail — the app sends the identity lock TEXT but zero actual reference photos to Gemini. Flying blind.

### 2. Wrong prompting approach
Our current code sends generic inline image data + a long identity lock prompt. This is not how production apps do it.

### 3. Outdated model
We're using `gemini-3-pro-image-preview` (Nano Banana Pro). The newer `gemini-3.1-flash-image-preview` (Nano Banana 2) is:
- Faster and cheaper
- Better at character consistency (designed for it)
- Supports multi-image fusion natively

## How Production Apps Actually Do It

### A. Multi-Turn Conversational Editing (Google's recommended approach)
Instead of one-shot API calls, use `startChat()` to create a multi-turn session:
1. **Turn 1:** Send reference photo + "This is Grace" → model locks identity
2. **Turn 2:** "Now show Grace sitting at a desk with a planner" → generates with locked identity
3. **Turn 3:** "Now show Grace cooking in a kitchen" → same locked identity
4. **Key insight:** Within a single conversation, Gemini maintains character consistency automatically

### B. Chained Reference Approach
- Generate first "anchor" image with reference photos
- Use that OUTPUT as the reference for the NEXT generation
- Each generation uses the previous output as input → consistency compounds

### C. Reference Image Types (Gemini 3.x specific)
Gemini 3.x models have TWO types of reference images:
- **Object Fidelity** (up to 10 on Flash / 6 on Pro) — preserves product/object appearance
- **Character Consistency** (up to 4 on Flash / 5 on Pro) — specifically designed for maintaining character identity
- You MUST frame the prompt correctly to trigger character consistency mode

### D. Prompting Best Practices (from Google's official guide)
- Formula: `[Reference images] + [Relationship instruction] + [New scenario]`
- Example: "This is Grace [+ reference photo]. Show her in a kitchen cooking."
- Use POSITIVE framing ("round full face") not negative ("do NOT slim face")
- Repeat full character description every prompt
- Be specific: `[Subject] + [Action] + [Location] + [Composition] + [Style]`

### E. What Other Apps Do (Ideogram, getimg.ai, Dzine.ai)
- **Ideogram Character:** Upload refs once, save as named character, reuse via @CharacterName
- **getimg.ai:** "Upload a few images once, give your character a name, and then reuse them in any prompt by typing @ElementName"
- **Dzine.ai:** Character mask system — adjustable masks for hair, clothing, accessories

## Test Results Summary

| Config | Images | Best | Avg | Notes |
|--------|--------|------|-----|-------|
| App current (no refs reaching Gemini) | 9 | 5/10 | 5/10 | Text-only identity lock |
| 3 refs, basic prompt | 5 | 8/10 | 6/10 | Inconsistent face-slimming |
| 3 refs, strong prompt | 3 | 5.5/10 | 5.2/10 | More refs = more confusion |
| **1 ref + negative prompts** | 3 | **7.5/10** | 6.3/10 | Best simple approach |

## Proposed Solution (3 tiers)

### Tier 1: Quick Fix (1-2 hours) — Gets us to ~7/10
- Fix Supabase storage (re-upload reference images or use local file paths)
- Switch to 1 reference image (best frontal headshot)
- Upgrade identity lock prompt with positive descriptors
- Keep current one-shot API approach

### Tier 2: Multi-Turn Approach (4-6 hours) — Gets us to ~8-9/10
- Upgrade model to `gemini-3.1-flash-image-preview` (Nano Banana 2)
- Implement multi-turn conversation via `startChat()` in the @google/genai SDK
- Turn 1: Lock Grace's identity with reference photo
- Turn 2+: Generate each scene variant within the same conversation
- Store the conversation session for reuse across ad generation sessions
- Use Google's recommended prompt formula

### Tier 3: Anchor + Chain (production quality) — Gets us to ~9/10
- Generate one "golden anchor" image of Grace (approved by user)
- Store this as the primary reference (not the original photo)
- Chain: Each new generation uses the previous best output as input
- Implement retry-and-pick: generate 3 variants, score consistency, keep best
- This is what Ideogram/getimg.ai effectively do under the hood

## Recommendation
Start with **Tier 2** — it's the highest ROI. The multi-turn approach is what Google explicitly designed for character consistency, and upgrading to Nano Banana 2 is a model name swap. Tier 1 alone won't solve the face-shape drift problem.
