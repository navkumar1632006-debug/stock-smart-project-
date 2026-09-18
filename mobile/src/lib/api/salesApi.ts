import { supabase } from '../supabase';
import { storeApi } from './storeApi';
import { SaleRecord } from '../../types/retail';

export const salesApi = {
  async processSale(productId: string, quantity: number, channel: string = 'In-Store'): Promise<any> {
    const storeId = await storeApi.getCurrentStoreId();
    
    // Execute atomic process_sale RPC
    const { data, error } = await supabase.rpc('process_sale', {
      p_store_id: storeId,
      p_product_id: productId,
      p_quantity: quantity,
      p_channel: channel
    });

    if (error) throw error;
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
