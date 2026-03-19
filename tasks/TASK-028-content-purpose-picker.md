# TASK-028 — Content Purpose Picker + Technique Surfacing

**Track:** DEFAULT → Blackwidow → Bruce
**Priority:** P1
**Depends on:** KB extraction complete (done ✅)

---

## Context

Right now, both the Short-form Script generator and Ad generator ask the user to type a "topic" or "product" with no strategic guidance. Grace (and future users) don't know which KB frameworks to use or what type of content to make. This feature closes that gap.

**Goal:** Surface content strategy BEFORE generation, so the user picks a PURPOSE and a TECHNIQUE, then the generator uses that specific framework.

---

## Reference Files to Read FIRST
1. `references/ARCHITECTURE.md`
2. `lib/knowledge/types.ts` — KnowledgeEntry, KNOWLEDGE_CATEGORIES
3. `lib/create/types.ts` — GenerateShortFormRequest
4. `lib/create/ad-types.ts` — AdGenerationRequest
5. `app/create/short-form/page.tsx` — existing short-form UI
6. `app/create/ads/page.tsx` — existing ad UI
7. `app/create/layout.module.css` — shared layout CSS
8. `lib/create/kb-retriever.ts` — getGenerationContext, getShortFormGenerationContext

---

## What to Build

### Wave 1 — Content Purpose API

**File: `app/api/knowledge/techniques/route.ts`** (CREATE)

```
GET /api/knowledge/techniques?purpose=educate&lane=short-form
```

Returns top KB entries relevant to the selected purpose + lane, sorted by effectiveness_score.

Purpose → category mapping:
```ts
const PURPOSE_CATEGORIES: Record<string, string[]> = {
  educate:    ['scripting_framework', 'hook_library', 'virality_science'],
  story:      ['hook_library', 'scripting_framework', 'brand_identity'],
  sell:       ['ad_creative', 'cro_patterns', 'content_funnel'],
  prove:      ['virality_science', 'cro_patterns', 'hook_library'],
  trend:      ['platform_intelligence', 'virality_science', 'hook_library'],
  inspire:    ['content_funnel', 'hook_library', 'virality_science'],
}
```

Response shape:
```ts
{
  purpose: string,
  lane: string,
  hooks: KnowledgeEntry[],        // top 5 from hook_library
  frameworks: KnowledgeEntry[],   // top 5 from scripting_framework or ad_creative
  supporting: KnowledgeEntry[],   // top 3 other relevant entries
}
```

Query logic:
- Filter by categories for the purpose
- Filter by lane (contains lane)
- Order by effectiveness_score DESC
- Limit hooks to 5, frameworks to 5, supporting to 3
- Use `review_status = 'candidate'` OR `'approved'` (fallback to candidate if no approved)

**File: `lib/create/types.ts`** (MODIFY)

Add to GenerateShortFormRequest:
```ts
content_purpose?: 'educate' | 'story' | 'sell' | 'prove' | 'trend' | 'inspire'
selected_hook_id?: string      // KB entry id for the chosen hook
selected_framework_id?: string // KB entry id for the chosen framework
```

**File: `lib/create/ad-types.ts`** (MODIFY)

Add to AdGenerationRequest:
```ts
content_purpose?: 'educate' | 'story' | 'sell' | 'prove' | 'trend' | 'inspire'
selected_hook_id?: string
selected_framework_id?: string
```

---

### Wave 2 — Prompt Builder Updates

**File: `lib/create/shortform-prompt.ts`** (MODIFY)

If `request.selected_hook_id` is provided AND matching entry exists in kbEntries:
- Prepend to the hook section: `## REQUIRED HOOK (must use this exact pattern)\n- ${selected.title}: ${selected.content}\nExamples: ${selected.examples.join('; ')}`
- Change instruction from "USE ONE hook pattern" to "USE THE REQUIRED HOOK PATTERN below"

If `request.selected_framework_id` is provided AND matching entry exists:
- Prepend to frameworks section: `## REQUIRED FRAMEWORK (must use this structure)\n- ${selected.title}: ${selected.content}`
- Change instruction to "USE THE REQUIRED FRAMEWORK below"

