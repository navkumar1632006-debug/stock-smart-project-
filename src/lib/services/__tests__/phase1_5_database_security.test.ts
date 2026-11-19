import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../supabase/client';

// Simulated PostgreSQL stored procedure logic for local verification
interface StoreStaffRecord {
  storeId: string;
  userId: string;
  role: 'manager' | 'inventory_clerk' | 'cashier';
  status: 'active' | 'pending';
}

interface ProductRecord {
  id: string;
  storeId: string;
  stockLevel: number;
  price?: number;
  sellingPrice?: number;
}

interface BatchRecord {
  id: string;
  productId: string;
  supplierId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
}

interface SaleRecord {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  taxTotal?: number;
  channel: string;
  idempotencyKey: string;
}

interface KhataTxRecord {
  id: string;
  storeId: string;
  customerId: string;
  type: string;
  amount: number;
  reference: string;
  idempotencyKey: string;
}

interface LoyaltyTxRecord {
  id: string;
  storeId: string;
  customerId: string;
  type: string;
  points: number;
  reference: string;
  idempotencyKey: string;
}

interface POReceiptRecord {
  id: string;
  storeId: string;
  poId: string;
  itemId: string;
  productId: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  idempotencyKey: string;
}

// In-memory mock database state
class MockPostgresEngine {
  stores = new Map<string, { id: string; ownerId: string }>();
  staff = new Map<string, StoreStaffRecord>();
  products = new Map<string, ProductRecord>();
  batches = new Map<string, BatchRecord>();
  suppliers = new Map<string, { id: string; storeId: string | null; name: string }>();
  purchaseOrders = new Map<string, { id: string; storeId: string; supplierId: string; status: string }>();
  purchaseOrderItems = new Map<string, { id: string; poId: string; productId: string; quantity: number; receivedQuantity?: number }>();
  sales = new Map<string, SaleRecord>();
  khataCustomers = new Map<string, { id: string; storeId: string; balance: number }>();
  loyaltyCustomers = new Map<string, { id: string; storeId: string; points: number }>();
  khataTransactions = new Map<string, KhataTxRecord>();
  loyaltyTransactions = new Map<string, LoyaltyTxRecord>();
  poReceipts = new Map<string, POReceiptRecord>();
  currentUserId: string | null = null;

  hasStoreRole(storeId: string, allowedRoles: string[]): boolean {
    if (!this.currentUserId) return false;
    const store = this.stores.get(storeId);
    if (store && store.ownerId === this.currentUserId) return true;

    for (const s of this.staff.values()) {
      if (
        s.storeId === storeId &&
        s.userId === this.currentUserId &&
        s.status === 'active' &&
        allowedRoles.includes(s.role)
      ) {
        return true;
      }
    }
    return false;
  }

  // Simulates trigger trg_sync_product_pricing
  syncProductPricing(
    op: 'INSERT' | 'UPDATE',
    oldRow: { price?: number | null; sellingPrice?: number | null } | null,
    newRow: { price?: number | null; sellingPrice?: number | null }
  ): { price: number; sellingPrice: number } {
    let result = {
      price: newRow.price ?? 0,
      sellingPrice: newRow.sellingPrice ?? 0,
    };

    if (op === 'INSERT') {
      if (newRow.sellingPrice && newRow.sellingPrice > 0 && (!newRow.price || newRow.price === 0)) {
        result.price = newRow.sellingPrice;
      } else if (newRow.price && newRow.price > 0 && (!newRow.sellingPrice || newRow.sellingPrice === 0)) {
        result.sellingPrice = newRow.price;
      } else if (newRow.sellingPrice && newRow.sellingPrice > 0) {
        result.price = newRow.sellingPrice;
      } else {
        result.price = newRow.price ?? 0;
        result.sellingPrice = newRow.sellingPrice ?? result.price;
      }
    } else if (op === 'UPDATE' && oldRow) {
      const spChanged = newRow.sellingPrice !== oldRow.sellingPrice;
      const pChanged = newRow.price !== oldRow.price;

      if (spChanged && !pChanged) {
        result.price = newRow.sellingPrice ?? 0;
      } else if (pChanged && !spChanged) {
        result.sellingPrice = newRow.price ?? 0;
      } else if (spChanged && pChanged) {
        result.price = newRow.sellingPrice ?? 0;
      } else {
        if (!result.sellingPrice) result.sellingPrice = result.price;
        if (!result.price) result.price = result.sellingPrice;
      }
    }

    return result;
  }

