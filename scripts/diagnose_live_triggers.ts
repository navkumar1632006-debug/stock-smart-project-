import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://dsshzxopmfxzzihhiopi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nS_gWJnmUoR1XFs-yFUqcw_NSwwgsxd';
const email = process.env.TEST_EMAIL || 'fstocksmart@gmail.com';
const password = process.env.TEST_PASSWORD || 'CtjAVgnd36A@HS3';

async function diagnose() {
  console.log('--- Diagnosing Live Database Triggers and Function Behavior ---');
  const client = createClient(url, key);

  // Authenticate
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error('Auth error:', authErr.message);
    return;
  }
  console.log('Authenticated as:', auth.user.email, '(UID:', auth.user.id, ')');

  // Get store
  const { data: store } = await client.from('stores').select('id, name').limit(1).single();
  const storeId = store?.id;
  console.log('Store ID:', storeId, `(${store?.name})`);

  // Test 1: Insert on products with stock_level omitted (defaults to 0)
  console.log('\n[Test 1] products INSERT with stock_level omitted:');
  const testSku1 = `DIAG-${Date.now().toString().slice(-6)}`;
  const { data: p1, error: p1Err } = await client.from('products').insert({
    store_id: storeId,
    name: 'Diagnostic Item 1',
    sku: testSku1,
    price: 50,
    selling_price: 50,
    cost: 30,
    category: 'Staples'
  }).select().single();
  console.log('Result:', p1Err ? `FAILED: ${p1Err.message}` : `SUCCESS (ID: ${p1?.id})`);

  // Test 2: Insert on products with explicit stock_level = 0
  console.log('\n[Test 2] products INSERT with stock_level = 0:');
  const testSku2 = `DIAG-${(Date.now() + 1).toString().slice(-6)}`;
  const { data: p2, error: p2Err } = await client.from('products').insert({
    store_id: storeId,
    name: 'Diagnostic Item 2',
    sku: testSku2,
    price: 50,
    selling_price: 50,
    cost: 30,
    stock_level: 0,
    category: 'Staples'
  }).select().single();
  console.log('Result:', p2Err ? `FAILED: ${p2Err.message}` : `SUCCESS (ID: ${p2?.id})`);

  // Test 3: Insert on products with stock_level = 10 (should be rejected by security trigger)
  console.log('\n[Test 3] products INSERT with stock_level = 10 (unauthorized):');
  const testSku3 = `DIAG-${(Date.now() + 2).toString().slice(-6)}`;
  const { data: p3, error: p3Err } = await client.from('products').insert({
    store_id: storeId,
    name: 'Diagnostic Item 3',
    sku: testSku3,
    price: 50,
    selling_price: 50,
    cost: 30,
    stock_level: 10,
    category: 'Staples'
  }).select().single();
  console.log('Result:', p3Err ? `REJECTED: ${p3Err.message}` : `ALLOWED: ${p3?.id} (SECURITY RISK!)`);

  // Test 4: Insert on khata_customers with balance omitted (defaults to 0)
  console.log('\n[Test 4] khata_customers INSERT with balance omitted:');
  const testPhone1 = `99${Date.now().toString().slice(-8)}`;
  const { data: k1, error: k1Err } = await client.from('khata_customers').insert({
    store_id: storeId,
    name: 'Diagnostic Khata Customer 1',
    phone: testPhone1
  }).select().single();
  console.log('Result:', k1Err ? `FAILED: ${k1Err.message}` : `SUCCESS (ID: ${k1?.id})`);

  // Test 5: Insert on khata_customers with balance = 500 (unauthorized)
  console.log('\n[Test 5] khata_customers INSERT with balance = 500 (unauthorized):');
  const testPhone2 = `98${Date.now().toString().slice(-8)}`;
  const { data: k2, error: k2Err } = await client.from('khata_customers').insert({
    store_id: storeId,
    name: 'Diagnostic Khata Customer 2',
    phone: testPhone2,
    balance: 500
  }).select().single();
  console.log('Result:', k2Err ? `REJECTED: ${k2Err.message}` : `ALLOWED: ${k2?.id} (SECURITY RISK!)`);

  // Clean up any test records
  if (p1?.id) await client.from('products').delete().eq('id', p1.id);
  if (p2?.id) await client.from('products').delete().eq('id', p2.id);
  if (k1?.id) await client.from('khata_customers').delete().eq('id', k1.id);
}

diagnose().catch(console.error);
