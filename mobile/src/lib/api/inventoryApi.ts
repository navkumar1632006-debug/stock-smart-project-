import { supabase } from '../supabase';
import { storeApi } from './storeApi';
import { Product, InventoryBatch } from '../../types/retail';

export const inventoryApi = {
  async getProducts(): Promise<Product[]> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('name');

    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Grocery',
      sku: p.sku,
      price: p.price,
      cost: p.cost,
      stockLevel: p.stock_level,
      reorderPoint: p.reorder_point,
      isFreshProduct: p.is_fresh_product || false
    }));
  },

  async getBatches(): Promise<InventoryBatch[]> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('batches')
      .select('*, products(name, price)')
      .eq('store_id', storeId)
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(b => {
      const origPrice = b.products?.price || 0;
      const daysUntilExpiry = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      let discountRate = 0;
      if (daysUntilExpiry <= 2) discountRate = 0.5;
      else if (daysUntilExpiry <= 5) discountRate = 0.25;
      else if (daysUntilExpiry <= 7) discountRate = 0.1;

      return {
        id: b.id,
        productId: b.product_id,
        productName: b.products?.name || 'Unknown',
        batchNumber: b.batch_number,
        expiryDate: b.expiry_date,
        initialQuantity: b.initial_quantity,
        currentQuantity: b.current_quantity,
        originalPrice: origPrice,
        discountRate,
        discountedPrice: origPrice * (1 - discountRate)
      };
    });
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('products')
      .insert([{
        store_id: storeId,
        name: product.name,
        category: product.category,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        stock_level: product.stockLevel,
        reorder_point: product.reorderPoint,
        is_fresh_product: product.isFreshProduct || false
      }])
      .select()
      .single();

    if (error || !data) throw error || new Error("Failed to create product");
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      sku: data.sku,
      price: data.price,
      cost: data.cost,
      stockLevel: data.stock_level,
      reorderPoint: data.reorder_point,
      isFreshProduct: data.is_fresh_product
    };
  }
};
