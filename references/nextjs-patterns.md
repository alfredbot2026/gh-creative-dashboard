# Next.js Patterns (App Router)

1. **Server Actions (`app/actions/*.ts`):** Use for all mutations (Create/Update/Delete). Must have `'use server'` at the top.
2. **Client Components:** Use `'use client'` only when necessary (interactivity, hooks). Keep components server-first by default.
3. **API Routes (`app/api/**/route.ts`):** Use for external integrations, webhooks, or heavy server-side processes (like Gemini generation) that need streaming or strict REST endpoints.
4. **Data Fetching:** Fetch directly in Server Components using Supabase server client.
