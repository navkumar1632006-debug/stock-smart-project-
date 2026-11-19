-- Migration: 20261116010000_phase22_harden_rls_and_stored_procedures.sql
-- Description: Production-Hardened Security, Strictly RPC-Mediated Mutability, Search Path Neutralization, and Multi-Batch FEFO
-- Target Tables: stores, products, sales, sale_items, inventory_batches, inventory_movements, stock_adjustments, khata_customers, khata_transactions, loyalty_customers, loyalty_transactions, purchase_orders, purchase_order_items
-- Procedures: has_store_role, is_active_store_staff, process_sale, process_stock_adjustment, process_khata_transaction, process_loyalty_transaction, send_purchase_order, receive_purchase_order

BEGIN;

-- ============================================================================
-- 1. SECURITY DEFINER HELPERS: has_store_role & is_active_store_staff
-- Explicitly validates Store Owners first, then checks active staff assignments.
-- is_active_store_staff breaks RLS recursion between stores and store_staff.
-- Hardened search_path = '' (zero search path hijacking risk)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_active_store_staff(target_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL OR target_store_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.store_staff
        WHERE store_id = target_store_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_store_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_store_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_store_role(target_store_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    is_owner boolean;
    has_role boolean;
BEGIN
    IF auth.uid() IS NULL OR target_store_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Fast check for store ownership (Owner always has full permissions)
    SELECT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = target_store_id AND owner_id = auth.uid()
    ) INTO is_owner;

    IF is_owner THEN
        RETURN true;
    END IF;

    -- 2. Check active staff role assignment
    SELECT EXISTS (
        SELECT 1 FROM public.store_staff
        WHERE store_id = target_store_id 
          AND user_id = auth.uid() 
          AND status = 'active' 
          AND role = ANY(allowed_roles)
    ) INTO has_role;

    RETURN COALESCE(has_role, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_store_role(uuid, text[]) TO authenticated;


-- ============================================================================
-- 2. SCHEMA ALIGNMENT: FINANCIAL COLUMNS, DEDICATED ADJUSTMENTS, IDEMPOTENCY
-- ============================================================================

-- Ensure products.selling_price exists with a default and synchronize price / selling_price
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_price NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.products ALTER COLUMN selling_price SET DEFAULT 0;
UPDATE public.products SET selling_price = COALESCE(price, 0) WHERE selling_price = 0 OR selling_price IS NULL;
ALTER TABLE public.products ALTER COLUMN selling_price SET NOT NULL;

ALTER TABLE public.products ALTER COLUMN price SET DEFAULT 0;
UPDATE public.products SET price = COALESCE(price, 0) WHERE price IS NULL;
ALTER TABLE public.products ALTER COLUMN price SET NOT NULL;

-- Ensure products.stock_level is non-null with 0 default
ALTER TABLE public.products ALTER COLUMN stock_level SET DEFAULT 0;
UPDATE public.products SET stock_level = 0 WHERE stock_level IS NULL;
ALTER TABLE public.products ALTER COLUMN stock_level SET NOT NULL;

-- Trigger to guarantee mutual consistency between price and selling_price
CREATE OR REPLACE FUNCTION public.sync_product_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.selling_price IS NOT NULL AND NEW.selling_price > 0 AND (NEW.price IS NULL OR NEW.price = 0) THEN
            NEW.price := NEW.selling_price;
        ELSIF NEW.price IS NOT NULL AND NEW.price > 0 AND (NEW.selling_price IS NULL OR NEW.selling_price = 0) THEN
            NEW.selling_price := NEW.price;
        ELSIF NEW.selling_price IS NOT NULL AND NEW.selling_price > 0 THEN
            NEW.price := NEW.selling_price;
        ELSE
            NEW.price := COALESCE(NEW.price, 0);
            NEW.selling_price := COALESCE(NEW.selling_price, NEW.price, 0);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case 1: Both changed simultaneously to different values -> selling_price authoritatively wins as retail standard
        IF (NEW.selling_price IS DISTINCT FROM OLD.selling_price) AND (NEW.price IS DISTINCT FROM OLD.price) THEN
            IF NEW.selling_price IS DISTINCT FROM NEW.price THEN
                NEW.price := NEW.selling_price;
            END IF;
        -- Case 2: Only selling_price changed -> propagate to price
        ELSIF NEW.selling_price IS DISTINCT FROM OLD.selling_price THEN
            NEW.price := NEW.selling_price;
        -- Case 3: Only price changed -> propagate to selling_price
        ELSIF NEW.price IS DISTINCT FROM OLD.price THEN
            NEW.selling_price := NEW.price;
        ELSE
            -- Case 4: Neither explicitly changed, but sanitize any NULL/zero values
            IF NEW.selling_price IS NULL OR NEW.selling_price = 0 THEN
                NEW.selling_price := COALESCE(NEW.price, 0);
            END IF;
            IF NEW.price IS NULL OR NEW.price = 0 THEN
                NEW.price := COALESCE(NEW.selling_price, 0);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_pricing ON public.products;
CREATE TRIGGER trg_sync_product_pricing
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.sync_product_pricing();

-- Ensure sales financial columns exist and explicitly retrofit defaults and NOT NULL constraints
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.sales ALTER COLUMN sale_date SET DEFAULT CURRENT_DATE;
UPDATE public.sales SET sale_date = CURRENT_DATE WHERE sale_date IS NULL;
ALTER TABLE public.sales ALTER COLUMN sale_date SET NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE public.sales ALTER COLUMN status SET DEFAULT 'COMPLETED';
UPDATE public.sales SET status = 'COMPLETED' WHERE status IS NULL;
ALTER TABLE public.sales ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS grand_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.sales ALTER COLUMN grand_total SET DEFAULT 0;
UPDATE public.sales SET grand_total = 0 WHERE grand_total IS NULL;
ALTER TABLE public.sales ALTER COLUMN grand_total SET NOT NULL;

-- Maintain total_price compatibility column synchronized with grand_total
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS total_price NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.sales ALTER COLUMN total_price SET DEFAULT 0;
UPDATE public.sales SET total_price = COALESCE(grand_total, 0) WHERE total_price IS NULL OR total_price = 0;
UPDATE public.sales SET grand_total = total_price WHERE (grand_total IS NULL OR grand_total = 0) AND total_price > 0;
ALTER TABLE public.sales ALTER COLUMN total_price SET NOT NULL;

-- Bidirectional trigger ensuring total_price and grand_total stay synchronized across all operations
CREATE OR REPLACE FUNCTION public.sync_sales_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.grand_total IS NOT NULL AND NEW.grand_total > 0 AND (NEW.total_price IS NULL OR NEW.total_price = 0) THEN
            NEW.total_price := NEW.grand_total;
        ELSIF NEW.total_price IS NOT NULL AND NEW.total_price > 0 AND (NEW.grand_total IS NULL OR NEW.grand_total = 0) THEN
            NEW.grand_total := NEW.total_price;
        ELSIF NEW.grand_total IS NOT NULL AND NEW.grand_total > 0 THEN
            NEW.total_price := NEW.grand_total;
        ELSE
            NEW.grand_total := COALESCE(NEW.grand_total, NEW.total_price, 0);
            NEW.total_price := NEW.grand_total;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case 1: Both changed simultaneously to different values -> grand_total authoritatively wins
        IF (NEW.grand_total IS DISTINCT FROM OLD.grand_total) AND (NEW.total_price IS DISTINCT FROM OLD.total_price) THEN
            IF NEW.grand_total IS DISTINCT FROM NEW.total_price THEN
                NEW.total_price := NEW.grand_total;
            END IF;
        -- Case 2: Only grand_total changed -> propagate to total_price
        ELSIF NEW.grand_total IS DISTINCT FROM OLD.grand_total THEN
            NEW.total_price := NEW.grand_total;
        -- Case 3: Only total_price changed -> propagate to grand_total
        ELSIF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
            NEW.grand_total := NEW.total_price;
        ELSE
            -- Case 4: Neither explicitly changed, but sanitize any NULL/zero values
            IF NEW.grand_total IS NULL OR NEW.grand_total = 0 THEN
                NEW.grand_total := COALESCE(NEW.total_price, 0);
            END IF;
            IF NEW.total_price IS NULL OR NEW.total_price = 0 THEN
                NEW.total_price := COALESCE(NEW.grand_total, 0);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sales_totals ON public.sales;
CREATE TRIGGER trg_sync_sales_totals
    BEFORE INSERT OR UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.sync_sales_totals();

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.sales ALTER COLUMN subtotal SET DEFAULT 0;
UPDATE public.sales SET subtotal = 0 WHERE subtotal IS NULL;
ALTER TABLE public.sales ALTER COLUMN subtotal SET NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.sales ALTER COLUMN tax_total SET DEFAULT 0;
UPDATE public.sales SET tax_total = 0 WHERE tax_total IS NULL;
ALTER TABLE public.sales ALTER COLUMN tax_total SET NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_idempotency_key 
    ON public.sales(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Ensure sale_items.unit_price has unconstrained precision (supports 4+ decimal places without typmod rounding)
ALTER TABLE public.sale_items ALTER COLUMN unit_price TYPE NUMERIC;

-- Dedicated stock_adjustments table for atomic, exact idempotency verification (persisting all material parameters)
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    action TEXT NOT NULL CHECK (action IN ('add', 'deduct')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_adj_store_prod ON public.stock_adjustments(store_id, product_id);

-- Idempotency keys on inventory_movements, khata, and loyalty
ALTER TABLE public.inventory_movements 
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.inventory_movements 
    ADD COLUMN IF NOT EXISTS purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_movements_idempotency_key 
    ON public.inventory_movements(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_movements_po_item 
    ON public.inventory_movements(purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;

-- Ensure purchase_order_items has unit_cost with appropriate default
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.purchase_order_items ALTER COLUMN unit_cost SET DEFAULT 0;
UPDATE public.purchase_order_items SET unit_cost = 0 WHERE unit_cost IS NULL;
ALTER TABLE public.purchase_order_items ALTER COLUMN unit_cost SET NOT NULL;

-- Drop unit_price column if it was introduced during migration attempts
ALTER TABLE public.purchase_order_items DROP COLUMN IF EXISTS unit_price;

-- Fix Fractional Math Trap: Enforce strict INTEGER types on purchase_order_items.quantity and received_quantity
UPDATE public.purchase_order_items SET quantity = ROUND(quantity)::INTEGER WHERE quantity IS NOT NULL;
UPDATE public.purchase_order_items SET quantity = 1 WHERE quantity IS NULL OR quantity <= 0;
ALTER TABLE public.purchase_order_items ALTER COLUMN quantity TYPE INTEGER USING ROUND(quantity)::INTEGER;
ALTER TABLE public.purchase_order_items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE public.purchase_order_items ALTER COLUMN quantity SET NOT NULL;

UPDATE public.purchase_order_items SET received_quantity = ROUND(received_quantity)::INTEGER WHERE received_quantity IS NOT NULL;
UPDATE public.purchase_order_items SET received_quantity = 0 WHERE received_quantity IS NULL;
ALTER TABLE public.purchase_order_items ALTER COLUMN received_quantity TYPE INTEGER USING ROUND(received_quantity)::INTEGER;
ALTER TABLE public.purchase_order_items ALTER COLUMN received_quantity SET DEFAULT 0;
ALTER TABLE public.purchase_order_items ALTER COLUMN received_quantity SET NOT NULL;

ALTER TABLE public.khata_transactions 
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_khata_transactions_idempotency_key 
    ON public.khata_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.loyalty_transactions 
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_transactions_idempotency_key 
    ON public.loyalty_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Ensure purchase_orders has store_id with ON DELETE RESTRICT (audit preservation)
ALTER TABLE public.purchase_orders 
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT;

-- PO Backfill Remediation Pipeline:
-- 1. Backfill from associated supplier when store_id is explicit on supplier
UPDATE public.purchase_orders po
SET store_id = s.store_id
FROM public.suppliers s
WHERE po.supplier_id = s.id AND po.store_id IS NULL AND s.store_id IS NOT NULL;

-- 2. Backfill from purchase_order_items products if supplier lacked store_id (shared supplier)
UPDATE public.purchase_orders po
SET store_id = p.store_id
FROM public.purchase_order_items poi
JOIN public.products p ON p.id = poi.product_id
WHERE po.id = poi.purchase_order_id AND po.store_id IS NULL AND p.store_id IS NOT NULL;

-- 3. Strict Cross-Tenant Verification & Zero-Orphan Assertion
-- (Shared suppliers with s.store_id IS NULL are permitted; foreign store suppliers are rejected)
DO $$
DECLARE
    v_mismatched_supplier_count INTEGER;
    v_mismatched_item_count INTEGER;
    v_orphan_count INTEGER;
BEGIN
    -- Verify no PO has a private supplier belonging to a different store
    SELECT COUNT(*) INTO v_mismatched_supplier_count
    FROM public.purchase_orders po
    JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE po.store_id IS NOT NULL AND s.store_id IS NOT NULL AND (s.store_id IS DISTINCT FROM po.store_id);

    IF v_mismatched_supplier_count > 0 THEN
        RAISE EXCEPTION 'Purchase order store conflict: % purchase orders have suppliers belonging to a different store', v_mismatched_supplier_count;
    END IF;

    -- Verify no PO item has a product belonging to a different store or unassigned store
    SELECT COUNT(*) INTO v_mismatched_item_count
    FROM public.purchase_order_items poi
    JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
    JOIN public.products p ON p.id = poi.product_id
    WHERE po.store_id IS NOT NULL AND (p.store_id IS DISTINCT FROM po.store_id OR p.store_id IS NULL);

    IF v_mismatched_item_count > 0 THEN
        RAISE EXCEPTION 'Purchase order item store conflict: % purchase order items belong to a different store than parent PO', v_mismatched_item_count;
    END IF;

    -- Assert zero purchase orders have NULL store_id
    SELECT COUNT(*) INTO v_orphan_count FROM public.purchase_orders WHERE store_id IS NULL;
    IF v_orphan_count > 0 THEN
        RAISE EXCEPTION 'Purchase orders store backfill incomplete: % rows lack store_id and cannot be resolved automatically. Explicit mapping required.', v_orphan_count;
    END IF;
END $$;

ALTER TABLE public.purchase_orders ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_po_store_id ON public.purchase_orders(store_id);


-- ============================================================================
-- 3. DYNAMIC PURGE OF PRE-EXISTING PERMISSIVE RLS POLICIES
-- ============================================================================

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_catalog.pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'stores', 
              'products',
              'sales',
              'sale_items',
              'inventory_batches',
              'inventory_movements',
              'stock_adjustments',
              'khata_customers', 
              'khata_transactions', 
              'loyalty_customers', 
              'loyalty_transactions', 
              'purchase_orders', 
              'purchase_order_items'
          )
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP; 
END $$;


-- ============================================================================
-- 4. STRICT RLS POLICIES (TO authenticated ONLY)
-- Anonymous access revoked. All transactional state mutations MUST be
-- executed through SECURITY DEFINER RPCs.
-- ============================================================================

-- STORES (Metadata management)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_owner_manage" ON public.stores
    FOR ALL TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "stores_staff_select" ON public.stores
    FOR SELECT TO authenticated
    USING (
        public.is_active_store_staff(id)
    );

-- PRODUCTS (Metadata editable by Owners/Managers; stock changes RPC-mediated)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk', 'cashier'])
    );

CREATE POLICY "products_insert" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    );

CREATE POLICY "products_update" ON public.products
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    );

CREATE POLICY "products_delete" ON public.products
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- COLUMN-LEVEL PRIVILEGE ENFORCEMENT ON SENSITIVE INVENTORY & BALANCE FIELDS
-- Revokes table-level INSERT and UPDATE from PUBLIC, anon, and authenticated.
-- Grants INSERT and UPDATE ONLY on live metadata columns (including selling_price).
-- ----------------------------------------------------------------------------

-- Revoke all table-wide write permissions from anon and PUBLIC
REVOKE ALL ON public.products, public.khata_customers, public.loyalty_customers FROM anon, PUBLIC;

-- Products: Revoke table-wide INSERT/UPDATE and grant specific live columns (including selling_price)
REVOKE INSERT, UPDATE ON public.products FROM authenticated;
GRANT SELECT, DELETE ON public.products TO authenticated;
GRANT INSERT (
    store_id, name, category, sku, price, selling_price, cost, reorder_point, is_fresh_product, hsn_code
) ON public.products TO authenticated;
GRANT UPDATE (
    name, category, sku, price, selling_price, cost, reorder_point, is_fresh_product, hsn_code, updated_at
) ON public.products TO authenticated;

-- Khata Customers: Revoke table-wide INSERT/UPDATE and grant specific live columns
REVOKE INSERT, UPDATE ON public.khata_customers FROM authenticated;
GRANT SELECT, DELETE ON public.khata_customers TO authenticated;
GRANT INSERT (
    store_id, name, phone
) ON public.khata_customers TO authenticated;
GRANT UPDATE (
    name, phone, updated_at
) ON public.khata_customers TO authenticated;

-- Loyalty Customers: Revoke table-wide INSERT/UPDATE and grant specific live columns
REVOKE INSERT, UPDATE ON public.loyalty_customers FROM authenticated;
GRANT SELECT, DELETE ON public.loyalty_customers TO authenticated;
GRANT INSERT (
    store_id, name, phone
) ON public.loyalty_customers TO authenticated;
GRANT UPDATE (
    name, phone, updated_at
) ON public.loyalty_customers TO authenticated;

-- ----------------------------------------------------------------------------
-- ENGINE-LEVEL TRIGGER GUARD (SECURITY INVOKER - DEFENSE IN DEPTH)
-- Runs as caller (current_user = 'authenticated' for direct PostgREST calls;
-- runs as 'postgres' inside SECURITY DEFINER procedures).
-- Prevents clients from supplying initial non-zero balances or modifying stock directly.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_direct_balance_stock_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Direct client updates/inserts execute with current_user = 'authenticated' or 'anon'.
    -- SECURITY DEFINER procedures execute with the function owner's role (e.g. postgres).
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF TG_TABLE_NAME = 'products' AND NEW.stock_level IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial stock_level on products must be 0. Use process_stock_adjustment or receive_purchase_order.';
            ELSIF TG_TABLE_NAME = 'khata_customers' AND NEW.balance IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial balance on khata_customers must be 0. Use process_khata_transaction.';
            ELSIF TG_TABLE_NAME = 'loyalty_customers' AND NEW.points_balance IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial points_balance on loyalty_customers must be 0. Use process_loyalty_transaction.';
            ELSIF TG_TABLE_NAME = 'purchase_order_items' AND NEW.received_quantity IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial received_quantity on purchase_order_items must be 0. Use receive_purchase_order.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF TG_TABLE_NAME = 'products' AND NEW.stock_level IS DISTINCT FROM OLD.stock_level THEN
                RAISE EXCEPTION 'Security violation: products.stock_level cannot be updated directly. Use process_sale, process_stock_adjustment, or receive_purchase_order.';
            ELSIF TG_TABLE_NAME = 'khata_customers' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
                RAISE EXCEPTION 'Security violation: khata_customers.balance cannot be updated directly. Use process_khata_transaction.';
            ELSIF TG_TABLE_NAME = 'loyalty_customers' AND NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
                RAISE EXCEPTION 'Security violation: loyalty_customers.points_balance cannot be updated directly. Use process_loyalty_transaction.';
            ELSIF TG_TABLE_NAME = 'purchase_order_items' AND NEW.received_quantity IS DISTINCT FROM OLD.received_quantity THEN
                RAISE EXCEPTION 'Security violation: purchase_order_items.received_quantity cannot be updated directly. Use receive_purchase_order.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_product_stock ON public.products;
CREATE TRIGGER trg_guard_product_stock
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_balance_stock_mutations();

DROP TRIGGER IF EXISTS trg_guard_khata_balance ON public.khata_customers;
CREATE TRIGGER trg_guard_khata_balance
    BEFORE INSERT OR UPDATE ON public.khata_customers
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_balance_stock_mutations();

DROP TRIGGER IF EXISTS trg_guard_loyalty_points ON public.loyalty_customers;
CREATE TRIGGER trg_guard_loyalty_points
    BEFORE INSERT OR UPDATE ON public.loyalty_customers
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_balance_stock_mutations();

DROP TRIGGER IF EXISTS trg_guard_poi_received ON public.purchase_order_items;
CREATE TRIGGER trg_guard_poi_received
    BEFORE INSERT OR UPDATE ON public.purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_balance_stock_mutations();

-- SALES: STRICTLY READ-ONLY FOR CLIENTS (Writes RPC-mediated via process_sale)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select" ON public.sales
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

-- SALE ITEMS: STRICTLY READ-ONLY FOR CLIENTS (Atomic insertion via process_sale)
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items_select" ON public.sale_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores st WHERE st.id = s.store_id AND st.owner_id = auth.uid())
                  OR public.has_store_role(s.store_id, ARRAY['manager', 'cashier'])
              )
        )
    );

