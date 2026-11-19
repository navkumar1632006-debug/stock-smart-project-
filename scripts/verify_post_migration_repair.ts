import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'mobile/.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dsshzxopmfxzzihhiopi.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nS_gWJnmUoR1XFs-yFUqcw_NSwwgsxd';
const TEST_EMAIL = process.env.TEST_EMAIL || 'fstocksmart@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'CtjAVgnd36A@HS3';

interface StepResult {
  stepNumber: number;
  scenario: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  evidence: any;
}

const results: StepResult[] = [];

async function runAll14Scenarios() {
  console.log('================================================================');
  console.log('StockSmart AI: 14-Scenario Database Repair Verification Suite');
  console.log('Target Project:', SUPABASE_URL);
  console.log('================================================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate as Store Manager
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authErr || !auth.user) {
    console.error('❌ Authentication failed:', authErr?.message);
    process.exit(1);
  }

  console.log('✅ Authenticated as:', auth.user.email, '(UID:', auth.user.id, ')');

  const { data: store } = await supabase.from('stores').select('id, name').limit(1).single();
  const storeId = store?.id;
  console.log('✅ Active Store Context:', store?.name, `(ID: ${storeId})\n`);

  // Query an active supplier for purchase order tests
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name')
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .limit(1)
    .single();

  const supplierId = supplier?.id;
  console.log('✅ Active Supplier Context:', supplier?.name || 'Shared FMCG', `(ID: ${supplierId})\n`);

  // Track created fixtures for atomic cleanup
  let testProductId: string | null = null;
  let testKhataId: string | null = null;
  let testLoyaltyId: string | null = null;
  let testPoId: string | null = null;
  let testPoiId: string | null = null;

  // ==========================================================================
  // SCENARIO 1: Product Zero-Stock Insertion (Permitted Zero-Value Insert)
  // ==========================================================================
  console.log('[1/14] Testing Product zero-stock insertion...');
  const testSku = `VERIF-SKU-${Date.now().toString().slice(-6)}`;
  try {
    const { data: p1, error: p1Err } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        name: 'Gate-Check Basmati Rice 1kg',
        sku: testSku,
        category: 'Staples',
        price: 130.00,
        selling_price: 130.00,
        cost: 95.00,
        reorder_point: 10,
        is_fresh_product: false,
      })
      .select('id, name, sku, stock_level')
      .single();

    if (p1Err) throw p1Err;
    testProductId = p1.id;
    console.log('✅ Product created. ID:', p1.id, 'Stock Level:', p1.stock_level);
    results.push({
      stepNumber: 1,
      scenario: 'Product Zero-Stock Insertion',
      expected: 'Product created with default stock_level = 0 without trigger collision',
      actual: `Created product ${p1.id} with stock_level: ${p1.stock_level}`,
      status: p1.stock_level === 0 ? 'PASS' : 'FAIL',
      evidence: p1,
    });
  } catch (err: any) {
    console.error('❌ Scenario 1 failed:', err.message);
    results.push({
      stepNumber: 1,
      scenario: 'Product Zero-Stock Insertion',
      expected: 'Product created with stock_level = 0',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 2: Unauthorized Nonzero Stock Insertion Rejection
  // ==========================================================================
  console.log('\n[2/14] Testing Unauthorized Product stock insertion rejection...');
  try {
    const { data: p2, error: p2Err } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        name: 'Unauthorized Stock Product',
        sku: `BAD-${Date.now().toString().slice(-6)}`,
        category: 'Staples',
        price: 50.00,
        selling_price: 50.00,
        cost: 30.00,
        stock_level: 50,
      })
      .select('id')
      .single();

    if (p2Err) {
      console.log('✅ Nonzero stock insertion properly rejected:', p2Err.message);
      results.push({
        stepNumber: 2,
        scenario: 'Unauthorized Stock Insertion Rejection',
        expected: 'Rejected by column privilege or trigger guard',
        actual: `Properly blocked: ${p2Err.message}`,
        status: 'PASS',
        evidence: p2Err.message,
      });
    } else {
      console.warn('⚠️ Nonzero stock was allowed! ID:', p2?.id);
      results.push({
        stepNumber: 2,
        scenario: 'Unauthorized Stock Insertion Rejection',
        expected: 'Rejected',
        actual: 'Allowed without RPC',
        status: 'FAIL',
        evidence: p2,
      });
      if (p2?.id) await supabase.from('products').delete().eq('id', p2.id);
    }
  } catch (err: any) {
    console.log('✅ Caught exception:', err.message);
    results.push({
      stepNumber: 2,
      scenario: 'Unauthorized Stock Insertion Rejection',
      expected: 'Rejected',
      actual: `Exception: ${err.message}`,
      status: 'PASS',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 3: Authorized Stock Adjustment (process_stock_adjustment RPC)
  // ==========================================================================
  console.log('\n[3/14] Testing Stock Adjustment RPC (process_stock_adjustment)...');
  try {
    if (!testProductId) throw new Error('No test product available from scenario 1');

    // 3a. Unauthorized store access rejection
    const { error: unauthAdjErr } = await supabase.rpc('process_stock_adjustment', {
      p_store_id: '00000000-0000-0000-0000-000000000000',
      p_product_id: testProductId,
      p_action: 'add',
      p_quantity: 10,
      p_notes: 'Unauthorized attempt',
      p_idempotency_key: crypto.randomUUID(),
    });

    const unauthBlocked = !!unauthAdjErr && unauthAdjErr.message.includes('Unauthorized');
    console.log('✅ Unauthorized store adjustment rejected:', unauthAdjErr?.message);

    // 3b. Authorized stock adjustment
    const { data: adjRes, error: adjErr } = await supabase.rpc('process_stock_adjustment', {
      p_store_id: storeId,
      p_product_id: testProductId,
      p_action: 'add',
      p_quantity: 30,
      p_notes: 'Gate-Check Restock 30 Units',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (adjErr) throw adjErr;
    console.log('✅ Stock adjustment RPC succeeded.');

    const { data: updatedProd } = await supabase
      .from('products')
      .select('stock_level')
      .eq('id', testProductId)
      .single();

    console.log('✅ Confirmed new stock level (0 + 30):', updatedProd?.stock_level);
    results.push({
      stepNumber: 3,
      scenario: 'Authorized Stock Adjustment RPC',
      expected: 'Rejects unauthorized store access; updates stock to 30 via authorized RPC',
      actual: `Stock: ${updatedProd?.stock_level}; Unauth check: ${unauthBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`,
      status: updatedProd?.stock_level === 30 && unauthBlocked ? 'PASS' : 'FAIL',
      evidence: { newStock: updatedProd?.stock_level, adjRes, unauthBlocked },
    });
  } catch (err: any) {
    console.error('❌ Scenario 3 failed:', err.message);
    results.push({
      stepNumber: 3,
      scenario: 'Authorized Stock Adjustment RPC',
      expected: 'Stock updated to 30 and unauthorized rejected',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 4: Authorized POS Sale & Stock Decrement (process_sale RPC)
  // ==========================================================================
  console.log('\n[4/14] Testing POS Sale RPC (process_sale)...');
  try {
    if (!testProductId) throw new Error('No test product available');

    // 4a. Unauthorized store access rejection
    const { error: unauthSaleErr } = await supabase.rpc('process_sale', {
      p_store_id: '00000000-0000-0000-0000-000000000000',
      p_product_id: testProductId,
      p_quantity: 1,
      p_total_price: 130.00,
      p_channel: 'In-Store',
      p_idempotency_key: crypto.randomUUID(),
    });

    const unauthBlocked = !!unauthSaleErr && unauthSaleErr.message.includes('Unauthorized');
    console.log('✅ Unauthorized store sale rejected:', unauthSaleErr?.message);

    // 4b. Authorized sale
    const { data: saleRes, error: saleErr } = await supabase.rpc('process_sale', {
      p_store_id: storeId,
      p_product_id: testProductId,
      p_quantity: 5,
      p_total_price: 650.00,
      p_channel: 'In-Store',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (saleErr) throw saleErr;
    console.log('✅ POS Sale RPC succeeded.');

    const { data: postSaleProd } = await supabase
      .from('products')
      .select('stock_level')
      .eq('id', testProductId)
      .single();

    console.log('✅ Stock level after sale (30 - 5):', postSaleProd?.stock_level);
    results.push({
      stepNumber: 4,
      scenario: 'Authorized POS Sale & Stock Decrement',
      expected: 'Rejects unauthorized store access; decrements stock to 25 atomically',
      actual: `Stock: ${postSaleProd?.stock_level}; Unauth check: ${unauthBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`,
      status: postSaleProd?.stock_level === 25 && unauthBlocked ? 'PASS' : 'FAIL',
      evidence: { postSaleStock: postSaleProd?.stock_level, saleRes, unauthBlocked },
    });
  } catch (err: any) {
    console.error('❌ Scenario 4 failed:', err.message);
    results.push({
      stepNumber: 4,
      scenario: 'Authorized POS Sale & Stock Decrement',
      expected: 'Stock decremented to 25 and unauthorized rejected',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 5: Khata Zero-Balance Insertion
  // ==========================================================================
  console.log('\n[5/14] Testing Khata Zero-Balance Insertion...');
  const testPhone = `98${Date.now().toString().slice(-8)}`;
  try {
    const { data: k1, error: k1Err } = await supabase
      .from('khata_customers')
      .insert({
        store_id: storeId,
        name: 'Gate-Check Khata Customer',
        phone: testPhone,
      })
      .select('id, name, phone, balance')
      .single();

    if (k1Err) throw k1Err;
    testKhataId = k1.id;
    console.log('✅ Khata customer inserted. ID:', k1.id, 'Balance:', k1.balance);
    results.push({
      stepNumber: 5,
      scenario: 'Khata Zero-Balance Insertion',
      expected: 'Customer created with default balance = 0.00 without trigger collision',
      actual: `Created customer ${k1.id} with balance: ${k1.balance}`,
      status: Number(k1.balance) === 0 ? 'PASS' : 'FAIL',
      evidence: k1,
    });
  } catch (err: any) {
    console.error('❌ Scenario 5 failed:', err.message);
    results.push({
      stepNumber: 5,
      scenario: 'Khata Zero-Balance Insertion',
      expected: 'Customer created with balance = 0',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 6: Khata Transaction RPC (process_khata_transaction)
  // ==========================================================================
  console.log('\n[6/14] Testing Khata Transaction RPC (process_khata_transaction)...');
  try {
    if (!testKhataId) throw new Error('No test khata customer available from scenario 5');

    // 6a. Unauthorized store access rejection
    const { error: unauthKhataErr } = await supabase.rpc('process_khata_transaction', {
      p_store_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: testKhataId,
      p_type: 'credit',
      p_amount: 100.00,
      p_reference: 'Unauthorized attempt',
      p_idempotency_key: crypto.randomUUID(),
    });

    const unauthBlocked = !!unauthKhataErr && unauthKhataErr.message.includes('Unauthorized');
    console.log('✅ Unauthorized store khata rejected:', unauthKhataErr?.message);

    // 6b. Authorized khata credit
    const { data: khataRes, error: khataErr } = await supabase.rpc('process_khata_transaction', {
      p_store_id: storeId,
      p_customer_id: testKhataId,
      p_type: 'credit',
      p_amount: 250.00,
      p_reference: 'Gate-Check Udhaar Credit',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (khataErr) throw khataErr;
    console.log('✅ Khata transaction RPC succeeded.');

    const { data: updatedCust } = await supabase
      .from('khata_customers')
      .select('balance')
      .eq('id', testKhataId)
      .single();

    console.log('✅ Confirmed new balance (0 + 250):', updatedCust?.balance);
    results.push({
      stepNumber: 6,
      scenario: 'Authorized Khata Transaction RPC',
      expected: 'Rejects unauthorized store access; updates balance to 250.00 via authorized RPC',
      actual: `Balance: ${updatedCust?.balance}; Unauth check: ${unauthBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`,
      status: Number(updatedCust?.balance) === 250 && unauthBlocked ? 'PASS' : 'FAIL',
      evidence: { newBalance: updatedCust?.balance, khataRes, unauthBlocked },
    });
  } catch (err: any) {
    console.error('❌ Scenario 6 failed:', err.message);
    results.push({
      stepNumber: 6,
      scenario: 'Authorized Khata Transaction RPC',
      expected: 'Balance updated to 250.00 and unauthorized rejected',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 7: Direct Khata Balance Mutation Rejection
  // ==========================================================================
  console.log('\n[7/14] Testing Direct Khata Balance Mutation Rejection...');
  try {
    if (!testKhataId) throw new Error('No test khata customer available');

    const { error: directKhataErr } = await supabase
      .from('khata_customers')
      .update({ balance: 8888.00 })
      .eq('id', testKhataId);

    if (directKhataErr) {
      console.log('✅ Direct balance modification properly rejected:', directKhataErr.message);
      results.push({
        stepNumber: 7,
        scenario: 'Direct Khata Balance Mutation Rejection',
        expected: 'Rejected by column privilege or trigger guard',
        actual: `Properly blocked: ${directKhataErr.message}`,
        status: 'PASS',
        evidence: directKhataErr.message,
      });
    } else {
      results.push({
        stepNumber: 7,
        scenario: 'Direct Khata Balance Mutation Rejection',
        expected: 'Rejected',
        actual: 'Direct update permitted without RPC',
        status: 'FAIL',
        evidence: null,
      });
    }
  } catch (err: any) {
    console.log('✅ Caught exception:', err.message);
    results.push({
      stepNumber: 7,
      scenario: 'Direct Khata Balance Mutation Rejection',
      expected: 'Rejected',
      actual: `Exception: ${err.message}`,
      status: 'PASS',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 8: Loyalty Zero-Points Insertion
  // ==========================================================================
  console.log('\n[8/14] Testing Loyalty Zero-Points Insertion...');
  const testLoyaltyPhone = `97${Date.now().toString().slice(-8)}`;
  try {
    const { data: l1, error: l1Err } = await supabase
      .from('loyalty_customers')
      .insert({
        store_id: storeId,
        name: 'Gate-Check Loyalty Customer',
        phone: testLoyaltyPhone,
      })
      .select('id, name, phone, points_balance')
      .single();

    if (l1Err) throw l1Err;
    testLoyaltyId = l1.id;
    console.log('✅ Loyalty customer inserted. ID:', l1.id, 'Points:', l1.points_balance);
    results.push({
      stepNumber: 8,
      scenario: 'Loyalty Zero-Points Insertion',
      expected: 'Customer created with points_balance = 0 without trigger collision',
      actual: `Created customer ${l1.id} with points: ${l1.points_balance}`,
      status: l1.points_balance === 0 ? 'PASS' : 'FAIL',
      evidence: l1,
    });
  } catch (err: any) {
    console.error('❌ Scenario 8 failed:', err.message);
    results.push({
      stepNumber: 8,
      scenario: 'Loyalty Zero-Points Insertion',
      expected: 'Customer created with points = 0',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 9: Loyalty Transaction RPC (process_loyalty_transaction)
  // ==========================================================================
  console.log('\n[9/14] Testing Loyalty Transaction RPC (process_loyalty_transaction)...');
  try {
    if (!testLoyaltyId) throw new Error('No test loyalty customer available');

    // 9a. Unauthorized store access rejection
    const { error: unauthLoyErr } = await supabase.rpc('process_loyalty_transaction', {
      p_store_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: testLoyaltyId,
      p_type: 'earn',
      p_points: 50,
      p_reference: 'Unauthorized attempt',
      p_idempotency_key: crypto.randomUUID(),
    });

    const unauthBlocked = !!unauthLoyErr && unauthLoyErr.message.includes('Unauthorized');
    console.log('✅ Unauthorized store loyalty rejected:', unauthLoyErr?.message);

    // 9b. Authorized loyalty transaction
    const { data: loyRes, error: loyErr } = await supabase.rpc('process_loyalty_transaction', {
      p_store_id: storeId,
      p_customer_id: testLoyaltyId,
      p_type: 'earn',
      p_points: 100,
      p_reference: 'Gate-Check Welcome Bonus',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (loyErr) throw loyErr;
    console.log('✅ Loyalty transaction RPC succeeded.');

    const { data: updatedLoy } = await supabase
      .from('loyalty_customers')
      .select('points_balance')
      .eq('id', testLoyaltyId)
      .single();

    console.log('✅ Confirmed new points balance (0 + 100):', updatedLoy?.points_balance);
    results.push({
      stepNumber: 9,
      scenario: 'Authorized Loyalty Transaction RPC',
      expected: 'Rejects unauthorized store access; updates points to 100 via authorized RPC',
      actual: `Points: ${updatedLoy?.points_balance}; Unauth check: ${unauthBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`,
      status: updatedLoy?.points_balance === 100 && unauthBlocked ? 'PASS' : 'FAIL',
      evidence: { newPoints: updatedLoy?.points_balance, loyRes, unauthBlocked },
    });
  } catch (err: any) {
    console.error('❌ Scenario 9 failed:', err.message);
    results.push({
      stepNumber: 9,
      scenario: 'Authorized Loyalty Transaction RPC',
      expected: 'Points updated to 100 and unauthorized rejected',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 10: Direct Loyalty Points Mutation Rejection
  // ==========================================================================
  console.log('\n[10/14] Testing Direct Loyalty Points Mutation Rejection...');
  try {
    if (!testLoyaltyId) throw new Error('No test loyalty customer available');

    const { error: directLoyErr } = await supabase
      .from('loyalty_customers')
      .update({ points_balance: 50000 })
      .eq('id', testLoyaltyId);

    if (directLoyErr) {
      console.log('✅ Direct points modification properly rejected:', directLoyErr.message);
      results.push({
        stepNumber: 10,
        scenario: 'Direct Loyalty Points Mutation Rejection',
        expected: 'Rejected by column privilege or trigger guard',
        actual: `Properly blocked: ${directLoyErr.message}`,
        status: 'PASS',
        evidence: directLoyErr.message,
      });
    } else {
      results.push({
        stepNumber: 10,
        scenario: 'Direct Loyalty Points Mutation Rejection',
        expected: 'Rejected',
        actual: 'Direct update permitted without RPC',
        status: 'FAIL',
        evidence: null,
      });
    }
  } catch (err: any) {
    console.log('✅ Caught exception:', err.message);
    results.push({
      stepNumber: 10,
      scenario: 'Direct Loyalty Points Mutation Rejection',
      expected: 'Rejected',
      actual: `Exception: ${err.message}`,
      status: 'PASS',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 11: Purchase Order Item Zero-Received Insertion
  // ==========================================================================
  console.log('\n[11/14] Testing Purchase Order Item Zero-Received Insertion...');
  try {
    if (!supplierId) throw new Error('No valid supplier found for store');
    if (!testProductId) throw new Error('No test product available');

    // Create a draft PO
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        store_id: storeId,
        supplier_id: supplierId,
        status: 'SENT',
      })
      .select('id, status')
      .single();

    if (poErr) throw poErr;
    testPoId = po.id;

    // Insert PO item with received_quantity omitted (defaulting to 0)
    const { data: poi, error: poiErr } = await supabase
      .from('purchase_order_items')
      .insert({
        purchase_order_id: testPoId,
        product_id: testProductId,
        quantity: 50,
        unit_cost: 95.00,
      })
      .select('id, purchase_order_id, quantity, received_quantity')
      .single();

    if (poiErr) throw poiErr;
    testPoiId = poi.id;
    console.log('✅ PO Item inserted. ID:', poi.id, 'Received Qty:', poi.received_quantity);
    results.push({
      stepNumber: 11,
      scenario: 'PO Item Zero-Received Insertion',
      expected: 'PO item created with received_quantity = 0 without trigger collision',
      actual: `Created item ${poi.id} with received_quantity: ${poi.received_quantity}`,
      status: poi.received_quantity === 0 ? 'PASS' : 'FAIL',
      evidence: poi,
    });
  } catch (err: any) {
    console.error('❌ Scenario 11 failed:', err.message);
    results.push({
      stepNumber: 11,
      scenario: 'PO Item Zero-Received Insertion',
      expected: 'PO item created with received_quantity = 0',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 12: Unauthorized Received-Quantity Mutation Rejection
  // ==========================================================================
  console.log('\n[12/14] Testing Unauthorized Received-Quantity Mutation Rejection...');
  try {
    if (!testPoiId) throw new Error('No test PO item available');

    const { error: directPoiErr } = await supabase
      .from('purchase_order_items')
      .update({ received_quantity: 50 })
      .eq('id', testPoiId);

    if (directPoiErr) {
      console.log('✅ Direct received_quantity modification properly rejected:', directPoiErr.message);
      results.push({
        stepNumber: 12,
        scenario: 'Unauthorized Received-Quantity Mutation Rejection',
        expected: 'Rejected by column privilege or trigger guard',
        actual: `Properly blocked: ${directPoiErr.message}`,
        status: 'PASS',
        evidence: directPoiErr.message,
      });
    } else {
      results.push({
        stepNumber: 12,
        scenario: 'Unauthorized Received-Quantity Mutation Rejection',
        expected: 'Rejected',
        actual: 'Direct update permitted without RPC',
        status: 'FAIL',
        evidence: null,
      });
    }
  } catch (err: any) {
    console.log('✅ Caught exception:', err.message);
    results.push({
      stepNumber: 12,
      scenario: 'Unauthorized Received-Quantity Mutation Rejection',
      expected: 'Rejected',
      actual: `Exception: ${err.message}`,
      status: 'PASS',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 13: Purchase Order Receiving RPC (receive_purchase_order)
  // ==========================================================================
  console.log('\n[13/14] Testing Purchase Order Receiving RPC (receive_purchase_order)...');
  try {
    if (!testPoId || !testPoiId) throw new Error('No test PO/item available from scenario 11');

    // 13a. Unauthorized store access rejection
    const { error: unauthRecvErr } = await supabase.rpc('receive_purchase_order', {
      p_store_id: '00000000-0000-0000-0000-000000000000',
      p_po_id: testPoId,
      p_item_id: testPoiId,
      p_receive_quantity: 5,
      p_batch_number: 'UNAUTH-BATCH',
      p_expiry_date: '2027-12-31',
      p_idempotency_key: crypto.randomUUID(),
    });

    const unauthBlocked = !!unauthRecvErr && unauthRecvErr.message.includes('Unauthorized');
    console.log('✅ Unauthorized store PO receiving rejected:', unauthRecvErr?.message);

    // 13b. Authorized PO receiving
    const { data: recvRes, error: recvErr } = await supabase.rpc('receive_purchase_order', {
      p_store_id: storeId,
      p_po_id: testPoId,
      p_item_id: testPoiId,
      p_receive_quantity: 20,
      p_batch_number: `LOT-${Date.now().toString().slice(-6)}`,
      p_expiry_date: '2027-12-31',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (recvErr) throw recvErr;
    console.log('✅ receive_purchase_order RPC succeeded:', recvRes);

    const { data: updatedPoi } = await supabase
      .from('purchase_order_items')
      .select('received_quantity')
      .eq('id', testPoiId)
      .single();

    console.log('✅ Confirmed new received_quantity (0 + 20):', updatedPoi?.received_quantity);
    results.push({
      stepNumber: 13,
      scenario: 'Authorized Purchase Order Receiving RPC',
      expected: 'Rejects unauthorized store access; updates received_quantity to 20 via authorized RPC',
      actual: `Received: ${updatedPoi?.received_quantity}; Unauth check: ${unauthBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`,
      status: updatedPoi?.received_quantity === 20 && unauthBlocked ? 'PASS' : 'FAIL',
      evidence: { newReceived: updatedPoi?.received_quantity, recvRes, unauthBlocked },
    });
  } catch (err: any) {
    console.error('❌ Scenario 13 failed:', err.message);
    results.push({
      stepNumber: 13,
      scenario: 'Authorized Purchase Order Receiving RPC',
      expected: 'Received quantity updated to 20 and unauthorized rejected',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // ==========================================================================
  // SCENARIO 14: Safe Cleanup Verification (Teardown of Test Fixtures)
  // ==========================================================================
  console.log('\n[14/14] Verifying Safe Cleanup of Isolated Test Records...');
  let cleanupSucceeded = true;
  try {
    if (testProductId) {
      await supabase.from('sale_items').delete().eq('product_id', testProductId);
      await supabase.from('sales').delete().eq('product_id', testProductId);
      await supabase.from('inventory_movements').delete().eq('product_id', testProductId);
      await supabase.from('inventory_batches').delete().eq('product_id', testProductId);
    }
    if (testPoiId) {
      const { error } = await supabase.from('purchase_order_items').delete().eq('id', testPoiId);
      if (error) cleanupSucceeded = false;
      console.log('✅ Cleaned up PO item:', testPoiId);
    }
    if (testPoId) {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', testPoId);
      if (error) cleanupSucceeded = false;
      console.log('✅ Cleaned up PO:', testPoId);
    }
    if (testLoyaltyId) {
      await supabase.from('loyalty_transactions').delete().eq('loyalty_customer_id', testLoyaltyId);
      const { error } = await supabase.from('loyalty_customers').delete().eq('id', testLoyaltyId);
      if (error) cleanupSucceeded = false;
      console.log('✅ Cleaned up loyalty customer:', testLoyaltyId);
    }
    if (testKhataId) {
      await supabase.from('khata_transactions').delete().eq('khata_customer_id', testKhataId);
      const { error } = await supabase.from('khata_customers').delete().eq('id', testKhataId);
      if (error) cleanupSucceeded = false;
      console.log('✅ Cleaned up khata customer:', testKhataId);
    }
    if (testProductId) {
      const { error } = await supabase.from('products').delete().eq('id', testProductId);
      if (error) cleanupSucceeded = false;
      console.log('✅ Cleaned up product:', testProductId);
    }

    results.push({
      stepNumber: 14,
      scenario: 'Safe Cleanup Verification',
      expected: 'All test fixtures deleted without impacting production business data',
      actual: cleanupSucceeded ? 'All test fixtures successfully purged' : 'Cleanup encountered partial error',
      status: cleanupSucceeded ? 'PASS' : 'FAIL',
      evidence: { testProductId, testKhataId, testLoyaltyId, testPoId, testPoiId },
    });
  } catch (err: any) {
    console.error('❌ Scenario 14 failed:', err.message);
    results.push({
      stepNumber: 14,
      scenario: 'Safe Cleanup Verification',
      expected: 'All test fixtures cleaned up',
      actual: `Cleanup error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  console.log('\n================================================================');
  console.log('14-Scenario Execution Summary');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      '#': r.stepNumber,
      Scenario: r.scenario,
      Status: r.status,
      Actual: r.actual.slice(0, 55),
    }))
  );
}

runAll14Scenarios().catch(console.error);
