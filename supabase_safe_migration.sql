-- StockSmart AI - Safe Supabase Database Schema Migration
-- Execute this in your Supabase SQL Editor
-- This script safely injects missing columns and tables without destroying legacy data.

BEGIN;

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Missing Tables (Stores & Batches)
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

-- 3. Safely Alter Existing Tables (Ensuring parity with target schema)
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized',
    ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT uuid_generate_v4()::text,
    ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS stock_level INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_fresh_product BOOLEAN DEFAULT FALSE;

ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'In-Store',
    ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.forecasts 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS predicted_demand_7d INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS insight TEXT;

ALTER TABLE public.suppliers 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS contact_info TEXT,
    ADD COLUMN IF NOT EXISTS reliability_score INTEGER DEFAULT 100;

-- ==========================================
-- 4. CONTROLLED LEGACY DATA MIGRATION
-- ==========================================
-- DO NOT RUN UNTIL YOU REPLACE 'YOUR_USER_UUID_HERE' WITH A REAL AUTH.USERS ID
DO $$
DECLARE
    legacy_store_id UUID;
    admin_uuid UUID := 'a49258dc-d4c7-48c9-ba3a-a758fae9205d'; -- <--- REPLACE THIS BEFORE RUNNING
    orphans_exist BOOLEAN := false;
BEGIN
    -- Check if any orphans exist across all relevant tables
    IF EXISTS (SELECT 1 FROM public.products WHERE store_id IS NULL) OR
       EXISTS (SELECT 1 FROM public.sales WHERE store_id IS NULL) OR
       EXISTS (SELECT 1 FROM public.forecasts WHERE store_id IS NULL) OR
       EXISTS (SELECT 1 FROM public.suppliers WHERE store_id IS NULL) THEN
       orphans_exist := true;
    END IF;

    IF orphans_exist THEN
        -- Find existing Legacy Store for this admin to ensure idempotency
        SELECT id INTO legacy_store_id FROM public.stores 
        WHERE name = 'Legacy Prototype Data' AND owner_id = admin_uuid 
        LIMIT 1;

        -- If it doesn't exist, create it
        IF legacy_store_id IS NULL THEN
            legacy_store_id := uuid_generate_v4();
            INSERT INTO public.stores (id, owner_id, name, location)
            VALUES (legacy_store_id, admin_uuid, 'Legacy Prototype Data', 'System Migrated');
        END IF;

        -- Map all orphaned rows to the Legacy Store safely
        UPDATE public.products SET store_id = legacy_store_id WHERE store_id IS NULL;
        UPDATE public.sales SET store_id = legacy_store_id WHERE store_id IS NULL;
        UPDATE public.forecasts SET store_id = legacy_store_id WHERE store_id IS NULL;
        UPDATE public.suppliers SET store_id = legacy_store_id WHERE store_id IS NULL;
    END IF;
END $$;

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Explicit USING (Read/Delete) and WITH CHECK (Insert/Update) for exact security

DROP POLICY IF EXISTS "Users can manage their own stores" ON public.stores;
CREATE POLICY "Users can manage their own stores" ON public.stores
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can manage products in their store" ON public.products;
CREATE POLICY "Users can manage products in their store" ON public.products
    FOR ALL
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
    WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage sales in their store" ON public.sales;
CREATE POLICY "Users can manage sales in their store" ON public.sales
    FOR ALL
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
    WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage batches in their store" ON public.batches;
CREATE POLICY "Users can manage batches in their store" ON public.batches
    FOR ALL
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
    WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view forecasts in their store" ON public.forecasts;
CREATE POLICY "Users can view forecasts in their store" ON public.forecasts
    FOR ALL
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
    WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage suppliers in their store" ON public.suppliers;
CREATE POLICY "Users can manage suppliers in their store" ON public.suppliers
    FOR ALL
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
    WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

COMMIT;

-- ==========================================
-- 6. REALTIME (Outside Transaction)
-- ==========================================
-- ALTER PUBLICATION cannot run inside a transaction block
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products') THEN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products; 
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales') THEN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales; 
  END IF;
END $$;
