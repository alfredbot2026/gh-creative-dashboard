-- 008_security_policies.sql

-- 1. content_items RLS Hardening
-- Drop existing broad policy that had qual = true
DROP POLICY IF EXISTS "Users can manage their own content_items" ON public.content_items;

-- Recreate policy with least-privilege CRUD restricted to user_id
CREATE POLICY "Users can manage their own content_items"
ON public.content_items
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. brand_style_guide RLS Hardening
-- Drop existing broad policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.brand_style_guide;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.brand_style_guide;

-- Since brand_style_guide has no user_id column, we grant SELECT to authenticated users.
-- To protect modifications, we intentionally do NOT create INSERT/UPDATE/DELETE policies for authenticated users.
-- This effectively restricts writes to the service_role (which bypasses RLS).
-- (Note: Any application logic that writes to this table must use the service_role client in a secure server action.)
CREATE POLICY "Allow read access for authenticated users"
ON public.brand_style_guide
FOR SELECT
TO authenticated
USING (true);

-- 3. storage.objects policies for ad-creatives bucket
-- Create the bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', false)
ON CONFLICT (id) DO NOTHING;

-- Enforce that users can only manage their own objects based on the owner field
CREATE POLICY "Users can upload their own ad-creatives"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-creatives' AND owner_id = auth.uid()::text);

CREATE POLICY "Users can read their own ad-creatives"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ad-creatives' AND owner_id = auth.uid()::text);

CREATE POLICY "Users can update their own ad-creatives"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ad-creatives' AND owner_id = auth.uid()::text);

CREATE POLICY "Users can delete their own ad-creatives"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ad-creatives' AND owner_id = auth.uid()::text);
