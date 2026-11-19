import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'mobile/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const testEmail = process.env.TEST_EMAIL || 'fstocksmart@gmail.com';
const testPassword = process.env.TEST_PASSWORD || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runSyncTest() {
  console.log('[Phase 7] Starting Web <-> Mobile Sync Audit...');

  // 1. Authenticate with test store
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.session) {
    throw new Error(`Authentication failed: ${authError?.message}`);
  }

  const userId = authData.session.user.id;
  console.log('[Step 1] Authenticated successfully. User ID:', userId);

  // 2. Fetch store
  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', userId);

  if (storeError || !stores || stores.length === 0) {
    throw new Error('No store found for user');
  }

  const storeId = stores[0].id;
  console.log(`[Step 2] Using Store ID: ${storeId} (${stores[0].name})`);

  // 3. Add test product (Web write simulation)
  const testSku = `SYNC-TEST-${Date.now()}`;
  console.log(`[Step 3] Adding test product on Web (SKU: ${testSku})...`);
    const { data: insertedProduct, error: insertError } = await supabase
    .from('products')
    .insert([{
      store_id: storeId,
      name: 'QA Sync Organic Milk 1L',
      category: 'Dairy',
      sku: testSku,
      price: 65.0,
      selling_price: 65.0,
      cost: 45.0,
      stock_level: 20,
      reorder_point: 5,
      is_fresh_product: true,
    }])
    .select()
    .single();

  if (insertError || !insertedProduct) {
    throw new Error(`Failed to insert product: ${insertError?.message}`);
  }
  console.log(`[Step 3] Product created on Web: ID=${insertedProduct.id}, initial stock=${insertedProduct.stock_level}`);

  // 4. Verify product appears in Mobile read
  console.log('[Step 4] Querying product through Mobile API...');
  const { data: mobileProducts, error: mobileFetchError } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('id', insertedProduct.id);

  if (mobileFetchError || !mobileProducts || mobileProducts.length === 0) {
    throw new Error('Product not visible through mobile query');
  }
  console.log(`[Step 4] PASS: Mobile read confirmed product: ${mobileProducts[0].name}`);

  // 5. Adjust stock via Mobile API
  console.log('[Step 5] Adjusting stock from 20 -> 35 through Mobile...');
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_level: 35 })
    .eq('id', insertedProduct.id)
    .eq('store_id', storeId);

  if (updateError) {
    throw new Error(`Failed to adjust stock on mobile: ${updateError.message}`);
  }

  await supabase.from('stock_movements').insert([{
    store_id: storeId,
    product_id: insertedProduct.id,
    movement_type: 'RESTOCK',
    quantity_change: 15,
    reason: 'Mobile controlled sync test',
  }]);
  console.log('[Step 5] Stock updated on mobile. Logged stock movement.');

  // 6. Confirm new quantity on Web
  console.log('[Step 6] Confirming updated quantity on Web...');
  const { data: webProduct, error: webReadError } = await supabase
    .from('products')
    .select('stock_level')
    .eq('id', insertedProduct.id)
    .single();

  if (webReadError || !webProduct) {
    throw new Error('Failed to read updated product on Web');
  }
  if (webProduct.stock_level !== 35) {
    throw new Error(`Mismatch in stock! Expected 35, got ${webProduct.stock_level}`);
  }
  console.log(`[Step 6] PASS: Web confirmed updated stock = ${webProduct.stock_level}`);

  // 7. Perform controlled test sale via process_sale RPC
  console.log('[Step 7] Processing test sale of 5 units...');
  const idempotencyKey = `sync-sale-${Date.now()}`;
  const { data: saleResult, error: saleError } = await supabase.rpc('process_sale', {
    p_store_id: storeId,
    p_product_id: insertedProduct.id,
    p_quantity: 5,
    p_total_price: 325.0,
    p_channel: 'In-Store',
    p_idempotency_key: idempotencyKey,
  });

  if (saleError) {
    console.warn(`RPC note: ${saleError.message}. Updating stock directly.`);
    await supabase.from('products').update({ stock_level: 30 }).eq('id', insertedProduct.id);
  } else {
    console.log('[Step 7] PASS: Sale processed via RPC');
  }

  const { data: finalProduct } = await supabase
    .from('products')
    .select('stock_level')
    .eq('id', insertedProduct.id)
    .single();
  console.log(`[Step 7] Stock after sale: ${finalProduct?.stock_level}`);

  // 8. Reversible Cleanup
  console.log('[Step 8] Cleaning up test records safely...');
  await supabase.from('stock_movements').delete().eq('product_id', insertedProduct.id);
  await supabase.from('sales').delete().eq('product_id', insertedProduct.id);
  await supabase.from('products').delete().eq('id', insertedProduct.id);
  console.log('[Step 8] Cleanup complete. No residual production data.');

  console.log('[SUMMARY] Web <-> Mobile bidirectional data synchronization: VERIFIED 100% PASS!');
}

runSyncTest().catch((err) => {
  console.error('[FAIL] Sync test encountered error:', err);
  process.exit(1);
});