-- INVENTORY BATCHES: STRICTLY READ-ONLY FOR CLIENTS (Mutations RPC-mediated)
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_batches_select" ON public.inventory_batches
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p.store_id AND s.owner_id = auth.uid())
                  OR public.has_store_role(p.store_id, ARRAY['manager', 'inventory_clerk', 'cashier'])
              )
        )
    );

-- INVENTORY MOVEMENTS: STRICTLY READ-ONLY FOR CLIENTS (Append-only via RPCs)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_movements_select" ON public.inventory_movements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p.store_id AND s.owner_id = auth.uid())
                  OR public.has_store_role(p.store_id, ARRAY['manager', 'inventory_clerk'])
              )
        )
    );

-- STOCK ADJUSTMENTS: STRICTLY READ-ONLY FOR CLIENTS (Writes RPC-mediated)
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_adjustments_select" ON public.stock_adjustments
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    );

-- KHATA CUSTOMERS (Customer profile management)
ALTER TABLE public.khata_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khata_cust_select" ON public.khata_customers
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

CREATE POLICY "khata_cust_insert" ON public.khata_customers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

CREATE POLICY "khata_cust_update" ON public.khata_customers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager'])
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager'])
    );

-- KHATA TRANSACTIONS: STRICTLY READ-ONLY FOR CLIENTS (Writes RPC-mediated)
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khata_tx_select" ON public.khata_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

