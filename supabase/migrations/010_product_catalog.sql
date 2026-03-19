-- 010: Product Catalog
CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  currency TEXT DEFAULT 'PHP',
  offer_details TEXT,
  product_type TEXT DEFAULT 'physical',
  target_audience TEXT,
  usps TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON product_catalog
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX idx_product_catalog_user ON product_catalog(user_id);

-- Seed Grace's known products
INSERT INTO product_catalog (name, description, price, offer_details, product_type, target_audience, usps) VALUES
  ('Papers to Profits Course', 'Complete paper crafting business course', '₱2,997', 'Step-by-step video tutorials, business templates, Canva designs, private community access, 30-minute/day format', 'course', 'Moms aged 25-45 who want to start a home-based paper products business', ARRAY['30 minutes/day format', 'Step-by-step for complete beginners', 'Includes business templates', 'Private community support']),
  ('Papers to Profits Starter Kit', 'Everything needed to start a paper business', '₱1,300', 'Curated paper supplies, ready-to-use Canva templates, step-by-step tutorials, starter tool kit', 'physical', 'Complete beginners who want to try paper crafting with minimal investment', ARRAY['Complete starter package', 'Ready-to-use templates', 'Curated supplies included', 'No guesswork']);