  processSale(
    storeId: string,
    productId: string,
    quantity: number,
    totalPrice: number,
    channel: string,
    idempotencyKey: string,
    taxTotal: number = 0
  ) {
    if (!this.currentUserId) throw new Error('Unauthorized: Caller must be authenticated');
    if (!quantity || quantity <= 0) throw new Error('Invalid quantity: must be positive integer');
    if (totalPrice === undefined || totalPrice < 0) throw new Error('Invalid total_price: cannot be negative');
    if (!['In-Store', 'Hyperlocal App', 'Online'].includes(channel)) throw new Error('Invalid channel');
    if (!idempotencyKey?.trim()) throw new Error('Invalid idempotency_key: key is required');

    if (taxTotal < 0) throw new Error('Invalid tax_total: cannot be negative');
    if (taxTotal > totalPrice / 2) {
      throw new Error('Invalid tax_total: tax cannot exceed 50% of gross total price (effective tax_rate cannot exceed 100%)');
    }

    const subtotal = totalPrice - taxTotal;
    const taxRate = subtotal > 0 ? Math.min(Math.round((taxTotal / subtotal) * 10000) / 100, 100) : 0;
    // 4-decimal precision on unit_price to minimize fractional rounding discrepancy
    const unitPrice = quantity > 0 ? Math.round((subtotal / quantity) * 10000) / 10000 : subtotal;

    if (!this.hasStoreRole(storeId, ['manager', 'cashier'])) {
      throw new Error(`Unauthorized: Caller does not possess an authorized role in store ${storeId}`);
    }

    const product = this.products.get(productId);
    if (!product || product.storeId !== storeId) {
      throw new Error('Product not found in this store');
    }

    // Idempotency check
    for (const s of this.sales.values()) {
      if (s.idempotencyKey === idempotencyKey) {
        if (s.productId !== productId || s.quantity !== quantity || s.totalPrice !== totalPrice || (s.taxTotal ?? 0) !== taxTotal) {
          throw new Error('Idempotency conflict: key was previously used with different parameters');
        }
        return { success: true, saleId: s.id, recovered: true };
      }
    }

    // Negative stock check
    if (product.stockLevel < quantity) {
      throw new Error(`Insufficient stock: requested ${quantity} units but only ${product.stockLevel} available`);
    }

    product.stockLevel -= quantity;
    const saleId = `sale-${Date.now()}-${Math.random()}`;
    this.sales.set(saleId, {
      id: saleId,
      storeId,
      productId,
      quantity,
      totalPrice,
      taxTotal,
      channel,
      idempotencyKey,
    });

    return { 
      success: true, 
      saleId,
      subtotal,
      taxRate,
      unitPrice,
      lineTotal: totalPrice 
    };
  }

  processStockAdjustment(
    storeId: string,
    productId: string,
    action: 'add' | 'deduct',
    quantity: number,
    notes: string,
    idempotencyKey: string,
    batchId?: string | null,
    supplierId?: string | null
  ) {
    if (!this.currentUserId) throw new Error('Unauthorized: Caller must be authenticated');
    if (!quantity || quantity <= 0) throw new Error('Invalid quantity: must be positive');
    if (!['add', 'deduct'].includes(action)) throw new Error('Invalid action');
    if (!this.hasStoreRole(storeId, ['manager', 'inventory_clerk'])) {
      throw new Error('Unauthorized: Caller must be manager or inventory clerk');
    }

    // Outbound deductions cannot specify supplier_id
    if (supplierId && action === 'deduct') {
      throw new Error('Invalid parameter: supplier_id cannot be specified for outbound stock deductions');
    }

    // Validate supplier when provided
    if (supplierId) {
      const sup = this.suppliers.get(supplierId);
      if (!sup || (sup.storeId !== storeId && sup.storeId !== null)) {
        throw new Error(`Supplier ${supplierId} does not belong to store ${storeId}`);
      }
    }

    const product = this.products.get(productId);
    if (!product || product.storeId !== storeId) throw new Error('Product not found in this store');

    if (action === 'deduct') {
      if (product.stockLevel < quantity) {
        throw new Error(`Insufficient stock for deduction: available ${product.stockLevel} units, requested ${quantity}`);
      }

      if (batchId) {
        const batch = this.batches.get(batchId);
        if (!batch || batch.productId !== productId) {
          throw new Error(`Specified batch ${batchId} not found for this product`);
        }
        if (batch.quantity < quantity) {
          throw new Error(`Insufficient batch inventory for deduction: batch ${batchId} has ${batch.quantity} units available, requested ${quantity}`);
        }
        batch.quantity -= quantity;
      }

      product.stockLevel -= quantity;
    } else {
      if (batchId) {
        const batch = this.batches.get(batchId);
        if (!batch || batch.productId !== productId) {
          throw new Error(`Specified batch ${batchId} not found for this product`);
        }
        if (supplierId && batch.supplierId && supplierId !== batch.supplierId) {
          throw new Error(`Supplier mismatch: specified supplier ${supplierId} does not match batch supplier ${batch.supplierId}`);
        }
        batch.quantity += quantity;
      } else {
        // When batchId is NULL:
        // If supplierId is provided, ONLY match an existing batch belonging to that supplier
        let targetBatch: BatchRecord | undefined;
        if (supplierId) {
          for (const b of this.batches.values()) {
            if (b.productId === productId && b.supplierId === supplierId) {
              targetBatch = b;
              break;
            }
          }
        } else {
          for (const b of this.batches.values()) {
            if (b.productId === productId) {
              targetBatch = b;
              break;
            }
          }
        }

        if (targetBatch) {
          targetBatch.quantity += quantity;
        } else {
          // Create new batch for this supplier
          const newBatchId = `batch-${Date.now()}-${Math.random()}`;
          const effectiveSupplierId = supplierId || 'sup-A';
          this.batches.set(newBatchId, {
            id: newBatchId,
            productId,
            supplierId: effectiveSupplierId,
            batchNumber: 'ADJ-NEW',
            quantity,
            expiryDate: '2027-11-16',
          });
        }
      }
      product.stockLevel += quantity;
    }

    return { success: true, resultingStock: product.stockLevel };
  }

