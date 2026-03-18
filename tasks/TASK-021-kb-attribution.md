# TASK-021: KB Attribution + Knowledge Used Display

## Priority: P1
## Track: DEFAULT
## Depends on: TASK-020

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `lib/create/shortform-prompt.ts`
3. `lib/create/ad-generator.ts`
4. `app/create/ads/page.tsx`
5. `app/create/short-form/page.tsx`

## Problem
1. LLM doesn't reliably cite which KB entries influenced its output
2. Knowledge Used section shows raw UUIDs (ads) or "No specific hooks" (scripts)
3. Grace has no way to know which techniques are being applied → can't provide feedback

## Wave 1: Force LLM attribution in output

### Short-form prompt (`lib/create/shortform-prompt.ts`)

Add to the output format:
```json
{
  ...existing fields...
  "techniques_used": [
    {
      "entry_id": "uuid",
      "entry_title": "The Iceberg Effect",
      "category": "hook_library",
      "how_applied": "Used as the opening hook pattern"
    }
  ]
}
```

Add instruction to the prompt:
```
IMPORTANT: In "techniques_used", list EVERY knowledge base entry you actually applied.
Include the entry_id and title from the KB entries provided above.
If you didn't use a specific entry, don't list it. Be honest — this tracks quality.
```

To make this work, include `id` and `title` in the KB context fed to the LLM:
```typescript
${hookEntries.map(h => `- [${h.id}] **${h.title}**: ${h.content}`).join('\n')}
```

### Ad copy prompt (`lib/create/ad-generator.ts`)

Same pattern — each variant should include:
```json
{
  ...existing variant fields...
  "techniques_used": [
    { "entry_id": "uuid", "entry_title": "PAS Framework", "category": "ad_creative", "how_applied": "Primary copy structure" }
  ]
}
```

## Wave 2: Return KB metadata in API response

### Short-form API response
Include entries metadata in the response (not just IDs):
```json
{
  "script": { ... },
  "knowledge_context": {
    "entries_loaded": [
      { "id": "uuid", "title": "...", "category": "hook_library" }
    ],
    "entries_applied": [...from LLM output techniques_used...],
    "tier": "candidate",
    "total_loaded": 25
  }
}
```

### Ad API response
Same structure in `generation_provenance`:
```json
{
  "generation_provenance": {
    ...existing fields...,
    "entries_loaded": [{ "id": "...", "title": "...", "category": "..." }],
    "per_variant_attribution": {
      "variant-id-1": [{ "entry_id": "...", "entry_title": "...", "how_applied": "..." }]
    }
  }
}
```

## Wave 3: Update UI display

### `app/create/short-form/page.tsx` — Knowledge Used section
Replace "No specific hooks or frameworks referenced" with:
```
Techniques Applied:
- 🪝 The Iceberg Effect → Used as opening hook
- 📝 My Story Structure → Narrative framework
- 🧪 Negativity Bias → Retention trigger

Context loaded: 25 entries from 5 categories (candidate tier)
```

### `app/create/ads/page.tsx` — Knowledge Used section
Replace raw UUID list with:
```
Context: 25 entries loaded (candidate tier)

Per Variant:
- PAS variant: 📢 PAS Framework, 🪝 Contrarian Hook, 📊 Urgency Pattern
- AIDA variant: 📢 AIDA Framework, 🪝 Comparison Hook
```

Category emoji map:
```typescript
const categoryEmoji: Record<string, string> = {
  'hook_library': '🪝',
  'scripting_framework': '📝',
  'virality_science': '🧪',
  'content_funnel': '🔻',
  'ad_creative': '📢',
  'platform_intelligence': '📱',
  'cro_patterns': '📊',
  'competitor_intel': '🔍',
  'ai_prompting': '🤖',
}
```

## Verification
- [ ] Script output includes `techniques_used` with real entry IDs
- [ ] Ad variants include `techniques_used` per variant
- [ ] Knowledge Used section shows titles + categories (not UUIDs)
- [ ] Category emojis display correctly
- [ ] `next build` passes
- [ ] Screenshot of Knowledge Used section for both generators

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `lib/create/shortform-prompt.ts` | Modify | Add entry IDs to context + attribution output format |
| `lib/create/ad-generator.ts` | Modify | Add entry IDs to context + per-variant attribution |
| `app/api/create/short-form/route.ts` | Modify | Include KB metadata in response |
| `app/api/create/ad/route.ts` | Modify | Include KB metadata in response |
| `app/create/short-form/page.tsx` | Modify | Display KB attribution with titles + emojis |
| `app/create/ads/page.tsx` | Modify | Display KB attribution with titles + emojis |
