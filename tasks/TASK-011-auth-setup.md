# TASK-011 — Supabase Auth Setup (Email/Password)

> **Track:** DEFAULT
> **Priority:** P0 — blocks all Phase 1 functionality
> **Depends on:** none

## Pre-Task Learning
1. Read `self-improving/corrections.md`
2. Read `LESSONS-LEARNED.md`
3. Read `references/ARCHITECTURE.md`
4. Read `skills/next-best-practices/SKILL.md`

## Context
No auth exists in the app. All API routes return 401. Users cannot log in, sign up, or use any features. This task adds Supabase email/password auth with login/signup pages, middleware for route protection, and session management.

The Supabase project is already configured (`mnqwquoewvgfztenyygf`) with `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Changes

### Wave 1: Supabase Auth Helpers

#### 1.1 Verify Supabase client setup
- **File:** `lib/supabase/server.ts`
- **Action:** Read — verify `createClient()` uses `createServerClient` from `@supabase/ssr`
- If it doesn't exist or uses old patterns, create/update it:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch { /* server component, ignore */ }
        },
      },
    }
  )
}
```

#### 1.2 Browser client
- **File:** `lib/supabase/client.ts`
- **Action:** Create if missing
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- **Verify:** `npx tsc --noEmit`

### Wave 2: Auth Middleware

#### 2.1 Create middleware
- **File:** `middleware.ts` (project root)
- **Action:** Create
- Protect all routes EXCEPT: `/login`, `/signup`, `/auth/callback`, `/_next`, `/favicon.ico`, `/api/health`
- If no session → redirect to `/login`
- Refresh session on every request (Supabase token refresh)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/signup') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.startsWith('/favicon')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- **Verify:** `npx tsc --noEmit`

### Wave 3: Login & Signup Pages

#### 3.1 Login page
- **File:** `app/login/page.tsx`
- **Action:** Create
- Email + password form
- "Don't have an account? Sign up" link
- Error handling (invalid credentials)
- On success → redirect to `/` (dashboard)
- Use `'use client'` — needs form state
- Style with CSS Module `app/login/page.module.css`
- Clean, minimal design matching app's existing style (dark sidebar theme)

#### 3.2 Signup page
- **File:** `app/signup/page.tsx`
- **Action:** Create
- Email + password + confirm password form
- "Already have an account? Log in" link
- On success → redirect to `/login` with success message
- Style with CSS Module `app/signup/page.module.css`

#### 3.3 Auth callback route
- **File:** `app/auth/callback/route.ts`
- **Action:** Create
- Handles Supabase auth callback (for email confirmation if enabled)
- Exchanges code for session → redirect to `/`

#### 3.4 Logout action
- Add a logout button/link in the sidebar (bottom, near "Settings")
- On click → `supabase.auth.signOut()` → redirect to `/login`
- **File:** Modify `components/layout/Sidebar.tsx` — add logout at bottom

- **Verify:** `npm run build` — all pages compile

### Wave 4: Create Test User

#### 4.1 Create test user via Supabase
- Run this command to create a test user:
```bash
# Use supabase CLI or curl to create user
npx supabase --project-ref mnqwquoewvgfztenyygf auth admin create-user \
  --email grace@ghcreative.test \
  --password GHCreative2026! \
  --email-confirm
```
- If Supabase CLI doesn't work, use the Management API:
```bash
curl -X POST "https://mnqwquoewvgfztenyygf.supabase.co/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"grace@ghcreative.test","password":"GHCreative2026!"}'
```
- **Verify:** User appears in Supabase Auth dashboard or login works

## Final Verification (EVIDENCE REQUIRED)
```bash
npm run build          # zero errors — paste output
npx tsc --noEmit       # zero type errors — paste output
```

### Functional Test (MANDATORY)
1. Start dev server: `npm run dev`
2. Open `/` — should redirect to `/login`
3. Try login with wrong credentials — should show error
4. Sign up with `grace@ghcreative.test` / `GHCreative2026!` (or log in if already created)
5. After login → should redirect to dashboard
6. Navigate to `/create/short-form` — should load (authenticated)
7. Check sidebar shows logout option

Take screenshots of:
- Login page
- Signup page  
- Successful login redirect to dashboard
- Any page while authenticated

Save screenshots to `active/gh-creative-dashboard/qa/TASK-011-*.png`

⚠️ **Screenshots are MANDATORY. No screenshots = rejected.**

## Commit
```bash
git add -A
git commit -m "feat: add Supabase email/password auth with login/signup pages"
```

## Build Report
Write to `active/gh-creative-dashboard/BUILD-REPORT-TASK-011.md`

## Output
- Report: `active/gh-creative-dashboard/BUILD-REPORT-TASK-011.md`
- Set WORKER-QUEUE.md: `state: WAITING_FOR_QA`, `result_file: active/gh-creative-dashboard/BUILD-REPORT-TASK-011.md`