  sendPurchaseOrder(storeId: string, poId: string) {
    if (!this.currentUserId) throw new Error('Unauthorized: Caller must be authenticated');
    if (!this.hasStoreRole(storeId, ['manager', 'inventory_clerk'])) {
      throw new Error('Unauthorized');
    }

    const po = this.purchaseOrders.get(poId);
    if (!po || po.storeId !== storeId) throw new Error('Purchase order not found in this store');
    if (po.status !== 'DRAFT') throw new Error(`Only DRAFT purchase orders can be sent (current status: ${po.status})`);

    // Verify all items belong to this store
    for (const item of this.purchaseOrderItems.values()) {
      if (item.poId === poId) {
        const prod = this.products.get(item.productId);
        if (!prod || prod.storeId !== storeId || prod.storeId === null) {
          throw new Error('Purchase order contains products from another store or unassigned products');
        }
      }
    }

    po.status = 'SENT';
    return { success: true, poId, status: 'SENT' };
  }

  processKhataTransaction(
    storeId: string,
    customerId: string,
    type: 'credit' | 'debit',
    amount: number,
    reference: string,
    idempotencyKey: string
  ) {
    if (!this.currentUserId) throw new Error('Unauthorized: Caller must be authenticated');
    if (!['credit', 'debit'].includes(type)) throw new Error('Invalid transaction type');
    if (!amount || amount <= 0) throw new Error('Invalid amount: must be positive');
    if (!idempotencyKey?.trim()) throw new Error('Invalid idempotency_key');
    if (!this.hasStoreRole(storeId, ['manager', 'cashier'])) {
      throw new Error('Unauthorized: Caller must be manager or cashier');
    }

    for (const tx of this.khataTransactions.values()) {
      if (tx.idempotencyKey === idempotencyKey) {
        if (
          tx.storeId !== storeId ||
          tx.customerId !== customerId ||
          tx.type !== type ||
          tx.amount !== amount ||
          tx.reference !== reference
        ) {
          throw new Error('Idempotency conflict: key was previously used with different parameters');
        }
        return { success: true, transactionId: tx.id, recovered: true };
      }
    }

    const customer = this.khataCustomers.get(customerId);
    if (!customer || customer.storeId !== storeId) throw new Error('Khata customer not found in this store');

    if (type === 'credit') {
      customer.balance += amount;
    } else {
      customer.balance -= amount;
    }

    const txId = `ktx-${Date.now()}-${Math.random()}`;
    this.khataTransactions.set(txId, {
      id: txId,
      storeId,
      customerId,
      type,
      amount,
      reference,
      idempotencyKey
    });

    return { success: true, transactionId: txId, newBalance: customer.balance };
  }

  processLoyaltyTransaction(
    storeId: string,
    customerId: string,
    type: 'earn' | 'redeem',
    points: number,
    reference: string = 'REF-DEFAULT',
    idempotencyKey: string = 'IDEM-DEFAULT'
  ) {
    if (!this.currentUserId) throw new Error('Unauthorized: Caller must be authenticated');
    if (!points || points <= 0) throw new Error('Invalid points: must be greater than zero');
    if (!idempotencyKey?.trim()) throw new Error('Invalid idempotency_key');
    if (!this.hasStoreRole(storeId, ['manager', 'cashier'])) {
      throw new Error('Unauthorized: Caller must be manager or cashier');
    }

    for (const tx of this.loyaltyTransactions.values()) {
      if (tx.idempotencyKey === idempotencyKey) {
        if (
          tx.storeId !== storeId ||
          tx.customerId !== customerId ||
          tx.type !== type ||
          tx.points !== points ||
          tx.reference !== reference
        ) {
          throw new Error('Idempotency conflict: key was previously used with different parameters');
        }
        return { success: true, transactionId: tx.id, recovered: true };
      }
    }

    const customer = this.loyaltyCustomers.get(customerId);
    if (!customer || customer.storeId !== storeId) throw new Error('Loyalty customer not found in this store');

    if (type === 'redeem' && customer.points < points) {
      throw new Error(`Insufficient points balance: current ${customer.points} points, requested ${points}`);
    }

    if (type === 'earn') {
      customer.points += points;
    } else {
      customer.points -= points;
    }

    const txId = `ltx-${Date.now()}-${Math.random()}`;
    this.loyaltyTransactions.set(txId, {
      id: txId,
      storeId,
      customerId,
      type,
      points,
      reference,
      idempotencyKey
    });

    return { success: true, transactionId: txId, newPoints: customer.points };
  }

