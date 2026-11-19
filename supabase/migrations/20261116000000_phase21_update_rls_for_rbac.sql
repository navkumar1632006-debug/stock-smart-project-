-- Migration: 20261116000000_phase21_update_rls_for_rbac.sql
-- Description: Security Hardening & Role-Based Access Control (RBAC) Policy Alignment
-- Targets: products, batches, sales, invoices, suppliers, forecasts, stock_movements
-- Stored Procedures: process_sale, process_stock_adjustment, process_khata_transaction

BEGIN;

-- ============================================================================
-- 1. DROP RESTRICTIVE & LEGACY POLICIES
-- ============================================================================

-- Products
DROP POLICY IF EXISTS "Users can manage products in their store" ON public.products;
DROP POLICY IF EXISTS "Users can view products in their store" ON public.products;
DROP POLICY IF EXISTS "Users can insert products in their store" ON public.products;
DROP POLICY IF EXISTS "Users can update products in their store" ON public.products;
DROP POLICY IF EXISTS "Users can delete products in their store" ON public.products;

-- Batches
DROP POLICY IF EXISTS "Users can manage batches in their store" ON public.batches;
DROP POLICY IF EXISTS "Users can view batches in their store" ON public.batches;
DROP POLICY IF EXISTS "Users can insert batches in their store" ON public.batches;
DROP POLICY IF EXISTS "Users can update batches in their store" ON public.batches;
DROP POLICY IF EXISTS "Users can delete batches in their store" ON public.batches;

-- Sales
DROP POLICY IF EXISTS "Users can manage sales in their store" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales in their store" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their store" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their store" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their store" ON public.sales;

-- Invoices
DROP POLICY IF EXISTS "Users view invoices in their store" ON public.invoices;
DROP POLICY IF EXISTS "Users insert invoices in their store" ON public.invoices;
DROP POLICY IF EXISTS "Users update invoices in their store" ON public.invoices;
DROP POLICY IF EXISTS "Users delete invoices in their store" ON public.invoices;

-- Suppliers
DROP POLICY IF EXISTS "Users can manage suppliers in their store" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers in their store" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers in their store" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update suppliers in their store" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers in their store" ON public.suppliers;

-- Forecasts
DROP POLICY IF EXISTS "Users can view forecasts in their store" ON public.forecasts;
DROP POLICY IF EXISTS "Users can insert forecasts in their store" ON public.forecasts;
DROP POLICY IF EXISTS "Users can update forecasts in their store" ON public.forecasts;
DROP POLICY IF EXISTS "Users can delete forecasts in their store" ON public.forecasts;

-- Stock Movements
DROP POLICY IF EXISTS "Users view stock movements in their store" ON public.stock_movements;
DROP POLICY IF EXISTS "Users manage stock movements in their store" ON public.stock_movements;
DROP POLICY IF EXISTS "Users insert stock movements in their store" ON public.stock_movements;

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ACROSS ALL RELEVANT TABLES
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. REPLACEMENT RBAC POLICIES (UTILIZING public.has_store_role)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRODUCTS TABLE
-- - Select: Owner, Manager, Inventory Clerk, Cashier
-- - Insert: Owner, Manager, Inventory Clerk
-- - Update: Owner, Manager, Inventory Clerk
-- - Delete: Owner, Manager
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_products_select" ON public.products
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk', 'cashier']));

CREATE POLICY "rbac_products_insert" ON public.products
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_products_update" ON public.products
    FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_products_delete" ON public.products
    FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));

-- ----------------------------------------------------------------------------
-- BATCHES TABLE (FEFO Expiry Management)
-- - Select: Owner, Manager, Inventory Clerk, Cashier
-- - Insert: Owner, Manager, Inventory Clerk
-- - Update: Owner, Manager, Inventory Clerk
-- - Delete: Owner, Manager
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_batches_select" ON public.batches
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk', 'cashier']));

CREATE POLICY "rbac_batches_insert" ON public.batches
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_batches_update" ON public.batches
    FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_batches_delete" ON public.batches
    FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));

-- ----------------------------------------------------------------------------
-- SALES TABLE (Register & POS)
-- - Select: Owner, Manager, Cashier
-- - Insert: Owner, Manager, Cashier
-- - Update: Owner, Manager
-- - Delete: Owner, Manager
-- (Inventory Clerks have NO access to sales data)
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_sales_select" ON public.sales
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

CREATE POLICY "rbac_sales_insert" ON public.sales
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

CREATE POLICY "rbac_sales_update" ON public.sales
    FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager']));

CREATE POLICY "rbac_sales_delete" ON public.sales
    FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));

-- ----------------------------------------------------------------------------
-- INVOICES TABLE (Tax & Receipts)
-- - Select: Owner, Manager, Cashier
-- - Insert: Owner, Manager, Cashier
-- - Update: Owner, Manager
-- - Delete: Owner, Manager
-- (Inventory Clerks have NO access to invoices)
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_invoices_select" ON public.invoices
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

