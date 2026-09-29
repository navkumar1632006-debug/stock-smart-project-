import { supabase } from '../supabase/client';
import { storeService } from './storeService';
import { Database } from '../database.types';

type KhataCustomer = Database['public']['Tables']['khata_customers']['Row'];
type KhataTransaction = Database['public']['Tables']['khata_transactions']['Row'];

export const khataService = {
  async getCustomers(): Promise<KhataCustomer[]> {
    const storeId = await storeService.getCurrentStoreId();
    const { data, error } = await supabase
      .from('khata_customers')
      .select('*')
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addCustomer(name: string, phone: string, initialBalance: number = 0): Promise<KhataCustomer> {
    const storeId = await storeService.getCurrentStoreId();
    const { data, error } = await supabase
      .from('khata_customers')
      .insert({ store_id: storeId, name, phone, balance: initialBalance })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addTransaction(customerId: string, type: 'credit' | 'debit', amount: number, reference: string = ''): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();
    
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
