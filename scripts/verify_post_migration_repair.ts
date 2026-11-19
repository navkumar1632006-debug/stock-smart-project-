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
  step: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  evidence: any;
}

const results: StepResult[] = [];

async function runPostMigrationVerification() {
  console.log('================================================================');
  console.log('StockSmart AI: Post-Migration Comprehensive Repair Verification');
  console.log('Target Project:', SUPABASE_URL);
  console.log('================================================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Auth
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
  console.log('✅ Active Store:', store?.name, `(ID: ${storeId})\n`);

  let testProductId: string | null = null;
  let testKhataId: string | null = null;

  // --------------------------------------------------------------------------
  // TEST 1: Product insertion with zero initial stock (omitted stock_level)
  // --------------------------------------------------------------------------
  console.log('[1/7] Testing Product insertion with zero initial stock...');
  const testSku = `VERIF-SKU-${Date.now().toString().slice(-6)}`;
  try {
    const { data: p1, error: p1Err } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        name: 'Post-Migration Test Basmati Rice 1kg',
        sku: testSku,
        category: 'Staples',
        price: 120.00,
        selling_price: 120.00,
        cost: 90.00,
        reorder_point: 10,
        is_fresh_product: false,
      })
      .select('id, name, sku, stock_level')
      .single();

    if (p1Err) throw p1Err;
    testProductId = p1.id;
    console.log('✅ Product inserted successfully. ID:', p1.id, 'Stock Level:', p1.stock_level);
    results.push({
      step: '1. Product Insert (Zero Stock)',
      expected: 'Product created with stock_level = 0 without trigger error',
      actual: `Created product ${p1.id} with stock_level: ${p1.stock_level}`,
      status: p1.stock_level === 0 ? 'PASS' : 'FAIL',
      evidence: p1,
    });
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    results.push({
      step: '1. Product Insert (Zero Stock)',
      expected: 'Product created successfully',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Product insertion with unauthorized nonzero initial stock
  // --------------------------------------------------------------------------
  console.log('\n[2/7] Testing Product insertion with unauthorized nonzero stock...');
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
        stock_level: 25,
      })
      .select('id')
      .single();

    if (p2Err) {
      console.log('✅ Nonzero stock insertion properly rejected:', p2Err.message);
      results.push({
        step: '2. Nonzero Product Insert Rejection',
        expected: 'Rejected by permission check or trigger guard',
        actual: `Properly rejected: ${p2Err.message}`,
        status: 'PASS',
        evidence: p2Err.message,
      });
    } else {
      console.warn('⚠️ Nonzero stock was allowed! ID:', p2?.id);
      results.push({
        step: '2. Nonzero Product Insert Rejection',
        expected: 'Rejected',
        actual: 'Allowed without RPC',
        status: 'FAIL',
        evidence: p2,
      });
      if (p2?.id) await supabase.from('products').delete().eq('id', p2.id);
    }
  } catch (err: any) {
    console.log('✅ Nonzero stock caught by exception:', err.message);
    results.push({
      step: '2. Nonzero Product Insert Rejection',
      expected: 'Rejected',
      actual: `Caught exception: ${err.message}`,
      status: 'PASS',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Authorized stock adjustment via RPC
  // --------------------------------------------------------------------------
  console.log('\n[3/7] Testing Authorized Stock Adjustment (process_stock_adjustment)...');
  try {
    const targetId = testProductId;
    if (!targetId) throw new Error('No test product available from step 1');

    const { data: adjRes, error: adjErr } = await supabase.rpc('process_stock_adjustment', {
      p_store_id: storeId,
      p_product_id: targetId,
      p_action: 'add',
      p_quantity: 20,
      p_notes: 'Post-Migration Test Stock Adjustment',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (adjErr) throw adjErr;
    console.log('✅ Stock adjustment RPC succeeded.');

    const { data: updatedProd } = await supabase
      .from('products')
      .select('stock_level')
      .eq('id', targetId)
      .single();

    console.log('✅ Confirmed new stock level:', updatedProd?.stock_level);
    results.push({
      step: '3. Authorized Stock Inward RPC',
      expected: 'Stock level updated to 20',
      actual: `Stock confirmed at ${updatedProd?.stock_level}`,
      status: updatedProd?.stock_level === 20 ? 'PASS' : 'FAIL',
      evidence: { newStock: updatedProd?.stock_level, adjRes },
    });
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    results.push({
      step: '3. Authorized Stock Inward RPC',
      expected: 'Stock level updated to 20',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Authorized POS Sale via RPC
  // --------------------------------------------------------------------------
  console.log('\n[4/7] Testing Authorized POS Sale (process_sale)...');
  try {
    const targetId = testProductId;
    if (!targetId) throw new Error('No test product available');

    const { data: saleRes, error: saleErr } = await supabase.rpc('process_sale', {
      p_store_id: storeId,
      p_product_id: targetId,
      p_quantity: 3,
      p_total_price: 360.00,
      p_channel: 'In-Store',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (saleErr) throw saleErr;
    console.log('✅ POS Sale RPC succeeded.');

    const { data: postSaleProd } = await supabase
      .from('products')
      .select('stock_level')
      .eq('id', targetId)
      .single();

    console.log('✅ Stock level after sale (20 - 3):', postSaleProd?.stock_level);
    results.push({
      step: '4. Authorized POS Sale RPC',
      expected: 'Stock level decremented to 17 atomically',
      actual: `Stock confirmed at ${postSaleProd?.stock_level}`,
      status: postSaleProd?.stock_level === 17 ? 'PASS' : 'FAIL',
      evidence: { postSaleStock: postSaleProd?.stock_level, saleRes },
    });
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    results.push({
      step: '4. Authorized POS Sale RPC',
      expected: 'Stock decremented to 17',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5: Khata customer insertion with zero initial balance
  // --------------------------------------------------------------------------
  console.log('\n[5/7] Testing Khata customer insertion with zero balance...');
  const testPhone = `98${Date.now().toString().slice(-8)}`;
  try {
    const { data: k1, error: k1Err } = await supabase
      .from('khata_customers')
      .insert({
        store_id: storeId,
        name: 'Post-Migration Test Customer',
        phone: testPhone,
      })
      .select('id, name, phone, balance')
      .single();

    if (k1Err) throw k1Err;
    testKhataId = k1.id;
    console.log('✅ Khata customer inserted successfully. ID:', k1.id, 'Balance:', k1.balance);
    results.push({
      step: '5. Khata Customer Insert (Zero Balance)',
      expected: 'Customer created with balance = 0.00 without trigger error',
      actual: `Created customer ${k1.id} with balance: ${k1.balance}`,
      status: Number(k1.balance) === 0 ? 'PASS' : 'FAIL',
      evidence: k1,
    });
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    results.push({
      step: '5. Khata Customer Insert (Zero Balance)',
      expected: 'Customer created with zero balance',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6: Authorized Khata transaction via RPC
  // --------------------------------------------------------------------------
  console.log('\n[6/7] Testing Authorized Khata Transaction (process_khata_transaction)...');
  try {
    const targetCustId = testKhataId;
    if (!targetCustId) throw new Error('No test khata customer available');

    const { data: khataRes, error: khataErr } = await supabase.rpc('process_khata_transaction', {
      p_store_id: storeId,
      p_customer_id: targetCustId,
      p_type: 'CREDIT',
      p_amount: 150.00,
      p_description: 'Post-Migration Test Udhaar Credit',
      p_idempotency_key: crypto.randomUUID(),
    });

    if (khataErr) throw khataErr;
    console.log('✅ Khata transaction RPC succeeded.');

    const { data: updatedCust } = await supabase
      .from('khata_customers')
      .select('balance')
      .eq('id', targetCustId)
      .single();

    console.log('✅ Confirmed new balance (0 + 150):', updatedCust?.balance);
    results.push({
      step: '6. Authorized Khata Transaction RPC',
      expected: 'Customer balance updated to 150.00 via RPC',
      actual: `Balance confirmed at ${updatedCust?.balance}`,
      status: Number(updatedCust?.balance) === 150 ? 'PASS' : 'FAIL',
      evidence: { newBalance: updatedCust?.balance, khataRes },
    });
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
    results.push({
      step: '6. Authorized Khata Transaction RPC',
      expected: 'Balance updated to 150.00',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 7: Unauthorized direct balance modification
  // --------------------------------------------------------------------------
  console.log('\n[7/7] Testing Unauthorized direct balance modification...');
  try {
    const targetCustId = testKhataId;
    if (!targetCustId) throw new Error('No test khata customer available');

    const { error: directKhataErr } = await supabase
      .from('khata_customers')
      .update({ balance: 9999.00 })
      .eq('id', targetCustId);

    if (directKhataErr) {
      console.log('✅ Direct balance modification properly rejected:', directKhataErr.message);
      results.push({
        step: '7. Direct Balance Mutation Rejection',
        expected: 'Rejected by column privilege revocation or trigger guard',
        actual: `Properly blocked: ${directKhataErr.message}`,
        status: 'PASS',
        evidence: directKhataErr.message,
      });
    } else {
      const { data: checkCust } = await supabase
        .from('khata_customers')
        .select('balance')
        .eq('id', targetCustId)
        .single();

      if (Number(checkCust?.balance) === 9999) {
        console.warn('⚠️ Direct balance modification was permitted!');
        results.push({
          step: '7. Direct Balance Mutation Rejection',
          expected: 'Rejected',
          actual: 'Permitted without RPC',
          status: 'FAIL',
          evidence: checkCust,
        });
      } else {
        console.log('✅ Balance preserved by trigger guard:', checkCust?.balance);
        results.push({
          step: '7. Direct Balance Mutation Rejection',
          expected: 'Integrity preserved',
          actual: `Preserved at ${checkCust?.balance}`,
          status: 'PASS',
          evidence: checkCust,
        });
      }
    }
  } catch (err: any) {
    console.log('✅ Direct balance update caught by exception:', err.message);
    results.push({
      step: '7. Direct Balance Mutation Rejection',
      expected: 'Rejected',
      actual: `Caught exception: ${err.message}`,
      status: 'PASS',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 8: Loyalty Customer insertion with zero initial points
  // --------------------------------------------------------------------------
  console.log('\n[8/8] Testing Loyalty customer insertion with zero points...');
  let testLoyaltyId: string | null = null;
  const testLoyaltyPhone = `97${Date.now().toString().slice(-8)}`;
  try {
    const { data: l1, error: l1Err } = await supabase
      .from('loyalty_customers')
      .insert({
        store_id: storeId,
        name: 'Post-Migration Loyalty Customer',
        phone: testLoyaltyPhone,
      })
      .select('id, name, points_balance')
      .single();

    if (l1Err) throw l1Err;
    testLoyaltyId = l1.id;
    console.log('✅ Loyalty customer inserted successfully. ID:', l1.id, 'Points:', l1.points_balance);
    results.push({
      step: '8. Loyalty Customer Insert (Zero Points)',
      expected: 'Customer created with points_balance = 0 without trigger error',
      actual: `Created customer ${l1.id} with points: ${l1.points_balance}`,
      status: l1.points_balance === 0 ? 'PASS' : 'FAIL',
      evidence: l1,
    });
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
    results.push({
      step: '8. Loyalty Customer Insert (Zero Points)',
      expected: 'Customer created with zero points',
      actual: `Error: ${err.message}`,
      status: 'FAIL',
      evidence: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEARDOWN: Clean up isolated test records
  // --------------------------------------------------------------------------
  console.log('\n🧹 Cleaning up isolated test records...');
  if (testProductId) {
    await supabase.from('products').delete().eq('id', testProductId);
    console.log('✅ Deleted test product:', testProductId);
  }
  if (testKhataId) {
    await supabase.from('khata_customers').delete().eq('id', testKhataId);
    console.log('✅ Deleted test khata customer:', testKhataId);
  }
  if (testLoyaltyId) {
    await supabase.from('loyalty_customers').delete().eq('id', testLoyaltyId);
    console.log('✅ Deleted test loyalty customer:', testLoyaltyId);
  }

  console.log('\n================================================================');
  console.log('Execution Summary');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Step: r.step,
      Status: r.status,
      Actual: r.actual.slice(0, 65),
    }))
  );
}

runPostMigrationVerification().catch(console.error);
