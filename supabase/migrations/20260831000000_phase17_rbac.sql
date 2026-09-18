BEGIN;

-- 1. Create store_staff table
CREATE TABLE IF NOT EXISTS public.store_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'cashier', 'inventory_clerk')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, user_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_store_staff_store_id ON public.store_staff(store_id);
CREATE INDEX IF NOT EXISTS idx_store_staff_user_id ON public.store_staff(user_id);

-- Enable RLS on store_staff
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

-- 2. Create SECURITY DEFINER Role Helper
CREATE OR REPLACE FUNCTION public.has_store_role(target_store_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_owner boolean;
    has_role boolean;
BEGIN
    -- Fast check for ownership first
    SELECT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = target_store_id AND owner_id = auth.uid()
    ) INTO is_owner;

    IF is_owner THEN
        RETURN true;
    END IF;

    -- Check active staff role
    SELECT EXISTS (
        SELECT 1 FROM public.store_staff
        WHERE store_id = target_store_id 
        AND user_id = auth.uid() 
        AND status = 'active'
        AND role = ANY(allowed_roles)
    ) INTO has_role;

    RETURN has_role;
END;
$$;

-- Revoke public execute to ensure only authenticated users can run it
REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_store_role(uuid, text[]) TO authenticated;

-- 3. Create Staff Invitation RPC
CREATE OR REPLACE FUNCTION public.invite_staff_by_email(
    staff_email text,
    assigned_role text,
    target_store_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_owner boolean;
    target_user_id uuid;
    existing_staff_id uuid;
BEGIN
    -- Ensure caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Must be logged in.';
    END IF;

    -- Validate caller is store owner
    SELECT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = target_store_id AND owner_id = auth.uid()
    ) INTO is_owner;

    IF NOT is_owner THEN
        RAISE EXCEPTION 'Unauthorized: Only the store owner can invite staff.';
    END IF;

    -- Validate assigned_role
    IF assigned_role NOT IN ('manager', 'cashier', 'inventory_clerk') THEN
        RAISE EXCEPTION 'Invalid role: Must be manager, cashier, or inventory_clerk.';
    END IF;

    -- Lookup target user by email in auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = lower(trim(staff_email));

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found. The staff member must create an account first.';
    END IF;

    -- Check for existing assignment
    SELECT id INTO existing_staff_id
    FROM public.store_staff
    WHERE store_id = target_store_id AND user_id = target_user_id;

    IF existing_staff_id IS NOT NULL THEN
        RAISE EXCEPTION 'User is already assigned to this store.';
    END IF;

    -- Insert staff record
    INSERT INTO public.store_staff (store_id, user_id, role, status)
    VALUES (target_store_id, target_user_id, assigned_role, 'active');

    RETURN jsonb_build_object('success', true, 'message', 'Staff successfully invited and activated.');
END;
$$;

-- Only authenticated users can call the RPC
REVOKE EXECUTE ON FUNCTION public.invite_staff_by_email(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_staff_by_email(text, text, uuid) TO authenticated;


-- 4. RLS POLICIES FOR store_staff
DROP POLICY IF EXISTS "Owners manage staff" ON public.store_staff;
CREATE POLICY "Owners manage staff" ON public.store_staff
FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view their own assignments" ON public.store_staff;
CREATE POLICY "Staff can view their own assignments" ON public.store_staff
FOR SELECT USING (user_id = auth.uid());


-- 5. UPGRADE RLS POLICIES FOR PRODUCTS
DROP POLICY IF EXISTS "Users can view products in their store" ON public.products;
CREATE POLICY "Users can view products in their store" ON public.products
FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk', 'cashier']));

DROP POLICY IF EXISTS "Users can insert products in their store" ON public.products;
CREATE POLICY "Users can insert products in their store" ON public.products
FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can update products in their store" ON public.products;
CREATE POLICY "Users can update products in their store" ON public.products
FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can delete products in their store" ON public.products;
CREATE POLICY "Users can delete products in their store" ON public.products
FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));


-- 6. UPGRADE RLS POLICIES FOR BATCHES
DROP POLICY IF EXISTS "Users can view batches in their store" ON public.batches;
CREATE POLICY "Users can view batches in their store" ON public.batches
FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk', 'cashier']));

DROP POLICY IF EXISTS "Users can insert batches in their store" ON public.batches;
CREATE POLICY "Users can insert batches in their store" ON public.batches
FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can update batches in their store" ON public.batches;
CREATE POLICY "Users can update batches in their store" ON public.batches
FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can delete batches in their store" ON public.batches;
CREATE POLICY "Users can delete batches in their store" ON public.batches
FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));


-- 7. UPGRADE RLS POLICIES FOR SALES
DROP POLICY IF EXISTS "Users can view sales in their store" ON public.sales;
CREATE POLICY "Users can view sales in their store" ON public.sales
FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

DROP POLICY IF EXISTS "Users can insert sales in their store" ON public.sales;
CREATE POLICY "Users can insert sales in their store" ON public.sales
FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

DROP POLICY IF EXISTS "Users can update sales in their store" ON public.sales;
CREATE POLICY "Users can update sales in their store" ON public.sales
FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete sales in their store" ON public.sales;
CREATE POLICY "Users can delete sales in their store" ON public.sales
FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));


-- 8. UPGRADE RLS POLICIES FOR INVOICES (Phase 16 replacement)
DROP POLICY IF EXISTS "Users view invoices in their store" ON public.invoices;
CREATE POLICY "Users view invoices in their store" ON public.invoices
FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

DROP POLICY IF EXISTS "Users insert invoices in their store" ON public.invoices;
CREATE POLICY "Users insert invoices in their store" ON public.invoices
FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'cashier']));

DROP POLICY IF EXISTS "Users update invoices in their store" ON public.invoices;
CREATE POLICY "Users update invoices in their store" ON public.invoices
FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));


-- 9. UPGRADE RLS POLICIES FOR FORECASTS
DROP POLICY IF EXISTS "Users can view forecasts in their store" ON public.forecasts;
CREATE POLICY "Users can view forecasts in their store" ON public.forecasts
FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager']));

DROP POLICY IF EXISTS "Users can insert forecasts in their store" ON public.forecasts;
CREATE POLICY "Users can insert forecasts in their store" ON public.forecasts
FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager']));

DROP POLICY IF EXISTS "Users can update forecasts in their store" ON public.forecasts;
CREATE POLICY "Users can update forecasts in their store" ON public.forecasts
FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager']));

DROP POLICY IF EXISTS "Users can delete forecasts in their store" ON public.forecasts;
CREATE POLICY "Users can delete forecasts in their store" ON public.forecasts
FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager']));


-- 10. UPGRADE RLS POLICIES FOR SUPPLIERS
DROP POLICY IF EXISTS "Users can view suppliers in their store" ON public.suppliers;
CREATE POLICY "Users can view suppliers in their store" ON public.suppliers
FOR SELECT USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can insert suppliers in their store" ON public.suppliers;
CREATE POLICY "Users can insert suppliers in their store" ON public.suppliers
FOR INSERT WITH CHECK (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can update suppliers in their store" ON public.suppliers;
CREATE POLICY "Users can update suppliers in their store" ON public.suppliers
FOR UPDATE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

DROP POLICY IF EXISTS "Users can delete suppliers in their store" ON public.suppliers;
CREATE POLICY "Users can delete suppliers in their store" ON public.suppliers
FOR DELETE USING (public.has_store_role(store_id, ARRAY['manager', 'inventory_clerk']));

COMMIT;
