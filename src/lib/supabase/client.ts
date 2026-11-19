import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
const supabaseKey = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';

function initSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '[StockSmart] Supabase credentials missing. ' +
      'Create a .env file in the project root with:\n' +
      '  VITE_SUPABASE_URL=https://<your-project>.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=<your-anon-key>'
    );
    // Return a Proxy that throws a descriptive error when any Supabase method is called,
    // instead of crashing the entire module graph at import time.
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        // Allow typeof checks and symbol access without throwing
        if (typeof prop === 'symbol' || prop === 'then') return undefined;
        throw new Error(
          `Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.`
        );
      },
    });
  }
  return createClient(supabaseUrl, supabaseKey);
}

export const supabase = initSupabaseClient();
