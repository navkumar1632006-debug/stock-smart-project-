import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url!, key!);

console.log('Testing Realtime subscription...');

const channel = supabase.channel('schema-db-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'products' },
    (payload) => console.log('Products change received!', payload)
  )
  .subscribe((status, err) => {
    console.log('Products Realtime Status:', status);
    if (err) console.error('Products Realtime Error:', err);
    
    // Test sales
    supabase.channel('schema-db-changes-sales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => console.log('Sales change received!', payload)
      )
      .subscribe((status2) => {
         console.log('Sales Realtime Status:', status2);
         setTimeout(() => process.exit(0), 2000);
      });
  });
