import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function testSalesColumns() {
  const cols = ['id', 'store_id', 'product_id', 'quantity', 'total_price', 'channel', 'sale_date', 'invoice_id'];
  const { data, error } = await supabase.from('sales').select(cols.join(',')).limit(1);
  if (error) {
    console.log('sales test error:', error);
  } else {
    console.log('✅ sales table verified with columns:', cols.join(', '));
  }
}

testSalesColumns();
