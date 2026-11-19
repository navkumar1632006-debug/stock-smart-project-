-- ============================================================================
-- SAFE ROLLBACK SCRIPT: rollback_20261119000000_safe.sql
-- Description: Reverts trigger guards to self-contained, table-specific baseline guards.
-- GUARANTEE:   NEVER recreates the broken monolithic guard_direct_balance_stock_mutations()
--              NEVER reintroduces NEW.balance / NEW.stock_level cross-table record access.
-- ============================================================================

BEGIN;

-- 1. Baseline Products Guard (Self-contained, table-specific)
CREATE OR REPLACE FUNCTION public.guard_direct_product_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' AND NEW.stock_level IS DISTINCT FROM 0 THEN
            RAISE EXCEPTION 'Security violation: initial stock_level on products must be 0.';
        ELSIF TG_OP = 'UPDATE' AND NEW.stock_level IS DISTINCT FROM OLD.stock_level THEN
            RAISE EXCEPTION 'Security violation: products.stock_level cannot be updated directly.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Baseline Khata Balance Guard (Self-contained, table-specific)
CREATE OR REPLACE FUNCTION public.guard_direct_khata_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' AND NEW.balance IS DISTINCT FROM 0 THEN
            RAISE EXCEPTION 'Security violation: initial balance on khata_customers must be 0.';
        ELSIF TG_OP = 'UPDATE' AND NEW.balance IS DISTINCT FROM OLD.balance THEN
            RAISE EXCEPTION 'Security violation: khata_customers.balance cannot be updated directly.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Baseline Loyalty Points Guard (Self-contained, table-specific)
CREATE OR REPLACE FUNCTION public.guard_direct_loyalty_points()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' AND NEW.points_balance IS DISTINCT FROM 0 THEN
            RAISE EXCEPTION 'Security violation: initial points_balance on loyalty_customers must be 0.';
        ELSIF TG_OP = 'UPDATE' AND NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
            RAISE EXCEPTION 'Security violation: loyalty_customers.points_balance cannot be updated directly.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Baseline PO Received Guard (Self-contained, table-specific)
CREATE OR REPLACE FUNCTION public.guard_direct_poi_received()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF TG_OP = 'INSERT' AND NEW.received_quantity IS DISTINCT FROM 0 THEN
            RAISE EXCEPTION 'Security violation: initial received_quantity on purchase_order_items must be 0.';
        ELSIF TG_OP = 'UPDATE' AND NEW.received_quantity IS DISTINCT FROM OLD.received_quantity THEN
            RAISE EXCEPTION 'Security violation: purchase_order_items.received_quantity cannot be updated directly.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Reattach triggers to the baseline table-specific guards
DROP TRIGGER IF EXISTS trg_guard_product_stock ON public.products;
CREATE TRIGGER trg_guard_product_stock BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_direct_product_stock();

DROP TRIGGER IF EXISTS trg_guard_khata_balance ON public.khata_customers;
CREATE TRIGGER trg_guard_khata_balance BEFORE INSERT OR UPDATE ON public.khata_customers FOR EACH ROW EXECUTE FUNCTION public.guard_direct_khata_balance();

DROP TRIGGER IF EXISTS trg_guard_loyalty_points ON public.loyalty_customers;
CREATE TRIGGER trg_guard_loyalty_points BEFORE INSERT OR UPDATE ON public.loyalty_customers FOR EACH ROW EXECUTE FUNCTION public.guard_direct_loyalty_points();

DROP TRIGGER IF EXISTS trg_guard_poi_received ON public.purchase_order_items;
CREATE TRIGGER trg_guard_poi_received BEFORE INSERT OR UPDATE ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.guard_direct_poi_received();

-- Ensure broken monolithic function is permanently removed
DROP FUNCTION IF EXISTS public.guard_direct_balance_stock_mutations();

-- Reconcile migration record if rolled back
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations'
    ) THEN
        DELETE FROM supabase_migrations.schema_migrations WHERE version = '20261119000000';
    END IF;
END $$;

COMMIT;
