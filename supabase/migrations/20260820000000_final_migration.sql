BEGIN;

-- 1. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STOCK MOVEMENTS (Audit Trail)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL,
    quantity_changed INTEGER NOT NULL,
    resulting_quantity INTEGER NOT NULL,
    reference_id TEXT,
    idempotency_key TEXT UNIQUE, -- Added for adjustment idempotency
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. IDEMPOTENCY
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 4. CONSTRAINTS (Migration-Safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_stock_level') THEN
        ALTER TABLE public.products ADD CONSTRAINT chk_product_stock_level CHECK (stock_level >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sale_quantity') THEN
        ALTER TABLE public.sales ADD CONSTRAINT chk_sale_quantity CHECK (quantity > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sale_total_price') THEN
        ALTER TABLE public.sales ADD CONSTRAINT chk_sale_total_price CHECK (total_price >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_init_qty') THEN
        ALTER TABLE public.batches ADD CONSTRAINT chk_batch_init_qty CHECK (initial_quantity >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_curr_qty') THEN
        ALTER TABLE public.batches ADD CONSTRAINT chk_batch_curr_qty CHECK (current_quantity >= 0);
    END IF;
END $$;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

-- 6. SECURE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Explicitly remove any existing client INSERT policy for notifications
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users view stock movements in their store" ON public.stock_movements;
CREATE POLICY "Users view stock movements in their store" ON public.stock_movements FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- 7. ATOMIC INVENTORY RPC
CREATE OR REPLACE FUNCTION public.process_sale(
    p_store_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_total_price NUMERIC,
    p_channel TEXT,
    p_idempotency_key TEXT
) RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
    v_sale_id UUID;
    v_existing_product UUID;
    v_existing_qty INTEGER;
BEGIN
    -- 1. Input Validation
    IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    IF p_total_price IS NULL OR p_total_price < 0 THEN RAISE EXCEPTION 'Invalid total_price'; END IF;
    IF p_product_id IS NULL THEN RAISE EXCEPTION 'Invalid product_id'; END IF;
    IF p_store_id IS NULL THEN RAISE EXCEPTION 'Invalid store_id'; END IF;
    IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN RAISE EXCEPTION 'Invalid idempotency_key'; END IF;
    IF p_channel NOT IN ('In-Store', 'Hyperlocal App', 'Online') THEN RAISE EXCEPTION 'Invalid channel'; END IF;

    -- 2. Explicit Ownership Validation (SECURITY DEFINER hardening)
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized store';
    END IF;

    -- 3. Row Locking for Concurrency Safety
    SELECT stock_level INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- 4. Strict Idempotency Check
    SELECT id, product_id, quantity INTO v_sale_id, v_existing_product, v_existing_qty FROM public.sales WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        IF v_existing_product != p_product_id OR v_existing_qty != p_quantity THEN
            RAISE EXCEPTION 'Idempotency conflict: key used with different parameters';
        END IF;
        RETURN json_build_object('success', true, 'sale_id', v_sale_id, 'message', 'Idempotent request recovered');
    END IF;

    -- 5. Business Logic Validation
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    -- 6. Execute Mutations Atomically
    UPDATE public.products SET stock_level = stock_level - p_quantity WHERE id = p_product_id;

    INSERT INTO public.sales (store_id, product_id, quantity, total_price, channel, idempotency_key)
    VALUES (p_store_id, p_product_id, p_quantity, p_total_price, p_channel, p_idempotency_key)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.stock_movements (store_id, product_id, movement_type, quantity_changed, resulting_quantity, reference_id, idempotency_key)
    VALUES (p_store_id, p_product_id, 'SALE', -p_quantity, v_current_stock - p_quantity, v_sale_id::TEXT, p_idempotency_key);

    RETURN json_build_object('success', true, 'sale_id', v_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 8. ATOMIC ADJUSTMENT RPC
CREATE OR REPLACE FUNCTION public.process_stock_adjustment(
    p_store_id UUID,
    p_product_id UUID,
    p_action TEXT,
    p_quantity INTEGER,
    p_notes TEXT,
    p_idempotency_key TEXT
) RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
    v_movement_id UUID;
    v_existing_product UUID;
    v_existing_qty INTEGER;
    v_existing_type TEXT;
BEGIN
    -- 1. Input Validation
    IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    IF p_product_id IS NULL THEN RAISE EXCEPTION 'Invalid product_id'; END IF;
    IF p_store_id IS NULL THEN RAISE EXCEPTION 'Invalid store_id'; END IF;
    IF p_action NOT IN ('add', 'deduct') THEN RAISE EXCEPTION 'Invalid action'; END IF;
    IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN RAISE EXCEPTION 'Invalid idempotency_key'; END IF;

    -- 2. Explicit Ownership Validation
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized store';
    END IF;

    -- 3. Row Locking
    SELECT stock_level INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- 4. Strict Idempotency Check
    SELECT id, product_id, quantity_changed INTO v_movement_id, v_existing_product, v_existing_qty FROM public.stock_movements WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        IF v_existing_product != p_product_id OR ABS(v_existing_qty) != p_quantity THEN
            RAISE EXCEPTION 'Idempotency conflict: key used with different parameters';
        END IF;
        RETURN json_build_object('success', true, 'movement_id', v_movement_id, 'message', 'Idempotent request recovered');
    END IF;

    -- 5. Business Logic Validation
    IF p_action = 'deduct' AND v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for deduction';
    END IF;

    -- 6. Execute Mutations Atomically
    IF p_action = 'add' THEN
        UPDATE public.products SET stock_level = stock_level + p_quantity WHERE id = p_product_id;
    ELSE
        UPDATE public.products SET stock_level = stock_level - p_quantity WHERE id = p_product_id;
    END IF;

    INSERT INTO public.stock_movements (store_id, product_id, movement_type, quantity_changed, resulting_quantity, reference_id, idempotency_key)
    VALUES (
        p_store_id, p_product_id, 'ADJUSTMENT', 
        CASE WHEN p_action = 'add' THEN p_quantity ELSE -p_quantity END, 
        CASE WHEN p_action = 'add' THEN v_current_stock + p_quantity ELSE v_current_stock - p_quantity END, 
        p_notes, p_idempotency_key
    ) RETURNING id INTO v_movement_id;

    RETURN json_build_object('success', true, 'movement_id', v_movement_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 9. RPC EXECUTE PRIVILEGES
REVOKE EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- 10. REALTIME PREPARATION
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'stock_movements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
  END IF;
END $$;

COMMIT;
