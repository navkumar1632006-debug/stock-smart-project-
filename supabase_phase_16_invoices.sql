BEGIN;

-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_name TEXT,
    customer_contact TEXT,
    customer_gstin TEXT,
    subtotal NUMERIC NOT NULL,
    total_discount NUMERIC NOT NULL DEFAULT 0,
    total_taxable NUMERIC NOT NULL,
    total_gst NUMERIC NOT NULL,
    grand_total NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    sales_channel TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (store_id, invoice_number)
);

-- 2. Modify Sales Table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_store_id ON public.invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_id ON public.sales(invoice_id);

-- 4. Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users view invoices in their store" ON public.invoices;
CREATE POLICY "Users view invoices in their store" ON public.invoices 
FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert invoices in their store" ON public.invoices;
CREATE POLICY "Users insert invoices in their store" ON public.invoices 
FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users update invoices in their store" ON public.invoices;
CREATE POLICY "Users update invoices in their store" ON public.invoices 
FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

COMMIT;
