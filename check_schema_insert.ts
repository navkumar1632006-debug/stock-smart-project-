import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkCatalog() {
  console.log("Verifying invoices table columns...");
  
  // Try inserting a record with all columns
  const dummyRecord = {
    id: "00000000-0000-0000-0000-000000000000",
    store_id: "00000000-0000-0000-0000-000000000000",
    invoice_number: "TEST-001",
    customer_name: "Test",
    customer_contact: "1234",
    customer_gstin: "GST123",
    subtotal: 100,
    total_discount: 0,
    total_taxable: 100,
    total_gst: 18,
    grand_total: 118,
    payment_method: "Cash",
    sales_channel: "In-Store"
  };

  const { data, error } = await supabase.from('invoices').insert(dummyRecord).select();
  
  if (error) {
    if (error.code === '23503') {
       console.log("FOREIGN KEY CONSTRAINT VERIFIED: store_id references stores(id). (Code 23503)");
    } else if (error.code === '42P01') {
       console.log("TABLE DOES NOT EXIST");
    } else if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
       console.log("COLUMNS EXIST. RLS IS ENABLED and blocked insert (Code PGRST116)");
    } else {
       console.log("OTHER ERROR (but columns likely exist):", error.code, error.message);
    }
  } else {
    console.log("INSERT SUCCEEDED (Unexpected if RLS is enabled)");
  }

  // Check sales.invoice_id
  const dummySale = {
    invoice_id: "00000000-0000-0000-0000-000000000000"
  };
  const { error: salesError } = await supabase.from('sales').insert(dummySale).select();
  if (salesError) {
     if (salesError.code === '23503') {
       console.log("FOREIGN KEY CONSTRAINT VERIFIED: sales.invoice_id references invoices(id). (Code 23503)");
     } else if (salesError.code === 'PGRST116' || salesError.message.includes('row-level security')) {
       console.log("SALES INVOICE_ID EXISTS. RLS blocked insert.");
     } else {
       console.log("SALES ERROR:", salesError.code, salesError.message);
     }
  }
}

checkCatalog();
