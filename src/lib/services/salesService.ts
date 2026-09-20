import { supabase } from '../supabase/client';
import { SaleRecord } from '../../types/retail';
import { storeService } from './storeService';

export const salesService = {
  async getSales(): Promise<SaleRecord[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, products(name, price)')
      .order('sale_date', { ascending: false });
      
    if (error) {
      console.error('Error fetching sales:', error);
      throw new Error('Failed to load sales data.');
    }
    
    return (data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.products?.name || 'Unknown Product',
      quantity: row.quantity,
      unitPrice: row.products?.price || (row.total_price / row.quantity),
      totalPrice: row.total_price,
      saleDate: row.sale_date,
      channel: row.channel || 'In-Store'
    }));
  },

  async recordSale(productId: string, quantity: number, channel: string = 'In-Store'): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    // 1. Fetch product to verify and get price
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('price, stock_level')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error('Product not found for sale.');
    }

    const totalPrice = product.price * quantity;
    const idempotencyKey = crypto.randomUUID();

    const { data, error } = await supabase.rpc('process_sale', {
      p_store_id: storeId,
      p_product_id: productId,
      p_quantity: quantity,
      p_total_price: totalPrice,
      p_channel: channel,
      p_idempotency_key: idempotencyKey
    });

    if (error) {
      console.error('Sale Transaction Failed:', error);
      throw new Error(`Sale Transaction Failed: ${error.message}`);
    }
    
    // Check custom JSON response from our RPC
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Transaction failed');
    }
  },

  async processCheckout(items: { product_id: string, quantity: number, total_price: number }[], channel: string = 'In-Store'): Promise<string[]> {
    const saleIds: string[] = [];
    // Process items sequentially using the single-item RPC
    for (const item of items) {
      const storeId = await storeService.getCurrentStoreId();
      const idempotencyKey = crypto.randomUUID();
      
      const { data, error } = await supabase.rpc('process_sale', {
        p_store_id: storeId,
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_total_price: item.total_price,
        p_channel: channel,
        p_idempotency_key: idempotencyKey
      });

      if (error) {
        console.error('POS Checkout Item Failed:', error);
        throw new Error(`POS Checkout Item Failed for ${item.product_id}: ${error.message}`);
      }
      
      if (data && typeof data === 'object') {
        if ('success' in data && data.success === false) {
           throw new Error((data as any).error || 'Transaction failed');
        }
        if ('sale_id' in data) {
           saleIds.push((data as any).sale_id);
        } else if ('id' in data) {
           saleIds.push((data as any).id);
        }
      }
    }
    return saleIds;
  }
};
