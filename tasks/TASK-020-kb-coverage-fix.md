# TASK-020: Fix Script Generator Crash + Expand KB Coverage

## Priority: P0 (script gen is broken) + P1 (KB underutilization)
## Track: DEFAULT

## Required Skills (Read before starting)
- **Implementation Workflow:** `/home/rob/.openclaw/workspace-coding/skills/implementation-workflow/SKILL.md`
- **Next.js Best Practices:** `/home/rob/.openclaw/workspace-coding/skills/next-best-practices/SKILL.md`

## Required Reading
- `/home/rob/.openclaw/workspace-coding/LESSONS-LEARNED.md`
- `/home/rob/.openclaw/workspace-coding/BEST-PRACTICES.md`

## Reference Files to Read
1. `references/ARCHITECTURE.md`
2. `lib/create/shortform-prompt.ts` — the broken prompt builder
3. `lib/create/kb-retriever.ts` — KB retrieval logic
4. `lib/create/ad-generator.ts` — ad generation (also needs KB expansion)

## Background

The Knowledge Base has 315 entries across 9 categories:
```
 51 | virality_science
 49 | scripting_framework
 48 | platform_intelligence
 47 | content_funnel
 44 | ad_creative
 29 | cro_patterns
 17 | hook_library
 16 | competitor_intel
 14 | ai_prompting
```

**Current problem:** Script generator only loads hook_library (17) + scripting_framework (49) = 66 entries. Ad generator only loads ad_creative (44) + hook_library (17) + cro_patterns (29) = 90 entries. Over half the KB is unused.

Also: script generator CRASHES because `h.examples` is stored as a JSON string in the DB but the code calls `.slice()` on it expecting an array.

## Wave 1: Fix the P0 crash

### File: `lib/create/shortform-prompt.ts` (line 24)

**Current (broken):**
```typescript
${hookEntries.map(h => `- **${h.title}**: ${h.content}\n  Examples: ${h.examples.slice(0, 2).join('; ')}`).join('\n')}
```

**Fix:**
```typescript
${hookEntries.map(h => {
  const examples = typeof h.examples === 'string' ? JSON.parse(h.examples) : (h.examples || [])
  return `- **${h.title}**: ${h.content}${examples.length > 0 ? `\n  Examples: ${examples.slice(0, 2).join('; ')}` : ''}`
}).join('\n')}
```

Do the same safety parsing for any other place `examples` is accessed.

### Verify:
```bash
npx next dev --port 3100
# Login, go to /create/short-form
# Generate a script with topic "How to start a planner business from home"
# Should NOT crash, should produce a script
```

## Wave 2: Expand KB retrieval for Script Generator

### File: `lib/create/kb-retriever.ts`

Add a new function for short-form context:
```typescript
export async function getShortFormGenerationContext(limit: number = 25): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  return getGenerationContext(
    'short-form',
    ['hook_library', 'scripting_framework', 'virality_science', 'content_funnel', 'platform_intelligence'],
    limit
  )
}
```

### File: `lib/create/shortform-prompt.ts`

Update to use ALL relevant categories in the prompt. Add sections for:
- **Virality Science** entries (why content goes viral — patterns, triggers, psychology)
- **Content Funnel** entries (TOFU/MOFU/BOFU positioning, content mix strategy)
- **Platform Intelligence** entries (Instagram-specific algorithm tips, optimal posting patterns)

Update the prompt template to include these:
```typescript
const viralityEntries = kbEntries.filter(e => e.category === 'virality_science')
const funnelEntries = kbEntries.filter(e => e.category === 'content_funnel')
const platformEntries = kbEntries.filter(e => e.category === 'platform_intelligence')

// Add to prompt:
## Virality Patterns (apply where relevant)
${viralityEntries.map(v => `- **${v.title}**: ${v.content}`).join('\n')}

## Content Funnel Context
${funnelEntries.map(f => `- **${f.title}**: ${f.content}`).join('\n')}

## Platform Intelligence (${request.platform})
${platformEntries.map(p => `- **${p.title}**: ${p.content}`).join('\n')}
```

### File: Where short-form route calls the retriever
Update to use `getShortFormGenerationContext(25)` instead of the current call.

## Wave 3: Expand KB retrieval for Ad Generator

### File: `lib/create/kb-retriever.ts`

Update `getAdGenerationContext`:
```typescript
export async function getAdGenerationContext(limit: number = 25): Promise<{ entries: KnowledgeEntry[], tier: 'approved' | 'candidate' }> {
  return getGenerationContext(
    'ads',
    ['ad_creative', 'hook_library', 'cro_patterns', 'content_funnel', 'virality_science', 'platform_intelligence'],
    limit
  )
}
```

Note: removed `brand_identity` (doesn't exist as a DB category — brand context comes from `brand_style_guide` table directly).

### File: `lib/create/ad-generator.ts`

If the ad prompt template only uses entries generically, update it to also section them by category (like the short-form prompt). The LLM generates better copy when it knows WHY each piece of context is provided.

## Wave 4: Smart context selection (token budget)

25 entries is a lot of text. To stay within reasonable token limits:

### File: `lib/create/kb-retriever.ts` — modify `getGenerationContext`

Add category diversity constraint:
```typescript
// After fetching entries, enforce max per category
const MAX_PER_CATEGORY = 5
const diverseEntries: KnowledgeEntry[] = []
const categoryCount: Record<string, number> = {}

for (const entry of sortedEntries) {
  const cat = entry.category
  categoryCount[cat] = (categoryCount[cat] || 0) + 1
  if (categoryCount[cat] <= MAX_PER_CATEGORY) {
    diverseEntries.push(entry)
  }
  if (diverseEntries.length >= limit) break
}
```

This ensures we get TOP entries but spread across categories (max 5 each), not just 15 entries from ad_creative.

## Verification
- [ ] Script generator NO LONGER crashes
- [ ] Script generation works with all framework styles
- [ ] Generated scripts reference virality/funnel concepts (not just hooks)
- [ ] Ad generation loads entries from 6 categories (not 3)
- [ ] Category diversity: no single category dominates the context
- [ ] `next build` passes
- [ ] Screenshot of working script generation to `qa/TASK-020-script-gen-fixed.png`

## Files to Touch
| Path | Action | What |
|------|--------|------|
| `lib/create/shortform-prompt.ts` | Modify | Fix examples parsing + add new KB sections |
| `lib/create/kb-retriever.ts` | Modify | Add getShortFormGenerationContext + expand ad categories + diversity constraint |
| `lib/create/ad-generator.ts` | Modify | Section KB entries by category in prompt |
| `app/api/create/short-form/route.ts` | Modify | Use new retriever function |