-- LOYALTY CUSTOMERS
ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_cust_select" ON public.loyalty_customers
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

CREATE POLICY "loyalty_cust_insert" ON public.loyalty_customers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

CREATE POLICY "loyalty_cust_update" ON public.loyalty_customers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager'])
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager'])
    );

-- LOYALTY TRANSACTIONS: STRICTLY READ-ONLY FOR CLIENTS (Writes RPC-mediated)
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_tx_select" ON public.loyalty_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'cashier'])
    );

-- PURCHASE ORDERS (Draft authoring with supplier store validation; transitions RPC-mediated)
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_select" ON public.purchase_orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    );

-- Write-path validation: supplier must belong to store_id or be a shared supplier (store_id IS NULL)
CREATE POLICY "po_insert" ON public.purchase_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
         OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']))
        AND status = 'DRAFT'
        AND EXISTS (
            SELECT 1 FROM public.suppliers s
            WHERE s.id = supplier_id
              AND (s.store_id = purchase_orders.store_id OR s.store_id IS NULL)
        )
    );

-- Updates restricted to DRAFT POs and cannot modify status away from DRAFT
CREATE POLICY "po_update" ON public.purchase_orders
    FOR UPDATE TO authenticated
    USING (
        (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
         OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']))
        AND status = 'DRAFT'
    )
    WITH CHECK (
        (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
         OR public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']))
        AND status = 'DRAFT'
        AND EXISTS (
            SELECT 1 FROM public.suppliers s
            WHERE s.id = supplier_id
              AND (s.store_id = purchase_orders.store_id OR s.store_id IS NULL)
        )
    );

CREATE POLICY "po_delete" ON public.purchase_orders
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        AND status = 'DRAFT'
    );

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poi_select" ON public.purchase_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = po.store_id AND s.owner_id = auth.uid())
                  OR public.has_store_role(po.store_id, ARRAY['manager', 'inventory_clerk'])
              )
        )
    );

