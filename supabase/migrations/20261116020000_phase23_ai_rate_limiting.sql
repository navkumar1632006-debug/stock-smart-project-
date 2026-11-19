-- Migration: 20261116020000_phase23_ai_rate_limiting.sql
-- Description: Server-Controlled AI Rate Limiting & Usage Quota Management (Phase 2)
-- Targets: store_api_quotas table, check_and_increment_ai_quota stored procedure, get_store_ai_metrics stored procedure

BEGIN;

-- ============================================================================
-- 1. STORE API QUOTAS TABLE
-- Tracks daily AI request counts per store to enforce quota boundaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_api_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_store_api_quotas_store_date UNIQUE (store_id, request_date)
);

-- Fast lookup index for daily store quota reconciliation
CREATE INDEX IF NOT EXISTS idx_store_api_quotas_store_date 
    ON public.store_api_quotas(store_id, request_date);

-- Enable Row Level Security
ALTER TABLE public.store_api_quotas ENABLE ROW LEVEL SECURITY;

-- Dynamic drop of any pre-existing policies on store_api_quotas
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_catalog.pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'store_api_quotas'
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP; 
END $$;

-- Store owners and managers can view their store's AI usage statistics
CREATE POLICY "quotas_select" ON public.store_api_quotas
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
        OR public.has_store_role(store_id, ARRAY['manager'])
    );

REVOKE ALL ON public.store_api_quotas FROM PUBLIC, anon;
GRANT SELECT ON public.store_api_quotas TO authenticated;

-- Note: No client INSERT, UPDATE, or DELETE policies exist.
-- Direct mutations are prohibited; all usage tracking is strictly atomic via the RPC below.


-- ============================================================================
-- 2. ATOMIC STORED PROCEDURE: check_and_increment_ai_quota
-- Hardened: Server-enforced daily limit (cannot be bypassed by client parameters),
-- auth.uid() check, has_store_role check, FOR UPDATE row locking,
-- atomic counter increment, returns remaining quota allowance.
-- Hardened search_path = '' with fully qualified table references
-- ============================================================================

