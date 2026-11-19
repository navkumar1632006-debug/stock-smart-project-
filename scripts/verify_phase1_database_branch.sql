-- ============================================================================
-- VERIFICATION SUITE: Phase 1 & 2 Database Branch Testing Script
-- Description: Exercises RLS policy enforcement under the 'authenticated' role,
--              dual-layer mutation guards (column privileges + trigger guard),
--              supplier isolation, targeted batch adjustments, trigger synchronization,
--              sale rounding precision, and cross-tenant foreign rejections.
-- Scope Note:  Running migration scripts commits schema DDL to the branch.
--              This verification script wraps test transactional data in a
--              transaction and executes ROLLBACK at the end so test rows are discarded.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIXTURE SETUP AS SUPERUSER (postgres)
-- Sets up isolated test tenants, products, and suppliers while bypassing RLS.
-- ============================================================================

CREATE TEMP TABLE test_branch_context (
    owner_id UUID,
    stranger_id UUID,
    store_a UUID,
    store_b UUID,
    sup_a1 UUID,
    sup_a2 UUID,
    sup_foreign UUID,
    sup_shared UUID,
    prod_a UUID,
    prod_foreign UUID,
    khata_cust_a UUID,
    loyalty_cust_a UUID,
    batch_a1 UUID,
    batch_a2 UUID,
    po_valid UUID
);

DO $$
DECLARE
    v_owner_id UUID := gen_random_uuid();
    v_stranger_id UUID := gen_random_uuid();
    v_store_a UUID := gen_random_uuid();
    v_store_b UUID := gen_random_uuid();
    v_sup_a1 UUID := gen_random_uuid();
    v_sup_a2 UUID := gen_random_uuid();
    v_sup_foreign UUID := gen_random_uuid();
    v_sup_shared UUID := gen_random_uuid();
    v_prod_a UUID := gen_random_uuid();
    v_prod_foreign UUID := gen_random_uuid();
    v_khata_cust_a UUID := gen_random_uuid();
    v_loyalty_cust_a UUID := gen_random_uuid();
    v_po_valid UUID := gen_random_uuid();
BEGIN
    -- Create Stores
    INSERT INTO public.stores (id, owner_id, name) VALUES (v_store_a, v_owner_id, 'Kirana Store A');
    INSERT INTO public.stores (id, owner_id, name) VALUES (v_store_b, v_stranger_id, 'Foreign Store B');

    -- Create Suppliers
    INSERT INTO public.suppliers (id, store_id, name) VALUES (v_sup_a1, v_store_a, 'Dairy Supplier A1');
    INSERT INTO public.suppliers (id, store_id, name) VALUES (v_sup_a2, v_store_a, 'Bakery Supplier A2');
    INSERT INTO public.suppliers (id, store_id, name) VALUES (v_sup_foreign, v_store_b, 'Foreign Supplier B');
    INSERT INTO public.suppliers (id, store_id, name) VALUES (v_sup_shared, NULL, 'National FMCG Shared');

    -- Create Products
    INSERT INTO public.products (id, store_id, name, category, sku, price, selling_price, stock_level)
    VALUES (v_prod_a, v_store_a, 'Amul Gold Milk 500ml', 'Dairy', 'SKU-MILK-500', 34.00, 34.00, 0);

    INSERT INTO public.products (id, store_id, name, category, sku, price, selling_price, stock_level)
    VALUES (v_prod_foreign, v_store_b, 'Foreign Biscuit', 'Snacks', 'SKU-BISCUIT-B', 20.00, 20.00, 10);

    -- Create Khata and Loyalty Customers
    INSERT INTO public.khata_customers (id, store_id, name, phone, balance)
    VALUES (v_khata_cust_a, v_store_a, 'Ramesh Kumar', '9876543210', 0.00);

    INSERT INTO public.loyalty_customers (id, store_id, name, phone, points_balance)
    VALUES (v_loyalty_cust_a, v_store_a, 'Suresh Patel', '9876543211', 0);

    -- Store context for subsequent role-based test steps
    INSERT INTO test_branch_context (
        owner_id, stranger_id, store_a, store_b, sup_a1, sup_a2, 
        sup_foreign, sup_shared, prod_a, prod_foreign, khata_cust_a, loyalty_cust_a, po_valid
    ) VALUES (
        v_owner_id, v_stranger_id, v_store_a, v_store_b, v_sup_a1, v_sup_a2, 
        v_sup_foreign, v_sup_shared, v_prod_a, v_prod_foreign, v_khata_cust_a, v_loyalty_cust_a, v_po_valid
    );
END $$;


-- ============================================================================
-- 2. PRE-MIGRATION BACKFILL EXPRESSION TESTING (ACTUAL NULL PRICES)
-- ============================================================================
CREATE TEMP TABLE test_legacy_products_simulation (
    id UUID PRIMARY KEY,
    price NUMERIC,
    selling_price NUMERIC
);

INSERT INTO test_legacy_products_simulation (id, price, selling_price)
VALUES 
    (gen_random_uuid(), NULL, NULL),       -- Legacy row: NULL price
    (gen_random_uuid(), 0, NULL),          -- Legacy row: 0 price
    (gen_random_uuid(), 125.50, NULL);     -- Legacy row: valid positive price

