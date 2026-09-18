import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCounts() {
  const tables = ['products', 'sales', 'forecasts', 'suppliers', 'stores', 'batches'];
  
  for (const table of tables) {
    try {
      let { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);
      
      if (error) {
        console.log(`Error reading ${table}:`, error.message);
      } else {
        console.log(`Table ${table} exists. Total rows: ${count}`);
        if (data && data.length > 0) {
           console.log(`  Columns in ${table}:`, Object.keys(data[0]).join(', '));
        }
      }
    } catch (e: any) {
      console.error(e.message);
    }
  }
}

checkCounts();