CREATE POLICY "rbac_invoices_insert" ON public.invoices
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

CREATE POLICY "rbac_invoices_update" ON public.invoices
    FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager']));

CREATE POLICY "rbac_invoices_delete" ON public.invoices
    FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));

-- ----------------------------------------------------------------------------
-- SUPPLIERS TABLE
-- - Select: Owner, Manager, Inventory Clerk
-- - Insert: Owner, Manager, Inventory Clerk
-- - Update: Owner, Manager, Inventory Clerk
-- - Delete: Owner, Manager
-- (Cashiers have NO access to supplier catalog)
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_suppliers_select" ON public.suppliers
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_suppliers_insert" ON public.suppliers
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_suppliers_update" ON public.suppliers
    FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_suppliers_delete" ON public.suppliers
    FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));

-- ----------------------------------------------------------------------------
-- FORECASTS TABLE (AI Demand Analytics)
-- - Select: Owner, Manager
-- - Insert: Owner, Manager
-- - Update: Owner, Manager
-- - Delete: Owner, Manager
-- (Cashiers and Inventory Clerks have NO access to executive forecasts)
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_forecasts_select" ON public.forecasts
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager']));

CREATE POLICY "rbac_forecasts_insert" ON public.forecasts
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager']));

CREATE POLICY "rbac_forecasts_update" ON public.forecasts
    FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager']));

CREATE POLICY "rbac_forecasts_delete" ON public.forecasts
    FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));

-- ----------------------------------------------------------------------------
-- STOCK MOVEMENTS TABLE (Audit Trail)
-- - Select: Owner, Manager, Inventory Clerk
-- - Insert: Owner, Manager, Inventory Clerk
-- ----------------------------------------------------------------------------
CREATE POLICY "rbac_stock_movements_select" ON public.stock_movements
    FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "rbac_stock_movements_insert" ON public.stock_movements
    FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));


