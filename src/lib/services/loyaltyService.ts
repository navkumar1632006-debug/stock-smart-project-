import { supabase } from '../supabase/client';
import { storeService } from './storeService';
import { Database } from '../database.types';

type LoyaltyCustomer = Database['public']['Tables']['loyalty_customers']['Row'];
type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row'];

export const loyaltyService = {
  async getCustomers(): Promise<LoyaltyCustomer[]> {
    const storeId = await storeService.getCurrentStoreId();
    const { data, error } = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addCustomer(name: string, phone: string, initialPoints: number = 0): Promise<LoyaltyCustomer> {
    const storeId = await storeService.getCurrentStoreId();
    const { data, error } = await supabase
      .from('loyalty_customers')
      .insert({ store_id: storeId, name, phone, points_balance: initialPoints })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addTransaction(customerId: string, type: 'earn' | 'redeem', points: number, reference: string = ''): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();
    
    const { error } = await supabase.rpc('process_loyalty_transaction', {
      p_store_id: storeId,
      p_customer_id: customerId,
      p_type: type,
      p_points: points,
      p_reference: reference
    });

    if (error) throw error;
  }
};
