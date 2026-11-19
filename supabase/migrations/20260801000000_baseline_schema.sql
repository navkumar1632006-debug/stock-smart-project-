-- StockSmart AI - Supabase Database Schema Migration
-- Execute this in your Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Businesses / Stores (Multi-tenancy foundation)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Catalog
-- Note: 'products' might already exist, so we use IF NOT EXISTS, but we ensure columns match.
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    stock_level INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 5,
    is_fresh_product BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sales / Transactions Ledger
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL,
    channel TEXT DEFAULT 'In-Store',
    sale_date TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Batches (For Expiry Management)
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

-- 6. Demand Forecasts (AI Outputs)
CREATE TABLE IF NOT EXISTS public.forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    predicted_demand_7d INTEGER NOT NULL,
    confidence_score INTEGER NOT NULL,
    insight TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_info TEXT,
    reliability_score INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Store Owners can only see and manage their own store
CREATE POLICY "Users can manage their own stores" ON public.stores
    FOR ALL USING (auth.uid() = owner_id);

-- Products isolated by store
CREATE POLICY "Users can manage products in their store" ON public.products
    FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Sales isolated by store
CREATE POLICY "Users can manage sales in their store" ON public.sales
    FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Batches isolated by store
CREATE POLICY "Users can manage batches in their store" ON public.batches
    FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Forecasts isolated by store
CREATE POLICY "Users can view forecasts in their store" ON public.forecasts
    FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Suppliers isolated by store
CREATE POLICY "Users can manage suppliers in their store" ON public.suppliers
    FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Enable Realtime for inventory syncing
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.sales;
