-- Phase 20: Procurement & Purchase Orders

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled')),
    total_amount DECIMAL NOT NULL DEFAULT 0,
    ordered_at TIMESTAMPTZ,
    expected_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_store_id ON public.purchase_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    unit_cost DECIMAL NOT NULL CHECK (unit_cost >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_qty_received CHECK (quantity_received <= quantity_ordered)
);

CREATE INDEX IF NOT EXISTS idx_poi_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON public.purchase_order_items(product_id);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view POs in their store" ON public.purchase_orders
  FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "Users can insert POs in their store" ON public.purchase_orders
  FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "Users can update POs in their store" ON public.purchase_orders
  FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

CREATE POLICY "Users can delete POs in their store" ON public.purchase_orders
  FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can view PO items in their store" ON public.purchase_order_items
  FOR SELECT USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders WHERE public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    )
  );

CREATE POLICY "Users can insert PO items in their store" ON public.purchase_order_items
  FOR INSERT WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders WHERE public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    )
  );

CREATE POLICY "Users can update PO items in their store" ON public.purchase_order_items
  FOR UPDATE USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders WHERE public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk'])
    )
  );

CREATE POLICY "Users can delete PO items in their store" ON public.purchase_order_items
  FOR DELETE USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    )
  );

-- RPC for atomic stock receiving
CREATE OR REPLACE FUNCTION receive_purchase_order(
    p_store_id UUID,
    p_po_id UUID,
    p_item_id UUID,
    p_receive_quantity INTEGER
) RETURNS jsonb AS $
DECLARE
    v_po_status TEXT;
    v_ordered INTEGER;
    v_received INTEGER;
    v_product_id UUID;
    v_current_stock INTEGER;
    v_new_received INTEGER;
    v_new_stock INTEGER;
    v_pending_items INTEGER;
BEGIN
    -- Verify auth
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify store role
    IF NOT public.has_store_role(p_store_id, ARRAY['manager', 'inventory_clerk']) THEN
        RAISE EXCEPTION 'Unauthorized to receive stock';
    END IF;

    IF p_receive_quantity <= 0 THEN
        RAISE EXCEPTION 'Receive quantity must be positive';
    END IF;

    -- Lock PO
    SELECT status INTO v_po_status
    FROM public.purchase_orders
    WHERE id = p_po_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found';
    END IF;

    IF v_po_status NOT IN ('approved', 'partially_received') THEN
        RAISE EXCEPTION 'Purchase order is not in a receivable state';
    END IF;

    -- Lock PO Item
    SELECT product_id, quantity_ordered, quantity_received
    INTO v_product_id, v_ordered, v_received
    FROM public.purchase_order_items
    WHERE id = p_item_id AND purchase_order_id = p_po_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order item not found';
    END IF;

    v_new_received := v_received + p_receive_quantity;

    IF v_new_received > v_ordered THEN
        RAISE EXCEPTION 'Cannot receive more than ordered';
    END IF;

    -- Update PO Item
    UPDATE public.purchase_order_items
    SET quantity_received = v_new_received,
        updated_at = NOW()
    WHERE id = p_item_id;

    -- Lock Product and update stock
    SELECT stock_level INTO v_current_stock
    FROM public.products
    WHERE id = v_product_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    v_new_stock := v_current_stock + p_receive_quantity;

    UPDATE public.products
    SET stock_level = v_new_stock,
        updated_at = NOW()
    WHERE id = v_product_id;

    -- Record stock movement
    INSERT INTO public.stock_movements (
        store_id,
        product_id,
        movement_type,
        quantity_changed,
        resulting_quantity,
        reference_id
    ) VALUES (
        p_store_id,
        v_product_id,
        'RESTOCK',
        p_receive_quantity,
        v_new_stock,
        'PO Received: ' || p_po_id
    );

    -- Check if PO is fully received
    SELECT COUNT(*) INTO v_pending_items
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_po_id AND quantity_received < quantity_ordered;

    IF v_pending_items = 0 THEN
        UPDATE public.purchase_orders
        SET status = 'received',
            received_at = NOW(),
            updated_at = NOW()
        WHERE id = p_po_id;
        v_po_status := 'received';
    ELSE
        UPDATE public.purchase_orders
        SET status = 'partially_received',
            updated_at = NOW()
        WHERE id = p_po_id;
        v_po_status := 'partially_received';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_status', v_po_status,
        'new_received', v_new_received,
        'new_stock', v_new_stock
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