  receivePurchaseOrder(
    storeId: string,
    poId: string,
    itemId: string,
    receiveQuantity: number,
    batchNumber: string,
    expiryDate: string,
    idempotencyKey: string
  ) {
    if (!this.currentUserId) throw new Error('Unauthorized: Caller must be authenticated');
    if (!receiveQuantity || receiveQuantity <= 0) throw new Error('Invalid quantity');
    if (!idempotencyKey?.trim()) throw new Error('Invalid idempotency_key');
    if (!this.hasStoreRole(storeId, ['manager', 'inventory_clerk'])) {
      throw new Error('Unauthorized: Caller must be manager or inventory clerk');
    }

    for (const rcv of this.poReceipts.values()) {
      if (rcv.idempotencyKey === idempotencyKey) {
        if (
          rcv.storeId !== storeId ||
          rcv.poId !== poId ||
          rcv.itemId !== itemId ||
          rcv.quantity !== receiveQuantity ||
          rcv.batchNumber !== batchNumber ||
          rcv.expiryDate !== expiryDate
        ) {
          throw new Error('Idempotency conflict: key was previously used with different parameters');
        }
        return { success: true, movementId: rcv.id, recovered: true };
      }
    }

    const po = this.purchaseOrders.get(poId);
    if (!po || po.storeId !== storeId) throw new Error('Purchase order not found in this store');

    const item = this.purchaseOrderItems.get(itemId);
    if (!item || item.poId !== poId) throw new Error('PO item not found for this purchase order');

    const ordered = item.quantity;
    const received = item.receivedQuantity ?? 0;
    const newReceived = received + receiveQuantity;

    if (newReceived > ordered) {
      throw new Error(`Over-delivery rejected: cannot receive more than ordered (${ordered} ordered, ${received} currently received, ${receiveQuantity} requested)`);
    }

    item.receivedQuantity = newReceived;

    const product = this.products.get(item.productId);
    if (!product || product.storeId !== storeId) throw new Error('Product not found in this store');

    product.stockLevel += receiveQuantity;

    // Update PO status if all items received
    let allReceived = true;
    for (const it of this.purchaseOrderItems.values()) {
      if (it.poId === poId && (it.receivedQuantity ?? 0) < it.quantity) {
        allReceived = false;
        break;
      }
    }
    po.status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    const movementId = `mov-${Date.now()}-${Math.random()}`;
    this.poReceipts.set(movementId, {
      id: movementId,
      storeId,
      poId,
      itemId,
      productId: item.productId,
      quantity: receiveQuantity,
      batchNumber,
      expiryDate,
      idempotencyKey
    });

    return { 
      success: true, 
      movementId, 
      newStatus: po.status, 
      newReceived, 
      newStock: product.stockLevel 
    };
  }
}

