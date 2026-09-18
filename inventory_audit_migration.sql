-- StockSmart AI - Inventory Audit Ledger Migration
-- Execute this in your Supabase SQL Editor AFTER the previous migrations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('SALE', 'RESTOCK', 'RETURN', 'SPOILAGE', 'ADJUSTMENT')),
    quantity_changed INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    
    reference_id UUID,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Realtime subscription for live audit logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;

-- RLS Policies
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view inventory transactions in their store" ON public.inventory_transactions;
CREATE POLICY "Users can view inventory transactions in their store" ON public.inventory_transactions
    FOR SELECT
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert inventory transactions in their store" ON public.inventory_transactions;
CREATE POLICY "Users can insert inventory transactions in their store" ON public.inventory_transactions
    FOR INSERT
    WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- Note: We intentionally do NOT create UPDATE or DELETE policies. 
-- The ledger must be immutable. Mistakes must be fixed via compensating ADJUSTMENT transactions.

COMMIT;
