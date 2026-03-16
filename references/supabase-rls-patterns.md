# Supabase RLS Patterns

1. **Default Deny:** All new tables MUST have `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`.
2. **Authentication Gate:** Policies should restrict to authenticated users minimum:
   `CREATE POLICY "Allow authenticated" ON table_name FOR ALL TO authenticated USING (true) WITH CHECK (true);`
3. **Single User App:** This dashboard is currently for a single user (Grace), so no complex tenant isolation is required yet, but unauthenticated access MUST be blocked.