describe('Phase 1.5 Database Security & Hardened Procedures', () => {
  let db: MockPostgresEngine;
  const storeA = 'store-A';
  const storeB = 'store-B';
  const ownerA = 'user-owner-A';
  const cashierA = 'user-cashier-A';
  const clerkA = 'user-clerk-A';
  const stranger = 'user-stranger';

  beforeEach(() => {
    db = new MockPostgresEngine();

    // Setup Store A and Store B
    db.stores.set(storeA, { id: storeA, ownerId: ownerA });
    db.stores.set(storeB, { id: storeB, ownerId: 'user-owner-B' });

    // Setup Staff
    db.staff.set('staff-1', { storeId: storeA, userId: cashierA, role: 'cashier', status: 'active' });
    db.staff.set('staff-2', { storeId: storeA, userId: clerkA, role: 'inventory_clerk', status: 'active' });

    // Setup Suppliers
    db.suppliers.set('sup-A', { id: 'sup-A', storeId: storeA, name: 'Local Dairy' });
    db.suppliers.set('sup-A2', { id: 'sup-A2', storeId: storeA, name: 'Alternative Dairy' });
    db.suppliers.set('sup-B', { id: 'sup-B', storeId: storeB, name: 'Foreign Bakery' });
    db.suppliers.set('sup-shared', { id: 'sup-shared', storeId: null, name: 'National FMCG' });

    // Setup Inventory & Batches
    db.products.set('prod-milk', { id: 'prod-milk', storeId: storeA, stockLevel: 10, price: 50, sellingPrice: 50 });
    db.products.set('prod-bread', { id: 'prod-bread', storeId: storeA, stockLevel: 2, price: 40, sellingPrice: 40 });
    db.products.set('prod-other', { id: 'prod-other', storeId: storeB, stockLevel: 50, price: 100, sellingPrice: 100 });

    db.batches.set('batch-milk-1', {
      id: 'batch-milk-1',
      productId: 'prod-milk',
      supplierId: 'sup-A',
      batchNumber: 'LOT-101',
      quantity: 10,
      expiryDate: '2026-12-31',
    });

    // Setup Loyalty
    db.loyaltyCustomers.set('cust-1', { id: 'cust-1', storeId: storeA, points: 100 });
  });

  // --------------------------------------------------------------------------
  // 1. NEGATIVE STOCK & OVER-SELLING PREVENTION
  // --------------------------------------------------------------------------
  describe('Negative Stock Guardrails', () => {
    it('should reject a sale when quantity exceeds current stock level', () => {
      db.currentUserId = cashierA;
      // Current stock of bread is 2, attempting to sell 5
      expect(() => {
        db.processSale(storeA, 'prod-bread', 5, 200, 'In-Store', 'tx-neg-1');
      }).toThrow(/Insufficient stock: requested 5 units but only 2 available/);

      // Verify stock level was NOT mutated
      expect(db.products.get('prod-bread')?.stockLevel).toBe(2);
    });

    it('should accurately deduct stock on a valid sale without going negative', () => {
      db.currentUserId = cashierA;
      const res = db.processSale(storeA, 'prod-bread', 2, 80, 'In-Store', 'tx-valid-1');
      expect(res.success).toBe(true);
      expect(db.products.get('prod-bread')?.stockLevel).toBe(0);
    });

    it('should prevent stock adjustment deduction when quantity exceeds inventory', () => {
      db.currentUserId = clerkA;
      expect(() => {
        db.processStockAdjustment(storeA, 'prod-milk', 'deduct', 15, 'Damaged crates', 'adj-1');
      }).toThrow(/Insufficient stock for deduction/);

      expect(db.products.get('prod-milk')?.stockLevel).toBe(10);
    });

    it('should prevent loyalty points redemption from going negative', () => {
      db.currentUserId = cashierA;
      expect(() => {
        db.processLoyaltyTransaction(storeA, 'cust-1', 'redeem', 150);
      }).toThrow(/Insufficient points balance/);

      expect(db.loyaltyCustomers.get('cust-1')?.points).toBe(100);
    });
  });

  // --------------------------------------------------------------------------
  // 2. CONCURRENCY & IDEMPOTENCY SAFETY
  // --------------------------------------------------------------------------
  describe('Concurrency & Idempotency Recovery', () => {
    it('should recover cached sale ID on duplicate network requests with identical parameters', () => {
      db.currentUserId = cashierA;
      const first = db.processSale(storeA, 'prod-milk', 3, 150, 'In-Store', 'idem-key-100');
      expect(first.success).toBe(true);
      expect(db.products.get('prod-milk')?.stockLevel).toBe(7);

      // Replay identical request (e.g. network retry)
      const second = db.processSale(storeA, 'prod-milk', 3, 150, 'In-Store', 'idem-key-100');
      expect(second.success).toBe(true);
      expect(second.saleId).toBe(first.saleId);
      expect(second.recovered).toBe(true);

      // Stock must NOT be deducted a second time
      expect(db.products.get('prod-milk')?.stockLevel).toBe(7);
    });

    it('should throw an idempotency conflict if key is reused with different parameters', () => {
      db.currentUserId = cashierA;
      db.processSale(storeA, 'prod-milk', 2, 100, 'In-Store', 'idem-key-tamper');

      // Attempt replay with modified quantity
      expect(() => {
        db.processSale(storeA, 'prod-milk', 5, 250, 'In-Store', 'idem-key-tamper');
      }).toThrow(/Idempotency conflict: key was previously used with different parameters/);
    });

    it('should recover khata transaction on identical retry and reject retry with tampered reference', () => {
      db.currentUserId = cashierA;
      db.khataCustomers.set('cust-k1', { id: 'cust-k1', storeId: storeA, balance: 100 });

      // First call
      const first = db.processKhataTransaction(storeA, 'cust-k1', 'credit', 50, 'Inv #101', 'khata-idem-1');
      expect(first.success).toBe(true);
      expect(db.khataCustomers.get('cust-k1')?.balance).toBe(150);

      // Replay identical
      const second = db.processKhataTransaction(storeA, 'cust-k1', 'credit', 50, 'Inv #101', 'khata-idem-1');
      expect(second.success).toBe(true);
      expect(second.transactionId).toBe(first.transactionId);
      expect((second as any).recovered).toBe(true);
      expect(db.khataCustomers.get('cust-k1')?.balance).toBe(150); // Balance NOT doubled

      // Replay with different reference on same key
      expect(() => {
        db.processKhataTransaction(storeA, 'cust-k1', 'credit', 50, 'Inv #TAMPERED', 'khata-idem-1');
      }).toThrow(/Idempotency conflict: key was previously used with different parameters/);
    });

    it('should recover loyalty transaction on identical retry and reject retry with tampered reference', () => {
      db.currentUserId = cashierA;
      db.loyaltyCustomers.set('cust-l1', { id: 'cust-l1', storeId: storeA, points: 200 });

      // First call
      const first = db.processLoyaltyTransaction(storeA, 'cust-l1', 'earn', 40, 'Bill #201', 'loyalty-idem-1');
      expect(first.success).toBe(true);
      expect(db.loyaltyCustomers.get('cust-l1')?.points).toBe(240);

      // Replay identical
      const second = db.processLoyaltyTransaction(storeA, 'cust-l1', 'earn', 40, 'Bill #201', 'loyalty-idem-1');
      expect(second.success).toBe(true);
      expect(second.transactionId).toBe(first.transactionId);
      expect((second as any).recovered).toBe(true);
      expect(db.loyaltyCustomers.get('cust-l1')?.points).toBe(240); // Points NOT doubled

      // Replay with different reference on same key
      expect(() => {
        db.processLoyaltyTransaction(storeA, 'cust-l1', 'earn', 40, 'Bill #TAMPERED', 'loyalty-idem-1');
      }).toThrow(/Idempotency conflict: key was previously used with different parameters/);
    });

    it('should bind PO receipts to specific item and reject key reuse on different PO item', () => {
      db.currentUserId = clerkA;
      db.purchaseOrders.set('po-multi', { id: 'po-multi', storeId: storeA, supplierId: 'sup-A', status: 'SENT' });
      db.purchaseOrderItems.set('item-1', { id: 'item-1', poId: 'po-multi', productId: 'prod-milk', quantity: 10 });
      db.purchaseOrderItems.set('item-2', { id: 'item-2', poId: 'po-multi', productId: 'prod-milk', quantity: 20 });
      const initialStock = db.products.get('prod-milk')?.stockLevel ?? 0;

      // Receive Item 1
      const first = db.receivePurchaseOrder(storeA, 'po-multi', 'item-1', 10, 'LOT-A', '2027-01-01', 'recv-idem-1');
      expect(first.success).toBe(true);
      expect(db.products.get('prod-milk')?.stockLevel).toBe(initialStock + 10);

      // Replay identical for Item 1
      const second = db.receivePurchaseOrder(storeA, 'po-multi', 'item-1', 10, 'LOT-A', '2027-01-01', 'recv-idem-1');
      expect(second.success).toBe(true);
      expect(second.movementId).toBe(first.movementId);
      expect((second as any).recovered).toBe(true);
      expect(db.products.get('prod-milk')?.stockLevel).toBe(initialStock + 10); // Stock NOT doubled

      // Replay with SAME key targeting Item 2 (same product, same PO) -> MUST throw conflict!
      expect(() => {
        db.receivePurchaseOrder(storeA, 'po-multi', 'item-2', 10, 'LOT-A', '2027-01-01', 'recv-idem-1');
      }).toThrow(/Idempotency conflict: key was previously used with different parameters/);
    });

    it('should prevent duplicate receipts and correctly calculate remaining allowable quantity for pre-existing PO item with non-zero received_quantity', () => {
      db.currentUserId = clerkA;
      db.purchaseOrders.set('po-partial', { id: 'po-partial', storeId: storeA, supplierId: 'sup-A', status: 'PARTIALLY_RECEIVED' });
      // Pre-existing legacy PO item: 10 ordered, 6 already received
      db.purchaseOrderItems.set('item-partial', { 
        id: 'item-partial', 
        poId: 'po-partial', 
        productId: 'prod-milk', 
        quantity: 10,
        receivedQuantity: 6 
      });
      const initialStock = db.products.get('prod-milk')?.stockLevel ?? 0;

      // Attempt to receive 5 units: 6 + 5 = 11 > 10 ordered -> MUST reject over-delivery!
      expect(() => {
        db.receivePurchaseOrder(storeA, 'po-partial', 'item-partial', 5, 'LOT-P1', '2027-01-01', 'recv-partial-fail');
      }).toThrow(/Over-delivery rejected: cannot receive more than ordered \(10 ordered, 6 currently received, 5 requested\)/);

      // Verify stock was NOT incremented on failed over-delivery
      expect(db.products.get('prod-milk')?.stockLevel).toBe(initialStock);

      // Attempt to receive full original quantity (10) -> MUST also reject over-delivery!
      expect(() => {
        db.receivePurchaseOrder(storeA, 'po-partial', 'item-partial', 10, 'LOT-P1', '2027-01-01', 'recv-partial-fail2');
      }).toThrow(/Over-delivery rejected/);

      // Receiving exactly remaining allowable quantity (10 - 6 = 4) succeeds
      const validReceipt = db.receivePurchaseOrder(storeA, 'po-partial', 'item-partial', 4, 'LOT-P2', '2027-01-01', 'recv-partial-ok');
      expect(validReceipt.success).toBe(true);
      expect(validReceipt.newReceived).toBe(10);
      expect(validReceipt.newStatus).toBe('RECEIVED');
      expect(db.products.get('prod-milk')?.stockLevel).toBe(initialStock + 4);
      expect(db.purchaseOrderItems.get('item-partial')?.receivedQuantity).toBe(10);
      expect(db.purchaseOrders.get('po-partial')?.status).toBe('RECEIVED');

      // Attempting any further receipt once fully received (10/10) must be rejected
      expect(() => {
        db.receivePurchaseOrder(storeA, 'po-partial', 'item-partial', 1, 'LOT-P3', '2027-01-01', 'recv-partial-fail3');
      }).toThrow(/Over-delivery rejected/);
    });
  });

  // --------------------------------------------------------------------------
  // 3. RLS & ROLE-BASED ACCESS CONTROL ENFORCEMENT
  // --------------------------------------------------------------------------
  describe('Multi-Tenant Store Isolation & RBAC Boundaries', () => {
    it('should reject unauthenticated caller (auth.uid = null)', () => {
      db.currentUserId = null;
      expect(() => {
        db.processSale(storeA, 'prod-milk', 1, 50, 'In-Store', 'unauth-1');
      }).toThrow(/Unauthorized: Caller must be authenticated/);
    });

    it('should prevent Cashier from performing Inventory Clerk operations (Stock Adjustment)', () => {
      db.currentUserId = cashierA;
      expect(() => {
        db.processStockAdjustment(storeA, 'prod-milk', 'add', 10, 'Restock', 'adj-cashier-fail');
      }).toThrow(/Unauthorized: Caller must be manager or inventory clerk/);
    });

    it('should prevent Inventory Clerk from performing Cashier operations (Sales)', () => {
      db.currentUserId = clerkA;
      expect(() => {
        db.processSale(storeA, 'prod-milk', 1, 50, 'In-Store', 'sale-clerk-fail');
      }).toThrow(/Unauthorized: Caller does not possess an authorized role/);
    });

    it('should prevent cross-store access (Store A staff calling Store B products)', () => {
      db.currentUserId = cashierA;
      expect(() => {
        db.processSale(storeB, 'prod-other', 1, 100, 'In-Store', 'cross-store-1');
      }).toThrow(/Unauthorized: Caller does not possess an authorized role in store store-B/);
    });

    it('should prevent stranger with valid auth token from accessing Store A operations', () => {
      db.currentUserId = stranger;
      expect(() => {
        db.processSale(storeA, 'prod-milk', 1, 50, 'In-Store', 'stranger-1');
      }).toThrow(/Unauthorized: Caller does not possess an authorized role in store store-A/);
    });

    it('should allow Store Owner full authority to record sales and adjustments', () => {
      db.currentUserId = ownerA;
      const sale = db.processSale(storeA, 'prod-milk', 1, 50, 'In-Store', 'owner-sale-1');
      expect(sale.success).toBe(true);

      const adj = db.processStockAdjustment(storeA, 'prod-milk', 'add', 5, 'Owner Restock', 'owner-adj-1');
      expect(adj.success).toBe(true);
      expect(adj.resultingStock).toBe(14); // 10 - 1 + 5 = 14
    });
  });

  // --------------------------------------------------------------------------
  // 4. FINANCIAL CONSISTENCY & TAX INTEGRITY (PHASE 1 HARDENING)
  // --------------------------------------------------------------------------
  describe('Financial Calculations & Tax Constraints', () => {
    it('should reject sales where tax exceeds 50% of gross total price', () => {
      db.currentUserId = cashierA;
      expect(() => {
        // Gross 100, tax 60 -> subtotal 40 -> tax_rate 150% (exceeds 100% cap)
        db.processSale(storeA, 'prod-milk', 1, 100, 'In-Store', 'tax-overflow-1', 60);
      }).toThrow(/tax cannot exceed 50% of gross total price/);
    });

    it('should correctly calculate pre-tax unit price and tax rate for standard retail GST', () => {
      db.currentUserId = cashierA;
      // Gross 118, tax 18 -> subtotal 100 -> tax_rate 18%, unit_price 50 for qty 2
      const sale = db.processSale(storeA, 'prod-milk', 2, 118, 'In-Store', 'gst-18-sale', 18);
      expect(sale.success).toBe(true);
      expect(sale.subtotal).toBe(100);
      expect(sale.taxRate).toBe(18);
      expect(sale.unitPrice).toBe(50);
      expect(sale.lineTotal).toBe(118);
    });

    it('should preserve 4-decimal precision on unit_price for odd quantity divisions while line totals reconcile exactly', () => {
      db.currentUserId = cashierA;
      // Gross 10.00, qty 3 -> subtotal 10.00, unit_price 3.3333
      const sale = db.processSale(storeA, 'prod-milk', 3, 10.00, 'In-Store', 'odd-division-sale', 0);
      expect(sale.success).toBe(true);
      expect(sale.unitPrice).toBe(3.3333);
      expect(sale.subtotal).toBe(10.00);
      expect(sale.lineTotal).toBe(10.00);
    });
  });

  // --------------------------------------------------------------------------
  // 5. PRODUCT PRICING MUTUAL SYNCHRONIZATION TRIGGER
  // --------------------------------------------------------------------------
  describe('Price & Selling Price Mutual Synchronization', () => {
    it('should propagate selling_price to price when price is missing on INSERT', () => {
      const synced = db.syncProductPricing('INSERT', null, { sellingPrice: 75 });
      expect(synced.price).toBe(75);
      expect(synced.sellingPrice).toBe(75);
    });

    it('should handle null price safely on backfill with coalesce to zero', () => {
      const synced = db.syncProductPricing('INSERT', null, { price: null, sellingPrice: 0 });
      expect(synced.price).toBe(0);
      expect(synced.sellingPrice).toBe(0);
    });

    it('should propagate price update to selling_price when only price changes', () => {
      const oldRow = { price: 50, sellingPrice: 50 };
      const newRow = { price: 65, sellingPrice: 50 };
      const synced = db.syncProductPricing('UPDATE', oldRow, newRow);
      expect(synced.sellingPrice).toBe(65);
      expect(synced.price).toBe(65);
    });

    it('should propagate selling_price update to price when only selling_price changes', () => {
      const oldRow = { price: 50, sellingPrice: 50 };
      const newRow = { price: 50, sellingPrice: 80 };
      const synced = db.syncProductPricing('UPDATE', oldRow, newRow);
      expect(synced.price).toBe(80);
      expect(synced.sellingPrice).toBe(80);
    });
  });

  // --------------------------------------------------------------------------
  // 6. STOCK ADJUSTMENT PARAMETER CONSISTENCY & TARGETED BATCHES
  // --------------------------------------------------------------------------
  describe('Stock Adjustment Parameter Consistency', () => {
    it('should reject supplier_id on outbound stock deductions', () => {
      db.currentUserId = clerkA;
      expect(() => {
        db.processStockAdjustment(storeA, 'prod-milk', 'deduct', 2, 'Waste', 'adj-deduct-sup', null, 'sup-A');
      }).toThrow(/supplier_id cannot be specified for outbound stock deductions/);
    });

    it('should reject foreign suppliers on stock additions', () => {
      db.currentUserId = clerkA;
      expect(() => {
        db.processStockAdjustment(storeA, 'prod-milk', 'add', 5, 'Restock', 'adj-foreign-sup', null, 'sup-B');
      }).toThrow(/does not belong to store/);
    });

    it('should accurately deduct from a targeted batch when batch_id is specified', () => {
      db.currentUserId = clerkA;
      const res = db.processStockAdjustment(storeA, 'prod-milk', 'deduct', 4, 'Batch damage', 'adj-batch-deduct', 'batch-milk-1');
      expect(res.success).toBe(true);
      expect(db.batches.get('batch-milk-1')?.quantity).toBe(6);
      expect(db.products.get('prod-milk')?.stockLevel).toBe(6);
    });

    it('should not misattribute stock when batch_id is null and requested supplier differs from existing batches', () => {
      db.currentUserId = clerkA;
      // Existing batch is batch-milk-1 with supplier sup-A (quantity 10).
      // Now clerk adds 5 units with supplierId 'sup-A2' (alternative supplier) and batch_id = null.
      const res = db.processStockAdjustment(storeA, 'prod-milk', 'add', 5, 'New supplier delivery', 'adj-sup-filter', null, 'sup-A2');
      expect(res.success).toBe(true);
      
      // Batch from sup-A must NOT be touched or increased
      expect(db.batches.get('batch-milk-1')?.quantity).toBe(10);
      
      // Total product stock should be 15
      expect(db.products.get('prod-milk')?.stockLevel).toBe(15);

      // Verify a new batch was created for sup-A2 with quantity 5
      let supA2BatchFound = false;
      for (const b of db.batches.values()) {
        if (b.supplierId === 'sup-A2' && b.quantity === 5) {
          supA2BatchFound = true;
          break;
        }
      }
      expect(supA2BatchFound).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. PURCHASE ORDER CROSS-TENANCY VALIDATION
  // --------------------------------------------------------------------------
  describe('Purchase Order Store Integrity & Unassigned Product Rejection', () => {
    it('should reject sending PO when it contains products from another store', () => {
      db.currentUserId = clerkA;
      db.purchaseOrders.set('po-1', { id: 'po-1', storeId: storeA, supplierId: 'sup-A', status: 'DRAFT' });
      // Add item pointing to Store B product
      db.purchaseOrderItems.set('poi-1', { id: 'poi-1', poId: 'po-1', productId: 'prod-other', quantity: 10 });

      expect(() => {
        db.sendPurchaseOrder(storeA, 'po-1');
      }).toThrow(/Purchase order contains products from another store or unassigned products/);
    });

    it('should successfully send PO when all items belong to caller store', () => {
      db.currentUserId = clerkA;
      db.purchaseOrders.set('po-valid', { id: 'po-valid', storeId: storeA, supplierId: 'sup-A', status: 'DRAFT' });
      db.purchaseOrderItems.set('poi-valid', { id: 'poi-valid', poId: 'po-valid', productId: 'prod-milk', quantity: 5 });

      const res = db.sendPurchaseOrder(storeA, 'po-valid');
      expect(res.success).toBe(true);
      expect(res.status).toBe('SENT');
      expect(db.purchaseOrders.get('po-valid')?.status).toBe('SENT');
    });
  });

  // --------------------------------------------------------------------------
  // 8. TRIGGER SECURITY & INVOKER DDL VALIDATION
  // --------------------------------------------------------------------------
  describe('Trigger Security & Invoker Mode Validation', () => {
    it('should declare guard_direct_balance_stock_mutations as SECURITY INVOKER and never SECURITY DEFINER', () => {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.resolve(__dirname, '../../../../supabase/migrations/20261116010000_phase22_harden_rls_and_stored_procedures.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      const funcMatch = content.match(/CREATE OR REPLACE FUNCTION public\.guard_direct_balance_stock_mutations\(\)[\s\S]*?AS \$\$/i);
      expect(funcMatch).not.toBeNull();
      const funcDef = funcMatch![0];

      // Must be explicitly declared as SECURITY INVOKER
      expect(funcDef).toContain('SECURITY INVOKER');
      // Must never be declared as SECURITY DEFINER
      expect(funcDef).not.toContain('SECURITY DEFINER');
    });
  });
});
