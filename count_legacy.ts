import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCounts() {
  console.log('Fetching legacy counts with anon key...');
  
  const tables = ['products', 'sales', 'forecasts', 'suppliers'];
  
  for (const table of tables) {
    // We try to count records where store_id is null.
    // However, if store_id doesn't exist yet, this query will fail with 'column does not exist'.
    // If that happens, we'll just count all rows.
    try {
      let { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('store_id', null);
      
      if (error) {
        if (error.message.includes('store_id')) {
           // store_id doesn't exist, count all
           let fallback = await supabase.from(table).select('*', { count: 'exact', head: true });
           console.log(`${table}: ${fallback.count} total legacy rows (store_id column not present)`);
        } else {
           console.log(`Error counting ${table}:`, error.message);
        }
      } else {
        console.log(`${table}: ${count} rows with store_id IS NULL`);
      }
    } catch (e: any) {
      console.error(e.message);
    }
  }

  // Also count if any have store_id IS NOT NULL
  for (const table of tables) {
    try {
      let { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .not('store_id', 'is', null);
      
      if (!error && count && count > 0) {
        console.log(`WARNING: ${table} has ${count} rows with valid store_id`);
      }
    } catch (e) {}
  }
}

checkCounts();
