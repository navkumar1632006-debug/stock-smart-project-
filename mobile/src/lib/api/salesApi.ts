import { supabase } from '../supabase';
import { storeApi } from './storeApi';
import { SaleRecord } from '../../types/retail';

export const salesApi = {
  async processSale(
    productId: string,
    quantity: number,
    totalPrice?: number,
    channel: 'In-Store' | 'Hyperlocal App' | 'Online' = 'In-Store'
  ): Promise<any> {
    const storeId = await storeApi.getCurrentStoreId();

    let computedTotal = totalPrice;
    if (computedTotal === undefined) {
      const { data: product, error: fetchErr } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();
      if (fetchErr || !product) {
        throw new Error('Product not found for sale transaction.');
      }
      computedTotal = Number(product.price) * quantity;
    }

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Execute atomic process_sale RPC matching postgres signature
    const { data, error } = await supabase.rpc('process_sale', {
      p_store_id: storeId,
      p_product_id: productId,
      p_quantity: quantity,
      p_total_price: computedTotal,
      p_channel: channel,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      console.error('Sale Transaction Failed:', error);
      throw new Error(`Sale Transaction Failed: ${error.message}`);
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Transaction failed');
    }

    return data;
  },

  async getSales(): Promise<SaleRecord[]> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('sales')
      .select('*, products(name, price)')
      .eq('store_id', storeId)
      .order('sale_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      productId: s.product_id,
      productName: s.products?.name || 'Item',
      quantity: s.quantity,
      unitPrice: s.products?.price || 0,
      totalPrice: s.total_price,
      saleDate: s.sale_date,
      channel: s.channel || 'In-Store'
    }));
  },

  async getInvoices(): Promise<any[]> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