-- Write-path validation: product_id MUST belong to the SAME store as the parent purchase order
CREATE POLICY "poi_insert" ON public.purchase_order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.products p ON p.id = product_id
            WHERE po.id = purchase_order_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = po.store_id AND s.owner_id = auth.uid())
                  OR public.has_store_role(po.store_id, ARRAY['manager', 'inventory_clerk'])
              )
              AND po.status = 'DRAFT'
              AND p.store_id = po.store_id
        )
    );

CREATE POLICY "poi_update" ON public.purchase_order_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = po.store_id AND s.owner_id = auth.uid())
                  OR public.has_store_role(po.store_id, ARRAY['manager', 'inventory_clerk'])
              )
              AND po.status = 'DRAFT'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.products p ON p.id = product_id
            WHERE po.id = purchase_order_id
              AND (
                  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = po.store_id AND s.owner_id = auth.uid())
                  OR public.has_store_role(po.store_id, ARRAY['manager', 'inventory_clerk'])
              )
              AND po.status = 'DRAFT'
              AND p.store_id = po.store_id
        )
    );

CREATE POLICY "poi_delete" ON public.purchase_order_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id
              AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = po.store_id AND s.owner_id = auth.uid())
              AND po.status = 'DRAFT'
        )
    );

-- Table grants for transactional and procurement tables
REVOKE ALL ON public.sales, public.sale_items, public.inventory_batches, 
              public.inventory_movements, public.stock_adjustments, 
              public.khata_transactions, public.loyalty_transactions, 
              public.purchase_orders, public.purchase_order_items FROM anon, PUBLIC;

GRANT SELECT ON public.sales, public.sale_items, public.inventory_batches, 
                public.inventory_movements, public.stock_adjustments, 
                public.khata_transactions, public.loyalty_transactions, 
                public.purchase_orders, public.purchase_order_items TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;

-- Column-Level Grants on purchase_order_items:
-- Explicitly permits creating and updating line items while strictly revoking direct mutability of received_quantity
REVOKE INSERT, UPDATE ON public.purchase_order_items FROM authenticated;
GRANT SELECT, DELETE ON public.purchase_order_items TO authenticated;
GRANT INSERT (
    purchase_order_id, product_id, quantity, unit_cost
) ON public.purchase_order_items TO authenticated;
GRANT UPDATE (
    quantity, unit_cost
) ON public.purchase_order_items TO authenticated;


-- ============================================================================
-- 5. COMPATIBILITY VIEW: stock_movements (SECURITY-INVOKER)
-- ============================================================================

CREATE OR REPLACE VIEW public.stock_movements 
WITH (security_invoker = true) AS 
SELECT 
    im.id,
    p.store_id,
    im.product_id,
    im.movement_type,
    im.quantity_delta AS quantity_changed,
    p.stock_level AS resulting_quantity,
    im.reference_id::TEXT AS reference_id,
    im.idempotency_key,
    im.created_at
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id;

REVOKE ALL ON public.stock_movements FROM PUBLIC, anon;
GRANT SELECT ON public.stock_movements TO authenticated;


-- ============================================================================
-- 6. HARDENED STORED PROCEDURES (SEARCH_PATH = '', UNEXPIRED FEFO ONLY)
-- ============================================================================

-- Drop all legacy overloads to prevent ambiguous or stale procedure routing
DROP FUNCTION IF EXISTS public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT, NUMERIC);

DROP FUNCTION IF EXISTS public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID);

DROP FUNCTION IF EXISTS public.send_purchase_order(UUID, UUID);

