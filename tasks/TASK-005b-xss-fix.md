# TASK-005b — Fix XSS in renderMarkdown (Hotfix)

## Reference Files
- `app/youtube/page.tsx` lines 23-43 — the vulnerable `renderMarkdown` function
- `qa/SECURITY-SCAN-2026-03-16.md` — Tony's security scan

## Context
`renderMarkdown()` is a naive regex markdown→HTML converter that passes output directly to `dangerouslySetInnerHTML`. No sanitization. The input is LLM-generated analysis text — if the LLM output contains HTML/script tags, they execute in the browser.

## Wave 1 — Fix

### Option A (preferred): Use DOMPurify
```bash
npm install isomorphic-dompurify
```

### Modify: `app/youtube/page.tsx`
```typescript
import DOMPurify from 'isomorphic-dompurify'

function renderMarkdown(md: string): string {
  const html = md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
  
  return DOMPurify.sanitize(html)
}
```

### Verify:
```bash
npx tsc --noEmit   # Zero errors
npm run build       # Clean build
# Test: renderMarkdown('<script>alert("xss")</script>') should strip the script tag
```

## Final Verification
```bash
npm run build  # Clean
```
