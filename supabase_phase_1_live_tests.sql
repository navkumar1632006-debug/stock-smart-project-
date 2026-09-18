-- =======================================================
-- STOCKSMART AI - PHASE 1 LIVE FUNCTIONAL TESTS
-- =======================================================
-- WARNING: This script uses BEGIN and ROLLBACK to safely 
-- verify RPC constraints without modifying your real data.
-- You must supply a valid store_id and product_id that YOU OWN 
-- to run these tests correctly in your SQL Editor.

-- To test RLS and SECURITY DEFINER properly, you can set the role to an authenticated user:
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "YOUR-USER-UUID"}';

BEGIN;

-- 1. NORMAL SALE
-- EXPECTED: Success, stock decrements by 3, one stock movement logged.
SELECT public.process_sale(
    'YOUR-STORE-UUID', 
    'YOUR-PRODUCT-UUID', 
    3, 
    300.00, 
    'In-Store', 
    'test-key-sale-1'
);

-- 2. DUPLICATE SALE (Same parameters)
-- EXPECTED: Returns the same sale_id from Test 1, no second stock decrement.
SELECT public.process_sale(
    'YOUR-STORE-UUID', 
    'YOUR-PRODUCT-UUID', 
    3, 
    300.00, 
    'In-Store', 
    'test-key-sale-1'
);

-- 3. IDEMPOTENCY CONFLICT (Same key, different parameters)
-- EXPECTED: FAIL (Exception: Idempotency conflict: key used with different parameters)
-- SELECT public.process_sale('YOUR-STORE-UUID', 'YOUR-PRODUCT-UUID', 9, 300.00, 'In-Store', 'test-key-sale-1');

-- 4. INSUFFICIENT STOCK
-- EXPECTED: FAIL (Exception: Insufficient stock)
-- SELECT public.process_sale('YOUR-STORE-UUID', 'YOUR-PRODUCT-UUID', 999999, 100.00, 'In-Store', 'test-key-sale-2');

-- 5. ADD ADJUSTMENT
-- EXPECTED: Success, stock increases by 5.
SELECT public.process_stock_adjustment(
    'YOUR-STORE-UUID', 
    'YOUR-PRODUCT-UUID', 
    'add', 
    5, 
    'Test Add', 
    'test-key-adj-1'
);

-- 6. DEDUCT ADJUSTMENT
-- EXPECTED: Success, stock decreases by 4.
SELECT public.process_stock_adjustment(
    'YOUR-STORE-UUID', 
    'YOUR-PRODUCT-UUID', 
    'deduct', 
    4, 
    'Test Deduct', 
    'test-key-adj-2'
);

-- 7. FAILED DEDUCTION (Insufficient stock)
-- EXPECTED: FAIL (Exception: Insufficient stock for deduction)
-- SELECT public.process_stock_adjustment('YOUR-STORE-UUID', 'YOUR-PRODUCT-UUID', 'deduct', 999999, 'Test', 'test-key-adj-3');

-- 8. DUPLICATE ADJUSTMENT (Same parameters)
-- EXPECTED: Returns original movement_id, stock not deducted twice.
SELECT public.process_stock_adjustment(
    'YOUR-STORE-UUID', 
    'YOUR-PRODUCT-UUID', 
    'deduct', 
    4, 
    'Test Deduct', 
    'test-key-adj-2'
);

-- 9. ADJUSTMENT IDEMPOTENCY CONFLICT (Same key, different params)
-- EXPECTED: FAIL (Exception: Idempotency conflict: key used with different parameters)
-- SELECT public.process_stock_adjustment('YOUR-STORE-UUID', 'YOUR-PRODUCT-UUID', 'add', 4, 'Test Deduct', 'test-key-adj-2');

-- 10. UNAUTHORIZED STORE
-- EXPECTED: FAIL (Exception: Unauthorized store)
-- Requires setting request.jwt.claims to a user that DOES NOT own the store.

-- 11. CROSS-STORE PRODUCT
-- EXPECTED: FAIL (Exception: Product not found)
-- Try querying a product that belongs to another store while using your own store_id.

ROLLBACK;
-- ALL CHANGES DISCARDED.
