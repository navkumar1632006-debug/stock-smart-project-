import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing URL or KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function verifyTableAndColumns(table: string, columns: string[]) {
  console.log(`\nVerifying table: ${table}`);
  
  // 1. Verify existence and columns via SELECT
  const { data, error } = await supabase.from(table).select(columns.join(',')).limit(1);
  if (error) {
    if (error.code === 'PGRST205') {
      console.log(`❌ Table missing or not accessible: ${error.message}`);
    } else if (error.code === 'PGRST204') {
      console.log(`❌ Column missing: ${error.message}`);
    } else {
      console.log(`❌ Error: ${error.code} - ${error.message}`);
    }
  } else {
    console.log(`✅ Table exists. Columns verified: ${columns.join(', ')}`);
    console.log(`✅ RLS Read test: Returned ${data?.length} rows for anon user (should be 0 if RLS is tight).`);
  }

  // 2. Verify RLS Write protection
  const { error: insertError } = await supabase.from(table).insert({}).select();
  if (insertError) {
    // We expect a 401 or 403 or RLS violation if RLS is on
    if (insertError.code === '42501' || insertError.message.includes('row-level security') || insertError.message.includes('policy')) {
      console.log(`✅ RLS Insert protection active. Blocked anon insert.`);
    } else if (insertError.code === '23502') {
      console.log(`❌ RLS BYPASSED! Insert reached table constraints: ${insertError.message}`);
    } else {
      console.log(`⚠️ RLS check returned unexpected error: ${insertError.code} - ${insertError.message}`);
    }
  } else {
    console.log(`❌ RLS FAILED! Anon insert succeeded.`);
  }
}

async function run() {
  await verifyTableAndColumns('stores', ['id', 'owner_id', 'name', 'location', 'created_at']);
  await verifyTableAndColumns('products', ['id', 'store_id', 'name', 'category', 'sku', 'price', 'cost', 'stock_level', 'reorder_point', 'is_fresh_product', 'created_at']);
  await verifyTableAndColumns('sales', ['id', 'store_id', 'product_id', 'quantity', 'total_price', 'channel', 'sale_date']);
  await verifyTableAndColumns('batches', ['id', 'store_id', 'product_id', 'batch_number', 'initial_quantity', 'current_quantity', 'expiry_date', 'received_date']);
  await verifyTableAndColumns('forecasts', ['id', 'store_id', 'product_id', 'predicted_demand_7d', 'confidence_score', 'insight', 'updated_at']);
  await verifyTableAndColumns('suppliers', ['id', 'store_id', 'name', 'contact_info', 'reliability_score', 'created_at']);
}

run();
