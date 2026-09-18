import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  console.log("Checking invoices table...");
  const { data, error } = await supabase.from('invoices').select('id').limit(1);
  if (error) {
    console.error("INVOICES TABLE ERROR:", error.code, error.message);
  } else {
    console.log("INVOICES TABLE EXISTS. Data length:", data.length);
  }

  console.log("Checking sales.invoice_id...");
  const { data: sales, error: salesError } = await supabase.from('sales').select('invoice_id').limit(1);
  if (salesError) {
    console.error("SALES INVOICE_ID ERROR:", salesError.code, salesError.message);
  } else {
    console.log("SALES INVOICE_ID EXISTS. Data length:", sales.length);
  }
}
check();
