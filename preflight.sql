-- PHASE 5B PRE-FLIGHT — READ ONLY

-- 1. Confirm the intended authenticated user exists
SELECT
  id,
  email
FROM auth.users
WHERE id = 'a49258dc-d4c7-48c9-ba3a-a758fae9205d';

-- 2. Check current row counts
SELECT 'products' AS table_name, COUNT(*) AS row_count FROM public.products
UNION ALL
SELECT 'sales', COUNT(*) FROM public.sales
UNION ALL
SELECT 'forecasts', COUNT(*) FROM public.forecasts
UNION ALL
SELECT 'suppliers', COUNT(*) FROM public.suppliers;

-- 3. Check whether the target tables already exist
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'stores',
    'products',
    'sales',
    'batches',
    'forecasts',
    'suppliers'
  )
ORDER BY table_name;
