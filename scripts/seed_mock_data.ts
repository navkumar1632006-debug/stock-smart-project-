/**
 * StockSmart AI — Production QA Mock Data Seeder
 *
 * Populates 500 products, associated suppliers, active inventory batches,
 * and 1,000 historical sales transactions via Phase 22 hardened RPCs.
 *
 * Usage:
 *   npx tsx scripts/seed_mock_data.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'mobile/.env.local') });

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const TEST_EMAIL = process.env.TEST_EMAIL || 'qa.storeowner@stocksmart.local';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'StockSmartQA2026!';

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL or VITE_SUPABASE_URL in .env');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.\n' +
      'Please add SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> to .env to bypass RLS for seeding.'
  );
  process.exit(1);
}

// 1. Service role client for schema administrative tasks (user creation, cleanup)
const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper for concurrency-controlled execution
async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.all(
      chunk.map((item, idx) => task(item, i + idx))
    );
    results.push(...chunkResults);
  }
  return results;
}

const RETAIL_CATEGORIES = [
  'Dairy & Eggs',
  'Bakery & Bread',
  'Fresh Produce',
  'Staples & Grains',
  'Snacks & Confectionery',
  'Beverages',
  'Personal Care',
  'Household Essentials',
];

const PRODUCT_TEMPLATES: Record<string, string[]> = {
  'Dairy & Eggs': [
    'Fresh Cow Milk 1L',
    'Toned Milk 500ml',
    'Paneer Block 200g',
    'Curd Dahi Tub 400g',
    'Salted Butter 100g',
    'Processed Cheese Slices 200g',
    'Pure Cow Ghee 500ml',
    'Farm Fresh Eggs 6pk',
    'Farm Fresh Eggs 12pk',
    'Flavoured Yogurt 100g',
  ],
  'Bakery & Bread': [
    'White Sandwich Bread 400g',
    'Whole Wheat Bread 400g',
    'Brown Bread 400g',
    'Pav Buns 6pk',
    'Burger Buns 4pk',
    'Milk Rusk 200g',
    'Butter Cookies 150g',
    'Garlic Toast 150g',
    'Fruit Cake Slice 100g',
  ],
  'Fresh Produce': [
    'Red Onions 1kg',
    'Farm Potatoes 1kg',
    'Hybrid Tomatoes 1kg',
    'Green Chillies 100g',
    'Fresh Coriander Bunch',
    'Ginger Root 250g',
    'Garlic Bulbs 250g',
    'Royal Gala Apples 1kg',
    'Robusta Bananas 1kg',
    'Fresh Lemons 4pk',
  ],
  'Staples & Grains': [
    'Basmati Rice 1kg',
    'Sona Masoori Rice 5kg',
    'Chakki Fresh Atta 5kg',
    'Toor Dal 1kg',
    'Moong Dal 1kg',
    'Chana Dal 1kg',
    'Refined Sunflower Oil 1L',
    'Mustard Oil 1L',
    'Iodized Table Salt 1kg',
    'Refined White Sugar 1kg',
  ],
  'Snacks & Confectionery': [
    'Classic Salted Potato Chips 50g',
    'Masala Munch Chips 50g',
    'Glucose Biscuits 200g',
    'Marie Gold Biscuits 250g',
    'Instant Masala Noodles 70g',
    'Aloo Bhujia Namkeen 200g',
    'Salted Peanuts 150g',
    'Milk Chocolate Bar 50g',
    'Dark Chocolate Bar 50g',
  ],
  'Beverages': [
    'Assam Black Tea 250g',
    'Green Tea Bags 25pk',
    'Instant Coffee Granules 100g',
    'Mineral Water 1L',
    'Sparkling Soda 750ml',
    'Mango Fruit Juice 1L',
    'Orange Juice 1L',
    'Cola Soft Drink 750ml',
    'Lemon Lime Soda 750ml',
  ],
  'Personal Care': [
    'Antiseptic Bathing Soap 125g',
    'Moisturizing Cream 100ml',
    'Herbal Shampoo 180ml',
    'Complete Care Toothpaste 150g',
    'Soft Bristle Toothbrush 2pk',
    'Hand Sanitizer 100ml',
    'Liquid Hand Wash 250ml',
  ],
  'Household Essentials': [
    'Dishwash Liquid Gel 500ml',
    'Detergent Powder 1kg',
    'Floor Cleaner Liquid 1L',
    'Toilet Cleaner Liquid 500ml',
    'Kitchen Paper Towels 2pk',
    'Mosquito Repellent Vaporizer Refill',
    'Garbage Bags Medium 30pk',
  ],
};

async function main() {
  console.log('🚀 StockSmart AI — Production QA Seeder starting...');
  console.log(`🌐 Target Supabase URL: ${SUPABASE_URL}\n`);

  // Step 1: Ensure QA User exists
  console.log('👤 [Step 1/5] Ensuring QA Store Owner user exists...');
  let ownerUserId: string;

  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const existingUser = usersData?.users?.find(
    (u: { email?: string; id: string }) => u.email === TEST_EMAIL
  );

  if (existingUser) {
    ownerUserId = existingUser.id;
    console.log(`   Found existing test user: ${TEST_EMAIL} (${ownerUserId})`);
    // Ensure password is synchronized
    await adminSupabase.auth.admin.updateUserById(ownerUserId, {
      password: TEST_PASSWORD,
    });
  } else {
    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
      });

    if (createError || !newUser.user) {
      throw new Error(`Failed to create test user: ${createError?.message}`);
    }
    ownerUserId = newUser.user.id;
    console.log(`   Created new test user: ${TEST_EMAIL} (${ownerUserId})`);
  }

  // Step 2: Authenticate client as the Store Owner (guarantees auth.uid() is active for RPCs)
  console.log('\n🔑 [Step 2/5] Authenticating as Store Owner to invoke Phase 22 RPCs...');
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    throw new Error(`Failed to sign in as store owner: ${signInError.message}`);
  }
  console.log('   Authenticated successfully.');

  // Step 3: Ensure Store exists
  console.log('\n🏪 [Step 3/5] Setting up target store...');
  let storeId: string;
  const { data: stores } = await adminSupabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', ownerUserId)
    .limit(1);

  if (stores && stores.length > 0) {
    storeId = stores[0].id;
    console.log(`   Using existing store: "${stores[0].name}" (${storeId})`);
  } else {
    const { data: newStore, error: storeError } = await adminSupabase
      .from('stores')
      .insert({
        name: 'StockSmart Supermart (QA Hyperlocal)',
        owner_id: ownerUserId,
      })
      .select('id, name')
      .single();

    if (storeError || !newStore) {
      throw new Error(`Failed to create store: ${storeError?.message}`);
    }
    storeId = newStore.id;
    console.log(`   Created new store: "${newStore.name}" (${storeId})`);
  }

  // Optional: Clean previous test transactions for fresh QA verification
  console.log('   Cleaning previous transactional test records for store...');
  await adminSupabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await adminSupabase.from('sales').delete().eq('store_id', storeId);
  await adminSupabase.from('stock_adjustments').delete().eq('store_id', storeId);
  await adminSupabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await adminSupabase.from('inventory_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await adminSupabase.from('purchase_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await adminSupabase.from('purchase_orders').delete().eq('store_id', storeId);
  await adminSupabase.from('products').delete().eq('store_id', storeId);
  await adminSupabase.from('suppliers').delete().eq('store_id', storeId);
  console.log('   Store clean state ready.');

  // Step 4: Seed Suppliers
  console.log('\n🚚 [Step 4/5] Seeding Suppliers & 500 Products...');
  const SUPPLIER_NAMES = [
    'Amul Dairy & Agro Co-Op',
    'Modern Bakery Logistics',
    'Green Field Fresh Farms',
    'Patanjali & Natural Goods Depot',
    'Nestle Regional Supply Hub',
    'Hindustan FMCG Distribution',
    'Metro Cash & Carry Wholesale',
    'ITC Foods Regional Center',
  ];

  const supplierInserts = SUPPLIER_NAMES.map((name) => ({
    store_id: storeId,
    name,
    contact_info: `${faker.person.fullName()} | ${faker.internet.email()} | ${faker.phone.number({ style: 'national' })}`,
    reliability_score: faker.number.int({ min: 85, max: 100 }),
  }));

  const { data: createdSuppliers, error: suppError } = await adminSupabase
    .from('suppliers')
    .insert(supplierInserts)
    .select('id, name');

  if (suppError || !createdSuppliers || createdSuppliers.length === 0) {
    throw new Error(`Failed to create suppliers: ${suppError?.message}`);
  }
  console.log(`   Seeded ${createdSuppliers.length} active suppliers.`);

  // Generate 500 Products
  console.log('   Generating 500 catalog products (enforcing stock_level = 0 per trigger guards)...');
  const productRows = [];

  for (let i = 1; i <= 500; i++) {
    const category = faker.helpers.arrayElement(RETAIL_CATEGORIES);
    const templates = PRODUCT_TEMPLATES[category];
    const baseName = faker.helpers.arrayElement(templates);
    const brand = faker.company.name().split(' ')[0];
    const productName = `${brand} ${baseName}`;

    const cost = parseFloat((Math.random() * 80 + 15).toFixed(2));
    const margin = Math.random() * 0.35 + 0.15; // 15% to 50% margin
    const sellingPrice = parseFloat((cost * (1 + margin)).toFixed(2));
    const isFresh = ['Dairy & Eggs', 'Bakery & Bread', 'Fresh Produce'].includes(category);

    productRows.push({
      store_id: storeId,
      name: productName,
      category,
      sku: `SKU-${category.slice(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`,
      cost,
      price: sellingPrice,
      selling_price: sellingPrice,
      stock_level: 0, // Mandatory 0 on insert due to Phase 22 trigger guard
      reorder_point: faker.number.int({ min: 10, max: 30 }),
      is_fresh_product: isFresh,
    });
  }

  // Insert products in chunks of 100
  const createdProducts: Array<{ id: string; name: string; selling_price: number }> = [];
  for (let i = 0; i < productRows.length; i += 100) {
    const chunk = productRows.slice(i, i + 100);
    const { data: inserted, error: prodErr } = await adminSupabase
      .from('products')
      .insert(chunk)
      .select('id, name, selling_price');

    if (prodErr || !inserted) {
      throw new Error(`Product insertion failed at chunk ${i}: ${prodErr?.message}`);
    }
    createdProducts.push(...inserted);
    process.stdout.write(`   Seeded products ${createdProducts.length}/500...\r`);
  }
  console.log(`\n   ✅ Successfully seeded 500 products.`);

  // Step 5: Initialize Inventory via process_stock_adjustment RPC
  console.log('\n📦 [Step 5/6] Initializing inventory via process_stock_adjustment RPC...');
  let totalStockAdded = 0;

  await runInBatches(createdProducts, 20, async (prod, idx) => {
    const initialQty = faker.number.int({ min: 50, max: 150 });
    const assignedSupplier = faker.helpers.arrayElement(createdSuppliers);

    const { error: adjErr } = await userClient.rpc('process_stock_adjustment', {
      p_store_id: storeId,
      p_product_id: prod.id,
      p_action: 'add',
      p_quantity: initialQty,
      p_notes: 'Initial opening inventory seed',
      p_idempotency_key: `seed-adj-${prod.id}-${idx}`,
      p_supplier_id: assignedSupplier.id,
    });

    if (adjErr) {
      console.warn(`   ⚠️ Adjustment failed for ${prod.name}: ${adjErr.message}`);
    } else {
      totalStockAdded += initialQty;
    }

    if ((idx + 1) % 100 === 0 || idx === createdProducts.length - 1) {
      process.stdout.write(`   Adjusted stock for ${idx + 1}/500 products...\r`);
    }
  });

  console.log(`\n   ✅ Stock initialized across all 500 products (Total Units: ${totalStockAdded.toLocaleString()}).`);

  // Step 6: Simulate 1,000 Historical Sales Transactions via process_sale RPC
  console.log('\n💳 [Step 6/6] Simulating 1,000 sales transactions via process_sale RPC...');
  let salesRecorded = 0;
  let grossRevenue = 0;
  const CHANNELS = ['In-Store', 'Hyperlocal App', 'Online'];

  const salesToGenerate = Array.from({ length: 1000 }, (_, i) => i);

  await runInBatches(salesToGenerate, 25, async (_, saleIndex) => {
    const randomProduct = faker.helpers.arrayElement(createdProducts);
    const quantity = faker.number.int({ min: 1, max: 4 });
    const lineTotal = parseFloat((quantity * randomProduct.selling_price).toFixed(2));
    const taxRate = 0.05; // 5% GST
    const taxTotal = parseFloat((lineTotal * taxRate).toFixed(2));
    const channel = faker.helpers.weightedArrayElement([
      { weight: 7, value: 'In-Store' },
      { weight: 2, value: 'Hyperlocal App' },
      { weight: 1, value: 'Online' },
    ]);

    const idempotencyKey = `seed-sale-${saleIndex}-${Date.now()}-${faker.string.alphanumeric(6)}`;

    const { data: saleResult, error: saleErr } = await userClient.rpc('process_sale', {
      p_store_id: storeId,
      p_product_id: randomProduct.id,
      p_quantity: quantity,
      p_total_price: lineTotal,
      p_tax_total: taxTotal,
      p_channel: channel,
      p_idempotency_key: idempotencyKey,
    });

    if (saleErr) {
      console.warn(`   ⚠️ Sale #${saleIndex + 1} failed: ${saleErr.message}`);
    } else {
      salesRecorded++;
      grossRevenue += lineTotal;

      // Distribute sales across the last 60 days to simulate realistic demand curves
      if (saleResult && (saleResult as any).sale_id) {
        const daysAgo = faker.number.int({ min: 0, max: 60 });
        const saleDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
        await adminSupabase
          .from('sales')
          .update({ sale_date: saleDate })
          .eq('id', (saleResult as any).sale_id);
      }
    }

    if ((saleIndex + 1) % 100 === 0 || saleIndex === 999) {
      process.stdout.write(`   Processed ${saleIndex + 1}/1,000 sales transactions...\r`);
    }
  });

  console.log(`\n\n🎉 Seeding Complete! Summary of QA Data:`);
  console.log(`   ─────────────────────────────────────────────────────────`);
  console.log(`   🏬 Store Name:           StockSmart Supermart (QA Hyperlocal)`);
  console.log(`   🆔 Store ID:             ${storeId}`);
  console.log(`   👤 Owner Email:          ${TEST_EMAIL}`);
  console.log(`   🔑 Owner Password:       ${TEST_PASSWORD}`);
  console.log(`   📦 Catalog Products:     500 active SKUs`);
  console.log(`   🚚 Registered Suppliers: ${createdSuppliers.length} vendors`);
  console.log(`   📊 Opening Units Added:  ${totalStockAdded.toLocaleString()} units`);
  console.log(`   💳 Sales Simulated:      ${salesRecorded} transactions`);
  console.log(`   💰 Gross Sales Value:    ₹${grossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`   ─────────────────────────────────────────────────────────\n`);
  console.log(`✨ You can now sign in to the Web or Mobile app using:`);
  console.log(`   Email:    ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}\n`);
}

main().catch((err) => {
  console.error('\n❌ Seeding failed with uncaught exception:', err);
  process.exit(1);
});
