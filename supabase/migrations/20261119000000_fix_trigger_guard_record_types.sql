-- ============================================================================
-- MIGRATION: 20261119000000_fix_trigger_guard_record_types.sql
-- Description: Replaces monolithic guard_direct_balance_stock_mutations() trigger
--              with table-specific, strongly-typed guard functions.
-- Root Cause:  Sharing a single trigger function across products, khata_customers,
--              loyalty_customers, and purchase_order_items caused PostgreSQL
--              to evaluate columns (NEW.balance, NEW.stock_level) on mismatched
--              rowtypes, throwing 'record "new" has no field ...'.
-- Target:      Supabase Project dsshzxopmfxzzihhiopi (StockSmart Cloud PostgreSQL)
-- Impact:      NON-DESTRUCTIVE. No schema columns or data modified. 
--              Restores ability for authenticated clients to create products and
--              khata customers with default zero balances while preserving dual-layer
--              mutation protection against direct client balance/stock tampering.
-- ============================================================================

BEGIN;

-- 1. Table-Specific Guard: Products (Stock Level Protection)
CREATE OR REPLACE FUNCTION public.guard_direct_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.stock_level IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial stock_level on products must be 0. Use process_stock_adjustment or receive_purchase_order.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.stock_level IS DISTINCT FROM OLD.stock_level THEN
                RAISE EXCEPTION 'Security violation: products.stock_level cannot be updated directly. Use process_sale, process_stock_adjustment, or receive_purchase_order.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Table-Specific Guard: Khata Customers (Balance Protection)
CREATE OR REPLACE FUNCTION public.guard_direct_khata_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.balance IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial balance on khata_customers must be 0. Use process_khata_transaction.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.balance IS DISTINCT FROM OLD.balance THEN
                RAISE EXCEPTION 'Security violation: khata_customers.balance cannot be updated directly. Use process_khata_transaction.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Table-Specific Guard: Loyalty Customers (Points Protection)
CREATE OR REPLACE FUNCTION public.guard_direct_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.points_balance IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial points_balance on loyalty_customers must be 0. Use process_loyalty_transaction.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
                RAISE EXCEPTION 'Security violation: loyalty_customers.points_balance cannot be updated directly. Use process_loyalty_transaction.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Table-Specific Guard: Purchase Order Items (Received Quantity Protection)
CREATE OR REPLACE FUNCTION public.guard_direct_poi_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.received_quantity IS DISTINCT FROM 0 THEN
                RAISE EXCEPTION 'Security violation: initial received_quantity on purchase_order_items must be 0. Use receive_purchase_order.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.received_quantity IS DISTINCT FROM OLD.received_quantity THEN
                RAISE EXCEPTION 'Security violation: purchase_order_items.received_quantity cannot be updated directly. Use receive_purchase_order.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 5. Attach Triggers to Table-Specific Functions
DROP TRIGGER IF EXISTS trg_guard_product_stock ON public.products;
CREATE TRIGGER trg_guard_product_stock
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_product_stock();

DROP TRIGGER IF EXISTS trg_guard_khata_balance ON public.khata_customers;
CREATE TRIGGER trg_guard_khata_balance
    BEFORE INSERT OR UPDATE ON public.khata_customers
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_khata_balance();

DROP TRIGGER IF EXISTS trg_guard_loyalty_points ON public.loyalty_customers;
CREATE TRIGGER trg_guard_loyalty_points
    BEFORE INSERT OR UPDATE ON public.loyalty_customers
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_loyalty_points();

DROP TRIGGER IF EXISTS trg_guard_poi_received ON public.purchase_order_items;
CREATE TRIGGER trg_guard_poi_received
    BEFORE INSERT OR UPDATE ON public.purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION public.guard_direct_poi_received();

-- 6. Clean up obsolete monolithic function
DROP FUNCTION IF EXISTS public.guard_direct_balance_stock_mutations();

COMMIT;
