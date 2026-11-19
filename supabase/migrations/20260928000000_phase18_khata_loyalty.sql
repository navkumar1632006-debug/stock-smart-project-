-- Digital Khata & Loyalty Tables and RLS

-- 1. Digital Khata (Customers)
CREATE TABLE public.khata_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Digital Khata Transactions
CREATE TABLE public.khata_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    khata_customer_id UUID NOT NULL REFERENCES public.khata_customers(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(12,2) NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Loyalty Customers
CREATE TABLE public.loyalty_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    points_balance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Loyalty Transactions
CREATE TABLE public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loyalty_customer_id UUID NOT NULL REFERENCES public.loyalty_customers(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
    points INTEGER NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.khata_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Store Ownership)
CREATE POLICY "khata_customers_store_isolation" ON public.khata_customers
    FOR ALL USING (store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()
    ));

CREATE POLICY "khata_transactions_store_isolation" ON public.khata_transactions
    FOR ALL USING (store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()
    ));

CREATE POLICY "loyalty_customers_store_isolation" ON public.loyalty_customers
    FOR ALL USING (store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()
    ));

CREATE POLICY "loyalty_transactions_store_isolation" ON public.loyalty_transactions
    FOR ALL USING (store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()
    ));