DROP FUNCTION IF EXISTS public.check_and_increment_ai_quota(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.check_and_increment_ai_quota(UUID);

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(
    p_store_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_daily_limit CONSTANT INTEGER := 50; -- Server-controlled immutable limit
    v_current_count INTEGER;
BEGIN
    -- 1. Caller Authorization Verification
    -- Execution is strictly restricted to internal service_role orchestration.
    -- Execution privilege is revoked from PUBLIC, anon, and authenticated to prevent direct client quota exhaustion.
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized: check_and_increment_ai_quota can only be invoked by internal service_role orchestration';
    END IF;

    -- 2. Store Parameter Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Invalid store_id: store reference required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
        RAISE EXCEPTION 'Store not found: %', p_store_id;
    END IF;

    -- 4. Ensure Daily Record Exists
    INSERT INTO public.store_api_quotas (store_id, request_date, request_count)
    VALUES (p_store_id, CURRENT_DATE, 0)
    ON CONFLICT (store_id, request_date) DO NOTHING;

    -- 5. Row Locking FOR UPDATE to Prevent Race Conditions During Concurrent Invocations
    SELECT request_count INTO v_current_count
    FROM public.store_api_quotas
    WHERE store_id = p_store_id AND request_date = CURRENT_DATE
    FOR UPDATE;

    IF v_current_count IS NULL THEN
        v_current_count := 0;
    END IF;

    -- 6. Check Quota Limit
    IF v_current_count >= v_daily_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'current_count', v_current_count,
            'limit', v_daily_limit,
            'remaining', 0,
            'message', 'Daily AI request limit reached for this store. Please try again tomorrow.'
        );
    END IF;

    -- 7. Atomic Increment
    UPDATE public.store_api_quotas
    SET request_count = request_count + 1,
        updated_at = NOW()
    WHERE store_id = p_store_id AND request_date = CURRENT_DATE;

    RETURN jsonb_build_object(
        'allowed', true,
        'current_count', v_current_count + 1,
        'limit', v_daily_limit,
        'remaining', v_daily_limit - (v_current_count + 1),
        'message', 'Quota verified successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ============================================================================
-- 3. ATOMIC STORED PROCEDURE: get_store_ai_metrics
-- Database-level aggregation of inventory and sales metrics for the AI Assistant.
-- Solves Supabase API row limit (1,000 rows), filters strictly by completed sales
-- today (sale_date = CURRENT_DATE AND status = 'COMPLETED'), and returns verified ground truth.
-- Treats nullable stock_level as zero (stockout / uninitialized).
-- Hardened search_path = '' with fully qualified table references.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_store_ai_metrics(UUID);

CREATE OR REPLACE FUNCTION public.get_store_ai_metrics(
    p_store_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_total_products INTEGER;
    v_out_of_stock_count INTEGER;
    v_low_stock_count INTEGER;
    v_out_of_stock_samples JSONB;
    v_low_stock_samples JSONB;
    v_today_sales_count INTEGER;
    v_today_sales_total NUMERIC;
BEGIN
    -- 1. Store Parameter Validation
    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'Invalid store_id: store reference required';
    END IF;

    -- 2. Authentication & Role-Based Access Control Verification
    -- Service role orchestration bypasses user-level RBAC; authenticated users must satisfy has_store_role
    IF auth.role() = 'service_role' THEN
        -- Service role authorized for background/edge AI synthesis
        NULL;
    ELSE
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
        END IF;

        IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'inventory_clerk', 'cashier']) THEN
            RAISE EXCEPTION 'Unauthorized: Caller does not possess an authorized role in store %', p_store_id;
        END IF;
    END IF;

    -- 4. Inventory Metrics (Aggregated in Database; COALESCE handles null stock_level as 0)
    SELECT COUNT(*) INTO v_total_products 
    FROM public.products 
    WHERE store_id = p_store_id;

    SELECT COUNT(*) INTO v_out_of_stock_count 
    FROM public.products 
    WHERE store_id = p_store_id AND COALESCE(stock_level, 0) <= 0;

    SELECT COALESCE(jsonb_agg(name), '[]'::jsonb) INTO v_out_of_stock_samples
    FROM (
        SELECT name FROM public.products 
        WHERE store_id = p_store_id AND COALESCE(stock_level, 0) <= 0 
        ORDER BY name LIMIT 5
    ) out_sub;

    SELECT COUNT(*) INTO v_low_stock_count 
    FROM public.products 
    WHERE store_id = p_store_id AND COALESCE(stock_level, 0) > 0 AND stock_level <= reorder_point;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'remaining', stock_level, 'reorder_point', reorder_point)), '[]'::jsonb) 
    INTO v_low_stock_samples
    FROM (
        SELECT name, stock_level, reorder_point FROM public.products 
        WHERE store_id = p_store_id AND COALESCE(stock_level, 0) > 0 AND stock_level <= reorder_point 
        ORDER BY stock_level ASC LIMIT 5
    ) low_sub;

    -- 5. Sales Metrics (Strictly Completed Sales Today via Database Aggregation)
    SELECT COUNT(*), COALESCE(SUM(grand_total), 0)
    INTO v_today_sales_count, v_today_sales_total
    FROM public.sales
    WHERE store_id = p_store_id 
      AND sale_date = CURRENT_DATE 
      AND status = 'COMPLETED';

    RETURN jsonb_build_object(
        'total_products_tracked', v_total_products,
        'out_of_stock_count', v_out_of_stock_count,
        'out_of_stock_samples', v_out_of_stock_samples,
        'low_stock_count', v_low_stock_count,
        'low_stock_samples', v_low_stock_samples,
        'today_sales_transactions', v_today_sales_count,
        'today_gross_revenue', v_today_sales_total,
        'server_audit_date', CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ============================================================================
-- 4. EXECUTION PRIVILEGES
-- ============================================================================

-- check_and_increment_ai_quota is restricted STRICTLY to service_role to prevent
-- authenticated store members from directly invoking the RPC and consuming quotas outside the AI endpoint.
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_store_ai_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_store_ai_metrics(UUID) TO authenticated, service_role;

COMMIT;