Same pattern for `lib/create/ad-generator.ts` (MODIFY) — inject selected_hook_id and selected_framework_id into the ad prompt.

---

### Wave 3 — Short-Form UI

**File: `app/create/short-form/page.tsx`** (MODIFY)

Add above the "Topic" input in the left sidebar:

```
Content Purpose (optional)
[6 pill buttons: 📚 Educate | 📖 Story | 🎯 Sell | 🤝 Prove | 🔥 Trend | 💡 Inspire]
```

When a purpose pill is clicked:
1. Set activePurpose state
2. Fetch `/api/knowledge/techniques?purpose={purpose}&lane=short-form`
3. Show "Techniques" section below the pills:

```
Hooks                          Frameworks
[ Iceberg Effect ⭐0.85 ]      [ Iverson Crossover ⭐0.91 ]
[ Comparison Hook ⭐0.78 ]     [ Dance Method ⭐0.84 ]
[ Bridge Hook ⭐0.72 ]         [ HEIT Framework ⭐0.79 ]
[ Super Hook ⭐0.68 ]          [ 3-2-1 Framework ⭐0.75 ]
[ Data Shock ⭐0.61 ]          [ Hook-Hold-Reward ⭐0.70 ]
```

Each is a clickable pill. Selected = highlighted ring. One hook + one framework selectable at a time.

Pass selected hook ID + framework ID into the generation request.

**CSS:** Use `app/create/layout.module.css` existing variables. Add `.purposePills`, `.purposePill`, `.purposePillActive`, `.techniqueGrid`, `.techniqueChip`, `.techniqueChipActive`, `.techniqueScore` to `app/create/short-form/page.module.css`.

NO inline hex values. Use CSS vars: `--color-primary`, `--color-surface-elevated`, `--color-text-muted`, `--color-success`, `--color-border`.

---

### Wave 4 — Ad UI

**File: `app/create/ads/page.tsx`** (MODIFY)

Same pattern as short-form. Add purpose picker + technique chips above the "Product/Offer" field in the Ad Settings panel.

Lane for technique fetch = `ads` when format is static/carousel, `short-form` when format is video-script.

---

### Wave 5 — Generation Context Update

**File: `lib/create/kb-retriever.ts`** (MODIFY)

Add new function:
```ts
export async function getGenerationContextWithSelection(
  lane: 'short-form' | 'ads' | 'youtube',
  categories: string[],
  selectedHookId?: string,
  selectedFrameworkId?: string,
  limit: number = 25
): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }>
```

If selectedHookId is provided: fetch that specific entry and ensure it's FIRST in the returned entries list (even if its score is low).
If selectedFrameworkId is provided: same — fetch it and ensure it's first in its category group.

This ensures selected techniques are always present in the generation context.

---

## Verification Steps

```bash
# 1. Build check
cd /home/rob/.openclaw/workspace-coding/active/gh-creative-dashboard
npx next build 2>&1 | tail -5
# Expected: exit 0, no TS errors

# 2. API check
curl -s "http://localhost:3100/api/knowledge/techniques?purpose=educate&lane=short-form" | python3 -m json.tool | head -30
# Expected: JSON with hooks[], frameworks[], supporting[] arrays, each with title + effectiveness_score

# 3. UI check — open browser
# Navigate to http://localhost:3100/create/short-form
# Verify: 6 purpose pills visible above topic input
# Click "📚 Educate" → techniques panel appears with hook chips and framework chips
# Click a hook chip → it highlights, stays selected
# Click a framework chip → it highlights, stays selected
# Click "Generate" → request includes selected IDs
# Verify generated script uses the selected hook pattern (check "Knowledge Used" panel)
```

---

## Final Verification
```bash
npx next build 2>&1 | grep -E "error|Error|✓ Compiled"
```
Build must exit 0. No TypeScript errors.

---

## Notes
- Purpose picker is OPTIONAL — if user skips it, generation works exactly as before
- Technique chips show effectiveness_score as ⭐ rating (0.9+ = ⭐⭐⭐, 0.7-0.9 = ⭐⭐, below = ⭐)
- If no KB entries exist for a purpose, hide the techniques panel (don't show empty state)
- This is purely frontend + API — no DB schema changes needed
