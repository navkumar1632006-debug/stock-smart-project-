BEGIN;

-- 1. EXTENSIONS & MISSING TABLES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    initial_quantity INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL,
    expiry_date DATE NOT NULL,
    received_date TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD MISSING COLUMNS SAFELY (Allowing NULL initially for legacy data compatibility)
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS is_fresh_product BOOLEAN DEFAULT FALSE;

ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'In-Store';

ALTER TABLE public.forecasts 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 80,
    ADD COLUMN IF NOT EXISTS insight TEXT;

ALTER TABLE public.suppliers 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT;

-- 3. CREATE LEGACY ADMIN STORE (Idempotent)
DO $$ 
DECLARE
    legacy_store_id UUID := '00000000-0000-4000-8000-000000000000'::uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = legacy_store_id) THEN
        -- owner_id is NULL intentionally. RLS policies explicitly require owner_id = auth.uid().
        -- Since NULL != any user ID, this data is permanently isolated from the frontend.
        INSERT INTO public.stores (id, owner_id, name, location)
        VALUES (legacy_store_id, NULL, 'Legacy Admin Store', 'Legacy/Unassigned');
    END IF;

    -- 4. MIGRATE ORPHANED DATA TO LEGACY ADMIN STORE
    UPDATE public.products SET store_id = legacy_store_id WHERE store_id IS NULL;
    UPDATE public.sales SET store_id = legacy_store_id WHERE store_id IS NULL;
    UPDATE public.forecasts SET store_id = legacy_store_id WHERE store_id IS NULL;
    UPDATE public.suppliers SET store_id = legacy_store_id WHERE store_id IS NULL;
END $$;

-- 5. SECURE RLS POLICIES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Wipe existing potentially unsafe policies
DROP POLICY IF EXISTS "Users can manage their own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can manage products in their store" ON public.products;
DROP POLICY IF EXISTS "Users can manage sales in their store" ON public.sales;
DROP POLICY IF EXISTS "Users can manage batches in their store" ON public.batches;
DROP POLICY IF EXISTS "Users can view forecasts in their store" ON public.forecasts;
DROP POLICY IF EXISTS "Users can manage suppliers in their store" ON public.suppliers;

-- === STORES ===
CREATE POLICY "Users can view their own stores" ON public.stores FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own stores" ON public.stores FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own stores" ON public.stores FOR DELETE USING (auth.uid() = owner_id);

-- === PRODUCTS ===
CREATE POLICY "Users can view products in their store" ON public.products FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert products in their store" ON public.products FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update products in their store" ON public.products FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())) WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete products in their store" ON public.products FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- === SALES ===
CREATE POLICY "Users can view sales in their store" ON public.sales FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert sales in their store" ON public.sales FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update sales in their store" ON public.sales FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())) WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete sales in their store" ON public.sales FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- === BATCHES ===
CREATE POLICY "Users can view batches in their store" ON public.batches FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert batches in their store" ON public.batches FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update batches in their store" ON public.batches FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())) WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete batches in their store" ON public.batches FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- === FORECASTS ===
CREATE POLICY "Users can view forecasts in their store" ON public.forecasts FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert forecasts in their store" ON public.forecasts FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update forecasts in their store" ON public.forecasts FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())) WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete forecasts in their store" ON public.forecasts FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- === SUPPLIERS ===
CREATE POLICY "Users can view suppliers in their store" ON public.suppliers FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert suppliers in their store" ON public.suppliers FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update suppliers in their store" ON public.suppliers FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())) WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete suppliers in their store" ON public.suppliers FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- 6. AUTOMATIC TENANT PROVISIONING
-- Creates a default store when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_store()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.stores (owner_id, name, location)
  VALUES (new.id, 'My Local Store', 'Unassigned Location');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure idempotent trigger creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_store();

COMMIT;
