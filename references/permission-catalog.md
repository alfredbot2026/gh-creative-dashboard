# Permission Catalog

*This application does not currently implement granular RBAC or fine-grained permissions.*

- **Default Role:** Authenticated user (Grace/Rob) has full CRUD access to all tables.
- **Unauthenticated:** Completely blocked via Supabase RLS and Next.js middleware (where applicable).
- API routes must verify Supabase session before executing operations.