-- ============================================================================
-- 4. SECURE STORED PROCEDURES (SECURITY DEFINER + search_path = public)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RPC 1: process_sale
-- Hardened: Checks has_store_role('manager', 'cashier'), search_path = public,
-- row locking FOR UPDATE, strict idempotency, prevents negative stock.
-- ----------------------------------------------------------------------------
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
    IF p_quantity IS NULL OR p_quantity <= 0 THEN 
        RAISE EXCEPTION 'Invalid quantity: must be greater than zero'; 
    END IF;
    IF p_total_price IS NULL OR p_total_price < 0 THEN 
        RAISE EXCEPTION 'Invalid total_price: cannot be negative'; 
    END IF;
    IF p_product_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid product_id: product reference is required'; 
    END IF;
    IF p_store_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid store_id: store reference is required'; 
    END IF;
    IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN 
        RAISE EXCEPTION 'Invalid idempotency_key: key is required'; 
    END IF;
    IF p_channel NOT IN ('In-Store', 'Hyperlocal App', 'Online') THEN 
        RAISE EXCEPTION 'Invalid channel: must be In-Store, Hyperlocal App, or Online'; 
    END IF;

    -- 2. Role-Based Access Control Verification
    -- Allows Store Owner (handled automatically by has_store_role), Manager, and Cashier
    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'cashier']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be store owner, manager, or cashier';
    END IF;

    -- 3. Row Locking for Concurrency Safety
    SELECT stock_level INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found in this store';
    END IF;

    -- 4. Strict Idempotency Check
    SELECT id, product_id, quantity INTO v_sale_id, v_existing_product, v_existing_qty 
    FROM public.sales 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_product != p_product_id OR v_existing_qty != p_quantity THEN
            RAISE EXCEPTION 'Idempotency conflict: key was previously used with different parameters';
        END IF;
        RETURN json_build_object(
            'success', true, 
            'sale_id', v_sale_id, 
            'message', 'Idempotent request recovered'
        );
    END IF;

    -- 5. Business Logic Validation
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock: requested % units but only % available', p_quantity, v_current_stock;
    END IF;

    -- 6. Atomic Mutations
    UPDATE public.products 
    SET stock_level = stock_level - p_quantity 
    WHERE id = p_product_id;

    INSERT INTO public.sales (store_id, product_id, quantity, total_price, channel, idempotency_key)
    VALUES (p_store_id, p_product_id, p_quantity, p_total_price, p_channel, p_idempotency_key)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.stock_movements (
        store_id, product_id, movement_type, quantity_changed, resulting_quantity, reference_id, idempotency_key
    ) VALUES (
        p_store_id, p_product_id, 'SALE', -p_quantity, v_current_stock - p_quantity, v_sale_id::TEXT, p_idempotency_key
    );

    RETURN json_build_object('success', true, 'sale_id', v_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------------------------------
-- RPC 2: process_stock_adjustment
-- Hardened: Checks has_store_role('manager', 'inventory_clerk'), search_path = public,
-- row locking FOR UPDATE, strict idempotency, prevents negative deductions.
-- ----------------------------------------------------------------------------
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
BEGIN
    -- 1. Input Validation
    IF p_quantity IS NULL OR p_quantity <= 0 THEN 
        RAISE EXCEPTION 'Invalid quantity: must be positive'; 
    END IF;
    IF p_product_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid product_id: product reference is required'; 
    END IF;
    IF p_store_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid store_id: store reference is required'; 
    END IF;
    IF p_action NOT IN ('add', 'deduct') THEN 
        RAISE EXCEPTION 'Invalid action: must be add or deduct'; 
    END IF;
    IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN 
        RAISE EXCEPTION 'Invalid idempotency_key: key is required'; 
    END IF;

    -- 2. Role-Based Access Control Verification
    -- Allows Store Owner, Manager, and Inventory Clerk
    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'inventory_clerk']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be store owner, manager, or inventory clerk';
    END IF;

    -- 3. Row Locking for Concurrency Safety
    SELECT stock_level INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found in this store';
    END IF;

    -- 4. Strict Idempotency Check
    SELECT id, product_id, quantity_changed INTO v_movement_id, v_existing_product, v_existing_qty 
    FROM public.stock_movements 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_product != p_product_id OR ABS(v_existing_qty) != p_quantity THEN
            RAISE EXCEPTION 'Idempotency conflict: key was previously used with different parameters';
        END IF;
        RETURN json_build_object(
            'success', true, 
            'movement_id', v_movement_id, 
            'message', 'Idempotent request recovered'
        );
    END IF;

    -- 5. Business Logic Validation
    IF p_action = 'deduct' AND v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for deduction: available % units, requested deduction %', v_current_stock, p_quantity;
    END IF;

    -- 6. Atomic Mutations
    IF p_action = 'add' THEN
        UPDATE public.products 
        SET stock_level = stock_level + p_quantity 
        WHERE id = p_product_id;
    ELSE
        UPDATE public.products 
        SET stock_level = stock_level - p_quantity 
        WHERE id = p_product_id;
    END IF;

    INSERT INTO public.stock_movements (
        store_id, product_id, movement_type, quantity_changed, resulting_quantity, reference_id, idempotency_key
    ) VALUES (
        p_store_id, p_product_id, 'ADJUSTMENT', 
        CASE WHEN p_action = 'add' THEN p_quantity ELSE -p_quantity END, 
        CASE WHEN p_action = 'add' THEN v_current_stock + p_quantity ELSE v_current_stock - p_quantity END, 
        p_notes, p_idempotency_key
    ) RETURNING id INTO v_movement_id;

    RETURN json_build_object('success', true, 'movement_id', v_movement_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------------------------------
-- RPC 3: process_khata_transaction
-- Hardened: Checks has_store_role('manager', 'cashier'), search_path = public,
-- row locking FOR UPDATE, atomic balance update.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_khata_transaction(
    p_store_id UUID,
    p_customer_id UUID,
    p_type TEXT,
    p_amount DECIMAL,
    p_reference TEXT
) RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_tx_id UUID;
BEGIN
    -- 1. Input Validation
    IF p_type NOT IN ('credit', 'debit') THEN
        RAISE EXCEPTION 'Invalid transaction type: must be credit or debit';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: must be positive';
    END IF;
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Invalid store_id: store reference required';
    END IF;
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid customer_id: customer reference required';
    END IF;

    -- 2. Role-Based Access Control Verification
    -- Allows Store Owner, Manager, and Cashier
    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'cashier']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be store owner, manager, or cashier';
    END IF;

    -- 3. Row Locking on Customer Record
    SELECT balance INTO v_current_balance
    FROM public.khata_customers
    WHERE id = p_customer_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Khata customer not found in this store';
    END IF;

    -- 4. Calculate New Balance
    IF p_type = 'credit' THEN
        v_new_balance := v_current_balance + p_amount;
    ELSE
        v_new_balance := v_current_balance - p_amount;
    END IF;

    -- 5. Atomic Insertion and Customer Balance Update
    INSERT INTO public.khata_transactions (
        khata_customer_id,
        store_id,
        type,
        amount,
        reference
    ) VALUES (
        p_customer_id,
        p_store_id,
        p_type,
        p_amount,
        p_reference
    ) RETURNING id INTO v_tx_id;

    UPDATE public.khata_customers
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN json_build_object(
        'success', true, 
        'transaction_id', v_tx_id, 
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 5. EXECUTION PRIVILEGES (AUTHENTICATED ONLY)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_khata_transaction(UUID, UUID, TEXT, DECIMAL, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_khata_transaction(UUID, UUID, TEXT, DECIMAL, TEXT) TO authenticated;

COMMIT;
