# TASK-029 — Product Catalog

**Track:** DEFAULT → Blackwidow → Bruce
**Priority:** P1
**Depends on:** None

---

## Context

Grace sells multiple products (P2P course, starter kits, printables). Currently she re-types product name and offer details every time she generates an ad or script. This task adds a Product Catalog to Settings and a product dropdown to all generators.

---

## Reference Files to Read FIRST
1. `references/ARCHITECTURE.md`
2. `app/actions/settings.ts` — BusinessProfileData, upsert pattern
3. `app/settings/page.tsx` — existing tabs (Business Profile, Brand Style Guide)
4. `app/create/short-form/page.tsx` — script generator form
5. `app/create/ads/page.tsx` — ad generator form
6. `lib/create/types.ts` — GenerateShortFormRequest
7. `lib/create/ad-types.ts` — AdGenerationRequest

---

## What to Build

### Wave 1 — Database + Server Actions

**File: `supabase/migrations/010_product_catalog.sql`** (CREATE)
```sql
CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,                    -- e.g. "₱1,300" or "₱2,997/mo"
  currency TEXT DEFAULT 'PHP',
  offer_details TEXT,            -- the full offer pitch (what's included, bonuses)
  product_type TEXT DEFAULT 'physical', -- physical, digital, course, service
  target_audience TEXT,          -- who is this product for
  usps TEXT[] DEFAULT '{}',      -- unique selling points
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON product_catalog
  FOR ALL USING (
    auth.uid() = user_id OR
    user_id IS NULL
  );

-- Index
CREATE INDEX idx_product_catalog_user ON product_catalog(user_id);
```

**File: `app/actions/products.ts`** (CREATE)
```ts
'use server'
// CRUD for product_catalog
// Functions: listProducts(), getProduct(id), upsertProduct(data), deleteProduct(id)
// Pattern: match app/actions/settings.ts
// On upsert, set updated_at = now()
// On list, filter is_active = true, order by name
```

### Wave 2 — Settings UI (Products Tab)

**File: `app/settings/page.tsx`** (MODIFY)

Add third tab: `products`
```
[Business Profile] [Brand Style Guide] [Products]
```

Products tab shows:
- List of products as cards (name, price, type badge, edit/delete buttons)
- "Add Product" button → expands inline form:
  - Name (required)
  - Price (e.g. "₱1,300")
  - Product Type dropdown (Physical, Digital, Course, Service)
  - Description (textarea)
  - Offer Details (textarea — "What's included? Bonuses?")
  - Target Audience (textarea)
  - USPs (add/remove list, same pattern as existing ListSection)
  - Save / Cancel buttons
- Edit = same form, pre-filled
- Delete = confirm dialog

Use existing `page.module.css` styles. NO inline hex. Product type badge uses CSS module class.

### Wave 3 — Product Dropdown in Generators

**File: `components/create/ProductSelect.tsx`** (CREATE)

Shared component:
```tsx
interface ProductSelectProps {
  onSelect: (product: Product | null) => void
  selectedId?: string
}
```

Renders as a dropdown with:
- "(No product — enter manually)" as first option
- Each product: "Name — Price" as label
- On select: calls onSelect with full product data
- Fetches products via `/api/products` (or server action) on mount

**File: `app/api/products/route.ts`** (CREATE)
```
GET /api/products — returns user's active products
```

**File: `app/create/short-form/page.tsx`** (MODIFY)

Add ProductSelect below Content Purpose picker, above Topic:
- When product selected: auto-fill topic with product name if topic is empty
- Pass product context into generation request as new field `product_context`

**File: `app/create/ads/page.tsx`** (MODIFY)

Add ProductSelect below Content Purpose picker, above Product/Offer fields:
- When product selected: auto-fill Product Name, Offer Details fields from product data
- Fields remain editable (user can tweak after auto-fill)

### Wave 4 — Generation Context

**File: `lib/create/types.ts`** (MODIFY)
Add to GenerateShortFormRequest:
```ts
product_context?: {
  name: string
  description?: string
  price?: string
  offer_details?: string
  target_audience?: string
  usps?: string[]
}
```

**File: `lib/create/shortform-prompt.ts`** (MODIFY)
If `request.product_context` provided, add section:
```
## Product Context
Product: ${name}
Price: ${price}
What's included: ${offer_details}
Target customer: ${target_audience}
Key selling points: ${usps.join(', ')}

Incorporate this product naturally into the script. Don't make it a hard sell unless the content purpose is "sell".
```

**File: `lib/create/ad-types.ts`** (MODIFY)
No structural change needed — `product` and `offer_details` fields already exist.
The ProductSelect just auto-fills them.

---

## Verification

```bash
# 1. Build
npx next build 2>&1 | tail -5
# Expected: exit 0

# 2. Products API
curl -s http://localhost:3100/api/products | python3 -m json.tool
# Expected: [] (empty array initially)

# 3. Settings UI
# Navigate to /settings → click "Products" tab
# Add a product: "Papers to Profits Starter Kit", ₱1,300, Physical
# Verify it appears in the list

# 4. Generator integration
# Navigate to /create/short-form
# Verify ProductSelect dropdown appears
# Select the product → topic hint fills in
# Navigate to /create/ads
# Select the product → Product Name + Offer Details auto-fill
```

## Final Build Check
```bash
npx next build 2>&1 | grep -E "error|Error|✓"
```
Exit 0. No TS errors.

---

## Notes
- Seed with Grace's known products: "Papers to Profits Course" (₱2,997), "Papers to Profits Starter Kit" (₱1,300)
- Product catalog is per-user (RLS) — future multi-tenant ready
- ProductSelect is optional in scripts, auto-fills in ads
- Migration 010 — apply to local, defer remote push