DROP FUNCTION IF EXISTS public.receive_purchase_order(UUID, UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.receive_purchase_order(UUID, UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.receive_purchase_order(UUID, UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.receive_purchase_order(UUID, UUID, UUID, NUMERIC, TEXT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.receive_purchase_order(UUID, UUID, UUID, INTEGER, TEXT, DATE, TEXT);

-- ----------------------------------------------------------------------------
-- PROCEDURE 1: process_sale
-- Hardened: p_total_price represents the GROSS TOTAL (consumer checkout price, grand_total).
-- Supports optional p_tax_total (default 0). Aligns grand_total = p_total_price,
-- total_price = p_total_price, subtotal = p_total_price - p_tax_total, tax_total = p_tax_total.
-- Validates p_tax_total in idempotency verification.
-- Reconciles all non-null fields of public.sale_items:
-- line_total = p_total_price, line_subtotal = subtotal, line_tax = tax_total, tax_rate, unit_price.
-- FEFO handles nullable expiry_date: (expiry_date >= CURRENT_DATE OR expiry_date IS NULL)
-- with ORDER BY expiry_date ASC NULLS LAST.
-- search_path = '' with fully qualified table references.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale(
    p_store_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_total_price NUMERIC,
    p_channel TEXT,
    p_idempotency_key TEXT,
    p_tax_total NUMERIC DEFAULT 0
) RETURNS JSON AS $$
DECLARE
    v_tax_total NUMERIC;
    v_subtotal NUMERIC;
    v_tax_rate NUMERIC;
    v_unit_price NUMERIC;
    v_current_stock INTEGER;
    v_sale_id UUID;
    v_existing_store UUID;
    v_existing_product UUID;
    v_existing_qty INTEGER;
    v_existing_price NUMERIC;
    v_existing_tax NUMERIC;
    v_existing_channel TEXT;
    v_total_batch_qty NUMERIC;
    v_remaining_to_allocate NUMERIC;
    v_batch_record RECORD;
    v_consume NUMERIC;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN 
        RAISE EXCEPTION 'Invalid quantity: must be positive integer'; 
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
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN 
        RAISE EXCEPTION 'Invalid idempotency_key: key is required for financial operations'; 
    END IF;
    IF p_channel IS NULL OR p_channel NOT IN ('In-Store', 'Hyperlocal App', 'Online') THEN 
        RAISE EXCEPTION 'Invalid channel: must be In-Store, Hyperlocal App, or Online'; 
    END IF;

    v_tax_total := COALESCE(p_tax_total, 0);
    IF v_tax_total < 0 THEN
        RAISE EXCEPTION 'Invalid tax_total: cannot be negative'; 
    END IF;
    IF v_tax_total > (p_total_price / 2) THEN
        RAISE EXCEPTION 'Invalid tax_total: tax cannot exceed 50%% of gross total price (effective tax_rate cannot exceed 100%%)'; 
    END IF;
    v_subtotal := p_total_price - v_tax_total;

    v_tax_rate := CASE 
        WHEN v_subtotal > 0 THEN LEAST(ROUND((v_tax_total / v_subtotal) * 100, 2), 100.00)
        ELSE 0 
    END;

    -- Pre-tax unit price computed with 4-decimal precision to prevent fractional rounding divergence.
    -- Stored line amounts (line_subtotal, line_tax, line_total) authoritatively govern financial balances
    -- with exact cross-column reconciliation (line_subtotal + line_tax = line_total).
    v_unit_price := CASE 
        WHEN p_quantity > 0 THEN ROUND(v_subtotal / p_quantity::NUMERIC, 4) 
        ELSE v_subtotal 
    END;

    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'cashier']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
    END IF;

    -- Transaction-level advisory lock serializes concurrent retries on identical idempotency keys,
    -- preventing duplicate unique constraint violations during simultaneous client invocations.
    PERFORM pg_advisory_xact_lock(hashtext('sale_idem:' || p_idempotency_key));

    -- Null-Safe Idempotency Check (including exact tax_total comparison)
    SELECT id, store_id, product_id, quantity, COALESCE(total_price, grand_total), tax_total, channel 
    INTO v_sale_id, v_existing_store, v_existing_product, v_existing_qty, v_existing_price, v_existing_tax, v_existing_channel
    FROM public.sales 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_store IS DISTINCT FROM p_store_id 
           OR v_existing_product IS DISTINCT FROM p_product_id 
           OR v_existing_qty IS DISTINCT FROM p_quantity 
           OR v_existing_price IS DISTINCT FROM p_total_price 
           OR v_existing_tax IS DISTINCT FROM v_tax_total
           OR v_existing_channel IS DISTINCT FROM p_channel THEN
            RAISE EXCEPTION 'Idempotency conflict: key % was previously used with different sale parameters', p_idempotency_key;
        END IF;
        RETURN json_build_object(
            'success', true, 
            'sale_id', v_sale_id, 
            'message', 'Idempotent request recovered'
        );
    END IF;

    -- Row Locking on Product
    SELECT stock_level INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found in this store';
    END IF;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient product stock: requested % units but only % available', p_quantity, v_current_stock;
    END IF;

    -- Verify Active Batch Inventory Availability (Unexpired or Non-expiring NULL)
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_batch_qty
    FROM public.inventory_batches
    WHERE product_id = p_product_id 
      AND quantity > 0 
      AND (expiry_date >= CURRENT_DATE OR expiry_date IS NULL);

    IF v_total_batch_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient unexpired batch inventory: product has % available in active unexpired batches, requested %', v_total_batch_qty, p_quantity;
    END IF;

    -- Insert Sale Header with Explicit Financial Alignment (gross total = grand_total = total_price)
    INSERT INTO public.sales (
        store_id, 
        product_id, 
        quantity, 
        total_price, 
        grand_total,
        subtotal,
        tax_total,
        channel, 
        sale_date, 
        status, 
        idempotency_key
    ) VALUES (
        p_store_id, 
        p_product_id, 
        p_quantity, 
        p_total_price, 
        p_total_price,
        v_subtotal,
        v_tax_total,
        p_channel, 
        CURRENT_DATE, 
        'COMPLETED', 
        p_idempotency_key
    ) RETURNING id INTO v_sale_id;

    -- Atomic line item recording in public.sale_items (satisfies all non-null columns without rounding divergence)
    INSERT INTO public.sale_items (
        sale_id,
        product_id,
        quantity,
        unit_price,
        tax_rate,
        line_subtotal,
        line_tax,
        line_total
    ) VALUES (
        v_sale_id,
        p_product_id,
        p_quantity,
        v_unit_price,
        v_tax_rate,
        v_subtotal,
        v_tax_total,
        p_total_price
    );

    -- Multi-Batch FEFO Consumption Loop on inventory_batches (Unexpired First, Non-expiring NULL Last)
    v_remaining_to_allocate := p_quantity;

    FOR v_batch_record IN 
        SELECT id, quantity 
        FROM public.inventory_batches 
        WHERE product_id = p_product_id 
          AND quantity > 0 
          AND (expiry_date >= CURRENT_DATE OR expiry_date IS NULL)
        ORDER BY expiry_date ASC NULLS LAST
        FOR UPDATE
    LOOP
        v_consume := LEAST(v_batch_record.quantity, v_remaining_to_allocate);
        
        UPDATE public.inventory_batches
        SET quantity = quantity - v_consume
        WHERE id = v_batch_record.id;

        INSERT INTO public.inventory_movements (
            product_id,
            batch_id,
            quantity_delta,
            movement_type,
            reference_type,
            reference_id,
            idempotency_key
        ) VALUES (
            p_product_id,
            v_batch_record.id,
            -v_consume,
            'SALE',
            'SALE',
            v_sale_id,
            p_idempotency_key || ':' || v_batch_record.id::TEXT
        );

        v_remaining_to_allocate := v_remaining_to_allocate - v_consume;
        EXIT WHEN v_remaining_to_allocate <= 0;
    END LOOP;

    -- Decrement Product Stock Level
    UPDATE public.products 
    SET stock_level = stock_level - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;

    RETURN json_build_object('success', true, 'sale_id', v_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ----------------------------------------------------------------------------
-- PROCEDURE 2: process_stock_adjustment
-- Hardened: Exact idempotency matching on all material inputs (notes, batch, supplier).
-- Unexpired FEFO deduction; validates supplier belongs strictly to p_store_id or is shared.
-- Handles nullable expiry_date (ORDER BY expiry_date ASC NULLS LAST).
-- search_path = '' with fully qualified table references.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_stock_adjustment(
    p_store_id UUID,
    p_product_id UUID,
    p_action TEXT,
    p_quantity INTEGER,
    p_notes TEXT,
    p_idempotency_key TEXT,
    p_batch_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
    v_existing_store UUID;
    v_existing_product UUID;
    v_existing_action TEXT;
    v_existing_qty INTEGER;
    v_existing_notes TEXT;
    v_existing_batch UUID;
    v_existing_supplier UUID;
    v_existing_adj_id UUID;
    v_adjustment_id UUID;
    v_target_batch_id UUID;
    v_supplier_id UUID;
    v_consume NUMERIC;
    v_remaining NUMERIC;
    v_total_batch_qty NUMERIC;
    v_batch_rec RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN 
        RAISE EXCEPTION 'Invalid quantity: must be positive integer'; 
    END IF;
    IF p_product_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid product_id: product reference is required'; 
    END IF;
    IF p_store_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid store_id: store reference is required'; 
    END IF;
    IF p_action IS NULL OR p_action NOT IN ('add', 'deduct') THEN 
        RAISE EXCEPTION 'Invalid action: must be add or deduct'; 
    END IF;
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN 
        RAISE EXCEPTION 'Invalid idempotency_key: key is required for adjustments'; 
    END IF;

    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'inventory_clerk']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
    END IF;

    -- Transaction-level advisory lock serializes concurrent retries on identical idempotency keys
    PERFORM pg_advisory_xact_lock(hashtext('adj_idem:' || p_idempotency_key));

    -- Validate p_supplier_id when supplied:
    -- Outbound deductions cannot specify supplier_id
    IF p_supplier_id IS NOT NULL THEN
        IF p_action = 'deduct' THEN
            RAISE EXCEPTION 'Invalid parameter: supplier_id cannot be specified for outbound stock deductions';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.suppliers 
            WHERE id = p_supplier_id AND (store_id = p_store_id OR store_id IS NULL)
        ) THEN
            RAISE EXCEPTION 'Supplier % does not belong to store %', p_supplier_id, p_store_id;
        END IF;
    END IF;

    -- Exact String Match Idempotency Check comparing ALL material parameters
    SELECT id, store_id, product_id, action, quantity, notes, batch_id, supplier_id 
    INTO v_existing_adj_id, v_existing_store, v_existing_product, v_existing_action, v_existing_qty, v_existing_notes, v_existing_batch, v_existing_supplier
    FROM public.stock_adjustments 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_store IS DISTINCT FROM p_store_id 
           OR v_existing_product IS DISTINCT FROM p_product_id 
           OR v_existing_action IS DISTINCT FROM p_action 
           OR v_existing_qty IS DISTINCT FROM p_quantity 
           OR v_existing_notes IS DISTINCT FROM p_notes 
           OR (p_batch_id IS NOT NULL AND v_existing_batch IS DISTINCT FROM p_batch_id)
           OR v_existing_supplier IS DISTINCT FROM p_supplier_id THEN
            RAISE EXCEPTION 'Idempotency conflict: key % was previously used with different adjustment parameters', p_idempotency_key;
        END IF;

        RETURN json_build_object(
            'success', true, 
            'adjustment_id', v_existing_adj_id,
            'message', 'Idempotent request recovered'
        );
    END IF;

    -- Row Locking on Product
    SELECT stock_level INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id AND store_id = p_store_id 
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found in this store';
    END IF;

    IF p_action = 'deduct' AND v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient product stock for deduction: available % units, requested %', v_current_stock, p_quantity;
    END IF;

    v_adjustment_id := gen_random_uuid();

    -- Inbound Stock Addition
    IF p_action = 'add' THEN
        IF p_batch_id IS NOT NULL THEN
            SELECT id, supplier_id INTO v_target_batch_id, v_supplier_id
            FROM public.inventory_batches
            WHERE id = p_batch_id AND product_id = p_product_id
            FOR UPDATE;

            IF v_target_batch_id IS NULL THEN
                RAISE EXCEPTION 'Specified batch % not found for this product', p_batch_id;
            END IF;

            IF p_supplier_id IS NOT NULL AND v_supplier_id IS NOT NULL AND p_supplier_id != v_supplier_id THEN
                RAISE EXCEPTION 'Supplier mismatch: specified supplier % does not match batch supplier %', p_supplier_id, v_supplier_id;
            END IF;

            UPDATE public.inventory_batches
            SET quantity = quantity + p_quantity
            WHERE id = v_target_batch_id;
        ELSE
            IF p_supplier_id IS NOT NULL THEN
                -- Caller requested a specific supplier: select ONLY unexpired batch belonging to this supplier
                SELECT id, supplier_id INTO v_target_batch_id, v_supplier_id 
                FROM public.inventory_batches 
                WHERE product_id = p_product_id 
                  AND supplier_id = p_supplier_id
                  AND (expiry_date >= CURRENT_DATE OR expiry_date IS NULL)
                ORDER BY expiry_date DESC NULLS LAST LIMIT 1 
                FOR UPDATE;
            ELSE
                -- Caller did not specify a supplier: select unexpired batch for the product regardless of supplier
                SELECT id, supplier_id INTO v_target_batch_id, v_supplier_id 
                FROM public.inventory_batches 
                WHERE product_id = p_product_id 
                  AND (expiry_date >= CURRENT_DATE OR expiry_date IS NULL)
                ORDER BY expiry_date DESC NULLS LAST LIMIT 1 
                FOR UPDATE;
            END IF;

            IF v_target_batch_id IS NOT NULL THEN
                UPDATE public.inventory_batches
                SET quantity = quantity + p_quantity
                WHERE id = v_target_batch_id;
            ELSE
                IF p_supplier_id IS NOT NULL THEN
                    v_supplier_id := p_supplier_id;
                ELSE
                    SELECT id INTO v_supplier_id 
                    FROM public.suppliers 
                    WHERE store_id = p_store_id OR store_id IS NULL 
                    ORDER BY (store_id IS NULL) ASC, created_at ASC 
                    LIMIT 1;
                END IF;

                IF v_supplier_id IS NULL THEN
                    RAISE EXCEPTION 'Cannot adjust stock: product requires an assigned supplier to initialize batch inventory';
                END IF;

                INSERT INTO public.inventory_batches (
                    product_id, supplier_id, batch_number, quantity, expiry_date
                ) VALUES (
                    p_product_id, v_supplier_id, 'ADJ-' || to_char(CURRENT_DATE, 'YYYYMMDD'), p_quantity, CURRENT_DATE + INTERVAL '1 year'
                ) RETURNING id INTO v_target_batch_id;
            END IF;
        END IF;

        INSERT INTO public.inventory_movements (
            product_id, batch_id, quantity_delta, movement_type, reference_type, reference_id, idempotency_key
        ) VALUES (
            p_product_id, v_target_batch_id, p_quantity, 'ADJUSTMENT_IN', 'STOCK_ADJUSTMENT', v_adjustment_id, p_idempotency_key
        );

        UPDATE public.products 
        SET stock_level = stock_level + p_quantity, updated_at = NOW() 
        WHERE id = p_product_id;

    -- Outbound Stock Deduction (Targeted Batch OR Unexpired FEFO Batches)
    ELSE
        IF p_batch_id IS NOT NULL THEN
            SELECT id, quantity INTO v_target_batch_id, v_total_batch_qty
            FROM public.inventory_batches
            WHERE id = p_batch_id AND product_id = p_product_id
            FOR UPDATE;

            IF v_target_batch_id IS NULL THEN
                RAISE EXCEPTION 'Specified batch % not found for this product', p_batch_id;
            END IF;

            IF v_total_batch_qty < p_quantity THEN
                RAISE EXCEPTION 'Insufficient batch inventory for deduction: batch % has % units available, requested %', p_batch_id, v_total_batch_qty, p_quantity;
            END IF;

            UPDATE public.inventory_batches
            SET quantity = quantity - p_quantity
            WHERE id = p_batch_id;

            INSERT INTO public.inventory_movements (
                product_id, batch_id, quantity_delta, movement_type, reference_type, reference_id, idempotency_key
            ) VALUES (
                p_product_id,
                p_batch_id,
                -p_quantity,
                'ADJUSTMENT_OUT',
                'STOCK_ADJUSTMENT',
                v_adjustment_id,
                p_idempotency_key
            );

            UPDATE public.products 
            SET stock_level = stock_level - p_quantity, updated_at = NOW() 
            WHERE id = p_product_id;
        ELSE
            SELECT COALESCE(SUM(quantity), 0) INTO v_total_batch_qty
            FROM public.inventory_batches
            WHERE product_id = p_product_id 
              AND quantity > 0 
              AND (expiry_date >= CURRENT_DATE OR expiry_date IS NULL);

            IF v_total_batch_qty < p_quantity THEN
                RAISE EXCEPTION 'Insufficient unexpired batch inventory for deduction: product has % available in active batches, requested %', v_total_batch_qty, p_quantity;
            END IF;

            v_remaining := p_quantity;
            FOR v_batch_rec IN 
                SELECT id, quantity FROM public.inventory_batches 
                WHERE product_id = p_product_id 
                  AND quantity > 0 
                  AND (expiry_date >= CURRENT_DATE OR expiry_date IS NULL)
                ORDER BY expiry_date ASC NULLS LAST FOR UPDATE
            LOOP
                v_consume := LEAST(v_batch_rec.quantity, v_remaining);
                UPDATE public.inventory_batches SET quantity = quantity - v_consume WHERE id = v_batch_rec.id;
                
                INSERT INTO public.inventory_movements (
                    product_id, batch_id, quantity_delta, movement_type, reference_type, reference_id, idempotency_key
                ) VALUES (
                    p_product_id, 
                    v_batch_rec.id, 
                    -v_consume, 
                    'ADJUSTMENT_OUT', 
                    'STOCK_ADJUSTMENT', 
                    v_adjustment_id, 
                    p_idempotency_key || ':' || v_batch_rec.id::TEXT
                );

                v_remaining := v_remaining - v_consume;
                EXIT WHEN v_remaining <= 0;
            END LOOP;

            UPDATE public.products 
            SET stock_level = stock_level - p_quantity, updated_at = NOW() 
            WHERE id = p_product_id;
        END IF;
    END IF;

    -- Record atomic stock adjustment master record with resolved batch and supplier tracking
    INSERT INTO public.stock_adjustments (
        id, store_id, product_id, action, quantity, notes, batch_id, supplier_id, idempotency_key
    ) VALUES (
        v_adjustment_id, p_store_id, p_product_id, p_action, p_quantity, p_notes, COALESCE(p_batch_id, v_target_batch_id), p_supplier_id, p_idempotency_key
    );

    RETURN json_build_object('success', true, 'adjustment_id', v_adjustment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ----------------------------------------------------------------------------
-- PROCEDURE 3: process_khata_transaction
-- search_path = '' with fully qualified table references.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_khata_transaction(
    p_store_id UUID,
    p_customer_id UUID,
    p_type TEXT,
    p_amount DECIMAL,
    p_reference TEXT,
    p_idempotency_key TEXT
) RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_tx_id UUID;
    v_existing_store UUID;
    v_existing_customer UUID;
    v_existing_type TEXT;
    v_existing_amount DECIMAL;
    v_existing_ref TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
    END IF;

    IF p_type IS NULL OR p_type NOT IN ('credit', 'debit') THEN
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
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'Invalid idempotency_key: key is required for khata transactions';
    END IF;

    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'cashier']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
    END IF;

    -- Transaction-level advisory lock serializes concurrent retries on identical idempotency keys
    PERFORM pg_advisory_xact_lock(hashtext('khata_idem:' || p_idempotency_key));

    -- Null-Safe Idempotency Check (including reference comparison)
    SELECT id, store_id, khata_customer_id, type, amount, reference
    INTO v_tx_id, v_existing_store, v_existing_customer, v_existing_type, v_existing_amount, v_existing_ref
    FROM public.khata_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_store IS DISTINCT FROM p_store_id 
           OR v_existing_customer IS DISTINCT FROM p_customer_id 
           OR v_existing_type IS DISTINCT FROM p_type 
           OR v_existing_amount IS DISTINCT FROM p_amount
           OR v_existing_ref IS DISTINCT FROM p_reference THEN
            RAISE EXCEPTION 'Idempotency conflict: key % was previously used with different khata parameters', p_idempotency_key;
        END IF;

        SELECT balance INTO v_current_balance FROM public.khata_customers WHERE id = p_customer_id;
        RETURN json_build_object(
            'success', true, 
            'transaction_id', v_tx_id, 
            'new_balance', v_current_balance,
            'message', 'Idempotent request recovered'
        );
    END IF;

    SELECT balance INTO v_current_balance
    FROM public.khata_customers
    WHERE id = p_customer_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Khata customer not found in this store';
    END IF;

    IF p_type = 'credit' THEN
        v_new_balance := v_current_balance + p_amount;
    ELSE
        v_new_balance := v_current_balance - p_amount;
    END IF;

    INSERT INTO public.khata_transactions (
        khata_customer_id, store_id, type, amount, reference, idempotency_key
    ) VALUES (
        p_customer_id, p_store_id, p_type, p_amount, p_reference, p_idempotency_key
    ) RETURNING id INTO v_tx_id;

    UPDATE public.khata_customers
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN json_build_object(
        'success', true, 
        'transaction_id', v_tx_id, 
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ----------------------------------------------------------------------------
-- PROCEDURE 4: process_loyalty_transaction
-- search_path = '' with fully qualified table references.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_loyalty_transaction(
    p_store_id UUID,
    p_customer_id UUID,
    p_type TEXT,
    p_points INTEGER,
    p_reference TEXT,
    p_idempotency_key TEXT
) RETURNS JSON AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
    v_tx_id UUID;
    v_existing_store UUID;
    v_existing_customer UUID;
    v_existing_type TEXT;
    v_existing_points INTEGER;
    v_existing_ref TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
    END IF;

    IF p_type IS NULL OR p_type NOT IN ('earn', 'redeem') THEN
        RAISE EXCEPTION 'Invalid transaction type: must be earn or redeem';
    END IF;
    IF p_points IS NULL OR p_points <= 0 THEN
        RAISE EXCEPTION 'Invalid points: must be greater than zero';
    END IF;
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Invalid store_id: store reference required';
    END IF;
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Invalid customer_id: customer reference required';
    END IF;
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'Invalid idempotency_key: key is required for loyalty transactions';
    END IF;

    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'cashier']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
    END IF;

    -- Transaction-level advisory lock serializes concurrent retries on identical idempotency keys
    PERFORM pg_advisory_xact_lock(hashtext('loyalty_idem:' || p_idempotency_key));

    -- Null-Safe Idempotency Check (including reference comparison)
    SELECT id, store_id, loyalty_customer_id, type, points, reference
    INTO v_tx_id, v_existing_store, v_existing_customer, v_existing_type, v_existing_points, v_existing_ref
    FROM public.loyalty_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_store IS DISTINCT FROM p_store_id 
           OR v_existing_customer IS DISTINCT FROM p_customer_id 
           OR v_existing_type IS DISTINCT FROM p_type 
           OR v_existing_points IS DISTINCT FROM p_points
           OR v_existing_ref IS DISTINCT FROM p_reference THEN
            RAISE EXCEPTION 'Idempotency conflict: key % was previously used with different loyalty parameters', p_idempotency_key;
        END IF;

        SELECT points_balance INTO v_current_points FROM public.loyalty_customers WHERE id = p_customer_id;
        RETURN json_build_object(
            'success', true, 
            'transaction_id', v_tx_id, 
            'new_points', v_current_points,
            'message', 'Idempotent request recovered'
        );
    END IF;

    SELECT points_balance INTO v_current_points
    FROM public.loyalty_customers
    WHERE id = p_customer_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loyalty customer not found in this store';
    END IF;

    IF p_type = 'earn' THEN
        v_new_points := v_current_points + p_points;
    ELSE
        v_new_points := v_current_points - p_points;
    END IF;

    IF v_new_points < 0 THEN
        RAISE EXCEPTION 'Insufficient points: current % points, requested redemption %', v_current_points, p_points;
    END IF;

    INSERT INTO public.loyalty_transactions (
        loyalty_customer_id, store_id, type, points, reference, idempotency_key
    ) VALUES (
        p_customer_id, p_store_id, p_type, p_points, p_reference, p_idempotency_key
    ) RETURNING id INTO v_tx_id;

    UPDATE public.loyalty_customers
    SET points_balance = v_new_points, updated_at = NOW()
    WHERE id = p_customer_id;

    RETURN json_build_object(
        'success', true, 
        'transaction_id', v_tx_id, 
        'new_points', v_new_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ----------------------------------------------------------------------------
-- PROCEDURE 5: send_purchase_order
-- Dedicated, narrowly validated transition RPC from DRAFT -> SENT.
-- Enforces that empty purchase orders cannot be dispatched.
-- Validates supplier consistency and product store ownership across all items.
-- search_path = '' with fully qualified table references.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_purchase_order(
    p_store_id UUID,
    p_po_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_status TEXT;
    v_supplier_id UUID;
    v_item_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
    END IF;

    IF p_store_id IS NULL OR p_po_id IS NULL THEN
        RAISE EXCEPTION 'Invalid parameters: store_id and po_id are required';
    END IF;

    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'inventory_clerk']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
    END IF;

    SELECT status, supplier_id INTO v_status, v_supplier_id
    FROM public.purchase_orders
    WHERE id = p_po_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found in this store';
    END IF;

    IF v_status != 'DRAFT' THEN
        RAISE EXCEPTION 'Only DRAFT purchase orders can be sent (current status: %)', v_status;
    END IF;

    -- Validate supplier belongs to this store or is shared (store_id IS NULL)
    IF NOT EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = v_supplier_id
          AND (s.store_id = p_store_id OR s.store_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Purchase order references an invalid or foreign supplier';
    END IF;

    -- Verify at least one item exists
    SELECT COUNT(*) INTO v_item_count
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_po_id;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Cannot send empty purchase order: at least one item is required';
    END IF;

    -- Verify all items in the purchase order belong to this store
    IF EXISTS (
        SELECT 1 FROM public.purchase_order_items poi
        JOIN public.products p ON p.id = poi.product_id
        WHERE poi.purchase_order_id = p_po_id
          AND (p.store_id IS DISTINCT FROM p_store_id OR p.store_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Purchase order contains products from another store or unassigned products';
    END IF;

    UPDATE public.purchase_orders
    SET status = 'SENT'
    WHERE id = p_po_id;

    RETURN jsonb_build_object(
        'success', true, 
        'po_id', p_po_id, 
        'status', 'SENT'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ----------------------------------------------------------------------------
-- PROCEDURE 6: receive_purchase_order
-- Hardened: Verified PO store access and locking FIRST.
-- Idempotency check executed BEFORE evaluating receivable status (prevents failure on final-receipt retries).
-- Comprehensive idempotency checking joining inventory_batches (batch_number, expiry_date).
-- Enforces cross-tenant integrity: verifies supplier belongs to store or is shared,
-- and product belongs to this store before creating lot batch and stock movement.
-- Mandatory p_batch_number and future p_expiry_date (no fabricated lots/dates).
-- Strict integer quantity enforcement; no writes to unrepresented columns.
-- search_path = '' with fully qualified table references.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
    p_store_id UUID,
    p_po_id UUID,
    p_item_id UUID,
    p_receive_quantity INTEGER,
    p_batch_number TEXT,
    p_expiry_date DATE,
    p_idempotency_key TEXT
) RETURNS JSONB AS $$
DECLARE
    v_po_status TEXT;
    v_supplier_id UUID;
    v_ordered INTEGER;
    v_received INTEGER;
    v_product_id UUID;
    v_current_stock INTEGER;
    v_new_received INTEGER;
    v_pending_items INTEGER;
    v_existing_movement UUID;
    v_existing_product UUID;
    v_existing_delta INTEGER;
    v_existing_type TEXT;
    v_existing_ref UUID;
    v_existing_item_id UUID;
    v_existing_batch_number TEXT;
    v_existing_expiry_date DATE;
    v_batch_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
    END IF;

    -- Strict Parameter Validation
    IF p_receive_quantity IS NULL OR p_receive_quantity <= 0 THEN 
        RAISE EXCEPTION 'Invalid receive quantity: must be positive integer'; 
    END IF;
    IF p_store_id IS NULL OR p_po_id IS NULL OR p_item_id IS NULL THEN 
        RAISE EXCEPTION 'Invalid reference: store, PO, and item identifiers are required'; 
    END IF;
    IF p_batch_number IS NULL OR btrim(p_batch_number) = '' THEN 
        RAISE EXCEPTION 'Invalid batch_number: supplier batch/lot number is required'; 
    END IF;
    IF p_expiry_date IS NULL OR p_expiry_date <= CURRENT_DATE THEN 
        RAISE EXCEPTION 'Invalid expiry_date: must be a valid future expiration date'; 
    END IF;
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN 
        RAISE EXCEPTION 'Invalid idempotency_key: key is required for receipt operations'; 
    END IF;

    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'inventory_clerk']) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
    END IF;

    -- Transaction-level advisory lock serializes concurrent retries on identical idempotency keys
    PERFORM pg_advisory_xact_lock(hashtext('po_recv_idem:' || p_idempotency_key));

    -- 1. Lock and Verify Purchase Order in this store FIRST (Guards access)
    SELECT status, supplier_id INTO v_po_status, v_supplier_id
    FROM public.purchase_orders
    WHERE id = p_po_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found in this store';
    END IF;

    -- 2. Lock and Verify PO Item belongs to this PO strictly using canonical quantity and received_quantity
    SELECT product_id, quantity, received_quantity
    INTO v_product_id, v_ordered, v_received
    FROM public.purchase_order_items
    WHERE id = p_item_id AND purchase_order_id = p_po_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order item not found for this purchase order';
    END IF;

    -- 3. Comprehensive Idempotency Verification BEFORE Terminal Status Check
    -- Ensures that retrying a request that transitioned the PO to RECEIVED succeeds cleanly.
    -- Binds and verifies p_item_id so multiple items for the same product are distinguished.
    SELECT im.id, im.product_id, im.quantity_delta, im.movement_type, im.reference_id,
           im.purchase_order_item_id, ib.batch_number, ib.expiry_date
    INTO v_existing_movement, v_existing_product, v_existing_delta, v_existing_type, v_existing_ref,
         v_existing_item_id, v_existing_batch_number, v_existing_expiry_date
    FROM public.inventory_movements im
    LEFT JOIN public.inventory_batches ib ON ib.id = im.batch_id
    WHERE im.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_product IS DISTINCT FROM v_product_id 
           OR v_existing_delta IS DISTINCT FROM p_receive_quantity 
           OR v_existing_type IS DISTINCT FROM 'RECEIPT' 
           OR v_existing_ref IS DISTINCT FROM p_po_id
           OR v_existing_item_id IS DISTINCT FROM p_item_id
           OR v_existing_batch_number IS DISTINCT FROM p_batch_number
           OR v_existing_expiry_date IS DISTINCT FROM p_expiry_date THEN
            RAISE EXCEPTION 'Idempotency conflict: key % was previously used with different receipt parameters', p_idempotency_key;
        END IF;

        RETURN jsonb_build_object(
            'success', true, 
            'movement_id', v_existing_movement, 
            'new_status', v_po_status, 
            'new_received', v_received, 
            'message', 'Idempotent request recovered'
        );
    END IF;

    -- 4. Status Check: Enforce Receivable State for New (Non-Idempotent) Invocations
    IF v_po_status IS NULL OR v_po_status NOT IN ('SENT', 'PARTIALLY_RECEIVED') THEN
        RAISE EXCEPTION 'Purchase order is not in a receivable state (current status: %)', v_po_status;
    END IF;

    -- 5. Cross-Tenant Integrity Check: Supplier must belong to this store or be shared
    IF NOT EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = v_supplier_id
          AND (s.store_id = p_store_id OR s.store_id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Cross-tenant violation: PO supplier does not belong to this store';
    END IF;

    -- 6. Verify Product Record belongs to this store
    SELECT stock_level INTO v_current_stock
    FROM public.products
    WHERE id = v_product_id AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Referenced product not found in this store';
    END IF;

    -- Check for over-delivery strictly against canonical received_quantity and quantity
    v_new_received := v_received + p_receive_quantity;
    IF v_new_received > v_ordered THEN
        RAISE EXCEPTION 'Over-delivery rejected: cannot receive more than ordered (% ordered, % currently received, % requested)', 
            v_ordered, v_received, p_receive_quantity;
    END IF;

    -- 7. Create batch in inventory_batches with genuine supplier lot and receiver expiry date
    INSERT INTO public.inventory_batches (
        product_id, supplier_id, batch_number, quantity, expiry_date
    ) VALUES (
        v_product_id, v_supplier_id, p_batch_number, p_receive_quantity, p_expiry_date
    ) RETURNING id INTO v_batch_id;

    -- 8. Insert into inventory_movements (RECEIPT) with purchase_order_item_id linkage
    INSERT INTO public.inventory_movements (
        product_id,
        batch_id,
        quantity_delta,
        movement_type,
        reference_type,
        reference_id,
        purchase_order_item_id,
        idempotency_key
    ) VALUES (
        v_product_id,
        v_batch_id,
        p_receive_quantity,
        'RECEIPT',
        'PURCHASE_ORDER',
        p_po_id,
        p_item_id,
        p_idempotency_key
    ) RETURNING id INTO v_existing_movement;

    -- 9. Update Item received_quantity strictly on canonical column
    UPDATE public.purchase_order_items
    SET received_quantity = v_new_received
    WHERE id = p_item_id;

    -- 10. Update Product stock_level
    UPDATE public.products
    SET stock_level = stock_level + p_receive_quantity,
        updated_at = NOW()
    WHERE id = v_product_id;

    -- 11. Update PO status strictly checking canonical received_quantity and quantity
    SELECT count(*) INTO v_pending_items
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_po_id AND received_quantity < quantity;

    IF v_pending_items = 0 THEN
        UPDATE public.purchase_orders
        SET status = 'RECEIVED'
        WHERE id = p_po_id;
        v_po_status := 'RECEIVED';
    ELSE
        UPDATE public.purchase_orders
        SET status = 'PARTIALLY_RECEIVED'
        WHERE id = p_po_id;
        v_po_status := 'PARTIALLY_RECEIVED';
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'movement_id', v_existing_movement, 
        'new_status', v_po_status, 
        'new_received', v_new_received, 
        'new_stock', v_current_stock + p_receive_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ============================================================================
-- 7. EXECUTION PRIVILEGES (AUTHENTICATED CALLERS ONLY)
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID, UUID, INTEGER, NUMERIC, TEXT, TEXT, NUMERIC) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_stock_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_khata_transaction(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_khata_transaction(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_loyalty_transaction(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_loyalty_transaction(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_purchase_order(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_purchase_order(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(UUID, UUID, UUID, INTEGER, TEXT, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(UUID, UUID, UUID, INTEGER, TEXT, DATE, TEXT) TO authenticated;

COMMIT;
