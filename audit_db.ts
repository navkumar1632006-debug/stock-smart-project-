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

async function testRLS() {
  const tables = ['sales', 'forecasts', 'suppliers'];
  for (const table of tables) {
    const { error } = await supabase.from(table).insert({}).select();
    console.log(`\n--- ${table} ---`);
    console.log('Error:', error);
  }
}

testRLS();
