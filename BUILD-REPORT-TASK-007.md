# Build Report: TASK-007 (Short-form Script Generation API)

## 1. What was done
Implemented the short-form script generation API (Phase 1a). Created types, KB retriever helper, generation prompt builder, generator function, and the Next.js API route. The API pulls from the knowledge base, injects the brand style guide, calls the LLM with structured JSON output, and applies a quality gate check if the eval module is present. The API endpoint is secured with Supabase Auth.

## 2. Where artifacts are
- `lib/create/types.ts`: TypeScript interfaces for the script, request, and response.
- `lib/create/kb-retriever.ts`: Helper to fetch generation context and brand style guide from Supabase.
- `lib/create/shortform-prompt.ts`: Constructs the system prompt for the LLM using brand voice, hooks, and frameworks.
- `lib/create/shortform-generator.ts`: Orchestrates context retrieval, LLM call, JSON parsing, and quality evaluation.
- `app/api/create/short-form/route.ts`: Next.js POST API route (secured with Supabase RLS patterns).

## 3. How to verify
### Commands
```bash
npx tsc --noEmit
# Output: (no output, success)

npm run build
# Output:
# ✓ Compiled successfully in 11.6s
# ✓ Generating static pages using 7 workers (33/33) in 1242.1ms
# Route (app) ... ├ ƒ /api/create/short-form ...
```

### cURL Example
```bash
curl -X POST http://localhost:3000/api/create/short-form \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -d '{
    "topic": "Why regular productivity tools fail ADHD brains",
    "platform": "instagram-reels",
    "target_duration": 45,
    "style": "hook-first"
  }'
```

## 4. Known issues
- None.

## 5. What's next
Ready for Bruce QA
