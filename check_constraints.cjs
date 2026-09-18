const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkConstraints() {
  console.log('Checking for constraint violations in existing data...');

  // 1. Negative stock levels
  const { count: negativeStock, error: err1 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .lt('stock_level', 0);
  if (err1) console.error('Error checking products:', err1.message);
  else console.log(`Products with negative stock: ${negativeStock}`);

  // 2. Sales with <= 0 quantity
  const { count: badSales, error: err2 } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .lte('quantity', 0);
  if (err2) console.error('Error checking sales:', err2.message);
  else console.log(`Sales with quantity <= 0: ${badSales}`);

  // 3. Batches with < 0 quantity
  const { count: badBatches, error: err3 } = await supabase
    .from('batches')
    .select('*', { count: 'exact', head: true })
    .or('initial_quantity.lt.0,current_quantity.lt.0');
  if (err3) console.error('Error checking batches:', err3.message);
  else console.log(`Batches with negative quantity: ${badBatches}`);

}

checkConstraints();
