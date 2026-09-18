-- StockSmart AI - POS Transaction RPC Migration
-- Executes FEFO (First Expiry First Out) stock deductions and records sales atomically.

CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_store_id UUID,
    p_items JSONB, -- Array of objects: [{"product_id": "uuid", "quantity": 1, "total_price": 100.00}]
    p_channel TEXT DEFAULT 'In-Store'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Executes with the privileges of the calling user (enforces RLS automatically)
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty_needed INTEGER;
    v_total_price NUMERIC;
    v_current_stock INTEGER;
    v_batch RECORD;
    v_deduction INTEGER;
    v_remaining_qty INTEGER;
    v_sale_id UUID;
BEGIN
    -- Loop through each item in the cart
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty_needed := (v_item->>'quantity')::INTEGER;
        v_total_price := (v_item->>'total_price')::NUMERIC;
        v_remaining_qty := v_qty_needed;

        IF v_qty_needed <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero for product %', v_product_id;
        END IF;

        -- 1. Check overall stock level
        SELECT stock_level INTO v_current_stock
        FROM public.products
        WHERE id = v_product_id AND store_id = p_store_id
        FOR UPDATE; -- Lock row to prevent race conditions

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found or access denied.', v_product_id;
        END IF;

        IF v_current_stock < v_qty_needed THEN
            RAISE EXCEPTION 'Insufficient stock for product %. Requested: %, Available: %', v_product_id, v_qty_needed, v_current_stock;
        END IF;

        -- 2. FEFO Batch Deduction
        -- Fetch active batches ordered by expiry date
        FOR v_batch IN 
            SELECT id, current_quantity 
            FROM public.batches
            WHERE product_id = v_product_id 
              AND store_id = p_store_id 
              AND current_quantity > 0
              AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC
            FOR UPDATE -- Lock batch rows for deduction
        LOOP
            IF v_remaining_qty <= 0 THEN
                EXIT;
            END IF;

            v_deduction := LEAST(v_batch.current_quantity, v_remaining_qty);
            v_remaining_qty := v_remaining_qty - v_deduction;

            UPDATE public.batches
            SET current_quantity = current_quantity - v_deduction
            WHERE id = v_batch.id;
            
            -- Log batch-specific deduction (Optional but good for strict audit)
            -- We'll log the overall transaction below instead to keep it simple, 
            -- or we could log multiple if we wanted batch-level audits.
        END LOOP;

        -- If remaining_qty > 0, it means we didn't have enough FRESH batched stock,
        -- even though overall stock said we had enough. This implies missing/expired batches.
        -- We will RAISE an exception to enforce strict FEFO consistency.
        IF v_remaining_qty > 0 THEN
             -- Fallback: if there are no batches at all (non-perishable item), we just allow it.
             -- Let's check if the product has ANY batches.
             IF EXISTS (SELECT 1 FROM public.batches WHERE product_id = v_product_id AND store_id = p_store_id) THEN
                 RAISE EXCEPTION 'Cannot fulfill sale for product %. Only % valid unexpired units available in batches.', v_product_id, (v_qty_needed - v_remaining_qty);
             END IF;
             -- If no batches exist, we gracefully skip batch deduction and just deduct overall stock.
        END IF;

        -- 3. Update overall product stock
        UPDATE public.products
        SET stock_level = stock_level - v_qty_needed
        WHERE id = v_product_id AND store_id = p_store_id;

        -- 4. Record the sale
        INSERT INTO public.sales (store_id, product_id, quantity, total_price, channel, sale_date)
        VALUES (p_store_id, v_product_id, v_qty_needed, v_total_price, p_channel, NOW())
        RETURNING id INTO v_sale_id;

        -- 5. Record the Inventory Audit Transaction
        INSERT INTO public.inventory_transactions (
            store_id, product_id, transaction_type, quantity_changed, stock_after, reference_id, notes, created_by
        ) VALUES (
            p_store_id, v_product_id, 'SALE', -v_qty_needed, (v_current_stock - v_qty_needed), v_sale_id, 'POS Sale ' || p_channel, auth.uid()
        );

    END LOOP;

    RETURN '{"success": true}'::JSONB;
END;
$$;
