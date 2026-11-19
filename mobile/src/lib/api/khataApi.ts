import { supabase } from '../supabase';
import { storeApi } from './storeApi';

export interface KhataCustomer {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  balance: number;
  created_at: string;
  updated_at: string;
}

export const khataApi = {
  async getCustomers(): Promise<KhataCustomer[]> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('khata_customers')
      .select('*')
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as KhataCustomer[]) || [];
  },

  async addCustomer(name: string, phone: string, initialBalance: number = 0): Promise<KhataCustomer> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('khata_customers')
      .insert({ store_id: storeId, name, phone, balance: initialBalance })
      .select()
      .single();

    if (error) throw error;
    return data as KhataCustomer;
  },

  async addTransaction(customerId: string, type: 'credit' | 'debit', amount: number, reference: string = ''): Promise<void> {
    const storeId = await storeApi.getCurrentStoreId();
    
    const { error } = await supabase.rpc('process_khata_transaction', {
      p_store_id: storeId,
      p_customer_id: customerId,
      p_type: type,
      p_amount: amount,
      p_reference: reference
    });

    if (error) throw error;
  }
};
