import { supabase } from '../supabase/client';
import { Product, InventoryBatch } from '../../types/retail';
import { storeService } from './storeService';

// Map database row to frontend Product type
const mapProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
  sku: row.sku,
  price: row.price,
  cost: row.cost,
  stockLevel: row.stock_level,
  reorderPoint: row.reorder_point,
  isFreshProduct: row.is_fresh_product || false
});

export const inventoryService = {
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to load inventory.');
    }
    
    return (data || []).map(mapProduct);
  },

  async getAuditLogs(): Promise<any[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    
    return data || [];
  },

  async adjustStock(productId: string, action: 'add' | 'deduct', quantity: number): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { data, error } = await supabase.rpc('process_stock_adjustment', {
      p_store_id: storeId,
      p_product_id: productId,
      p_action: action,
      p_quantity: quantity,
      p_notes: 'Manual stock adjustment',
      p_idempotency_key: crypto.randomUUID()
    });

    if (error) {
      console.error('Failed to update stock:', error);
      throw new Error(`Failed to update stock. Error: ${error.message}`);
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Adjustment failed');
    }
  },

  async addProduct(productPayload: Partial<Product>): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { data: insertedProduct, error } = await supabase
      .from('products')
      .insert([{
        store_id: storeId,
        name: productPayload.name,
        category: productPayload.category,
        sku: productPayload.sku,
        price: productPayload.price,
        selling_price: (productPayload as any).sellingPrice ?? productPayload.price ?? 0,
        cost: productPayload.cost,
        stock_level: productPayload.stockLevel,
        reorder_point: productPayload.reorderPoint,
        is_fresh_product: productPayload.category === 'Dairy' || productPayload.category === 'Bakery'
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to add product:', error);
      throw new Error(`Failed to add product. Error: ${error.message}`);
    }

    if (productPayload.stockLevel && productPayload.stockLevel > 0 && insertedProduct) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('stock_movements').insert([{
        store_id: storeId,
        product_id: insertedProduct.id,
        movement_type: 'RESTOCK',
        quantity_changed: productPayload.stockLevel,
        resulting_quantity: productPayload.stockLevel,
        reference_id: 'Initial stock on product creation'
      }]);
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.price !== undefined) {
      dbUpdates.price = updates.price;
      dbUpdates.selling_price = (updates as any).sellingPrice ?? updates.price;
    }
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
    if (updates.stockLevel !== undefined) dbUpdates.stock_level = updates.stockLevel;
    if (updates.reorderPoint !== undefined) dbUpdates.reorder_point = updates.reorderPoint;
    
    // Also update fresh flag based on category if provided
    if (updates.category !== undefined) {
      dbUpdates.is_fresh_product = updates.category === 'Dairy' || updates.category === 'Bakery';
    }

    // Fetch old stock first if we are changing it
    let oldStock = 0;
    if (updates.stockLevel !== undefined) {
      const { data: p } = await supabase.from('products').select('stock_level').eq('id', id).single();
      if (p) oldStock = p.stock_level;
    }

    const { error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .eq('store_id', storeId); // Ensure RLS scoping explicitly in case

    if (error) {
      console.error('Failed to update product:', error);
      throw new Error(`Failed to update product. Error: ${error.message}`);
    }

    if (updates.stockLevel !== undefined && updates.stockLevel !== oldStock) {
      const qtyChanged = updates.stockLevel - oldStock;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('stock_movements').insert([{
        store_id: storeId,
        product_id: id,
        movement_type: 'ADJUSTMENT',
        quantity_changed: qtyChanged,
        resulting_quantity: updates.stockLevel,
        reference_id: 'Product edit adjustment'
      }]);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId); // Ensure RLS scoping explicitly

    if (error) {
      console.error('Failed to delete product:', error);
      throw new Error(`Failed to delete product. Error: ${error.message}`);
    }
  },

  async getBatches(): Promise<InventoryBatch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*, products(name, price)')
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching batches:', error);
      throw new Error('Failed to load inventory batches.');
    }

    return (data || []).map((row: any) => {
      // Calculate dynamic discount based on expiry (just like FE simulation)
      const expiryDate = new Date(row.expiry_date);
      const today = new Date();
      const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let discountRate = 0;
      if (diffDays <= 1) discountRate = 0.50;
      else if (diffDays <= 3) discountRate = 0.25;
      else if (diffDays <= 5) discountRate = 0.10;

      const originalPrice = row.products?.price || 0;
      const discountedPrice = originalPrice * (1 - discountRate);

      return {
        id: row.id,
        productId: row.product_id,
        productName: row.products?.name || 'Unknown',
        batchNumber: row.batch_number,
        expiryDate: row.expiry_date,
        initialQuantity: row.initial_quantity,
        currentQuantity: row.current_quantity,
        originalPrice: originalPrice,
        discountRate: discountRate,
        discountedPrice: discountedPrice
      };
    });
  },

  async addBatch(productId: string, batchNumber: string, quantity: number, expiryDate: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { data: insertedBatch, error } = await supabase
      .from('batches')
      .insert([{
        store_id: storeId,
        product_id: productId,
        batch_number: batchNumber,
        initial_quantity: quantity,
        current_quantity: quantity,
        expiry_date: expiryDate
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to add batch:', error);
      throw new Error(`Failed to add batch. Error: ${error.message}`);
    }

    // Update parent product stock explicitly (RLS scopes this inherently since store_id is checked in policy, but let's be safe)
    const { data: currentStock, error: stockFetchError } = await supabase
      .from('products')
      .select('stock_level')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single();

    if (!stockFetchError && currentStock) {
      const newStock = currentStock.stock_level + quantity;
      await supabase
        .from('products')
        .update({ stock_level: newStock })
        .eq('id', productId)
        .eq('store_id', storeId);

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('stock_movements').insert([{
        store_id: storeId,
        product_id: productId,
        movement_type: 'RESTOCK',
        quantity_changed: quantity,
        resulting_quantity: newStock,
        reference_id: `New batch ${batchNumber} added`
      }]);
    }
  },

  async markBatchExpired(batchId: string, productId: string, currentQty: number): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    // 1. Update batch current_quantity to 0
    const { error: batchError } = await supabase
      .from('batches')
      .update({ current_quantity: 0 })
      .eq('id', batchId)
      .eq('store_id', storeId);

    if (batchError) {
      console.error('Failed to update batch:', batchError);
      throw new Error('Failed to update batch status.');
    }

    // 2. Deduct from total stock
    const { data, error } = await supabase.rpc('process_stock_adjustment', {
      p_store_id: storeId,
      p_product_id: productId,
      p_action: 'deduct',
      p_quantity: currentQty,
      p_notes: `Batch ${batchId} marked as expired`,
      p_idempotency_key: crypto.randomUUID()
    });

    if (error) {
      console.error('Failed to deduct expired stock:', error);
      throw new Error(`Failed to deduct stock. Error: ${error.message}`);
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Adjustment failed');
    }
  }
};