-- Execute exact migration backfill statement
UPDATE test_legacy_products_simulation 
SET selling_price = COALESCE(price, 0) 
WHERE selling_price = 0 OR selling_price IS NULL;

UPDATE test_legacy_products_simulation 
SET price = COALESCE(price, 0) 
WHERE price IS NULL;

DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM test_legacy_products_simulation WHERE selling_price IS NULL OR price IS NULL) = 0,
        'Test 2 Failed: Backfill left NULL values in selling_price or price';
    ASSERT (SELECT selling_price FROM test_legacy_products_simulation WHERE price = 125.50) = 125.50,
        'Test 2 Failed: Backfill did not copy price to selling_price';
    ASSERT (SELECT selling_price FROM test_legacy_products_simulation WHERE price = 0 LIMIT 1) = 0,
        'Test 2 Failed: Backfill did not default null price to 0';
END $$;

DROP TABLE test_legacy_products_simulation;


-- ============================================================================
-- 3. ESTABLISH AUTHENTICATED SESSION CONTEXT & SWITCH SQL ROLE
-- Switches session from superuser (postgres) to authenticated role.
-- Under 'authenticated', PostgreSQL actively enforces all RLS policies,
-- column-level permissions, and security invoker triggers.
-- ============================================================================

DO $$
DECLARE
    ctx RECORD;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;
    -- Set transaction-local JWT claims so auth.uid() resolves to v_owner_id
    PERFORM set_config('request.jwt.claim.sub', ctx.owner_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END $$;

-- Switch to the authenticated role for all subsequent tests
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    ctx RECORD;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;
    ASSERT current_user = 'authenticated', 
        format('Setup failure: current_user is %s, expected authenticated', current_user);
    ASSERT auth.uid() = ctx.owner_id, 
        'Setup failure: auth.uid() did not resolve to Store A owner';
END $$;


-- ============================================================================
-- 4. RLS POLICY VERIFICATION: SELECT ISOLATION (products_select)
-- ============================================================================
DO $$
DECLARE
    ctx RECORD;
    v_count_a INTEGER;
    v_count_b INTEGER;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- Store A owner can SELECT their own products
    SELECT COUNT(*) INTO v_count_a FROM public.products WHERE id = ctx.prod_a;
    ASSERT v_count_a = 1, 
        'Test 4 Failed: Store Owner could not select products in own store under RLS';

    -- Store A owner CANNOT see Store B products (RLS filters out foreign tenant rows)
    SELECT COUNT(*) INTO v_count_b FROM public.products WHERE id = ctx.prod_foreign;
    ASSERT v_count_b = 0, 
        'Test 4 Security Breach: Store Owner was able to view products of foreign store under RLS';
END $$;


-- ============================================================================
-- 5. RLS POLICY VERIFICATION: WRITE-PATH RESTRICTIONS (po_insert)
-- ============================================================================
DO $$
DECLARE
    ctx RECORD;
    v_rejected BOOLEAN := false;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- 5.1 Attempting to insert a Purchase Order referencing a private supplier of Store B
    -- Must be blocked by po_insert RLS policy
    BEGIN
        INSERT INTO public.purchase_orders (id, store_id, supplier_id, status)
        VALUES (gen_random_uuid(), ctx.store_a, ctx.sup_foreign, 'DRAFT');
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
    END;

    ASSERT v_rejected = true, 
        'Test 5.1 Security Breach: po_insert RLS policy permitted PO referencing foreign store supplier';

    -- 5.2 Inserting a valid Purchase Order with owned supplier succeeds under RLS
    INSERT INTO public.purchase_orders (id, store_id, supplier_id, status)
    VALUES (ctx.po_valid, ctx.store_a, ctx.sup_a1, 'DRAFT');

    ASSERT (SELECT COUNT(*) FROM public.purchase_orders WHERE id = ctx.po_valid) = 1,
        'Test 5.2 Failed: po_insert RLS policy rejected valid purchase order with owned store supplier';
END $$;


-- ============================================================================
-- 6. DIRECT MUTATION DEFENSE: DUAL-LAYER SECURITY VERIFICATION
-- Tests both Defense Layers:
-- Layer 1: Column-level privilege restrictions (SQL privilege engine)
-- Layer 2: Trigger guard guard_direct_balance_stock_mutations() (Defense-in-depth)
-- ============================================================================

-- 6.0 Pre-Flight Check: Verify Effective Privilege Absence
-- In PostgreSQL, a table-level UPDATE grant permits modifying all columns,
-- overriding any column-level restrictions. We assert that the 'authenticated' role
-- lacks both table-wide UPDATE and column-level UPDATE on all protected fields.
DO $$
BEGIN
    -- Verify that guard_direct_balance_stock_mutations runs as SECURITY INVOKER (prosecdef = false)
    -- If it were SECURITY DEFINER, current_user would resolve to the function owner (postgres),
    -- defeating the IF current_user IN ('authenticated', 'anon') check.
    ASSERT (
        SELECT p.prosecdef 
        FROM pg_catalog.pg_proc p 
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace 
        WHERE n.nspname = 'public' AND p.proname = 'guard_direct_balance_stock_mutations'
    ) = false, 'Pre-flight Failure: guard_direct_balance_stock_mutations must run as SECURITY INVOKER (prosecdef = false)';

    -- Verify absence of table-wide UPDATE grants
    ASSERT has_table_privilege('authenticated', 'public.products', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role has table-wide UPDATE on public.products';
    ASSERT has_table_privilege('authenticated', 'public.khata_customers', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role has table-wide UPDATE on public.khata_customers';
    ASSERT has_table_privilege('authenticated', 'public.loyalty_customers', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role has table-wide UPDATE on public.loyalty_customers';
    ASSERT has_table_privilege('authenticated', 'public.purchase_order_items', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role has table-wide UPDATE on public.purchase_order_items';
    ASSERT has_table_privilege('authenticated', 'public.purchase_order_items', 'INSERT') = false,
        'Pre-flight Failure: authenticated role has table-wide INSERT on public.purchase_order_items';

    -- Verify absence of effective column-level UPDATE/INSERT privileges on protected columns
    ASSERT has_column_privilege('authenticated', 'public.products', 'stock_level', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role unexpectedly has effective UPDATE privilege on products.stock_level';
    ASSERT has_column_privilege('authenticated', 'public.khata_customers', 'balance', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role unexpectedly has effective UPDATE privilege on khata_customers.balance';
    ASSERT has_column_privilege('authenticated', 'public.loyalty_customers', 'points_balance', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role unexpectedly has effective UPDATE privilege on loyalty_customers.points_balance';
    ASSERT has_column_privilege('authenticated', 'public.purchase_order_items', 'received_quantity', 'UPDATE') = false,
        'Pre-flight Failure: authenticated role unexpectedly has effective UPDATE privilege on purchase_order_items.received_quantity';
    ASSERT has_column_privilege('authenticated', 'public.purchase_order_items', 'received_quantity', 'INSERT') = false,
        'Pre-flight Failure: authenticated role unexpectedly has effective INSERT privilege on purchase_order_items.received_quantity';

    -- Verify allowed column-level privileges exist
    ASSERT has_column_privilege('authenticated', 'public.purchase_order_items', 'quantity', 'INSERT') = true,
        'Pre-flight Failure: authenticated role lacks expected INSERT privilege on purchase_order_items.quantity';
    ASSERT has_column_privilege('authenticated', 'public.purchase_order_items', 'unit_cost', 'INSERT') = true,
        'Pre-flight Failure: authenticated role lacks expected INSERT privilege on purchase_order_items.unit_cost';
END $$;

-- 6.0.1 Pre-Flight Check: Verify Row Eligibility under 'UPDATE' RLS Policy
-- Proves that target rows (prod_a, khata_cust_a, loyalty_cust_a) satisfy the RLS UPDATE
-- policy (USING clause) so that subsequent UPDATEs are not silently ignored (0 rows affected).
-- We execute a legitimate update on an allowed column and assert ROW_COUNT = 1.
DO $$
DECLARE
    ctx RECORD;
    v_rows_affected INTEGER;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- Legitimate update on products.name (permitted by both RLS and column GRANT)
    UPDATE public.products SET name = 'Amul Gold Milk 500ml RLS-Verified' WHERE id = ctx.prod_a;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    ASSERT v_rows_affected = 1,
        format('Pre-flight Failure: prod_a is not eligible under products_update RLS policy (rows affected: %s)', v_rows_affected);

    -- Legitimate update on khata_customers.phone
    UPDATE public.khata_customers SET phone = '9876543219' WHERE id = ctx.khata_cust_a;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    ASSERT v_rows_affected = 1,
        format('Pre-flight Failure: khata_cust_a is not eligible under khata_cust_update RLS policy (rows affected: %s)', v_rows_affected);

    -- Legitimate update on loyalty_customers.phone
    UPDATE public.loyalty_customers SET phone = '9876543218' WHERE id = ctx.loyalty_cust_a;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    ASSERT v_rows_affected = 1,
        format('Pre-flight Failure: loyalty_cust_a is not eligible under loyalty_cust_update RLS policy (rows affected: %s)', v_rows_affected);
END $$;

-- 6.1 Layer 1: Column Privilege Enforcement
-- Direct client UPDATE on stock_level, balance, and points_balance must fail at the SQL privilege check
DO $$
DECLARE
    ctx RECORD;
    v_stock_priv_rejected BOOLEAN := false;
    v_khata_priv_rejected BOOLEAN := false;
    v_loyalty_priv_rejected BOOLEAN := false;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- 6.1.1 Products stock_level
    BEGIN
        UPDATE public.products SET stock_level = 999 WHERE id = ctx.prod_a;
    EXCEPTION WHEN OTHERS THEN
        v_stock_priv_rejected := true;
    END;

    -- 6.1.2 Khata Customers balance
    BEGIN
        UPDATE public.khata_customers SET balance = 500.00 WHERE id = ctx.khata_cust_a;
    EXCEPTION WHEN OTHERS THEN
        v_khata_priv_rejected := true;
    END;

    -- 6.1.3 Loyalty Customers points_balance
    BEGIN
        UPDATE public.loyalty_customers SET points_balance = 500 WHERE id = ctx.loyalty_cust_a;
    EXCEPTION WHEN OTHERS THEN
        v_loyalty_priv_rejected := true;
    END;

    ASSERT v_stock_priv_rejected = true,
        'Test 6.1 Layer 1 Failure: Column privilege check did not reject direct update on products.stock_level';
    ASSERT v_khata_priv_rejected = true,
        'Test 6.1 Layer 1 Failure: Column privilege check did not reject direct update on khata_customers.balance';
    ASSERT v_loyalty_priv_rejected = true,
        'Test 6.1 Layer 1 Failure: Column privilege check did not reject direct update on loyalty_customers.points_balance';
END $$;

-- 6.2 Layer 2: Trigger Guard Defense-in-Depth for products.stock_level
-- Grant temporary UPDATE (stock_level) to authenticated to simulate a misconfigured
-- or overly permissive grant, proving guard_direct_balance_stock_mutations intercepts the write.
RESET ROLE;
GRANT UPDATE (stock_level) ON public.products TO authenticated;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    ctx RECORD;
    v_trigger_fired BOOLEAN := false;
    v_err TEXT;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    BEGIN
        UPDATE public.products SET stock_level = 999 WHERE id = ctx.prod_a;
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Security violation: products.stock_level cannot be updated directly%' THEN
            v_trigger_fired := true;
        END IF;
    END;

    ASSERT v_trigger_fired = true,
        format('Test 6.2 Layer 2 Failure: guard_direct_balance_stock_mutations trigger did not block stock update when privilege was present (Error: %s)', v_err);
END $$;

-- Revoke temporary grant as superuser, restore authenticated role, and assert privilege is revoked
RESET ROLE;
REVOKE UPDATE (stock_level) ON public.products FROM authenticated;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
    ASSERT has_column_privilege('authenticated', 'public.products', 'stock_level', 'UPDATE') = false,
        'Cleanup Failure: temporary UPDATE privilege on products.stock_level was not cleanly revoked';
END $$;

-- 6.3 Layer 2: Trigger Guard Defense-in-Depth for khata_customers.balance
-- Grant temporary UPDATE (balance) to authenticated to verify the trigger guard intercepts direct balance tampering.
RESET ROLE;
GRANT UPDATE (balance) ON public.khata_customers TO authenticated;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    ctx RECORD;
    v_trigger_fired BOOLEAN := false;
    v_err TEXT;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    BEGIN
        UPDATE public.khata_customers SET balance = 500.00 WHERE id = ctx.khata_cust_a;
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Security violation: khata_customers.balance cannot be updated directly%' THEN
            v_trigger_fired := true;
        END IF;
    END;

    ASSERT v_trigger_fired = true,
        format('Test 6.3 Layer 2 Failure: guard_direct_balance_stock_mutations trigger did not block khata balance update when privilege was present (Error: %s)', v_err);
END $$;

-- Revoke temporary grant as superuser, restore authenticated role, and assert privilege is revoked
RESET ROLE;
REVOKE UPDATE (balance) ON public.khata_customers FROM authenticated;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
    ASSERT has_column_privilege('authenticated', 'public.khata_customers', 'balance', 'UPDATE') = false,
        'Cleanup Failure: temporary UPDATE privilege on khata_customers.balance was not cleanly revoked';
END $$;

-- 6.4 Layer 2: Trigger Guard Defense-in-Depth for loyalty_customers.points_balance
-- Grant temporary UPDATE (points_balance) to authenticated to verify the trigger guard intercepts points tampering.
RESET ROLE;
GRANT UPDATE (points_balance) ON public.loyalty_customers TO authenticated;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    ctx RECORD;
    v_trigger_fired BOOLEAN := false;
    v_err TEXT;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    BEGIN
        UPDATE public.loyalty_customers SET points_balance = 500 WHERE id = ctx.loyalty_cust_a;
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Security violation: loyalty_customers.points_balance cannot be updated directly%' THEN
            v_trigger_fired := true;
        END IF;
    END;

    ASSERT v_trigger_fired = true,
        format('Test 6.4 Layer 2 Failure: guard_direct_balance_stock_mutations trigger did not block loyalty points update when privilege was present (Error: %s)', v_err);
END $$;

-- Revoke temporary grant as superuser, restore authenticated role, and assert privilege is revoked
RESET ROLE;
REVOKE UPDATE (points_balance) ON public.loyalty_customers FROM authenticated;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
    ASSERT has_column_privilege('authenticated', 'public.loyalty_customers', 'points_balance', 'UPDATE') = false,
        'Cleanup Failure: temporary UPDATE privilege on loyalty_customers.points_balance was not cleanly revoked';
END $$;


-- ============================================================================
-- 7. STOCK ADJUSTMENT: MULTI-SUPPLIER ISOLATION (p_batch_id IS NULL)
-- ============================================================================
DO $$
DECLARE
    ctx RECORD;
    v_batch_a1 UUID;
    v_batch_a2 UUID;
    v_batch_a1_qty NUMERIC;
    v_batch_a2_qty NUMERIC;
    v_stock INTEGER;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- Call 1: Add 10 units under Supplier A1
    PERFORM public.process_stock_adjustment(
        ctx.store_a, ctx.prod_a, 'add', 10, 'Initial Delivery A1', 'adj-tx-1', NULL, ctx.sup_a1
    );

    SELECT id, quantity INTO v_batch_a1, v_batch_a1_qty 
    FROM public.inventory_batches WHERE product_id = ctx.prod_a AND supplier_id = ctx.sup_a1;
    ASSERT v_batch_a1 IS NOT NULL, 'Test 7 Failed: Batch for Supplier A1 was not created';
    ASSERT v_batch_a1_qty = 10, 'Test 7 Failed: Supplier A1 batch quantity should be 10';

    -- Call 2: Add 5 units under Supplier A2 with p_batch_id NULL
    -- CRITICAL CHECK: MUST NOT increment Supplier A1's batch! Must create dedicated batch for Supplier A2.
    PERFORM public.process_stock_adjustment(
        ctx.store_a, ctx.prod_a, 'add', 5, 'Inbound Delivery A2', 'adj-tx-2', NULL, ctx.sup_a2
    );

    SELECT quantity INTO v_batch_a1_qty FROM public.inventory_batches WHERE id = v_batch_a1;
    ASSERT v_batch_a1_qty = 10, 
        format('Test 7 Security Violation: Supplier A1 batch was modified by Supplier A2 adjustment (got %s, expected 10)', v_batch_a1_qty);

    SELECT id, quantity INTO v_batch_a2, v_batch_a2_qty 
    FROM public.inventory_batches WHERE product_id = ctx.prod_a AND supplier_id = ctx.sup_a2;
    ASSERT v_batch_a2 IS NOT NULL, 'Test 7 Failed: Dedicated batch for Supplier A2 was not created';
    ASSERT v_batch_a2_qty = 5, 'Test 7 Failed: Supplier A2 batch quantity should be 5';

    SELECT stock_level INTO v_stock FROM public.products WHERE id = ctx.prod_a;
    ASSERT v_stock = 15, format('Test 7 Failed: Product stock level should be 15, got %s', v_stock);

    -- Call 3: Add 3 units under Supplier A1 with p_batch_id NULL
    -- Correctly matches and increments existing Supplier A1 batch; leaves Supplier A2 batch untouched
    PERFORM public.process_stock_adjustment(
        ctx.store_a, ctx.prod_a, 'add', 3, 'Second Delivery A1', 'adj-tx-3', NULL, ctx.sup_a1
    );

    SELECT quantity INTO v_batch_a1_qty FROM public.inventory_batches WHERE id = v_batch_a1;
    ASSERT v_batch_a1_qty = 13, format('Test 7 Failed: Supplier A1 batch should be 13 (10+3), got %s', v_batch_a1_qty);
    SELECT quantity INTO v_batch_a2_qty FROM public.inventory_batches WHERE id = v_batch_a2;
    ASSERT v_batch_a2_qty = 5, format('Test 7 Failed: Supplier A2 batch should remain 5, got %s', v_batch_a2_qty);

    -- Persist batch IDs for subsequent test
    UPDATE test_branch_context SET batch_a1 = v_batch_a1, batch_a2 = v_batch_a2;
END $$;


-- ============================================================================
-- 8. STOCK ADJUSTMENT: TARGETED BATCH DEDUCTION
-- ============================================================================
DO $$
DECLARE
    ctx RECORD;
    v_batch_a1_qty NUMERIC;
    v_batch_a2_qty NUMERIC;
    v_stock INTEGER;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- Call 4: Deduct 4 units strictly from Supplier A1's batch (ctx.batch_a1)
    PERFORM public.process_stock_adjustment(
        ctx.store_a, ctx.prod_a, 'deduct', 4, 'Damage in Batch A1', 'adj-tx-4', ctx.batch_a1, NULL
    );

    SELECT quantity INTO v_batch_a1_qty FROM public.inventory_batches WHERE id = ctx.batch_a1;
    ASSERT v_batch_a1_qty = 9, format('Test 8 Failed: Supplier A1 batch should be 9 (13-4), got %s', v_batch_a1_qty);

    SELECT quantity INTO v_batch_a2_qty FROM public.inventory_batches WHERE id = ctx.batch_a2;
    ASSERT v_batch_a2_qty = 5, format('Test 8 Failed: Supplier A2 batch should remain 5, got %s', v_batch_a2_qty);

    SELECT stock_level INTO v_stock FROM public.products WHERE id = ctx.prod_a;
    ASSERT v_stock = 14, format('Test 8 Failed: Product stock level should be 14 (18-4), got %s', v_stock);
END $$;


-- ============================================================================
-- 9. SALE ROUNDING & 4-DECIMAL TYPMOD VERIFICATION
-- ============================================================================
DO $$
DECLARE
    ctx RECORD;
    v_sale_res JSON;
    v_unit_price NUMERIC;
    v_tax_rate NUMERIC;
    v_subtotal NUMERIC;
    v_tax_total NUMERIC;
    v_line_total NUMERIC;
    v_sale_id UUID;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- Test 9.1: Odd division ($10.00 gross total across 3 units)
    v_sale_res := public.process_sale(
        ctx.store_a, ctx.prod_a, 3, 10.00, 'In-Store', 'sale-round-tx-1', 0.00
    );
    v_sale_id := (v_sale_res->>'sale_id')::UUID;

    SELECT unit_price, line_subtotal, line_tax, line_total 
    INTO v_unit_price, v_subtotal, v_tax_total, v_line_total
    FROM public.sale_items 
    WHERE sale_id = v_sale_id;

    -- Verify that sale_items.unit_price was NOT rounded down to 3.33 by a 2-decimal typmod
    ASSERT v_unit_price = 3.3333, 
        format('Test 9.1 Failed: sale_items.unit_price has a 2-decimal typmod restriction (got %s, expected 3.3333)', v_unit_price);
    ASSERT v_subtotal = 10.00, format('Test 9.1 Failed: line_subtotal expected 10.00, got %s', v_subtotal);
    ASSERT v_tax_total = 0.00, format('Test 9.1 Failed: line_tax expected 0.00, got %s', v_tax_total);
    ASSERT v_line_total = 10.00, format('Test 9.1 Failed: line_total expected 10.00, got %s', v_line_total);
    ASSERT (v_subtotal + v_tax_total) = v_line_total, 'Test 9.1 Failed: line_subtotal + line_tax != line_total';

    -- Verify sales header financial balance matches line item exactly
    ASSERT (SELECT grand_total FROM public.sales WHERE id = v_sale_id) = 10.00,
        'Test 9.1 Failed: sales.grand_total does not match line_total';
    ASSERT (SELECT total_price FROM public.sales WHERE id = v_sale_id) = 10.00,
        'Test 9.1 Failed: sales.total_price compatibility column does not match grand_total';

    -- Test 9.2: Standard Retail GST Sale (2 units, gross 118.00, tax 18.00)
    v_sale_res := public.process_sale(
        ctx.store_a, ctx.prod_a, 2, 118.00, 'In-Store', 'sale-round-tx-2', 18.00
    );
    v_sale_id := (v_sale_res->>'sale_id')::UUID;

    SELECT unit_price, tax_rate, line_subtotal, line_tax, line_total 
    INTO v_unit_price, v_tax_rate, v_subtotal, v_tax_total, v_line_total
    FROM public.sale_items 
    WHERE sale_id = v_sale_id;

    ASSERT v_unit_price = 50.0000, format('Test 9.2 Failed: pre-tax unit_price expected 50.0000, got %s', v_unit_price);
    ASSERT v_tax_rate = 18.00, format('Test 9.2 Failed: tax_rate expected 18.00, got %s', v_tax_rate);
    ASSERT v_subtotal = 100.00, format('Test 9.2 Failed: line_subtotal expected 100.00, got %s', v_subtotal);
    ASSERT v_tax_total = 18.00, format('Test 9.2 Failed: line_tax expected 18.00, got %s', v_tax_total);
    ASSERT v_line_total = 118.00, format('Test 9.2 Failed: line_total expected 118.00, got %s', v_line_total);
    ASSERT (v_subtotal + v_tax_total) = v_line_total, 'Test 9.2 Failed: line_subtotal + line_tax != line_total';
END $$;


-- ============================================================================
-- 10. IDEMPOTENCY RECOVERY & MATERIAL PARAMETER TAMPER DENIAL
-- Tests that:
-- 10.1 Khata retries with same reference recover transaction; different reference raises conflict.
-- 10.2 Loyalty retries with same reference recover transaction; different reference raises conflict.
-- 10.3 PO receipt retries with same item_id recover receipt; same key with different item_id raises conflict.
-- 10.4 Pre-existing PO item with non-zero received_quantity prevents duplicate receipt / over-delivery.
-- 10.5 Direct write on purchase_order_items.received_quantity by authenticated user is rejected.
-- ============================================================================

-- 10.1 & 10.2: KHATA & LOYALTY REFERENCE IDEMPOTENCY
DO $$
DECLARE
    ctx RECORD;
    v_khata_res1 JSON;
    v_khata_res2 JSON;
    v_loyalty_res1 JSON;
    v_loyalty_res2 JSON;
    v_caught_conflict BOOLEAN;
    v_err TEXT;
    v_balance DECIMAL;
    v_points INTEGER;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    -- 10.1 KHATA REFERENCE IDEMPOTENCY
    -- First invocation
    v_khata_res1 := public.process_khata_transaction(
        ctx.store_a, ctx.khata_cust_a, 'credit', 250.00, 'Invoice #K-100', 'khata-idem-test-1'
    );
    ASSERT (v_khata_res1->>'success')::BOOLEAN = true, 'Test 10.1 Failed: Initial khata transaction failed';

    -- Replay with identical parameters: must recover cached transaction without re-crediting
    v_khata_res2 := public.process_khata_transaction(
        ctx.store_a, ctx.khata_cust_a, 'credit', 250.00, 'Invoice #K-100', 'khata-idem-test-1'
    );
    ASSERT (v_khata_res2->>'transaction_id') = (v_khata_res1->>'transaction_id'), 
        'Test 10.1 Failed: Khata replay did not return original transaction ID';

    SELECT balance INTO v_balance FROM public.khata_customers WHERE id = ctx.khata_cust_a;
    ASSERT v_balance = 250.00, format('Test 10.1 Failed: Khata customer balance was modified on replay (got %s, expected 250.00)', v_balance);

    -- Replay with same key but DIFFERENT reference: must raise idempotency conflict
    v_caught_conflict := false;
    BEGIN
        PERFORM public.process_khata_transaction(
            ctx.store_a, ctx.khata_cust_a, 'credit', 250.00, 'Invoice #TAMPERED', 'khata-idem-test-1'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Idempotency conflict%' THEN
            v_caught_conflict := true;
        END IF;
    END;
    ASSERT v_caught_conflict = true, format('Test 10.1 Security Gap: process_khata_transaction allowed modified reference on same idempotency key (Error: %s)', v_err);


    -- 10.2 LOYALTY REFERENCE IDEMPOTENCY
    -- First invocation
    v_loyalty_res1 := public.process_loyalty_transaction(
        ctx.store_a, ctx.loyalty_cust_a, 'earn', 100, 'Bill #L-200', 'loyalty-idem-test-1'
    );
    ASSERT (v_loyalty_res1->>'success')::BOOLEAN = true, 'Test 10.2 Failed: Initial loyalty transaction failed';

    -- Replay with identical parameters: must recover cached transaction without re-awarding points
    v_loyalty_res2 := public.process_loyalty_transaction(
        ctx.store_a, ctx.loyalty_cust_a, 'earn', 100, 'Bill #L-200', 'loyalty-idem-test-1'
    );
    ASSERT (v_loyalty_res2->>'transaction_id') = (v_loyalty_res1->>'transaction_id'), 
        'Test 10.2 Failed: Loyalty replay did not return original transaction ID';

    SELECT points_balance INTO v_points FROM public.loyalty_customers WHERE id = ctx.loyalty_cust_a;
    ASSERT v_points = 100, format('Test 10.2 Failed: Loyalty points balance was modified on replay (got %s, expected 100)', v_points);

    -- Replay with same key but DIFFERENT reference: must raise idempotency conflict
    v_caught_conflict := false;
    BEGIN
        PERFORM public.process_loyalty_transaction(
            ctx.store_a, ctx.loyalty_cust_a, 'earn', 100, 'Bill #TAMPERED', 'loyalty-idem-test-1'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Idempotency conflict%' THEN
            v_caught_conflict := true;
        END IF;
    END;
    ASSERT v_caught_conflict = true, format('Test 10.2 Security Gap: process_loyalty_transaction allowed modified reference on same idempotency key (Error: %s)', v_err);
END $$;


-- 10.3 PURCHASE ORDER RECEIPT ITEM BINDING IDEMPOTENCY
-- Reset to superuser to seed test PO and items with exact IDs
RESET ROLE;
CREATE TEMP TABLE IF NOT EXISTS test_po_idem_context (
    po_id UUID,
    item_1 UUID,
    item_2 UUID
);
TRUNCATE TABLE test_po_idem_context;

DO $$
DECLARE
    ctx RECORD;
    v_po_test UUID := gen_random_uuid();
    v_item_1 UUID := gen_random_uuid();
    v_item_2 UUID := gen_random_uuid();
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    INSERT INTO public.purchase_orders (id, store_id, supplier_id, status)
    VALUES (v_po_test, ctx.store_a, ctx.sup_a1, 'DRAFT');

    INSERT INTO public.purchase_order_items (id, purchase_order_id, product_id, quantity, received_quantity, unit_cost)
    VALUES 
        (v_item_1, v_po_test, ctx.prod_a, 10, 0, 25.00),
        (v_item_2, v_po_test, ctx.prod_a, 20, 0, 25.00);

    INSERT INTO test_po_idem_context (po_id, item_1, item_2)
    VALUES (v_po_test, v_item_1, v_item_2);
END $$;

-- Switch to authenticated role to execute procedures
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    ctx RECORD;
    pctx RECORD;
    v_recv_res1 JSONB;
    v_recv_res2 JSONB;
    v_caught_conflict BOOLEAN := false;
    v_err TEXT;
    v_item2_received NUMERIC;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;
    SELECT * INTO pctx FROM test_po_idem_context LIMIT 1;

    -- Transition PO to SENT
    PERFORM public.send_purchase_order(ctx.store_a, pctx.po_id);

    -- Receive Item 1
    v_recv_res1 := public.receive_purchase_order(
        ctx.store_a, pctx.po_id, pctx.item_1, 10, 'LOT-ITEM-1', CURRENT_DATE + INTERVAL '180 days', 'po-recv-idem-test-1'
    );
    ASSERT (v_recv_res1->>'success')::BOOLEAN = true, 'Test 10.3 Failed: Initial receive_purchase_order failed';

    -- Replay with identical parameters (Item 1): must recover receipt cleanly
    v_recv_res2 := public.receive_purchase_order(
        ctx.store_a, pctx.po_id, pctx.item_1, 10, 'LOT-ITEM-1', CURRENT_DATE + INTERVAL '180 days', 'po-recv-idem-test-1'
    );
    ASSERT (v_recv_res2->>'movement_id') = (v_recv_res1->>'movement_id'),
        'Test 10.3 Failed: Receipt replay did not return original movement ID';

    -- Attempt replay with SAME key 'po-recv-idem-test-1' targeting Item 2 (same product, same PO):
    -- MUST raise idempotency conflict and MUST NOT leave Item 2 accepted!
    v_caught_conflict := false;
    BEGIN
        PERFORM public.receive_purchase_order(
            ctx.store_a, pctx.po_id, pctx.item_2, 10, 'LOT-ITEM-1', CURRENT_DATE + INTERVAL '180 days', 'po-recv-idem-test-1'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Idempotency conflict%' THEN
            v_caught_conflict := true;
        END IF;
    END;
    ASSERT v_caught_conflict = true, format('Test 10.3 Security Gap: receive_purchase_order allowed second PO item to reuse same idempotency key without conflict (Error: %s)', v_err);

    -- Verify Item 2 received quantity remains 0
    SELECT received_quantity INTO v_item2_received 
    FROM public.purchase_order_items WHERE id = pctx.item_2;
    ASSERT v_item2_received = 0, format('Test 10.3 Security Breach: Item 2 received quantity was altered under another item key (got %s, expected 0)', v_item2_received);
END $$;


-- 10.4 PRE-EXISTING PO ITEM WITH NON-ZERO RECEIVED QUANTITY
-- Verifies that existing received units prevent over-delivery / duplicate receipts
RESET ROLE;
CREATE TEMP TABLE IF NOT EXISTS test_po_partial_context (
    po_id UUID,
    item_id UUID
);
TRUNCATE TABLE test_po_partial_context;

DO $$
DECLARE
    ctx RECORD;
    v_po_partial UUID := gen_random_uuid();
    v_item_partial UUID := gen_random_uuid();
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;

    INSERT INTO public.purchase_orders (id, store_id, supplier_id, status)
    VALUES (v_po_partial, ctx.store_a, ctx.sup_a1, 'DRAFT');

    -- Item with 10 ordered and 6 already received (e.g. from prior legacy receipt)
    INSERT INTO public.purchase_order_items (id, purchase_order_id, product_id, quantity, received_quantity, unit_cost)
    VALUES (v_item_partial, v_po_partial, ctx.prod_a, 10, 6, 25.00);

    INSERT INTO test_po_partial_context (po_id, item_id)
    VALUES (v_po_partial, v_item_partial);
END $$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
    ctx RECORD;
    pctx RECORD;
    v_partial_res JSONB;
    v_caught_overdelivery BOOLEAN := false;
    v_final_received NUMERIC;
    v_err TEXT;
BEGIN
    SELECT * INTO ctx FROM test_branch_context LIMIT 1;
    SELECT * INTO pctx FROM test_po_partial_context LIMIT 1;

    PERFORM public.send_purchase_order(ctx.store_a, pctx.po_id);

    -- Attempt to receive 5 units: 6 + 5 = 11 > 10 ordered -> MUST reject over-delivery!
    BEGIN
        PERFORM public.receive_purchase_order(
            ctx.store_a, pctx.po_id, pctx.item_id, 5, 'LOT-PARTIAL-1', CURRENT_DATE + INTERVAL '180 days', 'po-recv-partial-fail'
        );
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLERRM;
        IF v_err LIKE '%Over-delivery rejected%' THEN
            v_caught_overdelivery := true;
        END IF;
    END;
    ASSERT v_caught_overdelivery = true, format('Test 10.4 Security Gap: receive_purchase_order allowed receipt exceeding remaining ordered quantity (Error: %s)', v_err);

    -- Receiving exactly 4 units (6 + 4 = 10) must succeed and transition PO to RECEIVED
    v_partial_res := public.receive_purchase_order(
        ctx.store_a, pctx.po_id, pctx.item_id, 4, 'LOT-PARTIAL-2', CURRENT_DATE + INTERVAL '180 days', 'po-recv-partial-ok'
    );
    ASSERT (v_partial_res->>'success')::BOOLEAN = true, 'Test 10.4 Failed: Valid remaining quantity receipt rejected';
    ASSERT (v_partial_res->>'new_status') = 'RECEIVED', 'Test 10.4 Failed: Fully delivered PO was not transitioned to RECEIVED';

    SELECT received_quantity INTO v_final_received FROM public.purchase_order_items WHERE id = pctx.item_id;
    ASSERT v_final_received = 10, format('Test 10.4 Failed: PO item received_quantity expected 10, got %s', v_final_received);
END $$;


-- 10.5 DIRECT WRITE ON purchase_order_items.received_quantity DENIED
-- Proves that authenticated users CANNOT directly update or tamper with received_quantity
DO $$
DECLARE
    pctx RECORD;
    v_priv_rejected BOOLEAN := false;
    v_err TEXT;
BEGIN
    SELECT * INTO pctx FROM test_po_partial_context LIMIT 1;

    BEGIN
        UPDATE public.purchase_order_items SET received_quantity = 0 WHERE id = pctx.item_id;
    EXCEPTION WHEN OTHERS THEN
        v_priv_rejected := true;
        v_err := SQLERRM;
    END;

    ASSERT v_priv_rejected = true,
        'Test 10.5 Security Violation: authenticated user was permitted to directly UPDATE purchase_order_items.received_quantity';
END $$;


-- ============================================================================
-- 11. CLEANUP & ROLLBACK OF TEST OPERATIONAL DATA
-- Restores superuser role and rolls back test operational rows.
-- Note: The branch database schema remains migrated by the applied DDL migrations.
-- ============================================================================
RESET ROLE;
DROP TABLE IF EXISTS test_branch_context;

DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: All Phase 1 & 2 branch database verification tests passed with zero defects!';
END $$;

ROLLBACK;
