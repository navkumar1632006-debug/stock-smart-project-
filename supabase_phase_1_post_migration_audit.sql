-- ==========================================
-- PHASE 1: POST-MIGRATION AUDIT SCRIPT
-- ==========================================
-- Run this in your Supabase SQL Editor AFTER executing the migration to verify all components.

-- 1. VERIFY TABLES EXIST
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'notifications'
) AS notifications_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
) AS stock_movements_exists;

-- 2. VERIFY COLUMNS EXIST
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'idempotency_key'
) AS sales_idempotency_exists;

SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'idempotency_key'
) AS stock_movements_idempotency_exists;

-- 3. VERIFY CONSTRAINTS
SELECT conname AS constraint_name, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' 
AND conname IN (
    'chk_product_stock_level', 
    'chk_sale_quantity', 
    'chk_sale_total_price', 
    'chk_batch_init_qty', 
    'chk_batch_curr_qty'
);

-- 4. VERIFY INDEXES
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_notifications_user_id',
    'idx_notifications_unread',
    'idx_stock_movements_product'
);

-- 5. VERIFY RLS IS ENABLED
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('notifications', 'stock_movements', 'stores', 'products', 'sales', 'batches', 'forecasts', 'suppliers')
AND relkind = 'r';

-- 6. VERIFY POLICIES
SELECT tablename, policyname, cmd AS operation, roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('notifications', 'stock_movements');

-- 7. VERIFY RPCs EXIST
SELECT proname AS function_name, prosecdef AS is_security_definer
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
AND proname IN ('process_sale', 'process_stock_adjustment');

-- 8. VERIFY REALTIME PUBLICATION
SELECT pubname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('notifications', 'stock_movements');
